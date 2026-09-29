// ── NFL Elo — data build ─────────────────────────────────────────────────────
// Rebuilds every rating from scratch and writes the JSON the page reads.
//
// Run with:  npm run build:nfl-elo
//
// Everything comes from nflverse, which publishes its data under CC BY 4.0.
// No NFL.com scraping — their terms forbid systematic retrieval — and no club
// logos or player photography is pulled in.
//
//   schedules + results + announced starters
//     https://github.com/nflverse/nfldata          (data/games.csv)
//   weekly player box scores
//     https://github.com/nflverse/nflverse-data    (stats_player release)
//   depth charts, for projecting starters in games not yet played
//     https://github.com/nflverse/nflverse-data    (depth_charts release)

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  LEAGUE_MEAN,
  LEAGUE_AVG_QB_VALUE,
  QB_VALUE_TO_ELO,
  matchupEloDiff,
  winProbability,
  expectedSpread,
  ratingShift,
  revertTeam,
  revertQb,
  qbValue,
  qbAdjustment,
  rollingUpdate,
  type EloSeason,
  type GameProjection,
  type QbRating,
  type TeamRating,
} from '../src/app/projects/nfl-elo/engine.ts';
import { TEAMS, resolveTeam } from '../src/app/projects/nfl-elo/teams.ts';
import { SIMULATIONS, simulateSeason } from '../src/app/projects/nfl-elo/playoffs.ts';

const GAMES_URL = 'https://raw.githubusercontent.com/nflverse/nfldata/master/data/games.csv';
const STATS_URL = (season: number) =>
  `https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_week_${season}.csv`;
const DEPTH_URL = (season: number) =>
  `https://github.com/nflverse/nflverse-data/releases/download/depth_charts/depth_charts_${season}.csv`;

/** QB box scores are only needed once the rolling ratings have warmed up. */
const QB_HISTORY_FROM = 2006;

/** Seasons the calibration metrics are measured over. */
const EVAL_FROM = 2015;

// ── CSV ──────────────────────────────────────────────────────────────────────

/** Split one CSV line, honouring double-quoted fields. */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"') {
        if (line[i + 1] === '"') { field += '"'; i++; } else { quoted = false; }
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { out.push(field); field = ''; }
    else field += c;
  }
  out.push(field);
  return out;
}

type Row = Record<string, string>;

function parseCsv(text: string, dropPartialLastLine = false): Row[] {
  const lines = text.split('\n');
  if (lines.length === 0) return [];
  const header = splitCsvLine(lines[0]);
  const rows: Row[] = [];
  const end = dropPartialLastLine ? lines.length - 1 : lines.length;
  for (let i = 1; i < end; i++) {
    const line = lines[i];
    if (!line || line.trim() === '') continue;
    const cells = splitCsvLine(line);
    const row: Row = {};
    for (let c = 0; c < header.length; c++) row[header[c]] = cells[c] ?? '';
    rows.push(row);
  }
  return rows;
}

async function fetchText(url: string, rangeBytes?: number): Promise<string> {
  const headers: Record<string, string> = {};
  if (rangeBytes) headers.Range = `bytes=0-${rangeBytes}`;
  const res = await fetch(url, { headers });
  if (!res.ok && res.status !== 206) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.text();
}

/** Fetch that tolerates a season's file not existing yet. */
async function fetchOptional(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

// ── helpers ──────────────────────────────────────────────────────────────────

function num(value: string | undefined, fallback = 0): number {
  if (value === undefined || value === '' || value === 'NA') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Minutes that `tz` is offset from UTC at the given instant. */
function tzOffsetMinutes(at: Date, tz: string): number {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const parts: Record<string, string> = {};
  for (const p of fmt.formatToParts(at)) parts[p.type] = p.value;
  const asUtc = Date.UTC(
    Number(parts.year), Number(parts.month) - 1, Number(parts.day),
    Number(parts.hour) % 24, Number(parts.minute), Number(parts.second),
  );
  return (asUtc - at.getTime()) / 60000;
}

/**
 * nflverse quotes kickoff in US Eastern wall-clock time. Resolve it to a real
 * UTC instant so the page can render it in whatever zone the reader is in —
 * this has to respect the EDT/EST changeover that lands mid-season.
 */
function easternToUtcIso(gameday: string, gametime: string): string | null {
  if (!gameday || !gametime) return null;
  const naive = new Date(`${gameday}T${gametime}:00Z`);
  if (Number.isNaN(naive.getTime())) return null;
  const offset = tzOffsetMinutes(naive, 'America/New_York');
  return new Date(naive.getTime() - offset * 60000).toISOString();
}

// ── build ────────────────────────────────────────────────────────────────────

interface QbState {
  rating: number;
  starts: number;
  lastValue: number | null;
  lastSeason: number;
  name: string;
  team: string;
}

async function main() {
  console.log('Fetching schedules…');
  const games = parseCsv(await fetchText(GAMES_URL))
    .filter((g) => resolveTeam(g.home_team) && resolveTeam(g.away_team));

  const seasons = games.map((g) => num(g.season));
  const currentSeason = Math.max(...seasons);
  console.log(`  ${games.length} games, through season ${currentSeason}`);

  console.log('Fetching quarterback box scores…');
  // (game_id, player_id) -> VALUE for that start
  const qbBox = new Map<string, number>();
  for (let season = QB_HISTORY_FROM; season <= currentSeason; season++) {
    const text = await fetchOptional(STATS_URL(season));
    if (text === null) { console.log(`  ${season}: not published yet, skipping`); continue; }
    let kept = 0;
    for (const r of parseCsv(text)) {
      if (r.position !== 'QB') continue;
      qbBox.set(`${r.game_id}|${r.player_id}`, qbValue({
        completions: num(r.completions),
        attempts: num(r.attempts),
        passingYards: num(r.passing_yards),
        passingTds: num(r.passing_tds),
        interceptions: num(r.passing_interceptions),
        sacks: num(r.sacks_suffered),
        carries: num(r.carries),
        rushingYards: num(r.rushing_yards),
        rushingTds: num(r.rushing_tds),
      }));
      kept++;
    }
    console.log(`  ${season}: ${kept} quarterback games`);
  }

  console.log('Fetching depth charts for projected starters…');
  // The file is written newest-snapshot-first, so the head of it is enough.
  const projectedStarter = new Map<string, { id: string; name: string }>();
  const depthText = await fetchOptional(DEPTH_URL(currentSeason));
  if (depthText) {
    const rows = parseCsv(depthText, true);
    const newest = rows.length > 0 ? rows[0].dt : '';
    for (const r of rows) {
      if (r.dt !== newest) break;
      if (r.pos_abb !== 'QB' || r.pos_rank !== '1') continue;
      const team = resolveTeam(r.team);
      if (team && !projectedStarter.has(team.abbr)) {
        projectedStarter.set(team.abbr, { id: r.gsis_id, name: r.player_name });
      }
    }
    console.log(`  ${projectedStarter.size} starters projected from ${newest}`);
  }

  // Chronological order is what makes a running rating meaningful.
  games.sort((a, b) => {
    const key = (g: Row) => `${g.gameday}T${g.gametime || '00:00'}|${g.game_id}`;
    return key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0;
  });

  const elo = new Map<string, number>();
  const seasonOf = new Map<string, number>();
  const preseasonElo = new Map<string, number>();
  const record = new Map<string, { w: number; l: number; t: number }>();
  /** Current season only: team -> week -> rating after that week's game. */
  const weekElo = new Map<string, Map<number, number>>();
  const qbs = new Map<string, QbState>();
  const teamQbBaseline = new Map<string, number>();
  const defenseAllowed = new Map<string, number>();
  /** Most recent announced starter per team, used when no depth chart exists. */
  const lastStarter = new Map<string, string>();

  const projections: GameProjection[] = [];
  let logLoss = 0, brier = 0, evaluated = 0;
  let baseLogLoss = 0, baseBrier = 0;

  const getQb = (id: string, name: string, team: string): QbState => {
    let q = qbs.get(id);
    if (!q) {
      q = { rating: LEAGUE_AVG_QB_VALUE, starts: 0, lastValue: null, lastSeason: 0, name, team };
      qbs.set(id, q);
    }
    if (name) q.name = name;
    if (team) q.team = team;
    return q;
  };

  let loopSeason = 0;
  for (const g of games) {
    const season = num(g.season);

    // Season boundary: regress the quarterback and defense ratings once, the
    // same way team ratings revert. Quarterback play is stickier year to year
    // than team strength, so it pulls back a quarter of the way rather than a
    // third.
    if (season !== loopSeason) {
      if (loopSeason !== 0) {
        for (const q of qbs.values()) q.rating = revertQb(q.rating);
        for (const [t, v] of teamQbBaseline) teamQbBaseline.set(t, revertQb(v));
        for (const [t, v] of defenseAllowed) defenseAllowed.set(t, revertQb(v));
      }
      loopSeason = season;
    }

    const home = resolveTeam(g.home_team)!.abbr;
    const away = resolveTeam(g.away_team)!.abbr;
    const played = g.result !== '' && g.result !== 'NA' && g.home_score !== '' && g.away_score !== '';

    for (const t of [home, away]) {
      if (!elo.has(t)) elo.set(t, 1500.0);
      if (!teamQbBaseline.has(t)) teamQbBaseline.set(t, LEAGUE_AVG_QB_VALUE);
      if (!defenseAllowed.has(t)) defenseAllowed.set(t, LEAGUE_AVG_QB_VALUE);
      const prev = seasonOf.get(t);
      if (prev !== undefined && prev !== season) {
        elo.set(t, revertTeam(elo.get(t)!));
        record.set(t, { w: 0, l: 0, t: 0 });
      }
      if (prev !== season) preseasonElo.set(t, elo.get(t)!);
      seasonOf.set(t, season);
      if (!record.has(t)) record.set(t, { w: 0, l: 0, t: 0 });
    }


    // Who is under center. Announced for played games; projected otherwise.
    let homeQbId = g.home_qb_id || '';
    let awayQbId = g.away_qb_id || '';
    let homeQbName = g.home_qb_name || '';
    let awayQbName = g.away_qb_name || '';
    let projected = false;
    if (!homeQbId) {
      const p = projectedStarter.get(home);
      if (p) { homeQbId = p.id; homeQbName = p.name; projected = true; }
      else if (lastStarter.get(home)) {
        homeQbId = lastStarter.get(home)!;
        homeQbName = qbs.get(homeQbId)?.name ?? '';
        projected = true;
      }
    }
    if (!awayQbId) {
      const p = projectedStarter.get(away);
      if (p) { awayQbId = p.id; awayQbName = p.name; projected = true; }
      else if (lastStarter.get(away)) {
        awayQbId = lastStarter.get(away)!;
        awayQbName = qbs.get(awayQbId)?.name ?? '';
        projected = true;
      }
    }

    const homeQbAdj = homeQbId
      ? qbAdjustment(getQb(homeQbId, homeQbName, home).rating, teamQbBaseline.get(home)!)
      : 0;
    const awayQbAdj = awayQbId
      ? qbAdjustment(getQb(awayQbId, awayQbName, away).rating, teamQbBaseline.get(away)!)
      : 0;

    const neutralSite = g.location === 'Neutral';
    const playoff = g.game_type !== 'REG';
    const homeElo = elo.get(home)!;
    const awayElo = elo.get(away)!;

    const diff = matchupEloDiff({
      homeElo, awayElo,
      homeQbAdjustment: homeQbAdj,
      awayQbAdjustment: awayQbAdj,
      homeRestDays: num(g.home_rest, 7),
      awayRestDays: num(g.away_rest, 7),
      neutralSite, playoff,
    });
    const homeWinProb = winProbability(diff);

    if (season === currentSeason) {
      projections.push({
        gameId: g.game_id,
        season,
        week: num(g.week),
        kickoff: easternToUtcIso(g.gameday, g.gametime),
        gameday: g.gameday,
        gameType: g.game_type,
        away, home,
        awayElo: Math.round(awayElo * 10) / 10,
        homeElo: Math.round(homeElo * 10) / 10,
        homeWinProb: Math.round(homeWinProb * 10000) / 10000,
        spread: Math.round(expectedSpread(diff) * 10) / 10,
        awayQb: awayQbName || null,
        homeQb: homeQbName || null,
        awayQbAdj: Math.round(awayQbAdj),
        homeQbAdj: Math.round(homeQbAdj),
        awayScore: played ? num(g.away_score) : null,
        homeScore: played ? num(g.home_score) : null,
        neutralSite,
        stadium: g.stadium || null,
        projectedStarters: projected,
      });
    }

    if (!played) continue;

    const homeScore = num(g.home_score);
    const awayScore = num(g.away_score);
    const homeResult = homeScore > awayScore ? 1.0 : homeScore < awayScore ? 0.0 : 0.5;

    if (season >= EVAL_FROM && !playoff) {
      const p = Math.min(Math.max(homeWinProb, 1e-9), 1 - 1e-9);
      logLoss += -(homeResult * Math.log(p) + (1 - homeResult) * Math.log(1 - p));
      brier += (homeWinProb - homeResult) ** 2;
      // 538's published defaults, same ratings, for a like-for-like comparison.
      const baseDiff = homeElo - awayElo + (neutralSite ? 0 : 65);
      const bp = Math.min(Math.max(winProbability(baseDiff), 1e-9), 1 - 1e-9);
      baseLogLoss += -(homeResult * Math.log(bp) + (1 - homeResult) * Math.log(1 - bp));
      baseBrier += (winProbability(baseDiff) - homeResult) ** 2;
      evaluated++;
    }

    const rec = (t: string) => record.get(t)!;
    if (homeResult === 1) { rec(home).w++; rec(away).l++; }
    else if (homeResult === 0) { rec(away).w++; rec(home).l++; }
    else { rec(home).t++; rec(away).t++; }

    const shift = ratingShift(diff, homeWinProb, homeResult, homeScore - awayScore);
    elo.set(home, homeElo + shift);
    elo.set(away, awayElo - shift);
    if (season === currentSeason) {
      for (const t of [home, away]) {
        if (!weekElo.has(t)) weekElo.set(t, new Map());
        weekElo.get(t)!.set(num(g.week), elo.get(t)!);
      }
    }

    // Rolling quarterback and defense updates, each adjusted for the other.
    for (const [pid, team, opp] of [[homeQbId, home, away], [awayQbId, away, home]] as const) {
      if (!pid) continue;
      const raw = qbBox.get(`${g.game_id}|${pid}`);
      if (raw === undefined) continue;
      const q = getQb(pid, '', team);
      const defense = defenseAllowed.get(opp)!;
      const adjusted = raw - (defense - LEAGUE_AVG_QB_VALUE);
      q.rating = rollingUpdate(q.rating, adjusted);
      q.starts++;
      q.lastValue = raw;
      q.lastSeason = season;
      q.team = team;
      teamQbBaseline.set(team, rollingUpdate(teamQbBaseline.get(team)!, adjusted));
      defenseAllowed.set(opp, rollingUpdate(defense, raw - (q.rating - LEAGUE_AVG_QB_VALUE)));
      lastStarter.set(team, pid);
    }
  }

  // ── assemble output ────────────────────────────────────────────────────────
  const playedThisSeason = projections.filter((p) => p.homeScore !== null);
  const throughWeek = playedThisSeason.length
    ? Math.max(...playedThisSeason.map((p) => p.week))
    : 0;

  console.log(`\nSimulating the rest of the season ${SIMULATIONS.toLocaleString()} times…`);
  const outlook = simulateSeason(projections, SIMULATIONS, currentSeason);

  const round1 = (x: number) => Math.round(x * 10) / 10;
  const teams: TeamRating[] = TEAMS.map((t) => {
    const r = record.get(t.abbr) ?? { w: 0, l: 0, t: 0 };
    const preseason = preseasonElo.get(t.abbr) ?? LEAGUE_MEAN;
    // A bye week, or a game not yet final, carries the previous week forward.
    const history = [round1(preseason)];
    for (let week = 1; week <= throughWeek; week++) {
      const after = weekElo.get(t.abbr)?.get(week);
      history.push(after === undefined ? history[week - 1] : round1(after));
    }
    const o = outlook.get(t.abbr);
    return {
      team: t.abbr,
      elo: round1(elo.get(t.abbr) ?? LEAGUE_MEAN),
      eloPreseason: round1(preseason),
      wins: r.w, losses: r.l, ties: r.t,
      rank: 0,
      history,
      expectedWins: o?.expectedWins ?? 0,
      playoffOdds: o?.playoffOdds ?? 0,
      divisionOdds: o?.divisionOdds ?? 0,
      seedOdds: o?.seedOdds ?? [],
    };
  });
  teams.sort((a, b) => b.elo - a.elo);
  teams.forEach((t, i) => { t.rank = i + 1; });

  // Rank the quarterbacks currently sitting atop a depth chart, plus anyone
  // else who has started in the current season.
  const relevant = new Set<string>();
  for (const p of projectedStarter.values()) relevant.add(p.id);
  for (const [id, q] of qbs) {
    if (q.lastSeason === currentSeason) relevant.add(id);
  }
  const quarterbacks: QbRating[] = [...relevant]
    .map((id) => {
      const q = qbs.get(id);
      const projectedFor = [...projectedStarter.entries()].find(([, p]) => p.id === id);
      const name = q?.name || projectedFor?.[1].name || 'Unknown';
      const team = projectedFor?.[0] ?? q?.team ?? '';
      const rating = q?.rating ?? LEAGUE_AVG_QB_VALUE;
      const baseline = teamQbBaseline.get(team) ?? LEAGUE_AVG_QB_VALUE;
      return {
        playerId: id,
        name,
        team,
        rating: Math.round(rating * 10) / 10,
        eloVsAverage: Math.round(QB_VALUE_TO_ELO * (rating - LEAGUE_AVG_QB_VALUE)),
        eloVsTeam: Math.round(qbAdjustment(rating, baseline)),
        starts: q?.starts ?? 0,
        lastValue: q?.lastValue === null || q?.lastValue === undefined
          ? null : Math.round(q.lastValue * 10) / 10,
        rank: 0,
      };
    })
    .filter((q) => q.team !== '')
    .sort((a, b) => b.rating - a.rating);
  quarterbacks.forEach((q, i) => { q.rank = i + 1; });

  const out: EloSeason = {
    generatedAt: new Date().toISOString(),
    season: currentSeason,
    throughSeason: currentSeason,
    throughWeek,
    teams,
    games: projections,
    quarterbacks,
    simulations: SIMULATIONS,
    calibration: {
      logLoss: Math.round((logLoss / evaluated) * 100000) / 100000,
      brierScore: Math.round((brier / evaluated) * 100000) / 100000,
      baselineLogLoss: Math.round((baseLogLoss / evaluated) * 100000) / 100000,
      baselineBrierScore: Math.round((baseBrier / evaluated) * 100000) / 100000,
      evaluatedGames: evaluated,
    },
  };

  const here = dirname(fileURLToPath(import.meta.url));
  const target = join(here, '..', 'public', 'data', 'nfl-elo', 'season.json');
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, JSON.stringify(out));

  console.log(`\nWrote ${target}`);
  console.log(`  season ${currentSeason}, through week ${throughWeek}`);
  console.log(`  ${projections.length} games, ${quarterbacks.length} quarterbacks`);
  console.log(`  log loss  ${out.calibration.logLoss} (538 defaults: ${out.calibration.baselineLogLoss})`);
  console.log(`  Brier     ${out.calibration.brierScore} (538 defaults: ${out.calibration.baselineBrierScore})`);
  console.log('\n  Top 5:');
  for (const t of teams.slice(0, 5)) {
    console.log(`    ${t.rank}. ${t.team}  ${t.elo}  ${t.expectedWins} wins, ${(t.playoffOdds * 100).toFixed(0)}% playoffs`);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });

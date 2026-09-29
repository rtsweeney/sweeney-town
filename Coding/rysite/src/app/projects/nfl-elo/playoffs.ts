// ── NFL Elo — season simulation ──────────────────────────────────────────────
// Plays the rest of the regular season out thousands of times to turn ratings
// into standings: expected wins, division titles and playoff seeds.
//
// Simulations run "hot", as 538's did: a simulated result moves both teams'
// ratings before their next simulated game, so a team that gets hot in one
// simulated season stays favoured in it. Holding ratings fixed would treat
// every week as independent and make the odds overconfident.
//
// Seeding follows the NFL's procedure — four division winners, then three wild
// cards drawn one division at a time — with a trimmed set of tiebreakers:
// head-to-head (when every tied team has met), division record (within a
// division), conference record, strength of victory, strength of schedule,
// then a coin flip. Common games and the points-based steps are skipped; they
// decide very few real ties and would need simulated scores.

import { ratingShift, winProbability, type GameProjection } from './engine.ts';
import { TEAMS } from './teams.ts';

/** Enough runs that a team's odds settle to within about half a point. */
export const SIMULATIONS = 20_000;

/** Seeds per conference since 2020: four division winners, three wild cards. */
export const PLAYOFF_SEEDS = 7;

/**
 * Margin fed to the rating update after a simulated game — roughly the median
 * NFL result. Only its log enters the update, so the exact choice matters
 * little.
 */
const SIM_MARGIN = 7;

export interface TeamOutlook {
  /** Mean regular-season wins, played games included; a tie counts half. */
  expectedWins: number;
  playoffOdds: number;
  divisionOdds: number;
  /** Chance of finishing as each seed, index 0 being the 1 seed. */
  seedOdds: number[];
}

/** Small seedable PRNG, so a rebuild with no new results reproduces the odds. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Records as win points (a tie is half) over games, plus the head-to-head grid. */
interface Standings {
  won: Float64Array;
  games: Float64Array;
  divWon: Float64Array;
  divGames: Float64Array;
  confWon: Float64Array;
  confGames: Float64Array;
  /** pts[i * N + j]: points team i took from team j. */
  pts: Float64Array;
  /** met[i * N + j]: games between i and j. */
  met: Float64Array;
}

function emptyStandings(n: number): Standings {
  return {
    won: new Float64Array(n), games: new Float64Array(n),
    divWon: new Float64Array(n), divGames: new Float64Array(n),
    confWon: new Float64Array(n), confGames: new Float64Array(n),
    pts: new Float64Array(n * n), met: new Float64Array(n * n),
  };
}

function copyStandings(from: Standings, to: Standings): void {
  to.won.set(from.won); to.games.set(from.games);
  to.divWon.set(from.divWon); to.divGames.set(from.divGames);
  to.confWon.set(from.confWon); to.confGames.set(from.confGames);
  to.pts.set(from.pts); to.met.set(from.met);
}

const pct = (won: number, games: number) => (games > 0 ? won / games : 0);
const EPS = 1e-9;

/**
 * Simulate the remaining regular season and summarise each team's outlook.
 * `games` is one season's schedule; played games carry scores, the rest carry
 * the model's pre-game home win probability.
 */
export function simulateSeason(
  games: GameProjection[],
  sims = SIMULATIONS,
  seed = 1,
): Map<string, TeamOutlook> {
  const N = TEAMS.length;
  const index = new Map(TEAMS.map((t, i) => [t.abbr, i]));
  const divisionOf = TEAMS.map((t) => `${t.conference} ${t.division}`);
  const conferenceOf = TEAMS.map((t) => t.conference);

  const record = (s: Standings, h: number, a: number, homeResult: number) => {
    s.won[h] += homeResult; s.won[a] += 1 - homeResult;
    s.games[h]++; s.games[a]++;
    if (divisionOf[h] === divisionOf[a]) {
      s.divWon[h] += homeResult; s.divWon[a] += 1 - homeResult;
      s.divGames[h]++; s.divGames[a]++;
    }
    if (conferenceOf[h] === conferenceOf[a]) {
      s.confWon[h] += homeResult; s.confWon[a] += 1 - homeResult;
      s.confGames[h]++; s.confGames[a]++;
    }
    s.pts[h * N + a] += homeResult; s.pts[a * N + h] += 1 - homeResult;
    s.met[h * N + a]++; s.met[a * N + h]++;
  };

  // ── fold in what has already happened ──────────────────────────────────────
  const base = emptyStandings(N);
  const opponents: number[][] = TEAMS.map(() => []);
  const remaining: { h: number; a: number; diff: number; at: string }[] = [];
  for (const g of games) {
    if (g.gameType !== 'REG') continue;
    const h = index.get(g.home);
    const a = index.get(g.away);
    if (h === undefined || a === undefined) continue;
    opponents[h].push(a);
    opponents[a].push(h);
    if (g.homeScore !== null && g.awayScore !== null) {
      record(base, h, a, g.homeScore > g.awayScore ? 1 : g.homeScore < g.awayScore ? 0 : 0.5);
    } else {
      // Recover the full pre-game rating gap — home field, rest and QB already
      // in it — from the published probability, so the hot update can shift it.
      const p = Math.min(Math.max(g.homeWinProb, 1e-6), 1 - 1e-6);
      remaining.push({ h, a, diff: 400 * Math.log10(p / (1 - p)), at: g.kickoff ?? g.gameday });
    }
  }
  remaining.sort((x, y) => (x.at < y.at ? -1 : x.at > y.at ? 1 : 0));

  const divisions = new Map<string, number[]>();
  TEAMS.forEach((_, i) => {
    if (!divisions.has(divisionOf[i])) divisions.set(divisionOf[i], []);
    divisions.get(divisionOf[i])!.push(i);
  });
  const conferences = (['AFC', 'NFC'] as const).map((conf) =>
    [...divisions.entries()].filter(([key]) => key.startsWith(conf)).map(([, teams]) => teams));

  const rng = mulberry32(seed);
  const s = emptyStandings(N);
  const delta = new Float64Array(N);

  // ── tiebreakers ────────────────────────────────────────────────────────────
  const overall = (t: number) => pct(s.won[t], s.games[t]);
  const headToHead = (t: number, group: number[]) => {
    let p = 0, g = 0;
    for (const o of group) if (o !== t) { p += s.pts[t * N + o]; g += s.met[t * N + o]; }
    return pct(p, g);
  };
  const everyoneMet = (group: number[]) =>
    group.every((t) => group.every((o) => o === t || s.met[t * N + o] > 0));
  const divisionRecord = (t: number) => pct(s.divWon[t], s.divGames[t]);
  const conferenceRecord = (t: number) => pct(s.confWon[t], s.confGames[t]);
  const strengthOfVictory = (t: number) => {
    let w = 0, g = 0;
    for (let o = 0; o < N; o++) {
      const beat = s.pts[t * N + o];
      if (beat > 0) { w += beat * s.won[o]; g += beat * s.games[o]; }
    }
    return pct(w, g);
  };
  const strengthOfSchedule = (t: number) => {
    let w = 0, g = 0;
    for (const o of opponents[t]) { w += s.won[o]; g += s.games[o]; }
    return pct(w, g);
  };

  /** The one team that wins a tie on record. */
  const pickBest = (group: number[], sameDivision: boolean): number => {
    const steps: ((t: number, group: number[]) => number)[] = [];
    if (sameDivision || everyoneMet(group)) steps.push(headToHead);
    if (sameDivision) steps.push(divisionRecord);
    steps.push(conferenceRecord, strengthOfVictory, strengthOfSchedule);
    for (const step of steps) {
      const scores = group.map((t) => step(t, group));
      const top = Math.max(...scores);
      const survivors = group.filter((_, i) => scores[i] > top - EPS);
      if (survivors.length === 1) return survivors[0];
      // Once a step trims a three-way tie, the NFL starts over with who is left.
      if (survivors.length < group.length) return pickBest(survivors, sameDivision);
    }
    return group[Math.floor(rng() * group.length)];
  };

  /** Teams best-first by record, each tie broken one team at a time. */
  const order = (teams: number[], sameDivision: boolean): number[] => {
    const sorted = [...teams].sort((x, y) => overall(y) - overall(x));
    const out: number[] = [];
    for (let i = 0; i < sorted.length;) {
      let j = i + 1;
      while (j < sorted.length && Math.abs(overall(sorted[j]) - overall(sorted[i])) < EPS) j++;
      let tied = sorted.slice(i, j);
      while (tied.length > 1) {
        const best = pickBest(tied, sameDivision);
        out.push(best);
        tied = tied.filter((t) => t !== best);
      }
      out.push(...tied);
      i = j;
    }
    return out;
  };

  // ── run ────────────────────────────────────────────────────────────────────
  const wonSum = new Float64Array(N);
  const divisionTitles = new Float64Array(N);
  const seedCounts = new Float64Array(N * PLAYOFF_SEEDS);

  for (let run = 0; run < sims; run++) {
    copyStandings(base, s);
    delta.fill(0);

    for (const g of remaining) {
      const diff = g.diff + delta[g.h] - delta[g.a];
      const p = winProbability(diff);
      const homeResult = rng() < p ? 1 : 0;
      record(s, g.h, g.a, homeResult);
      const shift = ratingShift(diff, p, homeResult, SIM_MARGIN);
      delta[g.h] += shift;
      delta[g.a] -= shift;
    }

    for (let t = 0; t < N; t++) wonSum[t] += s.won[t];

    for (const conferenceDivisions of conferences) {
      const standings = conferenceDivisions.map((teams) => order(teams, true));
      const seeds = order(standings.map((d) => d[0]), false);
      // Wild cards: only each division's best remaining team is in the running
      // for the next spot; whoever takes it lets a division-mate step up.
      const queues = standings.map((d) => d.slice(1));
      while (seeds.length < PLAYOFF_SEEDS) {
        const best = order(queues.filter((q) => q.length > 0).map((q) => q[0]), false)[0];
        seeds.push(best);
        queues.find((q) => q[0] === best)!.shift();
      }
      seeds.forEach((t, i) => {
        seedCounts[t * PLAYOFF_SEEDS + i]++;
        if (i < 4) divisionTitles[t]++;
      });
    }
  }

  const round = (x: number, places: number) => Math.round(x * 10 ** places) / 10 ** places;
  const out = new Map<string, TeamOutlook>();
  TEAMS.forEach((team, t) => {
    const seedOdds = Array.from({ length: PLAYOFF_SEEDS }, (_, i) => seedCounts[t * PLAYOFF_SEEDS + i] / sims);
    out.set(team.abbr, {
      expectedWins: round(wonSum[t] / sims, 2),
      playoffOdds: round(seedOdds.reduce((a, b) => a + b, 0), 4),
      divisionOdds: round(divisionTitles[t] / sims, 4),
      seedOdds: seedOdds.map((p) => round(p, 4)),
    });
  });
  return out;
}

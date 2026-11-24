// Data layer for the World Cup 2026 tracker.
// Pulls everything from ESPN's public scoreboard API (no key required, CORS-enabled)
// and reshapes it into rounds, a radial bracket tree, and a top-scorers table.

export const TOURNAMENT_START = '20260611';
export const TOURNAMENT_END = '20260719';

export const SCOREBOARD_URL =
  `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${TOURNAMENT_START}-${TOURNAMENT_END}&limit=400`;

export type RoundKey = 'group' | 'r32' | 'r16' | 'qf' | 'sf' | 'bronze' | 'final';

export const ROUND_LABELS: Record<RoundKey, string> = {
  group: 'Group Stage',
  r32: 'Round of 32',
  r16: 'Round of 16',
  qf: 'Quarterfinals',
  sf: 'Semifinals',
  bronze: 'Third Place',
  final: 'Final',
};

export interface TeamInfo {
  id: string;
  name: string;
  abbrev: string;
  logo: string;
  decided: boolean;
}

export interface GoalEvent {
  scorer: string;
  minute: string;
  teamId: string;
  penalty: boolean;
  ownGoal: boolean;
}

export interface MatchOdds {
  details: string;
  overUnder: number | null;
  homeMoneyLine: number | null;
  awayMoneyLine: number | null;
  drawMoneyLine: number | null;
  provider: string;
}

export interface Match {
  id: string;
  date: Date;
  round: RoundKey;
  state: 'pre' | 'in' | 'post';
  statusDetail: string;
  clock: string;
  home: TeamInfo;
  away: TeamInfo;
  homeScore: number | null;
  awayScore: number | null;
  homeShootout: number | null;
  awayShootout: number | null;
  winnerId: string | null;
  venue: string;
  city: string;
  goals: GoalEvent[];
  odds: MatchOdds | null;
  broadcasts: string[];
}

export interface Scorer {
  name: string;
  teamId: string;
  teamAbbrev: string;
  teamLogo: string;
  goals: number;
  penalties: number;
  alive: boolean;
}

export interface BracketNode {
  match: Match | null;
  round: RoundKey;
  children: (BracketNode | null)[];
  // Filled in by layoutBracket:
  angle: number;
  x: number;
  y: number;
}

const TBD = (label: string): TeamInfo => ({
  id: '',
  name: label,
  abbrev: 'TBD',
  logo: '',
  decided: false,
});

/* eslint-disable @typescript-eslint/no-explicit-any */

function parseTeam(competitor: any): TeamInfo {
  const team = competitor?.team ?? {};
  const name: string = team.shortDisplayName || team.displayName || team.name || 'TBD';
  const abbrev: string = team.abbreviation || 'TBD';
  const decided = Boolean(team.id) && abbrev !== 'TBD' && !/^tbd$/i.test(name);
  return {
    id: decided ? String(team.id) : '',
    name,
    abbrev,
    logo: team.logo || (team.flag && team.flag.href) || '',
    decided,
  };
}

function parseScore(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

// ET calendar date string (YYYY-MM-DD) for bucketing matches into rounds and "today".
const etDateFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/New_York',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function etDateString(d: Date): string {
  return etDateFmt.format(d);
}

// FIFA 2026 knockout schedule with rest days folded into each window so a
// day of drift doesn't misclassify anything.
function classifyRound(d: Date): RoundKey {
  const s = etDateString(d);
  if (s < '2026-06-28') return 'group';
  if (s <= '2026-07-03') return 'r32';
  if (s <= '2026-07-08') return 'r16';
  if (s <= '2026-07-13') return 'qf';
  if (s <= '2026-07-16') return 'sf';
  if (s <= '2026-07-18') return 'bronze';
  return 'final';
}

export function parseScoreboard(data: any): Match[] {
  const events: any[] = Array.isArray(data?.events) ? data.events : [];
  const matches: Match[] = [];

  for (const event of events) {
    const comp = event?.competitions?.[0];
    if (!comp) continue;

    const competitors: any[] = Array.isArray(comp.competitors) ? comp.competitors : [];
    const homeC = competitors.find((c) => c?.homeAway === 'home') ?? competitors[0];
    const awayC = competitors.find((c) => c?.homeAway === 'away') ?? competitors[1];
    if (!homeC && !awayC) continue;

    const home = homeC ? parseTeam(homeC) : TBD('TBD');
    const away = awayC ? parseTeam(awayC) : TBD('TBD');

    const statusType = event?.status?.type ?? comp?.status?.type ?? {};
    const state: Match['state'] =
      statusType.state === 'in' ? 'in' : statusType.state === 'post' ? 'post' : 'pre';

    let winnerId: string | null = null;
    if (homeC?.winner) winnerId = home.id;
    else if (awayC?.winner) winnerId = away.id;

    const goals: GoalEvent[] = [];
    const details: any[] = Array.isArray(comp.details) ? comp.details : [];
    for (const play of details) {
      const typeText: string = play?.type?.text ?? '';
      const isGoal =
        play?.scoringPlay === true ||
        /goal/i.test(typeText) ||
        /penalty - scored/i.test(typeText);
      if (!isGoal) continue;
      if (play?.shootout === true) continue; // shootout kicks aren't goals
      const ownGoal = play?.ownGoal === true || /own goal/i.test(typeText);
      const penalty = play?.penaltyKick === true || /penalty/i.test(typeText);
      goals.push({
        scorer:
          play?.athletesInvolved?.[0]?.shortName ||
          play?.athletesInvolved?.[0]?.displayName ||
          'Unknown',
        minute: play?.clock?.displayValue ?? '',
        teamId: play?.team?.id ? String(play.team.id) : '',
        penalty,
        ownGoal,
      });
    }

    let odds: MatchOdds | null = null;
    const rawOdds = comp?.odds?.[0];
    if (rawOdds) {
      odds = {
        details: rawOdds.details ?? '',
        overUnder: typeof rawOdds.overUnder === 'number' ? rawOdds.overUnder : null,
        homeMoneyLine: parseScore(rawOdds.homeTeamOdds?.moneyLine),
        awayMoneyLine: parseScore(rawOdds.awayTeamOdds?.moneyLine),
        drawMoneyLine: parseScore(rawOdds.drawOdds?.moneyLine),
        provider: rawOdds.provider?.name ?? '',
      };
    }

    const broadcasts: string[] = [];
    for (const b of Array.isArray(comp.broadcasts) ? comp.broadcasts : []) {
      for (const n of Array.isArray(b?.names) ? b.names : []) {
        if (n && !broadcasts.includes(n)) broadcasts.push(n);
      }
    }

    const date = new Date(event?.date ?? comp?.date ?? 0);

    matches.push({
      id: String(event?.id ?? comp?.id ?? matches.length),
      date,
      round: classifyRound(date),
      state,
      statusDetail: statusType.shortDetail || statusType.detail || '',
      clock: event?.status?.displayClock ?? '',
      home,
      away,
      homeScore: parseScore(homeC?.score),
      awayScore: parseScore(awayC?.score),
      homeShootout: parseScore(homeC?.shootoutScore),
      awayShootout: parseScore(awayC?.shootoutScore),
      winnerId,
      venue: comp?.venue?.fullName ?? '',
      city: [comp?.venue?.address?.city, comp?.venue?.address?.state || comp?.venue?.address?.country]
        .filter(Boolean)
        .join(', '),
      goals,
      odds,
      broadcasts,
    });
  }

  matches.sort((a, b) => a.date.getTime() - b.date.getTime());
  return matches;
}

/* eslint-enable @typescript-eslint/no-explicit-any */

// Winner of a completed match, resolving from scores/shootout when the
// feed doesn't set the winner flag.
export function matchWinnerId(m: Match): string | null {
  if (m.winnerId) return m.winnerId;
  if (m.state !== 'post' || m.homeScore === null || m.awayScore === null) return null;
  if (m.homeScore !== m.awayScore) return m.homeScore > m.awayScore ? m.home.id : m.away.id;
  if (m.homeShootout !== null && m.awayShootout !== null && m.homeShootout !== m.awayShootout) {
    return m.homeShootout > m.awayShootout ? m.home.id : m.away.id;
  }
  return null;
}

// Teams still alive in the tournament: everyone booked into the knockout
// bracket minus losers of completed knockout matches. Before the bracket is
// set, everyone is considered alive.
export function aliveTeamIds(matches: Match[]): Set<string> | null {
  const knockout = matches.filter((m) => m.round !== 'group' && m.round !== 'bronze');
  const booked = new Set<string>();
  for (const m of knockout) {
    if (m.home.decided) booked.add(m.home.id);
    if (m.away.decided) booked.add(m.away.id);
  }
  if (booked.size === 0) return null; // group stage still running — no eliminations knowable

  for (const m of knockout) {
    const winner = matchWinnerId(m);
    if (!winner) continue;
    const loser = winner === m.home.id ? m.away.id : m.home.id;
    if (loser) booked.delete(loser);
  }
  return booked;
}

export function topScorers(matches: Match[], limit: number): Scorer[] {
  const alive = aliveTeamIds(matches);
  const teams = new Map<string, TeamInfo>();
  for (const m of matches) {
    if (m.home.decided) teams.set(m.home.id, m.home);
    if (m.away.decided) teams.set(m.away.id, m.away);
  }

  const byPlayer = new Map<string, Scorer>();
  for (const m of matches) {
    for (const g of m.goals) {
      if (g.ownGoal || g.scorer === 'Unknown') continue;
      const key = `${g.teamId}|${g.scorer}`;
      let s = byPlayer.get(key);
      if (!s) {
        const team = teams.get(g.teamId);
        s = {
          name: g.scorer,
          teamId: g.teamId,
          teamAbbrev: team?.abbrev ?? '',
          teamLogo: team?.logo ?? '',
          goals: 0,
          penalties: 0,
          alive: alive === null || alive.has(g.teamId),
        };
        byPlayer.set(key, s);
      }
      s.goals += 1;
      if (g.penalty) s.penalties += 1;
    }
  }

  return Array.from(byPlayer.values())
    .sort((a, b) => b.goals - a.goals || a.penalties - b.penalties || a.name.localeCompare(b.name))
    .slice(0, limit);
}

// ---------------------------------------------------------------------------
// Radial bracket layout
// ---------------------------------------------------------------------------

const KNOCKOUT_ROUNDS: RoundKey[] = ['r32', 'r16', 'qf', 'sf', 'final'];
const ROUND_SIZES: Record<string, number> = { r32: 16, r16: 8, qf: 4, sf: 2, final: 1 };
export const ROUND_RADII: Record<string, number> = { r32: 432, r16: 328, qf: 228, sf: 128, final: 0 };

// Builds the knockout tree from the final backwards, one round at a time.
// Within each level, EVERY slot whose team is already decided is linked to
// its true feeder match by team identity first (a team in this round came
// from exactly one match of the previous round); only the slots that are
// genuinely unknowable yet (TBD teams) are then filled with the remaining
// matches in kickoff order so the wheel stays full. Doing all identity links
// before any filling is what keeps completed matches wired to the correct
// next-round matchups.
export function buildBracket(matches: Match[]): BracketNode {
  const byRound = new Map<RoundKey, Match[]>();
  for (const r of KNOCKOUT_ROUNDS) byRound.set(r, []);
  for (const m of matches) {
    if (byRound.has(m.round)) byRound.get(m.round)!.push(m);
  }

  const mkNode = (round: RoundKey, match: Match | null): BracketNode => ({
    match,
    round,
    children: [],
    angle: 0,
    x: 0,
    y: 0,
  });

  const finalMatch = (byRound.get('final') ?? [])[0] ?? null;
  const root = mkNode('final', finalMatch);

  let level: BracketNode[] = [root];
  for (let idx = KNOCKOUT_ROUNDS.length - 1; idx > 0; idx--) {
    const prev = KNOCKOUT_ROUNDS[idx - 1];
    const pool = byRound.get(prev) ?? []; // already in kickoff order
    const claimed = new Set<string>();

    // Pass 1: resolve every identity-linkable slot across the whole level.
    const slots: (Match | null)[][] = level.map((node) => {
      const out: (Match | null)[] = [null, null];
      const teams = [node.match?.home, node.match?.away];
      for (let i = 0; i < 2; i++) {
        const t = teams[i];
        if (!t?.decided) continue;
        const feeder = pool.find(
          (m) => !claimed.has(m.id) && (m.home.id === t.id || m.away.id === t.id)
        );
        if (feeder) {
          out[i] = feeder;
          claimed.add(feeder.id);
        }
      }
      return out;
    });

    // Pass 2: fill the still-unknown slots with unclaimed matches in order.
    let poolIdx = 0;
    const nextUnclaimed = (): Match | null => {
      while (poolIdx < pool.length && claimed.has(pool[poolIdx].id)) poolIdx++;
      return poolIdx < pool.length ? pool[poolIdx++] : null;
    };

    const nextLevel: BracketNode[] = [];
    level.forEach((node, li) => {
      node.children = slots[li].map((linkedMatch) => {
        const match = linkedMatch ?? nextUnclaimed();
        if (match) claimed.add(match.id);
        return mkNode(prev, match);
      });
      nextLevel.push(...(node.children as BracketNode[]));
    });
    level = nextLevel;
  }

  layoutBracket(root);
  return root;
}

// True once the routing of child → parent is confirmed by team identity:
// one of the parent's decided teams actually came out of the child match.
export function edgeConfirmed(parent: BracketNode, child: BracketNode): boolean {
  if (!parent.match || !child.match) return false;
  const c = child.match;
  return [parent.match.home, parent.match.away].some(
    (t) => t.decided && (c.home.id === t.id || c.away.id === t.id)
  );
}

function layoutBracket(root: BracketNode) {
  // Assign leaf angles by in-order traversal, then set parents to the
  // circular mean of their children so subtrees stay in their own wedge.
  const leafCount = ROUND_SIZES.r32;
  let leafIdx = 0;

  const assign = (node: BracketNode): void => {
    if (!node.children.length || node.children.every((c) => !c)) {
      node.angle = ((leafIdx + 0.5) / leafCount) * Math.PI * 2 - Math.PI / 2;
      leafIdx++;
    } else {
      const kids = node.children.filter(Boolean) as BracketNode[];
      kids.forEach(assign);
      let sx = 0;
      let sy = 0;
      for (const k of kids) {
        sx += Math.cos(k.angle);
        sy += Math.sin(k.angle);
      }
      node.angle = Math.atan2(sy, sx);
    }
    const r = ROUND_RADII[node.round] ?? 0;
    node.x = 500 + r * Math.cos(node.angle);
    node.y = 500 + r * Math.sin(node.angle);
  };

  assign(root);
  // Final sits dead center regardless of angle math.
  root.x = 500;
  root.y = 500;
}

export function flattenBracket(root: BracketNode): BracketNode[] {
  const out: BracketNode[] = [];
  const walk = (n: BracketNode) => {
    out.push(n);
    for (const c of n.children) if (c) walk(c);
  };
  walk(root);
  return out;
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

export function formatKickoffET(d: Date, opts?: { withDate?: boolean }): string {
  const time = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: '2-digit',
  }).format(d);
  if (!opts?.withDate) return `${time} ET`;
  const day = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(d);
  return `${day} · ${time} ET`;
}

export function formatMoneyLine(ml: number | null): string {
  if (ml === null) return '—';
  return ml > 0 ? `+${ml}` : `${ml}`;
}

export function matchScoreLabel(m: Match): string {
  if (m.state === 'pre' || m.homeScore === null || m.awayScore === null) return 'vs';
  let s = `${m.homeScore}–${m.awayScore}`;
  if (m.homeShootout !== null && m.awayShootout !== null) {
    s += ` (${m.homeShootout}–${m.awayShootout} pens)`;
  }
  return s;
}

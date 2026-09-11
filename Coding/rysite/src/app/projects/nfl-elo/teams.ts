// ── NFL team reference ───────────────────────────────────────────────────────
// Abbreviations follow nflverse (note LA = Rams, LAC = Chargers, WAS, LV).
// Names are used nominatively to identify the teams whose games are described.
// No team logos, wordmarks or photography are used anywhere in this project.

export type Conference = 'AFC' | 'NFC';

export interface Team {
  abbr: string;
  location: string;
  nickname: string;
  conference: Conference;
  division: string;
  /** Primary team colour, used only as a chip accent. */
  color: string;
}

export const TEAMS: Team[] = [
  { abbr: 'ARI', location: 'Arizona', nickname: 'Cardinals', conference: 'NFC', division: 'West', color: '#97233F' },
  { abbr: 'ATL', location: 'Atlanta', nickname: 'Falcons', conference: 'NFC', division: 'South', color: '#A71930' },
  { abbr: 'BAL', location: 'Baltimore', nickname: 'Ravens', conference: 'AFC', division: 'North', color: '#241773' },
  { abbr: 'BUF', location: 'Buffalo', nickname: 'Bills', conference: 'AFC', division: 'East', color: '#00338D' },
  { abbr: 'CAR', location: 'Carolina', nickname: 'Panthers', conference: 'NFC', division: 'South', color: '#0085CA' },
  { abbr: 'CHI', location: 'Chicago', nickname: 'Bears', conference: 'NFC', division: 'North', color: '#0B162A' },
  { abbr: 'CIN', location: 'Cincinnati', nickname: 'Bengals', conference: 'AFC', division: 'North', color: '#FB4F14' },
  { abbr: 'CLE', location: 'Cleveland', nickname: 'Browns', conference: 'AFC', division: 'North', color: '#311D00' },
  { abbr: 'DAL', location: 'Dallas', nickname: 'Cowboys', conference: 'NFC', division: 'East', color: '#003594' },
  { abbr: 'DEN', location: 'Denver', nickname: 'Broncos', conference: 'AFC', division: 'West', color: '#FB4F14' },
  { abbr: 'DET', location: 'Detroit', nickname: 'Lions', conference: 'NFC', division: 'North', color: '#0076B6' },
  { abbr: 'GB', location: 'Green Bay', nickname: 'Packers', conference: 'NFC', division: 'North', color: '#203731' },
  { abbr: 'HOU', location: 'Houston', nickname: 'Texans', conference: 'AFC', division: 'South', color: '#03202F' },
  { abbr: 'IND', location: 'Indianapolis', nickname: 'Colts', conference: 'AFC', division: 'South', color: '#002C5F' },
  { abbr: 'JAX', location: 'Jacksonville', nickname: 'Jaguars', conference: 'AFC', division: 'South', color: '#006778' },
  { abbr: 'KC', location: 'Kansas City', nickname: 'Chiefs', conference: 'AFC', division: 'West', color: '#E31837' },
  { abbr: 'LA', location: 'Los Angeles', nickname: 'Rams', conference: 'NFC', division: 'West', color: '#003594' },
  { abbr: 'LAC', location: 'Los Angeles', nickname: 'Chargers', conference: 'AFC', division: 'West', color: '#0080C6' },
  { abbr: 'LV', location: 'Las Vegas', nickname: 'Raiders', conference: 'AFC', division: 'West', color: '#A5ACAF' },
  { abbr: 'MIA', location: 'Miami', nickname: 'Dolphins', conference: 'AFC', division: 'East', color: '#008E97' },
  { abbr: 'MIN', location: 'Minnesota', nickname: 'Vikings', conference: 'NFC', division: 'North', color: '#4F2683' },
  { abbr: 'NE', location: 'New England', nickname: 'Patriots', conference: 'AFC', division: 'East', color: '#002244' },
  { abbr: 'NO', location: 'New Orleans', nickname: 'Saints', conference: 'NFC', division: 'South', color: '#D3BC8D' },
  { abbr: 'NYG', location: 'New York', nickname: 'Giants', conference: 'NFC', division: 'East', color: '#0B2265' },
  { abbr: 'NYJ', location: 'New York', nickname: 'Jets', conference: 'AFC', division: 'East', color: '#125740' },
  { abbr: 'PHI', location: 'Philadelphia', nickname: 'Eagles', conference: 'NFC', division: 'East', color: '#004C54' },
  { abbr: 'PIT', location: 'Pittsburgh', nickname: 'Steelers', conference: 'AFC', division: 'North', color: '#FFB612' },
  { abbr: 'SEA', location: 'Seattle', nickname: 'Seahawks', conference: 'NFC', division: 'West', color: '#002244' },
  { abbr: 'SF', location: 'San Francisco', nickname: '49ers', conference: 'NFC', division: 'West', color: '#AA0000' },
  { abbr: 'TB', location: 'Tampa Bay', nickname: 'Buccaneers', conference: 'NFC', division: 'South', color: '#D50A0A' },
  { abbr: 'TEN', location: 'Tennessee', nickname: 'Titans', conference: 'AFC', division: 'South', color: '#4B92DB' },
  { abbr: 'WAS', location: 'Washington', nickname: 'Commanders', conference: 'NFC', division: 'East', color: '#5A1414' },
];

export const TEAM_BY_ABBR: Record<string, Team> = Object.fromEntries(
  TEAMS.map((t) => [t.abbr, t]),
);

/** Historical abbreviations that nflverse still emits for relocated teams. */
const ALIASES: Record<string, string> = {
  OAK: 'LV', SD: 'LAC', STL: 'LA', LAR: 'LA', WSH: 'WAS', ARZ: 'ARI',
  BLT: 'BAL', CLV: 'CLE', HST: 'HOU', SL: 'LA', JAC: 'JAX',
};

/** Resolve any abbreviation the feeds use to a current team. */
export function resolveTeam(abbr: string): Team | undefined {
  return TEAM_BY_ABBR[abbr] ?? TEAM_BY_ABBR[ALIASES[abbr] ?? ''];
}

/** "Kansas City Chiefs" */
export function fullName(abbr: string): string {
  const t = resolveTeam(abbr);
  return t ? `${t.location} ${t.nickname}` : abbr;
}

/** "Chiefs" — enough to identify a team in a dense list. */
export function shortName(abbr: string): string {
  return resolveTeam(abbr)?.nickname ?? abbr;
}

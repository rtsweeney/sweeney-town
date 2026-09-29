// ── NFL Elo — rating engine ───────────────────────────────────────────────────
// A continuation of FiveThirtyEight's NFL Elo model (retired in 2025), rebuilt
// from their published source and re-fit on modern seasons.
//
// Core, unchanged from 538:
//  · Every team carries one rating; the league mean is ~1505.
//  · Win probability is logistic in the rating difference: 400 points ≈ 10:1.
//  · Ratings update by K · (result − expected), scaled by a margin-of-victory
//    multiplier that does two jobs at once:
//      log(|margin| + 1)          — blowouts move ratings more, with
//                                   diminishing returns.
//      2.2 / (0.001·eloDiff + 2.2) — the autocorrelation correction. Good teams
//                                   beat bad teams by a lot, so without damping
//                                   by the winner's pre-game edge, favorites who
//                                   cover would ratchet upward forever. Note the
//                                   sign flips on who won, so an underdog blowout
//                                   moves ratings *more*.
//  · Between seasons every team reverts one third of the way to the mean.
//
// Re-fit here (see scripts/build-nfl-elo.ts for the calibration):
//  · HOME_FIELD is 32, not 538's 65. Home advantage has genuinely decayed —
//    home teams won 57.3% of games in 2005-2014 but 54.5% in 2021-2025, and the
//    crowdless 2020 season landed at 50.4%. Fitting 65 to modern play is simply
//    wrong now.
//  · REST_PER_DAY and QB_VALUE_TO_ELO are fit by the same grid search.
//
// Grid-searched on 2015-2025 regular season games by log loss. The fitted
// parameters beat 538's published defaults: 0.62801 vs 0.63879 log loss,
// 0.21834 vs 0.22300 Brier score.

/** League-average rating that teams revert toward between seasons. */
export const LEAGUE_MEAN = 1505.0;

/** Fraction of the way a team reverts to the mean between seasons. */
export const SEASON_REVERT = 1 / 3;

/** Rating points awarded to the home team on a non-neutral field. */
export const HOME_FIELD = 32.0;

/** How fast ratings move. Higher reacts quicker but is noisier. */
export const K_FACTOR = 20.0;

/** Rating points per day of rest advantage (e.g. a bye week is worth ~28). */
export const REST_PER_DAY = 4.0;

/** Playoff games are higher-variance-resistant; 538 scaled the spread by 1.2. */
export const PLAYOFF_MULTIPLIER = 1.2;

/** Elo points per point of QB VALUE above the team's usual starter. */
export const QB_VALUE_TO_ELO = 3.5;

/** Weight given to the newest game in the rolling QB/defense averages. */
export const QB_ROLL_WEIGHT = 0.1;

/** Long-run average VALUE for a starting QB, measured over 2006-2025. */
export const LEAGUE_AVG_QB_VALUE = 43.59;

/** Fraction of the way a QB's rating reverts to league average between seasons. */
export const QB_SEASON_REVERT = 0.25;

/** Rating points per point of point spread — the usual Elo/spread conversion. */
export const ELO_PER_POINT = 25.0;

/** Cap on the QB adjustment so one anomalous game cannot distort a matchup. */
export const MAX_QB_ADJUSTMENT = 120.0;

/**
 * Probability the first team wins, given the rating difference from its
 * perspective (already including home field, rest and QB adjustments).
 */
export function winProbability(eloDiff: number): number {
  return 1.0 / (Math.pow(10.0, -eloDiff / 400.0) + 1.0);
}

/** Model point spread (negative favours the first team, as books quote it). */
export function expectedSpread(eloDiff: number): number {
  return -eloDiff / ELO_PER_POINT;
}

/**
 * Margin-of-victory multiplier on K. `eloDiff` is taken from the winner's
 * perspective; a tie collapses the correction to 1.
 */
export function movMultiplier(margin: number, eloDiffFromWinner: number, tie: boolean): number {
  const damping = tie ? 1.0 : eloDiffFromWinner * 0.001 + 2.2;
  return Math.log(Math.max(Math.abs(margin), 1) + 1.0) * (2.2 / damping);
}

/**
 * Rating points to move from the home team to the away team after a result.
 * `eloDiff` is the pre-game difference from the home team's perspective and
 * `homeResult` is 1 for a home win, 0.5 for a tie, 0 for a loss.
 */
export function ratingShift(
  eloDiff: number,
  homeWinProb: number,
  homeResult: number,
  margin: number,
): number {
  const tie = homeResult === 0.5;
  const fromWinner = homeResult === 1.0 ? eloDiff : -eloDiff;
  return K_FACTOR * movMultiplier(margin, fromWinner, tie) * (homeResult - homeWinProb);
}

/** Regress a team rating toward the league mean between seasons. */
export function revertTeam(elo: number): number {
  return LEAGUE_MEAN * SEASON_REVERT + elo * (1 - SEASON_REVERT);
}

/** Regress a QB rating toward league average between seasons. */
export function revertQb(value: number): number {
  return LEAGUE_AVG_QB_VALUE * QB_SEASON_REVERT + value * (1 - QB_SEASON_REVERT);
}

/** A single quarterback's box score line for one game. */
export interface QbBoxScore {
  completions: number;
  attempts: number;
  passingYards: number;
  passingTds: number;
  interceptions: number;
  sacks: number;
  carries: number;
  rushingYards: number;
  rushingTds: number;
}

/**
 * 538's VALUE — a regression of ESPN's Total QBR yards-above-replacement onto
 * basic box score numbers, so a quarterback's game can be scored without a
 * proprietary feed. Coefficients are theirs, unchanged.
 */
export function qbValue(box: QbBoxScore): number {
  return (
    -2.2 * box.attempts +
    3.7 * box.completions +
    box.passingYards / 5.0 +
    11.3 * box.passingTds -
    14.1 * box.interceptions -
    8.0 * box.sacks -
    1.1 * box.carries +
    0.6 * box.rushingYards +
    15.9 * box.rushingTds
  );
}

/** Exponentially weighted rolling update used for QB and defense ratings. */
export function rollingUpdate(previous: number, observed: number): number {
  return (1 - QB_ROLL_WEIGHT) * previous + QB_ROLL_WEIGHT * observed;
}

/**
 * Pre-game Elo adjustment for the announced starter.
 *
 * This is a *differential*, not an absolute. Team Elo already contains the
 * contribution of whoever has been playing, so adding a QB's full value would
 * double-count him. Only the deviation from the team's usual starter moves the
 * line — which is exactly what makes the adjustment fire on an injury or a
 * midseason change and stay quiet otherwise.
 */
export function qbAdjustment(starterRating: number, teamBaseline: number): number {
  const raw = QB_VALUE_TO_ELO * (starterRating - teamBaseline);
  return Math.max(-MAX_QB_ADJUSTMENT, Math.min(MAX_QB_ADJUSTMENT, raw));
}

/** Inputs that set the pre-game rating difference for a matchup. */
export interface MatchupInputs {
  homeElo: number;
  awayElo: number;
  homeQbAdjustment: number;
  awayQbAdjustment: number;
  homeRestDays: number;
  awayRestDays: number;
  neutralSite: boolean;
  playoff: boolean;
}

/** Full pre-game rating difference from the home team's perspective. */
export function matchupEloDiff(m: MatchupInputs): number {
  let diff = m.homeElo - m.awayElo + (m.homeQbAdjustment - m.awayQbAdjustment);
  if (!m.neutralSite) diff += HOME_FIELD;
  diff += REST_PER_DAY * (m.homeRestDays - m.awayRestDays);
  if (m.playoff) diff *= PLAYOFF_MULTIPLIER;
  return diff;
}

// ── Generated data shapes ────────────────────────────────────────────────────
// These describe the JSON the build script emits and the page reads.

export interface TeamRating {
  team: string;
  elo: number;
  eloPreseason: number;
  wins: number;
  losses: number;
  ties: number;
  rank: number;
  /** Rating at the end of each week of the season; index 0 is preseason. */
  history: number[];
  /** Mean regular-season wins across the simulations; a tie counts half. */
  expectedWins: number;
  playoffOdds: number;
  divisionOdds: number;
  /** Chance of finishing as each seed, index 0 being the 1 seed. */
  seedOdds: number[];
}

export interface GameProjection {
  gameId: string;
  season: number;
  week: number;
  /** Kickoff as a UTC instant; the page renders it in the viewer's zone. */
  kickoff: string | null;
  gameday: string;
  gameType: string;
  away: string;
  home: string;
  awayElo: number;
  homeElo: number;
  homeWinProb: number;
  /** Model spread, quoted from the home team's side (negative = home favoured). */
  spread: number;
  awayQb: string | null;
  homeQb: string | null;
  awayQbAdj: number;
  homeQbAdj: number;
  /** Null until the game is played; filled from the schedule feed. */
  awayScore: number | null;
  homeScore: number | null;
  neutralSite: boolean;
  stadium: string | null;
  /** True when the starters are projected from the depth chart, not announced. */
  projectedStarters: boolean;
}

export interface QbRating {
  playerId: string;
  name: string;
  team: string;
  /** Rolling VALUE, defense-adjusted. */
  rating: number;
  /** Elo points this QB is worth versus a league-average starter. */
  eloVsAverage: number;
  /** Elo points versus the team's own recent QB level — what moves a line. */
  eloVsTeam: number;
  starts: number;
  lastValue: number | null;
  rank: number;
  /** Rating at the end of each week of the season; index 0 is preseason. */
  history: number[];
}

export interface EloSeason {
  generatedAt: string;
  season: number;
  throughSeason: number;
  throughWeek: number;
  teams: TeamRating[];
  games: GameProjection[];
  quarterbacks: QbRating[];
  /** Seasons simulated for the playoff odds and expected wins. */
  simulations: number;
  calibration: {
    logLoss: number;
    brierScore: number;
    baselineLogLoss: number;
    baselineBrierScore: number;
    evaluatedGames: number;
  };
}

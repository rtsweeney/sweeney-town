// ── NFL Elo, boiled down for the homepage ─────────────────────────────────────
// Runs at build time. The ratings workflow commits season.json and that commit
// redeploys the site, so the homepage is never older than the ratings. Only
// this small summary reaches the browser, not the 140 KB season file.

import seasonJson from '../../public/data/nfl-elo/season.json';
import type { EloSeason, GameProjection } from '@/app/(apps)/nfl-elo/engine';
import { resolveTeam } from '@/app/(apps)/nfl-elo/teams';
import { spreadLabel } from '@/app/(apps)/nfl-elo/format';

const season = seasonJson as unknown as EloSeason;

export interface PreviewTeam {
  abbr: string;
  name: string;
  color: string;
}

export interface PreviewGame {
  id: string;
  week: number;
  kickoffMs: number;
  /** "Thu 8:20 PM ET" — formatted here so server and browser render the same text. */
  kickoffLabel: string;
  away: PreviewTeam;
  home: PreviewTeam;
  homeWinProb: number;
  spread: string;
  /**
   * How good the matchup is: the harmonic mean of the two ratings, which
   * FiveThirtyEight used for game quality. It is pulled toward the weaker
   * team, so two good teams beat one great team against a bad one.
   */
  quality: number;
}

export interface PowerRow {
  rank: number;
  team: PreviewTeam;
  elo: number;
  record: string;
}

export interface NflPreviewData {
  season: number;
  throughWeek: number;
  /** "Nov 23" — when the ratings were generated. */
  updatedLabel: string;
  /** Games not yet kicked off at build time, in the next two weeks that have any. The browser picks from these. */
  upcoming: PreviewGame[];
  power: PowerRow[];
  calibration: EloSeason['calibration'];
  simulations: number;
}

const ET = 'America/New_York';

function team(abbr: string): PreviewTeam {
  const t = resolveTeam(abbr);
  return { abbr, name: t?.nickname ?? abbr, color: t?.color ?? '#8888a4' };
}

/** Built from parts, not format(), so no locale-specific spacing sneaks in. */
function kickoffLabel(d: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: ET, weekday: 'short', hour: 'numeric', minute: '2-digit', hour12: true,
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('weekday')} ${get('hour')}:${get('minute')} ${get('dayPeriod')} ET`;
}

function dayLabel(d: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: ET, month: 'short', day: 'numeric' }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('month')} ${get('day')}`;
}

function toPreview(g: GameProjection): PreviewGame | null {
  if (!g.kickoff) return null;
  const kickoff = new Date(g.kickoff);
  if (Number.isNaN(kickoff.getTime())) return null;
  return {
    id: g.gameId,
    week: g.week,
    kickoffMs: kickoff.getTime(),
    kickoffLabel: kickoffLabel(kickoff),
    away: team(g.away),
    home: team(g.home),
    homeWinProb: g.homeWinProb,
    spread: spreadLabel(g),
    quality: (2 * g.homeElo * g.awayElo) / (g.homeElo + g.awayElo),
  };
}

/**
 * `now` is the build's clock. Games that kicked off before the build are left
 * out first: the season file can be a few hours older than the build (e.g. made
 * before Monday night's game), and a game that is already over must not use up
 * one of the two weeks of look-ahead.
 */
export function getNflPreview(now: number): NflPreviewData {
  const unplayed = season.games
    .filter((g) => g.homeScore === null || g.awayScore === null)
    .map(toPreview)
    .filter((g): g is PreviewGame => g !== null && g.kickoffMs > now)
    .sort((a, b) => a.kickoffMs - b.kickoffMs);
  // Two weeks, so that when the last game of one week kicks off before the
  // next ratings run, the browser still has the following week to show.
  const weeks = [...new Set(unplayed.map((g) => g.week))].slice(0, 2);

  const record = (w: number, l: number, t: number) => (t ? `${w}–${l}–${t}` : `${w}–${l}`);

  return {
    season: season.season,
    throughWeek: season.throughWeek,
    updatedLabel: dayLabel(new Date(season.generatedAt)),
    upcoming: unplayed.filter((g) => weeks.includes(g.week)),
    power: [...season.teams]
      .sort((a, b) => a.rank - b.rank)
      .slice(0, 5)
      .map((t) => ({ rank: t.rank, team: team(t.team), elo: Math.round(t.elo), record: record(t.wins, t.losses, t.ties) })),
    calibration: season.calibration,
    simulations: season.simulations,
  };
}

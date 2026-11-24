// Number formats shared by the NFL Elo page and the homepage preview, so the
// same game reads the same way in both places.

import type { GameProjection } from './engine';

export function pct(p: number): string {
  return `${(p * 100).toFixed(0)}%`;
}

/** "IND −2.2" — the model's line, quoted on whichever side is favoured. */
export function spreadLabel(game: Pick<GameProjection, 'spread' | 'home' | 'away'>): string {
  if (Math.abs(game.spread) < 0.05) return 'Pick ’em';
  const favourite = game.spread < 0 ? game.home : game.away;
  return `${favourite} −${Math.abs(game.spread).toFixed(1)}`;
}

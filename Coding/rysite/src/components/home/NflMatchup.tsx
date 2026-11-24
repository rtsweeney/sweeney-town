'use client';

import { useEffect, useState } from 'react';
import { pct } from '@/app/(apps)/nfl-elo/format';
import type { PreviewGame } from '@/lib/nflPreview';

/** The best matchup among games that haven't kicked off, in the soonest week that has any. */
function pickGame(games: PreviewGame[], now: number): PreviewGame | null {
  const ahead = games.filter((g) => g.kickoffMs > now);
  if (ahead.length === 0) return null;
  const week = Math.min(...ahead.map((g) => g.week));
  return ahead.filter((g) => g.week === week).reduce((best, g) => (g.quality > best.quality ? g : best));
}

/**
 * The page is built ahead of time, so "upcoming" is first judged by the build's
 * clock (`renderedAt`), which keeps the server HTML and the first browser render
 * identical. After mount it re-judges by the visitor's clock, dropping any game
 * that has kicked off since the build.
 */
export default function NflMatchup({ games, renderedAt }: { games: PreviewGame[]; renderedAt: number }) {
  const [now, setNow] = useState(renderedAt);
  useEffect(() => setNow(Date.now()), []);

  const game = pickGame(games, now);
  if (!game) return null;

  const away = 1 - game.homeWinProb;
  const home = game.homeWinProb;

  return (
    <div className="nflp-game">
      <div className="nflp-meta">
        <span>Week {game.week} &middot; best game left</span>
        <span>{game.kickoffLabel}</span>
      </div>
      <div className="nflp-teams">
        <span className={away > home ? 'fav' : undefined}>{game.away.name}</span>
        <span className="nflp-at">at</span>
        <span className={home >= away ? 'fav' : undefined}>{game.home.name}</span>
      </div>
      <div className="nflp-bar" aria-hidden="true">
        <span style={{ flexGrow: away, background: game.away.color }} />
        <span style={{ flexGrow: home, background: game.home.color }} />
      </div>
      <div className="nflp-probs">
        <span>{pct(away)}</span>
        <span className="nflp-line">Line {game.spread}</span>
        <span>{pct(home)}</span>
      </div>
    </div>
  );
}

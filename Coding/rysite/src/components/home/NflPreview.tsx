import type { NflPreviewData } from '@/lib/nflPreview';
import NflMatchup from './NflMatchup';

/** Live numbers for the NFL Elo card: the next big game, and the top of the ratings. */
export default function NflPreview({ data, renderedAt }: { data: NflPreviewData; renderedAt: number }) {
  return (
    <div className="nflp">
      <NflMatchup games={data.upcoming} renderedAt={renderedAt} />
      <div className="nflp-power">
        <div className="nflp-meta">
          <span>Top of the ratings</span>
          <span>Updated {data.updatedLabel}</span>
        </div>
        <ol>
          {data.power.map((row) => (
            <li key={row.team.abbr}>
              <span className="nflp-rank">{row.rank}</span>
              <span className="nflp-swatch" style={{ background: row.team.color }} aria-hidden="true" />
              <span className="nflp-name">{row.team.name}</span>
              <span className="nflp-record">{row.record}</span>
              <span className="nflp-elo">{row.elo}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

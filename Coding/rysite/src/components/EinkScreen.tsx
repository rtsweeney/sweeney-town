import { EINK_H, EINK_W, aviatorsScreen } from '@/lib/eink';

/**
 * The UV meter's aviators screen at a given UV index, rendered at build time
 * from a port of the firmware's own drawing code (src/lib/eink.ts).
 */
export default function EinkScreen({ uvi, caption }: { uvi: number; caption?: string }) {
  const { black, red, dither } = aviatorsScreen(uvi);
  // Unique per screen, since a page can show several.
  const patternId = `eink-dither-${Math.round(uvi * 10)}`;
  return (
    <figure className="eink">
      <div className="eink-bezel">
        <svg
          viewBox={`0 0 ${EINK_W} ${EINK_H}`}
          shapeRendering="crispEdges"
          role="img"
          aria-label={`The meter's e-ink screen showing a UV index of ${uvi}`}
        >
          <defs>
            <pattern id={patternId} patternUnits="userSpaceOnUse" width="2" height="1">
              <rect width="1" height="1" className="eink-ink" />
            </pattern>
          </defs>
          <rect width={EINK_W} height={EINK_H} className="eink-paper" />
          <path d={dither} fill={`url(#${patternId})`} />
          <path d={black} className="eink-ink" />
          <path d={red} className="eink-red" />
        </svg>
      </div>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

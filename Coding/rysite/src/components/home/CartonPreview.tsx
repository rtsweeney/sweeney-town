// An isometric pallet load for the Carton Packing card, drawn to scale with the
// same projection as the optimizer's own views: a 48 × 40 in pallet carrying
// two layers of 3 × 2 cartons, 16 × 20 × 12 in, major-flap tape on top.

const COS30 = Math.cos(Math.PI / 6);
type P3 = [number, number, number];

const pt = ([x, y, z]: P3) => `${((x - y) * COS30).toFixed(2)},${((x + y) / 2 - z).toFixed(2)}`;
const quad = (...corners: P3[]) => corners.map(pt).join(' ');

/** Rectangles lying in one plane: the top (z), the +x face, the +y face. */
const top = (x0: number, y0: number, x1: number, y1: number, z: number) =>
  quad([x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]);
const faceX = (x: number, y0: number, y1: number, z0: number, z1: number) =>
  quad([x, y0, z0], [x, y1, z0], [x, y1, z1], [x, y0, z1]);
const faceY = (y: number, x0: number, x1: number, z0: number, z1: number) =>
  quad([x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]);

const PALLET = { l: 48, w: 40, h: 5 };
const CARTON = { l: 16, w: 20, h: 12 };
const COLS = PALLET.l / CARTON.l; // 3
const ROWS = PALLET.w / CARTON.w; // 2
const LAYERS = 2;
const TAPE = 2.4;
const LOAD_TOP = PALLET.h + LAYERS * CARTON.h;

const OUTPUTS = ['The best carton set', 'Pallet patterns', 'Supplier-ready specs', 'QR-linked drawings'];

export default function CartonPreview() {
  const layers = Array.from({ length: LAYERS }, (_, k) => PALLET.h + k * CARTON.h);
  const cols = Array.from({ length: COLS }, (_, i) => i * CARTON.l);
  const rows = Array.from({ length: ROWS }, (_, j) => j * CARTON.w);
  /** The tape strip's two edges, centred on a carton that starts at x0. */
  const tapeX = (x0: number): [number, number] => [x0 + (CARTON.l - TAPE) / 2, x0 + (CARTON.l + TAPE) / 2];

  return (
    <div className="cpp">
      <div className="nflp-meta">
        <span>Example load</span>
        <span>48 &times; 40 in pallet</span>
      </div>
      <div className="cpp-body">
        <svg className="cpp-svg" viewBox="-37 -31 81 77" role="img" aria-label="Isometric drawing of two layers of cartons on a pallet">
          {/* Pallet: the two visible faces, with fork openings */}
          <polygon className="cpp-wood-r" points={faceX(PALLET.l, 0, PALLET.w, 0, PALLET.h)} />
          <polygon className="cpp-wood-l" points={faceY(PALLET.w, 0, PALLET.l, 0, PALLET.h)} />
          {[[6, 20], [28, 42]].map(([a, b]) => <polygon key={`fy${a}`} className="cpp-gap" points={faceY(PALLET.w, a, b, 1, 4)} />)}
          {[[5, 17], [23, 35]].map(([a, b]) => <polygon key={`fx${a}`} className="cpp-gap" points={faceX(PALLET.l, a, b, 1, 4)} />)}

          {/* Cartons: side faces per layer, then the tops of the upper layer */}
          {layers.map((z0) => (
            <g key={z0}>
              {rows.map((y0) => <polygon key={`r${y0}`} className="cpp-side-r" points={faceX(PALLET.l, y0, y0 + CARTON.w, z0, z0 + CARTON.h)} />)}
              {cols.map((x0) => {
                const [ta, tb] = tapeX(x0);
                return (
                  <g key={`l${x0}`}>
                    <polygon className="cpp-side-l" points={faceY(PALLET.w, x0, x0 + CARTON.l, z0, z0 + CARTON.h)} />
                    {/* the tape tab folds 3 in down the end of each carton */}
                    <polygon className="cpp-tape" points={faceY(PALLET.w, ta, tb, z0 + CARTON.h - 3, z0 + CARTON.h)} />
                  </g>
                );
              })}
            </g>
          ))}
          {cols.map((x0) => {
            const [ta, tb] = tapeX(x0);
            return rows.map((y0) => (
              <g key={`t${x0}-${y0}`}>
                <polygon className="cpp-top" points={top(x0, y0, x0 + CARTON.l, y0 + CARTON.w, LOAD_TOP)} />
                <polygon className="cpp-tape" points={top(ta, y0, tb, y0 + CARTON.w, LOAD_TOP)} />
              </g>
            ));
          })}
        </svg>
        <ul className="cpp-outputs">
          {OUTPUTS.map((o) => <li key={o}>{o}</li>)}
        </ul>
      </div>
    </div>
  );
}

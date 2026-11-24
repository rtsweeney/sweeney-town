import { STANDARD_ABV, STANDARD_OZ, standardBeersFromOz } from '@/app/(apps)/beers-per-beer/standard';

const POURS = [
  { label: 'Light beer', oz: STANDARD_OZ, abv: STANDARD_ABV },
  { label: 'Pint of IPA', oz: 16, abv: 7 },
  { label: 'Glass of wine', oz: 5, abv: 13 },
  { label: 'Shot of whiskey', oz: 1.5, abv: 40 },
];

/** One can per standard beer; the last one fills partway. */
function Cans({ beers }: { beers: number }) {
  const count = Math.ceil(beers - 1e-9);
  return (
    <span className="bpbp-cans" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className="bpbp-can">
          <span style={{ height: `${Math.min(1, beers - i) * 100}%` }} />
        </span>
      ))}
    </span>
  );
}

/** Worked examples for the Beers Per Beer card, using the calculator's own standard. */
export default function BeerPreview() {
  return (
    <div className="bpbp">
      <div className="nflp-meta">
        <span>How many beers?</span>
        <span>1 beer = {STANDARD_OZ} oz, {STANDARD_ABV}%</span>
      </div>
      <ul>
        {POURS.map((p) => {
          const beers = standardBeersFromOz(p.oz, p.abv);
          return (
            <li key={p.label}>
              <span className="bpbp-pour">
                <span className="bpbp-label">{p.label}</span>
                <span className="bpbp-detail">{p.oz} oz &middot; {p.abv}%</span>
              </span>
              <Cans beers={beers} />
              <span className="bpbp-value">{beers.toFixed(1)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

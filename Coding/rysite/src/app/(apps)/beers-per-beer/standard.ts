// What "one beer" means on this site. The calculator and the homepage's worked
// examples both import it, so they can never disagree.

export const ML_PER_OZ = 29.5735295625;

/** A "standard beer" on this site: 12 oz at 4.2% ABV. */
export const STANDARD_ABV = 4.2;
export const STANDARD_OZ = 12;
export const STANDARD_ML = STANDARD_OZ * ML_PER_OZ;

/** Standard beers in a pour of `oz` fluid ounces at `abv` percent. */
export function standardBeersFromOz(oz: number, abv: number): number {
  return (oz * abv) / (STANDARD_OZ * STANDARD_ABV);
}

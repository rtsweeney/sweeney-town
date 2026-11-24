// Stacking strength from the board grade, for choosing an ECT rating.
//
// McKee's short formula estimates a regular slotted carton's top-to-bottom
// compression strength (BCT) from the board's edge crush (ECT), its caliper t
// and the carton's perimeter Z:  BCT ≈ 5.87 · ECT · √(t · Z), with ECT in
// lbf/in and t, Z in inches, giving lbf. It holds for upright RSCs with the
// flutes vertical; cartons on their side are far weaker and are not rated.

import type { CartonSpec } from './engine';
import type { Units } from './format';

/** Divides BCT for humidity, time in storage, overhang and imperfect stacking. */
export const STACK_SAFETY = 4;
const KG_PER_LB = 0.45359237;

export interface StackCheck {
  /** Estimated compression strength, lbf. */
  bctLbf: number;
  /** Cartons resting on the bottom carton of a pallet. */
  above: number;
  /** Heaviest gross weight per carton the bottom one can carry, lb (null with nothing above). */
  maxGrossLbf: number | null;
}

export function mckeeBctLbf(ect: number, caliper: number, outerL: number, outerW: number, units: Units): number {
  const toIn = units === 'in' ? 1 : 1 / 25.4;
  const t = caliper * toIn;
  const z = 2 * (outerL + outerW) * toIn;
  return 5.87 * ect * Math.sqrt(t * z);
}

/** The bottom carton of a column carries every layer above it. */
export function stackCheck(carton: CartonSpec, ect: number, caliper: number, units: Units): StackCheck {
  const bctLbf = mckeeBctLbf(ect, caliper, carton.outer.l, carton.outer.w, units);
  const above = Math.max(0, carton.pallet.totalLayers - 1);
  return { bctLbf, above, maxGrossLbf: above > 0 ? bctLbf / STACK_SAFETY / above : null };
}

/** A force or weight in lb, shown as kg when working in millimetres. */
export function weightText(lb: number, units: Units): string {
  const v = units === 'in' ? lb : lb * KG_PER_LB;
  return `${Math.round(v).toLocaleString('en-US')} ${units === 'in' ? 'lb' : 'kg'}`;
}

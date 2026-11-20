// Number, length and area formatting shared by the page, the charts and the
// carton drawings. Lengths arrive in the user's working unit (mm or in).

import type { BlankSpec } from './engine';

export type Units = 'mm' | 'in';

/** Drawing sheet sizes, both printed landscape. */
export type Paper = 'a4' | 'letter';

export function fmt(x: number, digits = 0): string {
  return x.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}

/** Exactly `digits` decimals, so a table column of numbers lines up. */
export function fmtFixed(x: number, digits = 1): string {
  return x.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

/** A length rounded to 0.1 with no unit, for groups that state the unit once. */
export function fmtLen(x: number): string {
  const rounded = Math.round(x * 10) / 10;
  return fmt(rounded, Math.abs(rounded % 1) > 1e-9 ? 1 : 0);
}

export function fmtDim(x: number, units: string): string {
  const rounded = Math.round(x * 10) / 10;
  return `${fmt(rounded, Math.abs(rounded % 1) > 1e-9 ? 1 : 0)}${units === 'in' ? '″' : ' mm'}`;
}

/**
 * One dimension for a supplier: fractional inches rounded to the nearest
 * 1/16 (reduced, e.g. 24 3/16), or millimeters to 0.1.
 */
export function specDim(v: number, from: Units, to: Units): string {
  const mm = from === 'mm' ? v : v * 25.4;
  if (to === 'mm') return fmt(Math.round(mm * 10) / 10, 1);
  const sixteenths = Math.round((mm / 25.4) * 16);
  const whole = Math.floor(sixteenths / 16);
  let num = sixteenths - whole * 16;
  let den = 16;
  while (num > 0 && num % 2 === 0) {
    num /= 2;
    den /= 2;
  }
  if (num === 0) return `${whole}`;
  return whole === 0 ? `${num}/${den}` : `${whole} ${num}/${den}`;
}

/** Display step for supplier dimensions: 1/16 in, or 0.1 mm. */
function dimStep(units: Units): number {
  return units === 'in' ? 1 / 16 : 0.1;
}

/**
 * Blank dimensions as a supplier reads them, in `to` units: each part
 * snapped to the display step, and the overall length and width summed from
 * the snapped parts, so a dimension chain on a drawing always adds up.
 */
export function blankDims(b: BlankSpec, from: Units, to: Units) {
  const factor = from === to ? 1 : to === 'in' ? 1 / 25.4 : 25.4;
  const step = dimStep(to);
  const snap = (v: number) => Math.round((v * factor) / step) * step;
  const glueFlap = snap(b.glueFlap);
  const panelL = snap(b.panelL);
  const panelW = snap(b.panelW);
  const flap = snap(b.flap);
  const depth = snap(b.depth);
  return { glueFlap, panelL, panelW, flap, depth, length: glueFlap + 2 * panelL + 2 * panelW, width: 2 * flap + depth };
}

export function specDims3(d: { l: number; w: number; d: number }, from: Units, to: Units): string {
  return `${specDim(d.l, from, to)} × ${specDim(d.w, from, to)} × ${specDim(d.d, from, to)} ${to === 'in' ? 'in' : 'mm'}`;
}

/** Board areas read in m² when working in mm and in ft² when working in inches. */
export function areaUnit(units: Units): string {
  return units === 'in' ? 'ft²' : 'm²';
}

/** An area in the working unit squared (mm² or in²), as m² or ft². */
export function areaValue(unit2: number, units: Units): number {
  return units === 'in' ? unit2 / 144 : unit2 / 1e6;
}

export function fmtArea(unit2: number, units: Units, digits = 0): string {
  return `${fmt(areaValue(unit2, units), digits)} ${areaUnit(units)}`;
}

/** An area in `from` units², as a number of m² (to mm) or ft² (to in). 1 ft² = 92,903.04 mm². */
export function specAreaValue(unit2: number, from: Units, to: Units): number {
  const mm2 = from === 'in' ? unit2 * 645.16 : unit2;
  return to === 'in' ? mm2 / 92903.04 : mm2 / 1e6;
}

/** The same, formatted with its unit. */
export function specArea(unit2: number, from: Units, to: Units, digits = 0): string {
  return `${fmt(specAreaValue(unit2, from, to), digits)} ${areaUnit(to)}`;
}

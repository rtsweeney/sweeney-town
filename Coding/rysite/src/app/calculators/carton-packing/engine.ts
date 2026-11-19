// ── Carton Packing Optimizer — computation engine ─────────────────────────────
// Pure, unit-agnostic (all lengths in one consistent unit, e.g. mm).
// Everything runs client-side; no network, no server.
//
// Model summary
//  · Each prism SKU is packed into exactly one carton SKU (no mixed cartons).
//  · Prisms are inserted with a fixed axis mapping: one prism dimension lies
//    along the carton major-flap dimension (L), one along the erected carton
//    depth (D, vertical when upright), and one along the carton minor-flap
//    dimension (W) — the axis along which prisms accumulate ("stack").
//  · A column configuration multiplies the base stack: `cols` side-by-side
//    columns across L, `tiers` stacked along D. Units/carton = cols·tiers·n.
//  · Inner dims:  IL = cols·dl + allowMajor
//                 ID = tiers·dd + allowDepth
//                 IW = n·dw + allowMinor  (n free, ≥ 1)
//    Each allowance is the total extra space added to that inner dimension.
//  · Outer dims:  OL = IL + 2·wall, OW = IW + 2·wall, OD = ID + 4·wall
//    (side walls once per side; top + bottom flap stacks ≈ 2 plies each).
//  · Size caps: each outer dim has its own max single side length —
//    OL ≤ maxMajor, OW ≤ maxMinor, OD ≤ maxDepth — so the inner caps are
//    maxMajor − 2·wall, maxMinor − 2·wall and maxDepth − 4·wall.
//  · Closing constraint: W never exceeds L. On an RSC the two minor flaps each
//    span half the width and fold across L, so a carton with W > L cannot be
//    closed normally. L is a free dimension, so when the stack is deeper than
//    the packed row is wide, L is widened to W — dead space beside the column,
//    contents still aligned — instead of rejecting the carton. Because L must
//    reach W, the stack is held under L's cap as well as W's own.
//  · Pallet: usable footprint = pallet + 2·overhang per dimension. Cartons may
//    be placed upright (L×W footprint) and, when flutes are not required
//    vertical, on their side with the L×D plane down (height = OW). 90°
//    rotations may be mixed within a layer; layers of different orientations
//    may be mixed within the height budget, with the number of on-side layers
//    capped by maxOnSideLayers. Pads add per the selected mode.

export type PrismAxis = 'width' | 'height' | 'depth';
export type CartonAxis = 'major' | 'depth' | 'minor';

/** Which prism dimension lies along each carton axis. Must be a permutation. */
export type AxisMapping = Record<CartonAxis, PrismAxis>;

export const DEFAULT_MAPPING: AxisMapping = {
  major: 'width', // prism width  → carton major-flap dimension (L)
  depth: 'height', // prism height → carton depth (vertical when upright)
  minor: 'depth', // prism depth  → carton minor-flap dimension (stacking axis)
};

export interface PrismSku {
  id: string;
  name: string;
  width: number;
  height: number;
  depth: number;
  /** Usage weight (e.g. units per year). Drives the weighted objective. */
  usage: number;
  /**
   * Optional prescribed count per carton. When set, every carton of this SKU
   * holds exactly this many (an enabled orientation's columns × tiers must
   * divide it evenly); when null/absent the optimizer chooses freely.
   */
  perCarton?: number | null;
}

export interface ColumnConfig {
  id: string;
  /** Columns side-by-side across the carton major-flap dimension. */
  cols: number;
  /** Tiers stacked along the carton depth. */
  tiers: number;
  label: string;
  defaultOn: boolean;
}

export const COLUMN_CONFIGS: ColumnConfig[] = [
  { id: 'c1x1', cols: 1, tiers: 1, label: '1 column', defaultOn: true },
  { id: 'c1x2', cols: 1, tiers: 2, label: '2 along carton depth × 1 along major flap', defaultOn: true },
  { id: 'c2x1', cols: 2, tiers: 1, label: '2 along major flap × 1 along carton depth', defaultOn: false },
  { id: 'c2x2', cols: 2, tiers: 2, label: '2 along major flap × 2 along carton depth', defaultOn: true },
];

export type ObjectiveId = 'wfpp' | 'pallets' | 'weff';

export interface PadSettings {
  enabled: boolean;
  thickness: number;
  /** 'every' = under first, between every layer, and on top (layers + 1 pads). 'topBottom' = 2 pads. */
  mode: 'every' | 'topBottom';
}

export interface Settings {
  mapping: AxisMapping;
  goalSkus: number;
  /** Simulated K range is goal ± kSpread (clamped to [1, prism count]). */
  kSpread: number;
  /**
   * Max single side length of each carton outer dimension: the major-flap
   * side (L), the minor-flap side (W), and the depth (D). Each axis is capped
   * on its own.
   */
  maxMajor: number;
  maxMinor: number;
  maxDepth: number;
  /** Enabled column-configuration ids (subset of COLUMN_CONFIGS). */
  allowedConfigs: string[];
  /** Total extra space added to each carton inner dimension (push-in room). */
  allowMajor: number;
  allowMinor: number;
  allowDepth: number;
  /**
   * Smallest viable carton: SKUs without a prescribed per-carton count must
   * fit at least this many per carton. Guards against over-optimized shapes.
   */
  minUnitsPerCarton: number;
  /** Corrugated board caliper. */
  wall: number;
  /** If true, cartons must sit upright on the pallet (flutes orthogonal to ground). */
  flutesVertical: boolean;
  /**
   * Cap on how many layers may lie on their side (flutes horizontal) when
   * flutesVertical is off. null lifts the cap, so a whole pallet may be
   * stacked on its side if that packs better. Ignored when flutes must be
   * vertical.
   */
  maxOnSideLayers: number | null;
  palletLen: number;
  palletWid: number;
  /** Max height of the carton stack above the pallet deck, pads included. */
  maxLoadHeight: number;
  /** Max overhang per side of each pallet dimension. */
  overhangLen: number;
  overhangWid: number;
  pads: PadSettings;
  objective: ObjectiveId;
}

// ── Derived / result shapes ───────────────────────────────────────────────────

export interface OrientedPrism {
  prism: PrismSku;
  /** Dimension along carton L (major flaps). */
  dl: number;
  /** Dimension along carton D (depth). */
  dd: number;
  /** Dimension along carton W (minor flaps, stacking axis). */
  dw: number;
  weight: number;
  /** Prescribed count per carton, or null when the optimizer chooses. */
  fixed: number | null;
}

export interface Dims {
  l: number;
  w: number;
  d: number;
}

export interface MemberPack {
  prism: PrismSku;
  dl: number;
  dd: number;
  dw: number;
  configId: string;
  cols: number;
  tiers: number;
  /** Prisms per stack along the carton minor-flap axis. */
  nPerStack: number;
  unitsPerCarton: number;
  /** Prisms per pallet = unitsPerCarton × cartonsPerPallet. */
  fpp: number;
  /** Best-possible prisms per pallet with a dedicated carton for this SKU. */
  idealFpp: number;
  /** fpp / idealFpp. */
  efficiency: number;
  /** Prism volume × units ÷ carton inner volume. */
  volumeFill: number;
}

export interface PlacedRect {
  x: number;
  y: number;
  w: number;
  h: number;
  /** True when the footprint is rotated 90° from the base orientation. */
  rotated: boolean;
}

export interface LayerPlan {
  orientation: 'upright' | 'onSide';
  /** Number of layers using this orientation. */
  count: number;
  perLayer: number;
  /** Footprint of one carton in this orientation (x along pallet length). */
  foot: { x: number; y: number };
  /** Height of one layer. */
  height: number;
  placements: PlacedRect[];
}

export interface PalletPlan {
  layers: LayerPlan[];
  cartonsPerPallet: number;
  totalLayers: number;
  padCount: number;
  /** Cartons + pads, above the deck. */
  stackHeight: number;
  usable: { x: number; y: number };
}

export interface CartonSpec {
  /** Stable id within a solution ('A', 'B', …) assigned by usage share. */
  label: string;
  inner: Dims;
  outer: Dims;
  cartonsPerPallet: number;
  members: MemberPack[];
  /** Sum of member usage weights. */
  usageShare: number;
  pallet: PalletPlan;
}

export interface SolutionK {
  k: number;
  feasible: boolean;
  cartons: CartonSpec[];
  /** Σ usage·fpp ÷ Σ usage. */
  weightedFpp: number;
  /** Σ usage ÷ fpp — pallets needed to hold one usage period. */
  pallets: number;
  /** Σ usage·(fpp/ideal) ÷ Σ usage. */
  weightedEff: number;
}

export interface PrismIssue {
  prism: PrismSku;
  reason: string;
}

export interface SolveResult {
  solutions: SolutionK[];
  /** SKUs that could not be packed; they are excluded from the solutions. */
  issues: PrismIssue[];
  goalK: number;
  elapsedMs: number;
  /** SKUs submitted, and how many of them the solutions actually pack. */
  totalPrisms: number;
  packedPrisms: number;
}

export interface ProgressUpdate {
  label: string;
  frac: number;
}

export interface CancelToken {
  cancelled: boolean;
}

export class SolveCancelled extends Error {
  constructor() {
    super('Solve cancelled');
    this.name = 'SolveCancelled';
  }
}

const EPS = 1e-7;

function floorEps(x: number): number {
  return Math.floor(x + EPS);
}

// ── Orientation / padding helpers ─────────────────────────────────────────────

export function orientPrism(p: PrismSku, mapping: AxisMapping): OrientedPrism {
  return {
    prism: p,
    dl: p[mapping.major],
    dd: p[mapping.depth],
    dw: p[mapping.minor],
    weight: Math.max(p.usage, 0),
    fixed: p.perCarton != null && p.perCarton >= 1 ? Math.round(p.perCarton) : null,
  };
}

export function isValidMapping(m: AxisMapping): boolean {
  return new Set([m.major, m.depth, m.minor]).size === 3;
}

interface Paddings {
  padL: number;
  padD: number;
  padW: number;
  /** Inner caps: each axis's outer cap less the board that axis adds outside. */
  maxInnerL: number;
  maxInnerD: number;
  maxInnerW: number;
  /**
   * Deepest stack a closable carton can hold. W has its own cap, but L is
   * widened to at least W so the flaps can close, so L's cap bounds it too.
   */
  maxStackW: number;
}

function paddings(s: Settings): Paddings {
  const maxInnerL = s.maxMajor - 2 * s.wall;
  const maxInnerW = s.maxMinor - 2 * s.wall;
  return {
    padL: s.allowMajor,
    padD: s.allowDepth,
    padW: s.allowMinor,
    maxInnerL,
    maxInnerD: s.maxDepth - 4 * s.wall,
    maxInnerW,
    maxStackW: Math.min(maxInnerW, maxInnerL),
  };
}

export function innerToOuter(inner: Dims, wall: number): Dims {
  return { l: inner.l + 2 * wall, w: inner.w + 2 * wall, d: inner.d + 4 * wall };
}

// ── Pallet tiling ─────────────────────────────────────────────────────────────
// Mixed-90°-rotation rectangle packing via a bounded guillotine ("strip") search:
// peel off full strips of either orientation from the left or bottom, recurse on
// the remainder. Depth 3 covers the common one-, two- and three-block pallet
// patterns; fully interlocked (pinwheel) patterns are not searched.

const TILE_DEPTH = 3;

function tileKey(x: number, y: number): string {
  return `${Math.round(x * 100)}|${Math.round(y * 100)}`;
}

function tileCountRec(
  x: number,
  y: number,
  a: number,
  b: number,
  depth: number,
  memo: Map<string, number>,
): number {
  if (x < Math.min(a, b) - EPS || y < Math.min(a, b) - EPS) return 0;
  const key = `${depth}|${tileKey(x, y)}`;
  const hit = memo.get(key);
  if (hit !== undefined) return hit;

  const ax = floorEps(x / a);
  const bx = floorEps(x / b);
  const ay = floorEps(y / a);
  const by = floorEps(y / b);
  let best = Math.max(ax * by, bx * ay);

  if (depth > 0) {
    // Vertical strips peeled from the left: i columns of one orientation.
    for (let i = 1; i <= ax; i++) {
      const rest = tileCountRec(x - i * a, y, a, b, depth - 1, memo);
      const cand = i * by + rest;
      if (cand > best) best = cand;
    }
    for (let i = 1; i <= bx; i++) {
      const rest = tileCountRec(x - i * b, y, a, b, depth - 1, memo);
      const cand = i * ay + rest;
      if (cand > best) best = cand;
    }
    // Horizontal strips peeled from the bottom: j rows.
    for (let j = 1; j <= by; j++) {
      const rest = tileCountRec(x, y - j * b, a, b, depth - 1, memo);
      const cand = j * ax + rest;
      if (cand > best) best = cand;
    }
    for (let j = 1; j <= ay; j++) {
      const rest = tileCountRec(x, y - j * a, a, b, depth - 1, memo);
      const cand = j * bx + rest;
      if (cand > best) best = cand;
    }
  }

  memo.set(key, best);
  return best;
}

export type TileCache = Map<string, number>;

/** Max count of a×b rectangles (90° rotation allowed, mixed) in an X×Y area. */
export function tileCount(x: number, y: number, a: number, b: number, cache: TileCache): number {
  if (a <= 0 || b <= 0) return 0;
  const key = `${Math.round(a * 100)}|${Math.round(b * 100)}|${tileKey(x, y)}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  const n = tileCountRec(x, y, a, b, TILE_DEPTH, new Map());
  cache.set(key, n);
  return n;
}

/** Same recursion as tileCountRec, but reconstructs placements for display. */
export function tileLayout(x: number, y: number, a: number, b: number): PlacedRect[] {
  const memo = new Map<string, number>();
  const rects: PlacedRect[] = [];

  const place = (ox: number, oy: number, cols: number, rows: number, w: number, h: number, rotated: boolean) => {
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        rects.push({ x: ox + i * w, y: oy + j * h, w, h, rotated });
      }
    }
  };

  const rec = (ox: number, oy: number, w: number, h: number, depth: number) => {
    if (w < Math.min(a, b) - EPS || h < Math.min(a, b) - EPS) return;
    const target = tileCountRec(w, h, a, b, depth, memo);
    if (target <= 0) return;

    const ax = floorEps(w / a);
    const bx = floorEps(w / b);
    const ay = floorEps(h / a);
    const by = floorEps(h / b);

    if (ax * by === target) {
      place(ox, oy, ax, by, a, b, false);
      return;
    }
    if (bx * ay === target) {
      place(ox, oy, bx, ay, b, a, true);
      return;
    }
    if (depth > 0) {
      for (let i = 1; i <= ax; i++) {
        if (i * by + tileCountRec(w - i * a, h, a, b, depth - 1, memo) === target) {
          place(ox, oy, i, by, a, b, false);
          rec(ox + i * a, oy, w - i * a, h, depth - 1);
          return;
        }
      }
      for (let i = 1; i <= bx; i++) {
        if (i * ay + tileCountRec(w - i * b, h, a, b, depth - 1, memo) === target) {
          place(ox, oy, i, ay, b, a, true);
          rec(ox + i * b, oy, w - i * b, h, depth - 1);
          return;
        }
      }
      for (let j = 1; j <= by; j++) {
        if (j * ax + tileCountRec(w, h - j * b, a, b, depth - 1, memo) === target) {
          place(ox, oy, ax, j, a, b, false);
          rec(ox, oy + j * b, w, h - j * b, depth - 1);
          return;
        }
      }
      for (let j = 1; j <= ay; j++) {
        if (j * bx + tileCountRec(w, h - j * a, a, b, depth - 1, memo) === target) {
          place(ox, oy, bx, j, b, a, true);
          rec(ox, oy + j * a, w, h - j * a, depth - 1);
          return;
        }
      }
    }
  };

  rec(0, 0, x, y, TILE_DEPTH);
  return rects;
}

// ── Pallet stacking ───────────────────────────────────────────────────────────

interface OrientationOption {
  orientation: 'upright' | 'onSide';
  foot: { x: number; y: number };
  height: number;
  perLayer: number;
}

// Upright is listed first and stacks at the bottom of the pallet; on-side
// layers (flutes horizontal) always go on top of the upright layers.
function orientationOptions(outer: Dims, s: Settings, cache: TileCache): OrientationOption[] {
  const usX = s.palletLen + 2 * s.overhangLen;
  const usY = s.palletWid + 2 * s.overhangWid;
  const opts: OrientationOption[] = [];

  const upright = tileCount(usX, usY, outer.l, outer.w, cache);
  if (upright > 0) {
    opts.push({ orientation: 'upright', foot: { x: outer.l, y: outer.w }, height: outer.d, perLayer: upright });
  }
  if (!s.flutesVertical) {
    // Depth × major-flap plane parallel to the floor → height is the minor-flap dim.
    const onSide = tileCount(usX, usY, outer.l, outer.d, cache);
    if (onSide > 0) {
      opts.push({ orientation: 'onSide', foot: { x: outer.l, y: outer.d }, height: outer.w, perLayer: onSide });
    }
  }
  return opts;
}

interface StackPlan {
  cartonsPerPallet: number;
  counts: number[];
  options: OrientationOption[];
  padCount: number;
  stackHeight: number;
}

function bestStack(outer: Dims, s: Settings, cache: TileCache): StackPlan | null {
  const opts = orientationOptions(outer, s, cache);
  if (opts.length === 0) return null;

  const t = s.pads.enabled ? s.pads.thickness : 0;
  const every = s.pads.enabled && s.pads.mode === 'every';
  const budget = every ? s.maxLoadHeight - t : s.maxLoadHeight - (s.pads.enabled ? 2 * t : 0);
  const eff = opts.map((o) => o.height + (every ? t : 0));

  let best: StackPlan | null = null;
  const consider = (counts: number[]) => {
    const total = counts.reduce((acc, n, i) => acc + n * opts[i].perLayer, 0);
    const layers = counts.reduce((acc, n) => acc + n, 0);
    if (layers === 0) return;
    const padCount = !s.pads.enabled ? 0 : every ? layers + 1 : 2;
    const height = counts.reduce((acc, n, i) => acc + n * opts[i].height, 0) + padCount * t;
    if (height > s.maxLoadHeight + EPS) return;
    if (!best || total > best.cartonsPerPallet || (total === best.cartonsPerPallet && height < best.stackHeight)) {
      best = { cartonsPerPallet: total, counts: [...counts], options: opts, padCount, stackHeight: height };
    }
  };

  // On-side layers are capped independently of position in `opts`, since
  // upright is only listed first when it actually fits.
  const cap = (i: number) =>
    opts[i].orientation === 'onSide' && s.maxOnSideLayers != null ? Math.max(0, s.maxOnSideLayers) : Infinity;
  const fit = (i: number, room: number) => Math.min(Math.max(0, floorEps(room / eff[i])), cap(i));

  if (opts.length === 1) {
    consider([fit(0, budget)]);
  } else {
    const max0 = fit(0, budget);
    for (let n0 = 0; n0 <= max0; n0++) {
      consider([n0, fit(1, budget - n0 * eff[0])]);
      consider([n0, 0]);
    }
  }
  return best;
}

/** Cartons per pallet for the given outer dims (0 when nothing fits). */
export function cartonsPerPallet(outer: Dims, s: Settings, cache: TileCache): number {
  const plan = bestStack(outer, s, cache);
  return plan ? plan.cartonsPerPallet : 0;
}

/** Full pallet plan, with per-layer placements, for display. */
export function palletPlan(outer: Dims, s: Settings, cache: TileCache): PalletPlan | null {
  const plan = bestStack(outer, s, cache);
  if (!plan) return null;
  const usX = s.palletLen + 2 * s.overhangLen;
  const usY = s.palletWid + 2 * s.overhangWid;
  const layers: LayerPlan[] = [];
  plan.options.forEach((o, i) => {
    const count = plan.counts[i];
    if (count <= 0) return;
    layers.push({
      orientation: o.orientation,
      count,
      perLayer: o.perLayer,
      foot: o.foot,
      height: o.height,
      placements: tileLayout(usX, usY, o.foot.x, o.foot.y),
    });
  });
  return {
    layers,
    cartonsPerPallet: plan.cartonsPerPallet,
    totalLayers: plan.counts.reduce((a, b) => a + b, 0),
    padCount: plan.padCount,
    stackHeight: plan.stackHeight,
    usable: { x: usX, y: usY },
  };
}

// ── Group (carton) evaluation ─────────────────────────────────────────────────

interface GroupMember {
  idx: number;
  op: OrientedPrism;
  multiplier: number;
  configId: string;
  cols: number;
  tiers: number;
  n: number;
  units: number;
  fpp: number;
}

export interface GroupEval {
  inner: Dims;
  outer: Dims;
  cpp: number;
  members: GroupMember[];
  score: number;
}

interface EvalContext {
  settings: Settings;
  pad: Paddings;
  configs: ColumnConfig[];
  tileCache: TileCache;
  ideals: number[];
  objective: ObjectiveId;
  /** Cap on the number of stack-width candidates explored per group. */
  candWCap: number;
}

function groupScore(
  ctx: EvalContext,
  members: { weight: number; fpp: number; idx: number }[],
): number {
  let score = 0;
  for (const m of members) {
    const w = m.weight;
    if (ctx.objective === 'wfpp') score += w * m.fpp;
    else if (ctx.objective === 'weff') score += (w * m.fpp) / Math.max(ctx.ideals[m.idx], EPS);
    else score -= w / Math.max(m.fpp, EPS);
  }
  return score;
}

/**
 * Best single carton for a set of prisms: enumerate tight candidate inner
 * (L, D) pairs from member requirements, reduce to distinct multiplier vectors,
 * then scan tight stack-width candidates for each.
 */
export function bestCartonForGroup(idxs: number[], oriented: OrientedPrism[], ctx: EvalContext): GroupEval | null {
  const { pad, settings, configs } = ctx;
  const ms = idxs.map((i) => ({ idx: i, op: oriented[i] }));

  const colsVals = Array.from(new Set(configs.map((c) => c.cols)));
  const tiersVals = Array.from(new Set(configs.map((c) => c.tiers)));

  const candL = new Set<number>();
  const candD = new Set<number>();
  for (const { op } of ms) {
    for (const c of colsVals) {
      const v = c * op.dl + pad.padL;
      if (v <= pad.maxInnerL + EPS) candL.add(ceil2(v));
    }
    for (const t of tiersVals) {
      const v = t * op.dd + pad.padD;
      if (v <= pad.maxInnerD + EPS) candD.add(ceil2(v));
    }
  }
  const Ls = Array.from(candL).sort((a, b) => a - b);
  const Ds = Array.from(candD).sort((a, b) => a - b);
  if (Ls.length === 0 || Ds.length === 0) return null;

  // Stack-width candidates: tight for some member. Prescribed-count members'
  // required widths are always included; the rest are thinned to a cap,
  // keeping the highest-usage members' candidates when over budget.
  const wCands = new Set<number>();
  for (const { op } of ms) {
    if (op.fixed == null) continue;
    for (const c of configs) {
      const m = c.cols * c.tiers;
      if (op.fixed % m !== 0) continue;
      const v = (op.fixed / m) * op.dw + pad.padW;
      if (v <= pad.maxStackW + EPS) wCands.add(ceil2(v));
    }
  }
  const byWeight = [...ms].sort((a, b) => b.op.weight - a.op.weight);
  outer: for (const { op } of byWeight) {
    if (op.fixed != null) continue;
    for (let n = 1; ; n++) {
      const v = n * op.dw + pad.padW;
      if (v > pad.maxStackW + EPS) break;
      wCands.add(ceil2(v));
      if (wCands.size >= ctx.candWCap) break outer;
    }
  }
  const Ws = Array.from(wCands).sort((a, b) => a - b);
  if (Ws.length === 0) return null;

  // Distinct multiplier vectors over (L, D) pairs; keep Pareto-min dims per vector.
  interface Vec {
    l: number;
    d: number;
    mult: number[];
    cfg: ColumnConfig[];
  }
  const vecs = new Map<string, Vec[]>();
  for (const L of Ls) {
    for (const D of Ds) {
      const mult: number[] = [];
      const cfg: ColumnConfig[] = [];
      let ok = true;
      for (const { op } of ms) {
        let bestM = 0;
        let bestC: ColumnConfig | null = null;
        for (const c of configs) {
          if (c.cols * op.dl + pad.padL <= L + EPS && c.tiers * op.dd + pad.padD <= D + EPS) {
            const m = c.cols * c.tiers;
            // A prescribed count must split evenly across the configuration;
            // the max multiplier minimizes the width that count needs.
            if (op.fixed != null && op.fixed % m !== 0) continue;
            if (m > bestM) {
              bestM = m;
              bestC = c;
            }
          }
        }
        if (!bestC || (op.fixed != null && (op.fixed / bestM) * op.dw + pad.padW > pad.maxStackW + EPS)) {
          ok = false;
          break;
        }
        mult.push(bestM);
        cfg.push(bestC);
      }
      if (!ok) continue;
      const key = mult.join(',');
      const list = vecs.get(key) ?? [];
      let dominated = false;
      for (const v of list) {
        if (v.l <= L + EPS && v.d <= D + EPS) {
          dominated = true;
          break;
        }
      }
      if (!dominated) {
        const kept = list.filter((v) => !(L <= v.l + EPS && D <= v.d + EPS));
        kept.push({ l: L, d: D, mult, cfg });
        vecs.set(key, kept);
      }
    }
  }

  let best: GroupEval | null = null;
  for (const list of Array.from(vecs.values())) {
    for (const vec of list) {
      for (const W of Ws) {
        // Prescribed counts must fit exactly; free members fill the width and
        // must reach the minimum viable count per carton.
        let feasible = true;
        const scored: { weight: number; fpp: number; idx: number }[] = [];
        const ns: number[] = [];
        for (let i = 0; i < ms.length; i++) {
          const op = ms[i].op;
          if (op.fixed != null) {
            const n = op.fixed / vec.mult[i];
            if (n * op.dw + pad.padW > W + EPS) {
              feasible = false;
              break;
            }
            ns.push(n);
          } else {
            const n = floorEps((W - pad.padW) / op.dw);
            if (n < 1 || vec.mult[i] * n < settings.minUnitsPerCarton) {
              feasible = false;
              break;
            }
            ns.push(n);
          }
        }
        if (!feasible) continue;

        // The minor-flap side may never exceed the major-flap side, or the
        // major flaps cannot meet to close. The major-flap side is a free
        // dimension though: widen it to the stack width, leaving dead space
        // beside the prisms, rather than rejecting the carton.
        const innerL = Math.max(vec.l, W);
        if (innerL > pad.maxInnerL + EPS) break; // Ws ascends, so no wider W fits either
        const inner: Dims = { l: innerL, w: W, d: vec.d };
        const out = innerToOuter(inner, settings.wall);
        if (out.l > settings.maxMajor + EPS || out.w > settings.maxMinor + EPS || out.d > settings.maxDepth + EPS) continue;
        const cpp = cartonsPerPallet(out, settings, ctx.tileCache);
        if (cpp <= 0) continue;

        for (let i = 0; i < ms.length; i++) {
          scored.push({ weight: ms[i].op.weight, fpp: vec.mult[i] * ns[i] * cpp, idx: ms[i].idx });
        }
        const score = groupScore(ctx, scored);
        if (!best || score > best.score + EPS) {
          const members: GroupMember[] = ms.map((m, i) => ({
            idx: m.idx,
            op: m.op,
            multiplier: vec.mult[i],
            configId: vec.cfg[i].id,
            cols: vec.cfg[i].cols,
            tiers: vec.cfg[i].tiers,
            n: ns[i],
            units: vec.mult[i] * ns[i],
            fpp: vec.mult[i] * ns[i] * cpp,
          }));
          best = { inner, outer: out, cpp, members, score };
        }
      }
    }
  }
  return best;
}

/**
 * Candidate inner dimensions are "the smallest size that fits X", so they must
 * never round DOWN: Math.round would turn a required 603.852 into 603.85 and
 * the requirement would no longer be satisfied, silently discarding the
 * candidate. Rounding up keeps the de-duplication without shrinking anything.
 */
function ceil2(x: number): number {
  return Math.ceil(x * 100) / 100;
}

// ── Partition solver ──────────────────────────────────────────────────────────

// Browsers clamp nested setTimeout(0) to ~4ms, which would dominate a solve
// that yields thousands of times. A MessageChannel round-trip is not clamped,
// so it hands the UI a paint opportunity at a fraction of the cost.
type LoopPort = MessagePort & { ref?: () => void; unref?: () => void };
let yieldSend: LoopPort | null = null;
let yieldRecv: LoopPort | null = null;
const yieldQueue: (() => void)[] = [];

/**
 * Hold Node's event loop open only while a yield is actually in flight — an
 * always-ref'd port would never let a CLI exit, an always-unref'd one would let
 * it exit mid-solve. Browsers have no ref/unref and simply ignore this.
 */
function setLoopRef(on: boolean): void {
  for (const port of [yieldSend, yieldRecv]) {
    if (!port) continue;
    if (on) port.ref?.();
    else port.unref?.();
  }
}

function yieldToUi(): Promise<void> {
  if (typeof MessageChannel === 'undefined') {
    return new Promise((resolve) => setTimeout(resolve, 0));
  }
  if (!yieldRecv) {
    const channel = new MessageChannel();
    yieldRecv = channel.port1 as LoopPort;
    yieldSend = channel.port2 as LoopPort;
    yieldRecv.onmessage = () => {
      const next = yieldQueue.shift();
      if (yieldQueue.length === 0) setLoopRef(false);
      if (next) next();
    };
    yieldRecv.start();
    setLoopRef(false);
  }
  return new Promise((resolve) => {
    yieldQueue.push(resolve);
    setLoopRef(true);
    yieldSend!.postMessage(0);
  });
}

/** Yield at most once per frame budget, so long solves stay responsive. */
const FRAME_BUDGET_MS = 12;

interface SolverState {
  ctx: EvalContext;
  oriented: OrientedPrism[];
  memo: Map<string, GroupEval | null>;
  misses: number;
  token: CancelToken;
  onProgress?: (u: ProgressUpdate) => void;
  /** Timestamp of the last UI yield, for the frame-budget check. */
  lastYield: number;
}

/** Hand the UI a slot only when this run has held the thread past its budget. */
async function breathe(state: SolverState): Promise<void> {
  const now = Date.now();
  if (now - state.lastYield < FRAME_BUDGET_MS) return;
  state.lastYield = now;
  await yieldToUi();
}

async function evalGroup(state: SolverState, idxs: number[]): Promise<GroupEval | null> {
  const key = [...idxs].sort((a, b) => a - b).join(',');
  const hit = state.memo.get(key);
  if (hit !== undefined) return hit;
  if (state.token.cancelled) throw new SolveCancelled();
  const res = bestCartonForGroup(idxs, state.oriented, state.ctx);
  state.memo.set(key, res);
  state.misses++;
  await breathe(state);
  if (state.token.cancelled) throw new SolveCancelled();
  return res;
}

const NEG = -Infinity;

async function totalScore(state: SolverState, groups: number[][]): Promise<number> {
  let sum = 0;
  for (const g of groups) {
    const ev = await evalGroup(state, g);
    if (!ev) return NEG;
    sum += ev.score;
  }
  return sum;
}

/**
 * Derive a (K+1)-group seed from a K-group solution by applying the best
 * single binary split. Splitting a group never lowers its members' score, so
 * the resulting seed scores at least as well as the K-group solution — this
 * keeps the metric-vs-K curve monotone by construction.
 */
async function splitSeed(state: SolverState, groups: number[][]): Promise<number[][] | null> {
  const { oriented } = state;
  let best: { gi: number; left: number[]; right: number[]; delta: number } | null = null;
  for (let gi = 0; gi < groups.length; gi++) {
    const g = groups[gi];
    if (g.length < 2) continue;
    const base = await evalGroup(state, g);
    if (!base) continue;
    const sorted = [...g].sort(
      (a, b) => oriented[a].dl - oriented[b].dl || oriented[a].dd - oriented[b].dd || oriented[a].dw - oriented[b].dw,
    );
    for (let s = 1; s < sorted.length; s++) {
      const left = sorted.slice(0, s);
      const right = sorted.slice(s);
      const evL = await evalGroup(state, left);
      const evR = await evalGroup(state, right);
      if (!evL || !evR) continue;
      const delta = evL.score + evR.score - base.score;
      if (!best || delta > best.delta) best = { gi, left, right, delta };
    }
  }
  if (!best) return null;
  const out = groups.filter((_, i) => i !== best.gi).map((g) => [...g]);
  out.push(best.left, best.right);
  return out;
}

async function dpPartition(
  state: SolverState,
  order: number[],
  k: number,
  progressBase: number,
  progressSpan: number,
): Promise<{ groups: number[][]; score: number } | null> {
  const n = order.length;
  // seg[i][j] = score of group covering order[i..j] inclusive.
  const seg: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(NEG));
  let done = 0;
  const total = (n * (n + 1)) / 2;
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      const g = await evalGroup(state, order.slice(i, j + 1));
      seg[i][j] = g ? g.score : NEG;
      done++;
      if (done % 64 === 0) {
        state.onProgress?.({ label: 'Evaluating carton candidates', frac: progressBase + (progressSpan * done) / total });
      }
    }
  }

  // dp[j][kk]: best score for the first j prisms in kk groups.
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(k + 1).fill(NEG));
  const from: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(k + 1).fill(-1));
  dp[0][0] = 0;
  for (let j = 1; j <= n; j++) {
    for (let kk = 1; kk <= Math.min(k, j); kk++) {
      for (let i = kk - 1; i < j; i++) {
        if (dp[i][kk - 1] === NEG || seg[i][j - 1] === NEG) continue;
        const cand = dp[i][kk - 1] + seg[i][j - 1];
        if (cand > dp[j][kk]) {
          dp[j][kk] = cand;
          from[j][kk] = i;
        }
      }
    }
  }
  if (dp[n][k] === NEG) return null;

  const groups: number[][] = [];
  let j = n;
  let kk = k;
  while (kk > 0) {
    const i = from[j][kk];
    groups.unshift(order.slice(i, j));
    j = i;
    kk--;
  }
  return { groups, score: dp[n][k] };
}

async function polish(
  state: SolverState,
  groups: number[][],
  budget: number,
): Promise<number[][]> {
  const scores = await Promise.all(groups.map((g) => evalGroup(state, g)));
  const cur = scores.map((s) => (s ? s.score : NEG));
  let spent = 0;

  for (let pass = 0; pass < 24 && spent < budget; pass++) {
    let improved = false;
    for (let gi = 0; gi < groups.length && spent < budget; gi++) {
      for (const idx of [...groups[gi]]) {
        if (groups[gi].length <= 1) break; // group must stay non-empty
        if (!groups[gi].includes(idx)) continue; // already moved this pass
        const without = groups[gi].filter((x) => x !== idx);
        const evalWithout = await evalGroup(state, without);
        spent++;
        if (!evalWithout) continue;
        let bestDelta = EPS;
        let bestTarget = -1;
        let bestTargetScore = 0;
        for (let gj = 0; gj < groups.length; gj++) {
          if (gj === gi) continue;
          const evalWith = await evalGroup(state, [...groups[gj], idx]);
          spent++;
          if (!evalWith) continue;
          const delta = evalWithout.score + evalWith.score - cur[gi] - cur[gj];
          if (delta > bestDelta) {
            bestDelta = delta;
            bestTarget = gj;
            bestTargetScore = evalWith.score;
          }
        }
        if (bestTarget >= 0) {
          groups[gi] = without;
          groups[bestTarget] = [...groups[bestTarget], idx];
          cur[gi] = evalWithout.score;
          cur[bestTarget] = bestTargetScore;
          improved = true;
        }
      }
    }
    if (!improved) break;
  }
  return groups;
}

// ── Public solve API ──────────────────────────────────────────────────────────

function feasibilityIssue(op: OrientedPrism, ctx: EvalContext): string | null {
  const { pad, settings, configs } = ctx;
  const { mapping } = settings;

  if (op.fixed != null && !configs.some((c) => op.fixed! % (c.cols * c.tiers) === 0)) {
    return `its set count of ${op.fixed} per carton cannot be split evenly across any enabled packing orientation`;
  }

  // The row across L and the tiers down D depend only on the prism and the
  // configuration, so check each against its own axis cap and name whichever
  // one blocks it — each cap is a separate setting to adjust.
  const fitsL = (c: ColumnConfig) => c.cols * op.dl + pad.padL <= pad.maxInnerL + EPS;
  const fitsD = (c: ColumnConfig) => c.tiers * op.dd + pad.padD <= pad.maxInnerD + EPS;
  const sizeFits = configs.filter((c) => fitsL(c) && fitsD(c));
  if (sizeFits.length === 0) {
    const anyL = configs.some(fitsL);
    const anyD = configs.some(fitsD);
    if (!anyL && !anyD) {
      return `its ${mapping.major} does not fit the max major-flap side (L) and its ${mapping.depth} does not fit the max depth (D) with any enabled packing orientation`;
    }
    if (!anyL) return `its ${mapping.major} does not fit the max major-flap side (L) with any enabled packing orientation`;
    if (!anyD) return `its ${mapping.depth} does not fit the max depth (D) with any enabled packing orientation`;
    return 'no enabled packing orientation fits it within both the max major-flap side (L) and the max depth (D)';
  }

  // The smallest viable stack count per configuration: the prescribed count,
  // or enough to reach the minimum units per carton. Null when a prescribed
  // count cannot split evenly across the configuration.
  const minStack = (c: ColumnConfig): number | null => {
    const m = c.cols * c.tiers;
    if (op.fixed != null) {
      if (op.fixed % m !== 0) return null;
      return op.fixed / m;
    }
    return Math.max(1, Math.ceil((settings.minUnitsPerCarton - EPS) / m));
  };
  /** Inner W that smallest stack needs (null when the count cannot split). */
  const minStackW = (c: ColumnConfig): number | null => {
    const n = minStack(c);
    return n == null ? null : n * op.dw + pad.padW;
  };

  const stackable = sizeFits.filter((c) => minStack(c) != null);
  if (stackable.length === 0) {
    // Only a prescribed count gets here: every orientation that splits it
    // evenly is too big along L or D.
    return `its set count of ${op.fixed} per carton only splits evenly across packing orientations that exceed the max major-flap side (L) or the max depth (D)`;
  }

  // The stack must fit the minor-flap side's own cap…
  const withinW = stackable.filter((c) => minStackW(c)! <= pad.maxInnerW + EPS);
  if (withinW.length === 0) {
    if (op.dw + pad.padW > pad.maxInnerW + EPS) {
      return `its ${mapping.minor} does not fit the max minor-flap side (W) even one at a time`;
    }
    return op.fixed != null
      ? `its set count of ${op.fixed} per carton needs a deeper stack than the max minor-flap side (W) allows with every enabled packing orientation`
      : `it cannot reach the minimum ${settings.minUnitsPerCarton} prisms per carton within the max minor-flap side (W)`;
  }

  // …and the major-flap side's cap too: L is widened to the stack whenever the
  // stack is the longer of the two, so the flaps can close. This can only
  // block a SKU when the W max is set above the L max.
  const viable = withinW.filter((c) => minStackW(c)! <= pad.maxInnerL + EPS);
  if (viable.length === 0) {
    return op.fixed != null
      ? `its set count of ${op.fixed} per carton needs a stack longer than the max major-flap side (L), and the major-flap side must be at least as long as the stack for the carton to close — lower the count, enable a 2-across orientation, or raise the L max`
      : `reaching the minimum ${settings.minUnitsPerCarton} prisms per carton needs a stack longer than the max major-flap side (L), and the major-flap side must be at least as long as the stack for the carton to close — raise the L max, enable a 2-across orientation, or lower the minimum`;
  }

  // Smallest closable carton for a configuration: the major-flap side is
  // widened to the stack width when the stack is the longer of the two, so a
  // narrow prism just leaves dead space beside the column rather than failing.
  const minInner = (c: ColumnConfig): Dims => {
    const w = minStackW(c)!;
    return { l: Math.max(c.cols * op.dl + pad.padL, w), w, d: c.tiers * op.dd + pad.padD };
  };
  const fitsPallet = viable.some(
    (c) => cartonsPerPallet(innerToOuter(minInner(c), settings.wall), settings, ctx.tileCache) > 0,
  );
  if (!fitsPallet) {
    return 'its smallest viable carton does not fit the pallet footprint or max load height';
  }
  return null;
}

export async function solve(
  prisms: PrismSku[],
  settings: Settings,
  onProgress?: (u: ProgressUpdate) => void,
  token: CancelToken = { cancelled: false },
): Promise<SolveResult> {
  const started = Date.now();
  const configs = COLUMN_CONFIGS.filter((c) => settings.allowedConfigs.includes(c.id));
  let oriented = prisms.map((p) => orientPrism(p, settings.mapping));
  const pad = paddings(settings);
  const tileCache: TileCache = new Map();

  const baseCtx: EvalContext = {
    settings,
    pad,
    configs,
    tileCache,
    ideals: new Array<number>(prisms.length).fill(1),
    objective: 'wfpp',
    candWCap: 160,
  };

  // Up-front feasibility screen.
  const issues: PrismIssue[] = [];
  const totalPrisms = prisms.length;
  if (configs.length === 0) {
    return {
      solutions: [],
      issues: prisms.map((p) => ({ prism: p, reason: 'no packing orientation is enabled' })),
      goalK: settings.goalSkus,
      elapsedMs: 0,
      totalPrisms,
      packedPrisms: 0,
    };
  }
  // Un-packable SKUs are set aside and reported; the run continues on the rest
  // so one bad size never blocks the whole simulation.
  const packable: OrientedPrism[] = [];
  oriented.forEach((op) => {
    const issue = feasibilityIssue(op, baseCtx);
    if (issue) issues.push({ prism: op.prism, reason: issue });
    else packable.push(op);
  });
  oriented = packable;
  if (oriented.length === 0) {
    return { solutions: [], issues, goalK: settings.goalSkus, elapsedMs: Date.now() - started, totalPrisms, packedPrisms: 0 };
  }

  // Ideal (dedicated-carton) prisms/pallet per SKU — the efficiency baseline.
  // Evaluated with unit weight so a zero-usage SKU still gets a real baseline
  // (its own usage would zero out every candidate's score).
  onProgress?.({ label: 'Sizing ideal dedicated cartons', frac: 0.02 });
  const orientedIdeal = oriented.map((op) => ({ ...op, weight: 1 }));
  const idealState: SolverState = { ctx: baseCtx, oriented: orientedIdeal, memo: new Map(), misses: 0, token, onProgress, lastYield: Date.now() };
  const ideals = new Array<number>(oriented.length).fill(EPS);
  for (let i = 0; i < oriented.length; i++) {
    const g = await evalGroup(idealState, [i]);
    ideals[i] = g ? g.members[0].fpp : EPS;
  }

  // Authoritative screen: the analytic check above explains *why* a SKU fails,
  // but only the real carton search decides. Anything that cannot be built a
  // dedicated carton is dropped here too, so one bad SKU can never make every
  // grouping infeasible.
  const stillPackable: OrientedPrism[] = [];
  const keptIdeals: number[] = [];
  oriented.forEach((op, i) => {
    if (ideals[i] > EPS) {
      stillPackable.push(op);
      keptIdeals.push(ideals[i]);
    } else {
      issues.push({ prism: op.prism, reason: 'no carton within the current limits can hold it' });
    }
  });
  oriented = stillPackable;
  if (oriented.length === 0) {
    return { solutions: [], issues, goalK: settings.goalSkus, elapsedMs: Date.now() - started, totalPrisms, packedPrisms: 0 };
  }

  const ctx: EvalContext = { ...baseCtx, ideals: keptIdeals, objective: settings.objective };
  const state: SolverState = { ctx, oriented, memo: new Map(), misses: 0, token, onProgress, lastYield: Date.now() };

  const n = oriented.length;
  // Clamp the low end to the packable count too, so a heavily-skipped run still
  // reports the sweep points it can rather than an empty table.
  const kLo = Math.max(1, Math.min(settings.goalSkus - settings.kSpread, n));
  const kHi = Math.min(n, settings.goalSkus + settings.kSpread);
  const ks: number[] = [];
  for (let k = kLo; k <= kHi; k++) ks.push(k);

  // Two sort orders share most segment evaluations through the memo.
  const byL = oriented.map((_, i) => i).sort(
    (a, b) => oriented[a].dl - oriented[b].dl || oriented[a].dd - oriented[b].dd || oriented[a].dw - oriented[b].dw,
  );
  const byD = oriented.map((_, i) => i).sort(
    (a, b) => oriented[a].dd - oriented[b].dd || oriented[a].dl - oriented[b].dl || oriented[a].dw - oriented[b].dw,
  );
  const orders = n <= 90 ? [byL, byD] : [byL];

  const solutions: SolutionK[] = [];
  let prevGroups: number[][] | null = null;
  for (let ki = 0; ki < ks.length; ki++) {
    const k = ks[ki];
    const base = 0.05 + (0.93 * ki) / ks.length;
    const span = 0.93 / ks.length;
    onProgress?.({ label: `Optimizing ${k} carton SKU${k === 1 ? '' : 's'}`, frac: base });

    // Candidate starts: the interval DP over each sort order, plus a split of
    // the previous K's solution.
    const candidates: number[][][] = [];
    for (const order of orders) {
      const res = await dpPartition(state, order, k, base, span * 0.7);
      if (res) candidates.push(res.groups);
    }
    if (prevGroups && prevGroups.length === k - 1) {
      const seeded = await splitSeed(state, prevGroups);
      if (seeded) candidates.push(seeded);
    }

    // Local search is what decides quality, and the best pre-search candidate
    // does not always polish to the best result — so polish each and compare
    // finished scores. The memo makes the extra passes mostly cache hits.
    onProgress?.({ label: `Refining ${k}-SKU grouping`, frac: base + span * 0.75 });
    let bestGroups: number[][] | null = null;
    let bestScore = NEG;
    for (const cand of candidates) {
      const polished = await polish(state, cand.map((g) => [...g]), 2600);
      const score = await totalScore(state, polished);
      if (score > bestScore) {
        bestScore = score;
        bestGroups = polished;
      }
    }
    solutions.push(await buildSolution(state, k, bestGroups));
    prevGroups = bestGroups;
  }

  onProgress?.({ label: 'Done', frac: 1 });
  return { solutions, issues, goalK: settings.goalSkus, elapsedMs: Date.now() - started, totalPrisms, packedPrisms: oriented.length };
}

async function buildSolution(state: SolverState, k: number, groups: number[][] | null): Promise<SolutionK> {
  if (!groups) {
    return { k, feasible: false, cartons: [], weightedFpp: 0, pallets: 0, weightedEff: 0 };
  }
  const { settings } = state.ctx;
  const cartons: CartonSpec[] = [];
  for (const g of groups) {
    const ev = await evalGroup(state, g);
    if (!ev) return { k, feasible: false, cartons: [], weightedFpp: 0, pallets: 0, weightedEff: 0 };
    const plan = palletPlan(ev.outer, settings, state.ctx.tileCache);
    if (!plan) return { k, feasible: false, cartons: [], weightedFpp: 0, pallets: 0, weightedEff: 0 };
    const members: MemberPack[] = ev.members
      .map((m) => {
        const ideal = Math.max(state.ctx.ideals[m.idx], EPS);
        const vol = m.op.prism.width * m.op.prism.height * m.op.prism.depth;
        const innerVol = ev.inner.l * ev.inner.w * ev.inner.d;
        return {
          prism: m.op.prism,
          dl: m.op.dl,
          dd: m.op.dd,
          dw: m.op.dw,
          configId: m.configId,
          cols: m.cols,
          tiers: m.tiers,
          nPerStack: m.n,
          unitsPerCarton: m.units,
          fpp: m.fpp,
          idealFpp: ideal,
          // A shared carton can never beat a dedicated one; the min guards
          // float jitter in the ratio.
          efficiency: Math.min(m.fpp / ideal, 1),
          volumeFill: innerVol > 0 ? (vol * m.units) / innerVol : 0,
        };
      })
      .sort((a, b) => b.prism.usage - a.prism.usage);
    cartons.push({
      label: '',
      inner: ev.inner,
      outer: ev.outer,
      cartonsPerPallet: ev.cpp,
      members,
      usageShare: members.reduce((acc, m) => acc + m.prism.usage, 0),
      pallet: plan,
    });
  }
  cartons.sort((a, b) => b.usageShare - a.usageShare);
  cartons.forEach((c, i) => {
    c.label = String.fromCharCode(65 + (i % 26)) + (i >= 26 ? String(Math.floor(i / 26)) : '');
  });

  let wSum = 0;
  let wFpp = 0;
  let pallets = 0;
  let wEff = 0;
  for (const c of cartons) {
    for (const m of c.members) {
      const w = Math.max(m.prism.usage, 0);
      wSum += w;
      wFpp += w * m.fpp;
      pallets += w / Math.max(m.fpp, EPS);
      wEff += w * m.efficiency;
    }
  }
  return {
    k,
    feasible: true,
    cartons,
    weightedFpp: wSum > 0 ? wFpp / wSum : 0,
    pallets,
    weightedEff: wSum > 0 ? wEff / wSum : 0,
  };
}

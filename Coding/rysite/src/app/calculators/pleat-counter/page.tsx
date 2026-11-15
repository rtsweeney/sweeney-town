'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import Footer from '@/components/Footer';

// ── Types ─────────────────────────────────────────────────────────────────────
type Pt = [number, number];
type Quad = [Pt, Pt, Pt, Pt]; // TL, TR, BR, BL
interface Peak { x: number; v: number; prom: number }
interface RectData { rect: Float32Array; RW: number; RH: number; H: number[]; Hinv: number[] }
interface RectAnalysis { shearDeg: number; profile: Float32Array; det: Float32Array; pitch: number; peaks: Peak[] }
interface AnalyzeOpts { promFrac?: number; spacingFrac?: number; shearRange?: number; shearCenter?: number; mask?: Uint8Array | null }
interface AppState {
  img: ImageBitmap | HTMLImageElement | null;
  gray: Float32Array | null; gw: number; gh: number;
  aScale: number;
  quad: Quad | null;
  rectData: RectData | null;
  transposed: boolean;
  result: RectAnalysis | null;
  removed: Set<number>;
  manual: number[];
  grateMask: Uint8Array | null; openPct: number | null;
  dragging: number;
  dispScale: number; dispOx: number; dispOy: number;
}

// ================= core pipeline (validated) =================
function computeHomography(src: Pt[], dst: Pt[]): number[] {
  const M: number[][] = [], b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i]; const [u, v] = dst[i];
    M.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
    M.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
  }
  const h = solve8(M, b);
  return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
}
function solve8(M: number[][], b: number[]): number[] {
  const n = 8, a = M.map((row, i) => row.concat([b[i]]));
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(a[r][col]) > Math.abs(a[piv][col])) piv = r;
    [a[col], a[piv]] = [a[piv], a[col]];
    const d = a[col][col] || 1e-12;
    for (let c = col; c <= n; c++) a[col][c] /= d;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = a[r][col];
      for (let c = col; c <= n; c++) a[r][c] -= f * a[col][c];
    }
  }
  return a.map(row => row[n]);
}
function invertH(H: number[]): number[] {
  const [a, b, c, d, e, f, g, h, i] = H;
  const A = (e * i - f * h), B = -(d * i - f * g), C = (d * h - e * g), D = -(b * i - c * h), E = (a * i - c * g), F = -(a * h - b * g),
    G = (b * f - c * e), Hh = -(a * f - c * d), I = (a * e - b * d);
  const det = a * A + b * B + c * C;
  return [A / det, D / det, G / det, B / det, E / det, Hh / det, C / det, F / det, I / det];
}
function applyH(H: number[], x: number, y: number): Pt {
  const w = H[6] * x + H[7] * y + H[8];
  return [(H[0] * x + H[1] * y + H[2]) / w, (H[3] * x + H[4] * y + H[5]) / w];
}
function bilinear(g: Float32Array, w: number, h: number, x: number, y: number): number {
  if (x < 0 || y < 0 || x > w - 1 || y > h - 1) return 0;
  const x0 = Math.floor(x), y0 = Math.floor(y), x1 = Math.min(x0 + 1, w - 1), y1 = Math.min(y0 + 1, h - 1), fx = x - x0, fy = y - y0;
  return g[y0 * w + x0] * (1 - fx) * (1 - fy) + g[y0 * w + x1] * fx * (1 - fy) + g[y1 * w + x0] * (1 - fx) * fy + g[y1 * w + x1] * fx * fy;
}
function rectify(gray: Float32Array, w: number, h: number, quad: Quad, targetW: number): RectData {
  const [tl, tr, br, bl] = quad;
  const topLen = Math.hypot(tr[0] - tl[0], tr[1] - tl[1]), botLen = Math.hypot(br[0] - bl[0], br[1] - bl[1]);
  const leftLen = Math.hypot(bl[0] - tl[0], bl[1] - tl[1]), rightLen = Math.hypot(br[0] - tr[0], br[1] - tr[1]);
  const RW = Math.round(targetW);
  const RH = Math.max(32, Math.round(RW * ((leftLen + rightLen) / (topLen + botLen))));
  const dst: Pt[] = [[0, 0], [RW - 1, 0], [RW - 1, RH - 1], [0, RH - 1]];
  const H = computeHomography(quad, dst), Hinv = invertH(H);
  const rect = new Float32Array(RW * RH);
  for (let ry = 0; ry < RH; ry++) for (let rx = 0; rx < RW; rx++) {
    const [sx, sy] = applyH(Hinv, rx, ry);
    rect[ry * RW + rx] = bilinear(gray, w, h, sx, sy);
  }
  return { rect, RW, RH, H, Hinv };
}
function columnProfile(rect: Float32Array, RW: number, RH: number, shear: number, mask: Uint8Array | null, fast: boolean): Float32Array {
  const prof = new Float32Array(RW), tanS = Math.tan(shear), samples: number[] = [];
  for (let x = 0; x < RW; x++) {
    samples.length = 0;
    for (let y = 0; y < RH; y++) {
      const sx = x + tanS * (y - RH / 2);
      if (sx < 0 || sx > RW - 1) continue;
      const idx = y * RW + Math.round(sx);
      if (mask && mask[idx]) continue;
      samples.push(rect[idx]);
    }
    if (samples.length < 8) { prof[x] = NaN; continue; }
    if (fast) { let s = 0; for (let i = 0; i < samples.length; i++) s += samples[i]; prof[x] = s / samples.length; continue; }
    samples.sort((a, b) => a - b);
    const lo = Math.floor(samples.length * .25), hi = Math.ceil(samples.length * .75);
    let s = 0, n = 0; for (let i = lo; i < hi; i++) { s += samples[i]; n++; }
    prof[x] = s / n;
  }
  for (let x = 0; x < RW; x++) if (isNaN(prof[x])) prof[x] = prof[x > 0 ? x - 1 : x + 1] || 0;
  return prof;
}
function detrend(prof: Float32Array, win: number): Float32Array {
  const n = prof.length, out = new Float32Array(n), half = Math.max(2, Math.floor(win / 2));
  const ps = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) ps[i + 1] = ps[i] + prof[i];
  for (let i = 0; i < n; i++) { const a = Math.max(0, i - half), b = Math.min(n, i + half + 1); out[i] = prof[i] - (ps[b] - ps[a]) / (b - a); }
  return out;
}
function smoothArr(prof: Float32Array, r: number): Float32Array {
  if (r < 1) return prof.slice();
  const n = prof.length, out = new Float32Array(n), ps = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) ps[i + 1] = ps[i] + prof[i];
  for (let i = 0; i < n; i++) { const a = Math.max(0, i - r), b = Math.min(n, i + r + 1); out[i] = (ps[b] - ps[a]) / (b - a); }
  return out;
}
function estimatePitch(det: Float32Array, minLag: number, maxLag: number): number {
  const n = det.length; maxLag = Math.min(maxLag, Math.floor(n / 2));
  let bestLag = 0, bestVal = -Infinity, e0 = 0;
  for (let i = 0; i < n; i++) e0 += det[i] * det[i];
  if (e0 <= 0) return 0;
  const scores: number[] = [];
  for (let lag = minLag; lag <= maxLag; lag++) {
    let s = 0; for (let i = 0; i + lag < n; i++) s += det[i] * det[i + lag];
    const v = s / e0; scores.push(v);
    if (v > bestVal) { bestVal = v; bestLag = lag; }
  }
  for (let lag = minLag + 1; lag < bestLag; lag++) {
    const i = lag - minLag;
    if (scores[i] > scores[i - 1] && scores[i] > scores[i + 1] && scores[i] > 0.55 * bestVal) return lag;
  }
  return bestLag;
}
function findPeaks(det: Float32Array, minDist: number, promFrac: number): Peak[] {
  const n = det.length;
  const mags = Array.from(det, Math.abs).sort((a, b) => a - b);
  const scale = mags[Math.floor(mags.length * .9)] || 1;
  const minProm = promFrac * scale, cands: number[] = [];
  for (let i = 1; i < n - 1; i++) if (det[i] >= det[i - 1] && det[i] > det[i + 1]) cands.push(i);
  const peaks: Peak[] = [];
  for (const p of cands) {
    let lm = det[p], rm = det[p];
    for (let i = p; i >= Math.max(0, p - minDist * 2); i--) lm = Math.min(lm, det[i]);
    for (let i = p; i <= Math.min(n - 1, p + minDist * 2); i++) rm = Math.min(rm, det[i]);
    const prom = det[p] - Math.max(lm, rm);
    if (prom >= minProm) peaks.push({ x: p, v: det[p], prom });
  }
  peaks.sort((a, b) => b.prom - a.prom);
  const kept: Peak[] = [];
  for (const pk of peaks) if (kept.every(k => Math.abs(k.x - pk.x) >= minDist)) kept.push(pk);
  kept.sort((a, b) => a.x - b.x);
  return kept;
}
function analyzeRect(rect: Float32Array, RW: number, RH: number, opts: AnalyzeOpts = {}): RectAnalysis {
  const promFrac = opts.promFrac ?? 0.35, spacingFrac = opts.spacingFrac ?? 0.6,
    shearRange = opts.shearRange ?? 12, shearCenter = opts.shearCenter ?? 0, mask = opts.mask || null;
  let best = { deg: shearCenter, energy: -Infinity };
  for (let deg = shearCenter - shearRange; deg <= shearCenter + shearRange; deg += 1.5) {
    const prof = columnProfile(rect, RW, RH, deg * Math.PI / 180, mask, true);
    const sm = smoothArr(prof, Math.max(1, Math.round(RW / 400)));
    const rough = detrend(sm, Math.round(RW / 6));
    let energy = 0; for (let i = 0; i < rough.length; i++) energy += rough[i] * rough[i];
    if (energy > best.energy) best = { deg, energy };
  }
  const prof = smoothArr(columnProfile(rect, RW, RH, best.deg * Math.PI / 180, mask, false),
    Math.max(1, Math.round(RW / 400)));
  const minLag = Math.max(4, Math.round(RW / 200));
  let det = detrend(prof, Math.round(RW / 6));
  let pitch = estimatePitch(det, minLag, Math.round(RW / 3));
  if (pitch > 0) {
    det = detrend(prof, Math.round(pitch * 2.5));
    const p2 = estimatePitch(det, minLag, Math.round(RW / 3));
    if (p2 > 0) pitch = p2;
  } else pitch = Math.round(RW / 20);
  const minDist = Math.max(3, Math.round(pitch * spacingFrac));
  const allPeaks = findPeaks(det, minDist, promFrac);
  // The frame runs parallel to the face edges, so the texture jump at either
  // extreme of the profile produces false ridges — skip peaks hugging the ends.
  const edgeMargin = Math.max(3, Math.round(pitch * 0.5));
  const peaks = allPeaks.filter(p => p.x >= edgeMargin && p.x <= det.length - 1 - edgeMargin);
  return { shearDeg: best.deg, profile: prof, det, pitch, peaks };
}
function transposeRect(rect: Float32Array, RW: number, RH: number): Float32Array {
  const out = new Float32Array(RW * RH);
  for (let y = 0; y < RH; y++) for (let x = 0; x < RW; x++) out[x * RH + y] = rect[y * RW + x];
  return out;
}

/* ---------- auto corner detection ----------
   The pleated area is bright AND textured; the frame border and most
   backgrounds are smooth. Segment on local texture, take the largest
   blob, and fit the maximum-area quadrilateral to its convex hull. */
function otsu(arr: Float32Array, bins: number, lo: number, hi: number): number {
  const hist = new Float64Array(bins);
  const scale = (bins - 1) / (hi - lo);
  for (let i = 0; i < arr.length; i++) {
    let b = Math.round((arr[i] - lo) * scale);
    if (b < 0) b = 0; if (b > bins - 1) b = bins - 1;
    hist[b]++;
  }
  const total = arr.length;
  let sum = 0; for (let i = 0; i < bins; i++) sum += i * hist[i];
  let sumB = 0, wB = 0, best = 0, thr = 0;
  for (let i = 0; i < bins; i++) {
    wB += hist[i]; if (!wB) continue;
    const wF = total - wB; if (!wF) break;
    sumB += i * hist[i];
    const mB = sumB / wB, mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > best) { best = between; thr = i; }
  }
  return lo + thr / scale;
}
function autoDetectQuad(gray: Float32Array, gw: number, gh: number): Quad | null {
  const dw = Math.min(300, gw), sc = dw / gw, dh = Math.max(8, Math.round(gh * sc));
  const g = new Float32Array(dw * dh);
  for (let y = 0; y < dh; y++) for (let x = 0; x < dw; x++) g[y * dw + x] = bilinear(gray, gw, gh, x / sc, y / sc);
  // local std via integral images, r=2
  const r = 2, W1 = dw + 1;
  const ps = new Float64Array(W1 * (dh + 1)), ps2 = new Float64Array(W1 * (dh + 1));
  for (let y = 0; y < dh; y++) {
    let rs = 0, rs2 = 0;
    for (let x = 0; x < dw; x++) {
      const v = g[y * dw + x]; rs += v; rs2 += v * v;
      ps[(y + 1) * W1 + x + 1] = ps[y * W1 + x + 1] + rs;
      ps2[(y + 1) * W1 + x + 1] = ps2[y * W1 + x + 1] + rs2;
    }
  }
  const std = new Float32Array(dw * dh);
  for (let y = 0; y < dh; y++) {
    const y0 = Math.max(0, y - r), y1 = Math.min(dh - 1, y + r);
    for (let x = 0; x < dw; x++) {
      const x0 = Math.max(0, x - r), x1 = Math.min(dw - 1, x + r);
      const area = (x1 - x0 + 1) * (y1 - y0 + 1);
      const s = ps[(y1 + 1) * W1 + x1 + 1] - ps[y0 * W1 + x1 + 1] - ps[(y1 + 1) * W1 + x0] + ps[y0 * W1 + x0];
      const s2 = ps2[(y1 + 1) * W1 + x1 + 1] - ps2[y0 * W1 + x1 + 1] - ps2[(y1 + 1) * W1 + x0] + ps2[y0 * W1 + x0];
      const mean = s / area;
      std[y * dw + x] = Math.sqrt(Math.max(0, s2 / area - mean * mean));
    }
  }
  const bThr = otsu(g, 256, 0, 255);
  let sThr = otsu(std, 256, 0, 64);
  sThr = Math.max(3, Math.min(sThr, 18));
  const bin = new Uint8Array(dw * dh);
  for (let i = 0; i < bin.length; i++) bin[i] = (std[i] > sThr && g[i] > bThr * 0.8) ? 1 : 0;
  // morphological close (dilate r=2, erode r=2) to bridge glue lines / hot melt
  const dil = morph(bin, dw, dh, 2, true);
  const clo = morph(dil, dw, dh, 2, false);
  // largest connected component
  const comp = largestComponent(clo, dw, dh);
  if (!comp || comp.pts.length < dw * dh * 0.03) return null;
  // convex hull of component pixels (subsampled)
  const hull = convexHull(comp.pts);
  if (hull.length < 4) return null;
  // subsample hull, brute-force max-area quad
  const H2 = hull.length > 40 ? hull.filter((_, i) => i % Math.ceil(hull.length / 40) === 0) : hull;
  if (H2.length < 4) return null;
  let best: Pt[] | null = null, bestA = 0;
  const n = H2.length;
  for (let i = 0; i < n - 3; i++) for (let j = i + 1; j < n - 2; j++) for (let k = j + 1; k < n - 1; k++) for (let l = k + 1; l < n; l++) {
    const a = quadArea(H2[i], H2[j], H2[k], H2[l]);
    if (a > bestA) { bestA = a; best = [H2[i], H2[j], H2[k], H2[l]]; }
  }
  if (!best || bestA < dw * dh * 0.05) return null;
  // order TL,TR,BR,BL (clockwise on screen), start at min(x+y)
  const cx = best.reduce((s, p) => s + p[0], 0) / 4, cy = best.reduce((s, p) => s + p[1], 0) / 4;
  best.sort((a, b) => Math.atan2(a[1] - cy, a[0] - cx) - Math.atan2(b[1] - cy, b[0] - cx));
  let start = 0, mv = Infinity;
  best.forEach((p, i) => { const v = p[0] + p[1]; if (v < mv) { mv = v; start = i; } });
  const ordered = [0, 1, 2, 3].map(i => best![(start + i) % 4]);
  return ordered.map(([x, y]): Pt => [Math.max(0, Math.min(gw - 1, x / sc)), Math.max(0, Math.min(gh - 1, y / sc))]) as Quad;
}
function morph(bin: Uint8Array, w: number, h: number, r: number, dilate: boolean): Uint8Array {
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let hit = dilate ? 0 : 1;
    for (let dy = -r; dy <= r && (dilate ? !hit : hit); dy++) {
      const yy = y + dy; if (yy < 0 || yy >= h) { if (!dilate) hit = 0; continue; }
      for (let dx = -r; dx <= r; dx++) {
        const xx = x + dx; if (xx < 0 || xx >= w) { if (!dilate) { hit = 0; break; } continue; }
        const v = bin[yy * w + xx];
        if (dilate && v) { hit = 1; break; }
        if (!dilate && !v) { hit = 0; break; }
      }
    }
    out[y * w + x] = hit;
  }
  return out;
}
function largestComponent(bin: Uint8Array, w: number, h: number): { pts: Pt[] } | null {
  const label = new Int32Array(w * h).fill(-1);
  let bestPts: Pt[] | null = null, bestN = 0, cur = 0;
  const stack: number[] = [];
  for (let s = 0; s < w * h; s++) {
    if (!bin[s] || label[s] >= 0) continue;
    stack.length = 0; stack.push(s); label[s] = cur;
    const pts: Pt[] = [];
    while (stack.length) {
      const p = stack.pop()!;
      const px = p % w, py = (p - px) / w;
      pts.push([px, py]);
      const nb = [p - 1, p + 1, p - w, p + w];
      if (px === 0) nb[0] = -1; if (px === w - 1) nb[1] = -1;
      for (const q of nb) {
        if (q < 0 || q >= w * h) continue;
        if (bin[q] && label[q] < 0) { label[q] = cur; stack.push(q); }
      }
    }
    if (pts.length > bestN) { bestN = pts.length; bestPts = pts; }
    cur++;
  }
  return bestPts ? { pts: bestPts } : null;
}
function convexHull(pts: Pt[]): Pt[] {
  const P = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: Pt, a: Pt, b: Pt) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo: Pt[] = [], hi: Pt[] = [];
  for (const p of P) {
    while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop();
    lo.push(p);
  }
  for (let i = P.length - 1; i >= 0; i--) {
    const p = P[i];
    while (hi.length >= 2 && cross(hi[hi.length - 2], hi[hi.length - 1], p) <= 0) hi.pop();
    hi.push(p);
  }
  lo.pop(); hi.pop();
  return lo.concat(hi);
}
function quadArea(a: Pt, b: Pt, c: Pt, d: Pt): number {
  return Math.abs(
    a[0] * b[1] - b[0] * a[1] + b[0] * c[1] - c[0] * b[1] +
    c[0] * d[1] - d[0] * c[1] + d[0] * a[1] - a[0] * d[1]
  ) / 2;
}
function profileEnergy(rect: Float32Array, RW: number, RH: number, mask: Uint8Array | null, center = 0): number {
  let best = 0;
  for (let deg = center - 12; deg <= center + 12; deg += 3) {
    const prof = smoothArr(columnProfile(rect, RW, RH, deg * Math.PI / 180, mask, true), Math.max(1, Math.round(RW / 400)));
    const det = detrend(prof, Math.round(RW / 6));
    let e = 0; for (let i = 0; i < det.length; i++) e += det[i] * det[i];
    best = Math.max(best, e / det.length);
  }
  return best;
}
function transposeMask(mask: Uint8Array, RW: number, RH: number): Uint8Array {
  const out = new Uint8Array(RW * RH);
  for (let y = 0; y < RH; y++) for (let x = 0; x < RW; x++) out[x * RH + y] = mask[y * RW + x];
  return out;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function PleatCounterPage() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let disposed = false;

    function byId<T extends HTMLElement = HTMLElement>(id: string): T {
      return root!.querySelector<T>('#' + id)!;
    }

    // overlay palette mapped to the sweeney.town accent colors
    const C_PLEAT = '#00b894';
    const C_PLEAT_SHADOW = 'rgba(0,184,148,0.5)';
    const C_PLEAT_TXT = 'rgba(0,184,148,0.95)';
    const C_FRAME = '#6c5ce7';
    const C_FRAME_FILL = 'rgba(108,92,231,0.18)';
    const C_ZERO = 'rgba(136,136,164,0.3)';
    const C_TICK_OFF = 'rgba(136,136,164,0.6)';
    const GRATE_R = 232, GRATE_G = 67, GRATE_B = 147;

    const stage = byId<HTMLDivElement>('stage');
    const imgCanvas = byId<HTMLCanvasElement>('imgCanvas');
    const ovCanvas = byId<HTMLCanvasElement>('overlayCanvas');
    const traceCanvas = byId<HTMLCanvasElement>('traceCanvas');
    const dropzone = byId<HTMLDivElement>('dropzone');
    const fileInput = byId<HTMLInputElement>('fileInput');
    const statusEl = byId('status');
    const grateOnEl = byId<HTMLInputElement>('grateOn');
    const grateSliders = byId<HTMLDivElement>('grateSliders');
    const sensEl = byId<HTMLInputElement>('sens');
    const spacingEl = byId<HTMLInputElement>('spacing');
    const tiltEl = byId<HTMLInputElement>('tilt');
    let orientMode: 'auto' | 'v' | 'h' = 'auto';
    const traceInfo = byId('traceInfo');
    const rectCanvas = byId<HTMLCanvasElement>('rectCanvas');
    const rectInfo = byId('rectInfo');
    const ictx = imgCanvas.getContext('2d')!;
    const octx = ovCanvas.getContext('2d')!;

    const S: AppState = {
      img: null,
      gray: null, gw: 0, gh: 0,
      aScale: 1,
      quad: null,
      rectData: null,
      transposed: false,
      result: null,
      removed: new Set<number>(),
      manual: [],
      grateMask: null, openPct: null,
      dragging: -1,
      dispScale: 1, dispOx: 0, dispOy: 0,
    };

    // ---------- image loading ----------
    async function loadFile(file: File) {
      if (!file || !file.type.startsWith('image/')) { setStatus('That file is not an image.'); return; }
      let bmp: ImageBitmap | HTMLImageElement;
      try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
      catch {
        bmp = await new Promise<HTMLImageElement>((res, rej) => {
          const im = new Image();
          im.onload = () => res(im); im.onerror = rej;
          im.src = URL.createObjectURL(file);
        });
      }
      if (disposed) return;
      S.img = bmp;
      // analysis grayscale, max 1400 px on the long side
      const maxDim = 1400, sc = Math.min(1, maxDim / Math.max(bmp.width, bmp.height));
      S.gw = Math.round(bmp.width * sc); S.gh = Math.round(bmp.height * sc); S.aScale = sc;
      const c = document.createElement('canvas'); c.width = S.gw; c.height = S.gh;
      const cx = c.getContext('2d', { willReadFrequently: true })!;
      cx.drawImage(bmp, 0, 0, S.gw, S.gh);
      const d = cx.getImageData(0, 0, S.gw, S.gh).data;
      const gray = new Float32Array(S.gw * S.gh);
      for (let i = 0, p = 0; i < gray.length; i++, p += 4)
        gray[i] = 0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2];
      S.gray = gray;
      S.quad = autoDetectQuad(gray, S.gw, S.gh);
      if (!S.quad) resetQuad();
      S.removed.clear(); S.manual = []; S.result = null; S.grateMask = null; S.openPct = null;
      dropzone.classList.add('hidden');
      layoutStage();
      runAnalysis();
    }
    function resetQuad() {
      const w = S.gw, h = S.gh, ix = w * 0.06, iy = h * 0.06;
      const q: Quad = [[ix, iy], [w - ix, iy], [w - ix, h - iy], [ix, h - iy]];
      S.quad = q;
    }

    // ---------- layout / drawing ----------
    function layoutStage() {
      const cw = stage.clientWidth;
      let ch: number;
      if (S.img) {
        const ar = S.gh / S.gw;
        ch = Math.min(Math.max(cw * ar, 260), window.innerHeight * 0.62);
      } else ch = Math.min(cw * 0.66, 480);
      stage.style.height = ch + 'px';
      const dpr = window.devicePixelRatio || 1;
      [imgCanvas, ovCanvas].forEach(cv => {
        cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
        cv.getContext('2d')!.setTransform(dpr, 0, 0, dpr, 0, 0);
      });
      if (S.img) {
        const s = Math.min(cw / S.gw, ch / S.gh);
        S.dispScale = s;
        S.dispOx = (cw - S.gw * s) / 2; S.dispOy = (ch - S.gh * s) / 2;
        ictx.clearRect(0, 0, cw, ch);
        ictx.imageSmoothingQuality = 'high';
        ictx.drawImage(S.img, S.dispOx, S.dispOy, S.gw * s, S.gh * s);
      }
      drawOverlay();
      drawTrace();
      drawRectPreview();
    }

    function a2d(p: Pt): Pt { return [S.dispOx + p[0] * S.dispScale, S.dispOy + p[1] * S.dispScale]; }
    function d2a(x: number, y: number): Pt { return [(x - S.dispOx) / S.dispScale, (y - S.dispOy) / S.dispScale]; }

    function currentLines(): number[] {
      const result = S.result;
      if (!result) return [];
      const auto = result.peaks.map(p => p.x).filter(x => !S.removed.has(x));
      return auto.concat(S.manual).sort((a, b) => a - b);
    }
    function lineEndpointsAnalysis(pos: number): [Pt, Pt] {
      const { RW, RH, Hinv } = S.rectData!;
      const tanS = Math.tan(S.result!.shearDeg * Math.PI / 180);
      let p0: Pt, p1: Pt;
      if (!S.transposed) {
        p0 = [pos + tanS * (0 - RH / 2), 0]; p1 = [pos + tanS * (RH - 1 - RH / 2), RH - 1];
      } else {
        p0 = [0, pos + tanS * (0 - RW / 2)]; p1 = [RW - 1, pos + tanS * (RW - 1 - RW / 2)];
      }
      return [applyH(Hinv, p0[0], p0[1]), applyH(Hinv, p1[0], p1[1])];
    }

    function drawOverlay() {
      const cw = ovCanvas.clientWidth || stage.clientWidth, ch = stage.clientHeight;
      octx.clearRect(0, 0, cw, ch);
      if (!S.img) return;

      // grating overlay
      if (S.grateMask && grateOnEl.checked) drawGrateOverlay(cw, ch);

      // pleat lines
      const result = S.result, rectData = S.rectData;
      if (result && rectData) {
        const autoSet = new Set(result.peaks.map(p => p.x).filter(x => !S.removed.has(x)));
        const all = currentLines();
        octx.lineWidth = 2;
        octx.shadowColor = C_PLEAT_SHADOW;
        octx.shadowBlur = 4;
        for (const pos of all) {
          const [pa, pb] = lineEndpointsAnalysis(pos);
          const [x0, y0] = a2d(pa), [x1, y1] = a2d(pb);
          octx.strokeStyle = C_PLEAT;
          octx.setLineDash(autoSet.has(pos) ? [] : [6, 5]);
          octx.beginPath(); octx.moveTo(x0, y0); octx.lineTo(x1, y1); octx.stroke();
        }
        octx.setLineDash([]); octx.shadowBlur = 0;
        // numerals every 5th line along top of quad
        octx.font = '600 11px ui-monospace,Menlo,monospace';
        octx.fillStyle = C_PLEAT_TXT;
        all.forEach((pos, i) => {
          if ((i + 1) % 5 !== 0 && i !== 0 && i !== all.length - 1) return;
          const [pa] = lineEndpointsAnalysis(pos);
          const [x, y] = a2d(pa);
          octx.fillText(String(i + 1), x + 3, Math.max(12, y - 4));
        });
      }

      // quad + handles
      const quad = S.quad;
      if (quad) {
        octx.strokeStyle = C_FRAME;
        octx.setLineDash([7, 6]); octx.lineWidth = 1.5;
        octx.beginPath();
        quad.forEach((p, i) => { const [x, y] = a2d(p); if (i) octx.lineTo(x, y); else octx.moveTo(x, y); });
        octx.closePath(); octx.stroke(); octx.setLineDash([]);
        quad.forEach((p, i) => {
          const [x, y] = a2d(p);
          octx.beginPath(); octx.arc(x, y, i === S.dragging ? 11 : 8, 0, Math.PI * 2);
          octx.fillStyle = C_FRAME_FILL; octx.fill();
          octx.lineWidth = 2; octx.strokeStyle = C_FRAME; octx.stroke();
          octx.beginPath(); octx.arc(x, y, 2.4, 0, Math.PI * 2);
          octx.fillStyle = C_FRAME; octx.fill();
        });
      }
    }

    function drawGrateOverlay(cw: number, ch: number) {
      const rectData = S.rectData, quad = S.quad, grateMask = S.grateMask;
      if (!rectData || !quad || !grateMask) return;
      const { RW, RH, H } = rectData;
      // bbox of quad in display px
      const pts = quad.map(a2d);
      const minX = Math.max(0, Math.floor(Math.min(...pts.map(p => p[0]))));
      const maxX = Math.min(cw, Math.ceil(Math.max(...pts.map(p => p[0]))));
      const minY = Math.max(0, Math.floor(Math.min(...pts.map(p => p[1]))));
      const maxY = Math.min(ch, Math.ceil(Math.max(...pts.map(p => p[1]))));
      const w = maxX - minX, h = maxY - minY;
      if (w <= 0 || h <= 0) return;
      const off = document.createElement('canvas'); off.width = w; off.height = h;
      const ox = off.getContext('2d')!;
      const id = ox.createImageData(w, h), dd = id.data;
      for (let yy = 0; yy < h; yy++) {
        for (let xx = 0; xx < w; xx++) {
          const [ax, ay] = d2a(minX + xx, minY + yy);
          const [rx, ry] = applyH(H, ax, ay);
          if (rx < 0 || ry < 0 || rx >= RW || ry >= RH) continue;
          if (grateMask[Math.round(ry) * RW + Math.round(rx)]) {
            const p = (yy * w + xx) * 4;
            dd[p] = GRATE_R; dd[p + 1] = GRATE_G; dd[p + 2] = GRATE_B; dd[p + 3] = 120;
          }
        }
      }
      ox.putImageData(id, 0, 0);
      octx.drawImage(off, minX, minY); // respects the DPR transform, unlike putImageData
    }

    function drawTrace() {
      const dpr = window.devicePixelRatio || 1;
      const cw = traceCanvas.clientWidth, ch = 84;
      traceCanvas.width = cw * dpr; traceCanvas.height = ch * dpr;
      const t = traceCanvas.getContext('2d')!;
      t.setTransform(dpr, 0, 0, dpr, 0, 0);
      t.clearRect(0, 0, cw, ch);
      const result = S.result;
      if (!result) { traceInfo.textContent = '—'; return; }
      const det = result.det, n = det.length;
      let mn = Infinity, mx = -Infinity;
      for (let i = 0; i < n; i++) { mn = Math.min(mn, det[i]); mx = Math.max(mx, det[i]); }
      const rng = (mx - mn) || 1;
      const X = (i: number) => i / (n - 1) * cw, Y = (v: number) => ch - 6 - ((v - mn) / rng) * (ch - 14);
      // zero line
      t.strokeStyle = C_ZERO; t.lineWidth = 1;
      t.beginPath(); t.moveTo(0, Y(0)); t.lineTo(cw, Y(0)); t.stroke();
      // trace
      t.strokeStyle = C_PLEAT; t.lineWidth = 1.4;
      t.beginPath();
      for (let i = 0; i < n; i++) { const x = X(i), y = Y(det[i]); if (i) t.lineTo(x, y); else t.moveTo(x, y); }
      t.stroke();
      // ticks
      const autoSet = new Set(result.peaks.map(p => p.x).filter(x => !S.removed.has(x)));
      for (const p of result.peaks) {
        const kept = autoSet.has(p.x);
        t.strokeStyle = kept ? C_PLEAT : C_TICK_OFF;
        t.lineWidth = kept ? 2 : 1;
        t.beginPath(); t.moveTo(X(p.x), Y(p.v) - 4); t.lineTo(X(p.x), 6); t.stroke();
      }
      t.strokeStyle = C_PLEAT;
      t.setLineDash([3, 3]);
      for (const m of S.manual) { t.beginPath(); t.moveTo(X(m), ch - 6); t.lineTo(X(m), 6); t.stroke(); }
      t.setLineDash([]);
      traceInfo.textContent =
        `pitch ${result.pitch}px · shear ${result.shearDeg.toFixed(1)}°${S.transposed ? ' · horizontal pleats' : ''}`;
    }

    // ---------- corner dragging & click-to-correct ----------
    function pointerPos(e: PointerEvent): Pt {
      const r = ovCanvas.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top];
    }
    let moved = false;
    const onPointerDown = (e: PointerEvent) => {
      if (!S.img || !S.quad) return;
      const quad = S.quad;
      const [x, y] = pointerPos(e);
      moved = false;
      for (let i = 0; i < 4; i++) {
        const [hx, hy] = a2d(quad[i]);
        if (Math.hypot(hx - x, hy - y) < 20) {
          S.dragging = i;
          ovCanvas.setPointerCapture(e.pointerId);
          drawOverlay();
          return;
        }
      }
    };
    const onPointerMove = (e: PointerEvent) => {
      if (S.dragging < 0 || !S.quad) return;
      const quad = S.quad;
      moved = true;
      const [x, y] = pointerPos(e);
      const [ax, ay] = d2a(x, y);
      quad[S.dragging] = [Math.max(0, Math.min(S.gw - 1, ax)), Math.max(0, Math.min(S.gh - 1, ay))];
      drawOverlay();
    };
    // toggle a counted line at a working-orientation position: remove the
    // nearest existing line if one is within tolerance, otherwise add one
    function togglePleatAt(pos: number) {
      const result = S.result;
      if (!result) return;
      const tol = Math.max(4, result.pitch * 0.4);
      let bi = -1, bd = Infinity;
      const lines = currentLines();
      lines.forEach(L => { const d = Math.abs(L - pos); if (d < bd) { bd = d; bi = L; } });
      if (bi >= 0 && bd < tol) {
        const mIdx = S.manual.findIndex(m => Math.abs(m - bi) < 1);
        if (mIdx >= 0) S.manual.splice(mIdx, 1);
        else {
          // it's an auto peak (or was removed→can't be in lines). remove it
          const pk = result.peaks.find(p => Math.abs(p.x - bi) < 1);
          if (pk) S.removed.add(pk.x);
        }
      } else {
        // add: if a removed auto peak is nearby, restore it; else manual
        const nearRemoved = Array.from(S.removed).find(rp => Math.abs(rp - pos) < tol);
        if (nearRemoved !== undefined) S.removed.delete(nearRemoved);
        else S.manual.push(Math.round(pos));
      }
      updateReadouts();
      drawOverlay(); drawTrace();
    }

    const onPointerUp = (e: PointerEvent) => {
      if (S.dragging >= 0) {
        S.dragging = -1;
        if (moved) { S.removed.clear(); S.manual = []; runAnalysis(); }
        drawOverlay();
        return;
      }
      // plain tap: toggle a line
      const result = S.result, rectData = S.rectData;
      if (!result || !rectData) return;
      const [x, y] = pointerPos(e);
      const [ax, ay] = d2a(x, y);
      const { H, RW, RH } = rectData;
      const [rx, ry] = applyH(H, ax, ay);
      if (rx < 0 || ry < 0 || rx >= RW || ry >= RH) return;
      const tanS = Math.tan(result.shearDeg * Math.PI / 180);
      let pos: number;
      if (!S.transposed) pos = rx - tanS * (ry - RH / 2);
      else pos = ry - tanS * (rx - RW / 2);
      togglePleatAt(pos);
    };

    // click in the ridge intensity trace: same toggle, mapped along the profile
    const onTraceClick = (e: MouseEvent) => {
      const result = S.result;
      if (!result) return;
      const r = traceCanvas.getBoundingClientRect();
      if (r.width <= 0) return;
      const frac = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      togglePleatAt(frac * (result.det.length - 1));
    };

    // ---------- analysis ----------
    function setStatus(msg: string) { statusEl.textContent = msg; }

    function runAnalysis() {
      if (!S.gray || !S.quad) return;
      setStatus('Analyzing…');
      requestAnimationFrame(() => { setTimeout(doAnalysis, 10); });
    }
    function doAnalysis() {
      if (disposed) return;
      const gray = S.gray, quad = S.quad;
      if (!gray || !quad) return;
      const t0 = performance.now();
      const quadW = Math.hypot(quad[1][0] - quad[0][0], quad[1][1] - quad[0][1]);
      const targetW = Math.max(300, Math.min(820, Math.round(quadW)));
      S.rectData = rectify(gray, S.gw, S.gh, quad, targetW);
      const { rect, RW, RH } = S.rectData;

      // grating mask first (also feeds the profile if enabled)
      computeGrateMask();
      const maskForProfile = (grateOnEl.checked && S.grateMask) ? S.grateMask : null;

      // orientation: forced by the user, or auto by comparing best periodic
      // energy over the shear sweep for both axes
      let rectT: Float32Array | null = null, maskT: Uint8Array | null = null;
      if (orientMode === 'auto') {
        const tiltGuide = +tiltEl.value;
        const eCol = profileEnergy(rect, RW, RH, maskForProfile, tiltGuide);
        rectT = transposeRect(rect, RW, RH);
        maskT = maskForProfile ? transposeMask(maskForProfile, RW, RH) : null;
        const eRow = profileEnergy(rectT, RH, RW, maskT, tiltGuide);
        S.transposed = eRow > eCol * 1.15;
      } else {
        S.transposed = orientMode === 'h';
        if (S.transposed) {
          rectT = transposeRect(rect, RW, RH);
          maskT = maskForProfile ? transposeMask(maskForProfile, RW, RH) : null;
        }
      }

      const promFrac = +sensEl.value / 100;
      const spacingFrac = +spacingEl.value / 100;
      const opts: AnalyzeOpts = {
        promFrac, spacingFrac,
        shearCenter: +tiltEl.value,
        mask: S.transposed ? maskT : maskForProfile,
      };
      S.result = S.transposed
        ? analyzeRect(rectT!, RH, RW, opts)
        : analyzeRect(rect, RW, RH, opts);

      const ms = Math.round(performance.now() - t0);
      setStatus(`Done in ${ms} ms · pleats ${S.transposed ? 'horizontal' : 'vertical'} in frame${orientMode !== 'auto' ? ' (forced)' : ''} · shear ${S.result.shearDeg.toFixed(1)}°`);
      updateReadouts();
      drawOverlay(); drawTrace(); drawRectPreview();
    }

    // ---------- rectified preview panel ----------
    function drawRectPreview() {
      const canvas = rectCanvas;
      const panel = canvas.parentElement!;
      const rectData = S.rectData;
      if (!rectData) { canvas.width = 0; canvas.height = 0; rectInfo.textContent = '—'; return; }
      const { rect, RW, RH } = rectData;
      const availW = panel.clientWidth - 2;
      const sc = Math.min(availW / RW, 240 / RH);
      const dw = Math.max(1, Math.round(RW * sc)), dh = Math.max(1, Math.round(RH * sc));
      const dpr = window.devicePixelRatio || 1;
      canvas.width = dw * dpr; canvas.height = dh * dpr;
      canvas.style.width = dw + 'px'; canvas.style.height = dh + 'px';
      // build at native rect resolution offscreen, then scale
      const off = document.createElement('canvas'); off.width = RW; off.height = RH;
      const ox = off.getContext('2d')!;
      const id = ox.createImageData(RW, RH), dd = id.data;
      const showMask = grateOnEl.checked && S.grateMask;
      for (let i = 0; i < RW * RH; i++) {
        const v = rect[i], p = i * 4;
        if (showMask && S.grateMask![i]) {
          dd[p] = Math.round(v * 0.35 + GRATE_R * 0.55);
          dd[p + 1] = Math.round(v * 0.35 + GRATE_G * 0.55);
          dd[p + 2] = Math.round(v * 0.35 + GRATE_B * 0.55);
        } else {
          dd[p] = dd[p + 1] = dd[p + 2] = v;
        }
        dd[p + 3] = 255;
      }
      ox.putImageData(id, 0, 0);
      const ctx = canvas.getContext('2d')!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(off, 0, 0, dw, dh);
      // pleat lines
      const result = S.result;
      if (result) {
        const tanS = Math.tan(result.shearDeg * Math.PI / 180);
        const autoSet = new Set(result.peaks.map(p => p.x).filter(x => !S.removed.has(x)));
        ctx.lineWidth = 1.5;
        for (const pos of currentLines()) {
          ctx.strokeStyle = C_PLEAT;
          ctx.setLineDash(autoSet.has(pos) ? [] : [5, 4]);
          ctx.beginPath();
          if (!S.transposed) {
            ctx.moveTo((pos + tanS * (0 - RH / 2)) * sc, 0);
            ctx.lineTo((pos + tanS * (RH - 1 - RH / 2)) * sc, dh);
          } else {
            ctx.moveTo(0, (pos + tanS * (0 - RW / 2)) * sc);
            ctx.lineTo(dw, (pos + tanS * (RW - 1 - RW / 2)) * sc);
          }
          ctx.stroke();
        }
        ctx.setLineDash([]);
      }
      rectInfo.textContent = `${RW}×${RH}px` +
        (grateOnEl.checked && S.openPct != null ? ` · open ${S.openPct.toFixed(1)}%` : '');
    }

    // ---------- grating / open area ----------
    function computeGrateMask() {
      if (!grateOnEl.checked || !S.rectData) { S.grateMask = null; S.openPct = null; return; }
      const { rect, RW, RH } = S.rectData;
      const bT = +byId<HTMLInputElement>('gBright').value;
      const tT = +byId<HTMLInputElement>('gTex').value;
      // integral images for local std (window r)
      const r = 3;
      const ps = new Float64Array((RW + 1) * (RH + 1)), ps2 = new Float64Array((RW + 1) * (RH + 1));
      for (let y = 0; y < RH; y++) {
        let rs = 0, rs2 = 0;
        for (let x = 0; x < RW; x++) {
          const v = rect[y * RW + x]; rs += v; rs2 += v * v;
          ps[(y + 1) * (RW + 1) + x + 1] = ps[y * (RW + 1) + x + 1] + rs;
          ps2[(y + 1) * (RW + 1) + x + 1] = ps2[y * (RW + 1) + x + 1] + rs2;
        }
      }
      const mask = new Uint8Array(RW * RH);
      let cnt = 0;
      for (let y = 0; y < RH; y++) {
        const y0 = Math.max(0, y - r), y1 = Math.min(RH - 1, y + r);
        for (let x = 0; x < RW; x++) {
          const v = rect[y * RW + x];
          if (v < bT) continue;
          const x0 = Math.max(0, x - r), x1 = Math.min(RW - 1, x + r);
          const area = (x1 - x0 + 1) * (y1 - y0 + 1);
          const s = ps[(y1 + 1) * (RW + 1) + x1 + 1] - ps[(y0) * (RW + 1) + x1 + 1] - ps[(y1 + 1) * (RW + 1) + x0] + ps[(y0) * (RW + 1) + x0];
          const s2 = ps2[(y1 + 1) * (RW + 1) + x1 + 1] - ps2[(y0) * (RW + 1) + x1 + 1] - ps2[(y1 + 1) * (RW + 1) + x0] + ps2[(y0) * (RW + 1) + x0];
          const mean = s / area, vari = Math.max(0, s2 / area - mean * mean);
          if (Math.sqrt(vari) <= tT) { mask[y * RW + x] = 1; cnt++; }
        }
      }
      S.grateMask = mask;
      S.openPct = 100 * (1 - cnt / (RW * RH));
    }

    let grateTimer: ReturnType<typeof setTimeout> | null = null;
    function grateSliderInput(id: string, outId: string, suffix = '') {
      const el = byId<HTMLInputElement>(id), out = byId(outId);
      el.addEventListener('input', () => {
        out.textContent = el.value + suffix;
        if (grateTimer) clearTimeout(grateTimer);
        grateTimer = setTimeout(() => {
          if (disposed) return;
          if (S.rectData) { computeGrateMask(); updateReadouts(); drawOverlay(); drawRectPreview(); }
        }, 70);
      });
      el.addEventListener('change', () => { if (grateOnEl.checked) runAnalysis(); });
    }

    // ---------- readouts ----------
    let depthUnit: 'in' | 'mm' = 'in';
    function depthInches(): number {
      const v = parseFloat(byId<HTMLInputElement>('pleatDepth').value);
      if (!isFinite(v)) return NaN;
      return depthUnit === 'mm' ? v / 25.4 : v;
    }
    function setDepthUnit(u: 'in' | 'mm') {
      if (u === depthUnit) return;
      const input = byId<HTMLInputElement>('pleatDepth');
      const v = parseFloat(input.value);
      if (isFinite(v)) {
        input.value = u === 'mm' ? String(+(v * 25.4).toFixed(2)) : String(+(v / 25.4).toFixed(3));
      }
      input.step = u === 'mm' ? '0.5' : '0.125';
      input.min = u === 'mm' ? '1' : '0.125';
      depthUnit = u;
      byId('depthIn').classList.toggle('active', u === 'in');
      byId('depthMm').classList.toggle('active', u === 'mm');
      updateReadouts();
    }

    function updateReadouts() {
      const result = S.result;
      const n = result ? currentLines().length : 0;
      byId('roCount').textContent = result ? String(n) : '—';
      byId('headCount').innerHTML = result ? `pleats <b>${n}</b>` : 'no image';
      // dimension ACROSS the pleats: quad width if pleats are vertical in frame,
      // quad height if they run horizontally; the media sheet width runs ALONG them
      const faceW = parseFloat(byId<HTMLInputElement>('faceW').value);
      const faceH = parseFloat(byId<HTMLInputElement>('faceH').value);
      const depth = depthInches();
      const across = S.transposed ? faceH : faceW;
      const along = S.transposed ? faceW : faceH;
      const ppfLabel = byId('roPPFLabel'), ppfSub = byId('roPPFSub');
      ppfLabel.textContent = 'Pleats / ft';
      ppfSub.textContent = '';
      if (result && result.pitch > 0) {
        let txt = `${result.pitch}<small> px</small>`;
        let ppf = '—';
        if (across > 0 && S.rectData) {
          const workW = S.transposed ? S.rectData.RH : S.rectData.RW;
          const pitchIn = result.pitch * across / workW;
          if (n >= 50) {
            // minipleat territory: metric pitch, PPI + pleats/dm
            const pitchMm = pitchIn * 25.4;
            txt = `${pitchMm.toFixed(2)}<small> mm</small>`;
            ppfLabel.textContent = 'PPI';
            ppf = (1 / pitchIn).toFixed(2);
            ppfSub.textContent = `${(100 / pitchMm).toFixed(1)} pleats / dm`;
          } else {
            txt = `${pitchIn.toFixed(3)}<small> in</small>`;
            ppf = (12 / pitchIn).toFixed(1);
          }
        }
        byId('roPitch').innerHTML = txt;
        byId('roPPF').textContent = ppf;
      } else {
        byId('roPitch').textContent = '—';
        byId('roPPF').textContent = '—';
      }
      // media area: each pleat is a V of media ≈ 2 × depth, times the sheet width
      if (result && n > 0 && depth > 0 && along > 0) {
        const sqft = n * 2 * depth * along / 144;
        byId('roMedia').innerHTML = `${sqft.toFixed(2)}<small> ft²</small>`;
      } else {
        byId('roMedia').textContent = '—';
      }
      byId('roOpen').innerHTML =
        (grateOnEl.checked && S.openPct != null) ? `${S.openPct.toFixed(1)}<small> %</small>` : '—';
    }

    // ---------- wiring ----------
    const onDropzoneClick = () => fileInput.click();
    const onDropzoneKey = (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') fileInput.click(); };
    const onFileChange = (e: Event) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) loadFile(f); };
    const onNewImage = () => fileInput.click();
    const onAutoCorners = () => {
      if (!S.gray) return;
      const q = autoDetectQuad(S.gray, S.gw, S.gh);
      if (q) { S.quad = q; S.removed.clear(); S.manual = []; runAnalysis(); }
      else setStatus('Could not find the filter automatically — drag the corners by hand.');
    };
    const onGrateToggle = () => { grateSliders.style.display = grateOnEl.checked ? '' : 'none'; runAnalysis(); };
    const onSensInput = () => { byId('sensOut').textContent = sensEl.value; };
    const onSensChange = () => { S.removed.clear(); S.manual = []; runAnalysis(); };
    const onSpacingInput = () => { byId('spacingOut').textContent = (+spacingEl.value / 100).toFixed(2) + '×'; };
    const onSpacingChange = () => { S.removed.clear(); S.manual = []; runAnalysis(); };
    const onTiltInput = () => { byId('tiltOut').textContent = tiltEl.value + '°'; };
    const onTiltChange = () => { S.removed.clear(); S.manual = []; runAnalysis(); };
    const applyOrientClasses = () => {
      byId('orientAuto').classList.toggle('active', orientMode === 'auto');
      byId('orientV').classList.toggle('active', orientMode === 'v');
      byId('orientH').classList.toggle('active', orientMode === 'h');
    };
    const onOrient = (m: 'auto' | 'v' | 'h') => () => {
      if (orientMode === m) return;
      orientMode = m;
      applyOrientClasses();
      S.removed.clear(); S.manual = [];
      runAnalysis();
    };
    const onResetParams = () => {
      sensEl.value = '35'; byId('sensOut').textContent = '35';
      spacingEl.value = '60'; byId('spacingOut').textContent = '0.60×';
      tiltEl.value = '0'; byId('tiltOut').textContent = '0°';
      orientMode = 'auto'; applyOrientClasses();
      grateOnEl.checked = true; grateSliders.style.display = '';
      byId<HTMLInputElement>('gBright').value = '205'; byId('gBrightOut').textContent = '205';
      byId<HTMLInputElement>('gTex').value = '12'; byId('gTexOut').textContent = '12';
      S.removed.clear(); S.manual = [];
      runAnalysis();
    };

    dropzone.addEventListener('click', onDropzoneClick);
    dropzone.addEventListener('keydown', onDropzoneKey);
    fileInput.addEventListener('change', onFileChange);
    byId('newImage').addEventListener('click', onNewImage);
    byId('autoCorners').addEventListener('click', onAutoCorners);
    grateOnEl.addEventListener('change', onGrateToggle);
    sensEl.addEventListener('input', onSensInput);
    sensEl.addEventListener('change', onSensChange);
    spacingEl.addEventListener('input', onSpacingInput);
    spacingEl.addEventListener('change', onSpacingChange);
    tiltEl.addEventListener('input', onTiltInput);
    tiltEl.addEventListener('change', onTiltChange);
    byId('orientAuto').addEventListener('click', onOrient('auto'));
    byId('orientV').addEventListener('click', onOrient('v'));
    byId('orientH').addEventListener('click', onOrient('h'));
    byId('resetParams').addEventListener('click', onResetParams);
    byId('faceW').addEventListener('input', updateReadouts);
    byId('faceH').addEventListener('input', updateReadouts);
    byId('pleatDepth').addEventListener('input', updateReadouts);
    byId('depthIn').addEventListener('click', () => setDepthUnit('in'));
    byId('depthMm').addEventListener('click', () => setDepthUnit('mm'));
    ovCanvas.addEventListener('pointerdown', onPointerDown);
    ovCanvas.addEventListener('pointermove', onPointerMove);
    ovCanvas.addEventListener('pointerup', onPointerUp);
    traceCanvas.addEventListener('click', onTraceClick);
    grateSliderInput('gBright', 'gBrightOut');
    grateSliderInput('gTex', 'gTexOut');

    const addDrag = (e: Event) => { e.preventDefault(); dropzone.classList.add('drag'); };
    const rmDrag = (e: Event) => { e.preventDefault(); dropzone.classList.remove('drag'); };
    const onBodyDrop = (e: DragEvent) => { const f = e.dataTransfer?.files?.[0]; if (f) loadFile(f); };
    document.body.addEventListener('dragover', addDrag);
    document.body.addEventListener('dragenter', addDrag);
    document.body.addEventListener('dragleave', rmDrag);
    document.body.addEventListener('drop', rmDrag);
    document.body.addEventListener('drop', onBodyDrop as EventListener);
    const onResize = () => layoutStage();
    window.addEventListener('resize', onResize);

    layoutStage();

    return () => {
      disposed = true;
      if (grateTimer) clearTimeout(grateTimer);
      document.body.removeEventListener('dragover', addDrag);
      document.body.removeEventListener('dragenter', addDrag);
      document.body.removeEventListener('dragleave', rmDrag);
      document.body.removeEventListener('drop', rmDrag);
      document.body.removeEventListener('drop', onBodyDrop as EventListener);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <main>
      <div className="page-bg" />

      <div className="container">
        {/* Header */}
        <div className="page-header">
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            <Link href="/calculators" style={{ color: 'var(--accent-secondary)' }}>Calculators</Link>
            {' / '}Machine Vision Pleat Counting
          </p>
          <h1 className="section-title">
            <span className="gradient-text">Machine Vision Pleat Counting</span>
          </h1>
          <p className="section-subtitle" style={{ marginBottom: 0 }}>
            Upload a photo of a pleated filter and the face is perspective-corrected before counting. Ridges
            are found by autocorrelation, the frame and grating are detected and excluded, and pitch,
            pleats-per-foot, and open area are reported — entirely in the browser.
          </p>
        </div>

        {/* Tool */}
        <div className="pc-root" ref={rootRef}>
          <div className="pc-topbar">
            <span className="pc-eyebrow">Perspective-corrected ridge detection</span>
            <span className="pc-headcount" id="headCount">no image</span>
          </div>

          <div className="pc-wrap">
            <div className="pc-main">
            <div className="pc-stagecard">
              <div className="pc-stage" id="stage">
                <canvas id="imgCanvas" />
                <canvas id="overlayCanvas" />
                <div className="pc-dropzone" id="dropzone" tabIndex={0} role="button" aria-label="Upload a filter photo">
                  <div className="pc-dropicon">
                    <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                  </div>
                  <div className="pc-big">Drop a filter photo here</div>
                  <div>or click to choose &nbsp;·&nbsp; <kbd>JPG</kbd> <kbd>PNG</kbd> <kbd>HEIC→JPG</kbd></div>
                </div>
                <input type="file" id="fileInput" accept="image/*" hidden />
              </div>
              <div className="pc-tracewrap">
                <div className="pc-tracehead"><span>Ridge intensity trace · detrended · click to add or remove a pleat</span><span id="traceInfo">—</span></div>
                <canvas id="traceCanvas" />
              </div>
            </div>

            <div className="pc-card pc-results">
              <div className="pc-step"><span className="pc-n">4</span><h2>Results</h2></div>
              <div className="pc-resrow">
                <div className="pc-row" style={{ margin: 0 }}>
                  <label htmlFor="faceW">Face size (in)</label>
                  <input type="number" id="faceW" min={1} step={0.125} defaultValue={23.375} style={{ flex: '0 0 78px' }} aria-label="Face width in inches" />
                  <span style={{ color: 'var(--text-muted)' }}>×</span>
                  <input type="number" id="faceH" min={1} step={0.125} defaultValue={23.375} style={{ flex: '0 0 78px' }} aria-label="Face height in inches" />
                </div>
                <div className="pc-row" style={{ margin: 0 }}>
                  <label htmlFor="pleatDepth">Pleat depth</label>
                  <input type="number" id="pleatDepth" min={0.125} step={0.125} defaultValue={1.75} style={{ flex: '0 0 78px' }} aria-label="Pleat depth" />
                  <span className="pc-unittoggle" role="radiogroup" aria-label="Pleat depth units">
                    <button type="button" id="depthIn" className="active">in</button>
                    <button type="button" id="depthMm">mm</button>
                  </span>
                </div>
              </div>
              <div className="pc-readout">
                <div className="pc-ro count"><div className="pc-k">Pleats</div><div className="pc-v" id="roCount">—</div></div>
                <div className="pc-ro media"><div className="pc-k">Media area</div><div className="pc-v" id="roMedia">—</div></div>
                <div className="pc-ro"><div className="pc-k">Pitch</div><div className="pc-v" id="roPitch">—</div></div>
                <div className="pc-ro"><div className="pc-k" id="roPPFLabel">Pleats / ft</div><div className="pc-v" id="roPPF">—</div><div className="pc-sub" id="roPPFSub"></div></div>
                <div className="pc-ro open"><div className="pc-k">Open area</div><div className="pc-v" id="roOpen">—</div></div>
              </div>
            </div>
            </div>

            <div className="pc-rail">
              <div className="pc-card">
                <div className="pc-step"><span className="pc-n">1</span><h2>Frame the face</h2></div>
                <p className="pc-hint">Corners snap to the pleated area automatically — the smooth, bright frame is excluded. Drag the purple dots to fine-tune; the rectified view in step 3 shows exactly what falls inside the frame.</p>
                <div className="pc-btnrow">
                  <button className="primary" id="autoCorners">Auto corners</button>
                  <button id="newImage">New image</button>
                </div>
                <div className="pc-legend">
                  <span className="pc-lq"><i></i>face outline</span>
                  <span className="pc-lp"><i></i>pleat ridge</span>
                  <span className="pc-lm"><i></i>manual line</span>
                  <span className="pc-lg"><i></i>grating</span>
                </div>
              </div>

              <div className="pc-card">
                <div className="pc-step"><span className="pc-n">2</span><h2>Count pleats</h2><button type="button" className="pc-reset" id="resetParams">Reset defaults</button></div>
                <div className="pc-row">
                  <label htmlFor="sens">Sensitivity</label>
                  <input type="range" id="sens" min={10} max={70} defaultValue={35} />
                  <output id="sensOut">35</output>
                </div>
                <div className="pc-row">
                  <label htmlFor="spacing">Min spacing</label>
                  <input type="range" id="spacing" min={15} max={90} defaultValue={60} />
                  <output id="spacingOut">0.60×</output>
                </div>
                <div className="pc-row">
                  <label>Orientation</label>
                  <span className="pc-unittoggle" role="radiogroup" aria-label="Pleat orientation">
                    <button type="button" id="orientAuto" className="active">Auto</button>
                    <button type="button" id="orientV">Vert</button>
                    <button type="button" id="orientH">Horiz</button>
                  </span>
                </div>
                <div className="pc-row">
                  <label htmlFor="tilt">Tilt guide</label>
                  <input type="range" id="tilt" min={-30} max={30} defaultValue={0} />
                  <output id="tiltOut">0°</output>
                </div>
                <p className="pc-hint" style={{ margin: '0.7rem 0 0' }}>Spacing is a fraction of the detected pitch — go low for minipleats. Orientation forces the ridge direction if auto picks wrong; the tilt guide recenters the ±12° lean search for strongly tilted pleats. Everything recounts when a setting changes. Tap the image, or click in the trace below it, to add a missed ridge or remove a false one.</p>
                <div className="pc-status" id="status">Waiting for image.</div>
              </div>

              <div className="pc-card">
                <div className="pc-step"><span className="pc-n">3</span><h2>Frame &amp; grating</h2></div>
                <label className="pc-toggle" style={{ marginBottom: '0.6rem' }}>
                  <input type="checkbox" id="grateOn" defaultChecked /> <span>Detect frame + grating (excluded from the count, measures open area)</span>
                </label>
                <div className="pc-grate-sliders" id="grateSliders">
                  <div className="pc-row">
                    <label htmlFor="gBright">Brightness ≥</label>
                    <input type="range" id="gBright" min={120} max={255} defaultValue={205} />
                    <output id="gBrightOut">205</output>
                  </div>
                  <div className="pc-row">
                    <label htmlFor="gTex">Texture ≤</label>
                    <input type="range" id="gTex" min={2} max={40} defaultValue={12} />
                    <output id="gTexOut">12</output>
                  </div>
                  <p className="pc-hint" style={{ marginTop: '0.3rem' }}>Frame strips and grating are bright <em>and</em> smooth. Tune until the pink shading hugs them without eating into the pleat ridges.</p>
                </div>
                <div className="pc-rectpanel">
                  <div className="pc-ph"><span>Rectified face · pink = blocked</span><span id="rectInfo">—</span></div>
                  <canvas id="rectCanvas" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />

      <style>{PC_CSS}</style>
    </main>
  );
}

const PC_CSS = `
.pc-root{margin:0 auto 4rem;color:var(--text-primary)}
.pc-topbar{display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;margin-bottom:1rem}
.pc-eyebrow{font-size:0.72rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:var(--text-muted)}
.pc-headcount{font-size:0.9rem;color:var(--text-secondary);font-variant-numeric:tabular-nums}
.pc-headcount b{color:var(--accent-secondary);font-size:1.2rem;font-weight:800}

.pc-wrap{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:1.25rem;align-items:start}
@media(max-width:860px){.pc-wrap{grid-template-columns:1fr}}
.pc-main{display:flex;flex-direction:column;gap:1rem;min-width:0}

.pc-stagecard{background:var(--glass-bg);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border:1px solid var(--glass-border);border-radius:var(--radius-lg);overflow:hidden;display:flex;flex-direction:column;box-shadow:0 8px 40px rgba(0,0,0,0.05)}
.pc-stage{position:relative;width:100%;background:repeating-conic-gradient(#eef1f8 0% 25%,#f6f7fb 0% 50%) 0 0/22px 22px}
.pc-stage canvas{position:absolute;inset:0;width:100%;height:100%;touch-action:none}
.pc-stage #imgCanvas{position:relative}
.pc-dropzone{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0.55rem;color:var(--text-secondary);cursor:pointer;text-align:center;padding:1.5rem}
.pc-dropzone.hidden{display:none}
.pc-dropzone .pc-big{font-size:1.05rem;font-weight:700;color:var(--text-primary)}
.pc-dropzone kbd{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:0.7rem;border:1px solid var(--border);border-radius:5px;padding:2px 7px;color:var(--text-muted);background:var(--surface)}
.pc-dropzone.drag{outline:2px dashed var(--accent-secondary);outline-offset:-10px;background:rgba(0,184,148,0.05)}
.pc-dropicon{color:var(--text-muted);margin-bottom:0.15rem}
.pc-dropzone:focus-visible{outline:2px solid var(--accent-primary);outline-offset:-6px}

.pc-tracewrap{border-top:1px solid var(--border-subtle);background:var(--surface);padding:0.6rem 0.9rem 0.7rem}
.pc-tracehead{display:flex;justify-content:space-between;gap:0.5rem;font-size:0.66rem;color:var(--text-muted);letter-spacing:0.08em;text-transform:uppercase;margin-bottom:0.25rem;font-weight:600;flex-wrap:wrap}
.pc-root #traceCanvas{display:block;width:100%;height:84px;cursor:pointer}

.pc-rail{display:flex;flex-direction:column;gap:1rem}
.pc-card{background:var(--glass-bg);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border:1px solid var(--glass-border);border-radius:var(--radius-lg);padding:1.1rem 1.2rem}
.pc-step{display:flex;align-items:center;gap:0.6rem;margin-bottom:0.7rem}
.pc-root .pc-step .pc-reset{margin-left:auto;font-size:0.66rem;font-weight:600;padding:0.28rem 0.55rem;color:var(--text-secondary)}
.pc-step .pc-n{font-size:0.72rem;font-weight:700;color:#fff;background:linear-gradient(135deg,var(--accent-primary),#8b5cf6);border-radius:6px;padding:0.1rem 0.5rem;line-height:1.5}
.pc-step h2{font-size:0.82rem;font-weight:700;letter-spacing:0.03em;text-transform:uppercase;color:var(--text-primary)}
.pc-hint{color:var(--text-secondary);font-size:0.8rem;line-height:1.55;margin-bottom:0.7rem}

.pc-row{display:flex;align-items:center;gap:0.6rem;margin:0.55rem 0}
.pc-row label{flex:0 0 92px;font-size:0.72rem;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.03em}
.pc-row output{flex:0 0 52px;text-align:right;font-size:0.8rem;font-weight:600;color:var(--text-primary);font-variant-numeric:tabular-nums}
.pc-root input[type=range]{flex:1;accent-color:var(--accent-secondary);height:22px;cursor:pointer}
.pc-grate-sliders input[type=range]{accent-color:var(--accent-warm)}
.pc-root input[type=number],.pc-root input[type=text]{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text-primary);font-family:inherit;font-size:0.85rem;padding:0.4rem 0.5rem;width:90px;outline:none}
.pc-root input[type=number]:focus,.pc-root input[type=text]:focus{border-color:var(--accent-primary);box-shadow:0 0 0 3px rgba(108,92,231,0.15)}

.pc-root button{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text-primary);font-family:inherit;font-size:0.78rem;font-weight:600;letter-spacing:0.02em;padding:0.5rem 0.8rem;cursor:pointer;transition:all var(--transition-fast)}
.pc-root button:hover{border-color:var(--accent-primary);background:var(--surface-hover)}
.pc-root button.primary{background:linear-gradient(135deg,var(--accent-primary),#8b5cf6);border-color:transparent;color:#fff;box-shadow:0 2px 12px rgba(108,92,231,0.25)}
.pc-root button.primary:hover{transform:translateY(-1px);box-shadow:0 4px 18px rgba(108,92,231,0.35)}
.pc-btnrow{display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:0.4rem}

.pc-toggle{display:flex;align-items:flex-start;gap:0.5rem;cursor:pointer;user-select:none;font-size:0.8rem;color:var(--text-secondary);line-height:1.45}
.pc-toggle input{accent-color:var(--accent-warm);width:15px;height:15px;margin-top:2px;flex-shrink:0}

.pc-readout{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:0.6rem;margin-top:0.3rem}
.pc-ro{background:var(--surface);border:1px solid var(--border-subtle);border-radius:var(--radius-md);padding:0.6rem 0.7rem}
.pc-ro .pc-k{font-size:0.62rem;font-weight:600;color:var(--text-muted);letter-spacing:0.1em;text-transform:uppercase}
.pc-ro .pc-v{font-size:1.15rem;font-weight:800;margin-top:0.2rem;color:var(--text-primary);font-variant-numeric:tabular-nums;line-height:1.15}
.pc-ro .pc-v small{font-size:0.68rem;font-weight:600;color:var(--text-muted)}
.pc-ro.count .pc-v{color:var(--accent-secondary);font-size:1.55rem}
.pc-ro.media .pc-v{color:var(--accent-primary);font-size:1.55rem}
.pc-ro.open .pc-v{color:var(--accent-warm)}
.pc-sub{font-size:0.65rem;font-weight:600;color:var(--text-muted);margin-top:0.15rem}
.pc-resrow{display:flex;flex-wrap:wrap;gap:0.6rem 2rem;margin-bottom:0.9rem}
.pc-unittoggle{display:inline-flex;border:1px solid var(--border);border-radius:var(--radius-sm);overflow:hidden}
.pc-root .pc-unittoggle button{border:none;border-radius:0;padding:0.35rem 0.65rem;font-size:0.72rem;background:transparent;color:var(--text-secondary)}
.pc-root .pc-unittoggle button:hover{background:var(--surface-hover)}
.pc-root .pc-unittoggle button.active{background:var(--accent-secondary);color:#fff}
.pc-root button:disabled{opacity:0.45;cursor:not-allowed;transform:none !important;box-shadow:none !important}
.pc-status{font-size:0.72rem;color:var(--text-muted);margin-top:0.6rem;min-height:15px;line-height:1.45}

.pc-rectpanel{margin-top:0.8rem;border:1px solid var(--border-subtle);border-radius:var(--radius-md);overflow:hidden;background:var(--surface)}
.pc-rectpanel .pc-ph{display:flex;justify-content:space-between;gap:0.5rem;padding:0.4rem 0.6rem;font-size:0.62rem;color:var(--text-muted);font-weight:600;letter-spacing:0.08em;text-transform:uppercase;border-bottom:1px solid var(--border-subtle)}
.pc-root #rectCanvas{display:block;margin:0 auto}

.pc-legend{display:flex;gap:0.9rem;flex-wrap:wrap;font-size:0.68rem;color:var(--text-secondary);margin-top:0.7rem}
.pc-legend span{display:inline-flex;align-items:center}
.pc-legend i{display:inline-block;width:14px;height:3px;border-radius:2px;vertical-align:middle;margin-right:5px}
.pc-legend .pc-lp i{background:var(--accent-secondary)}
.pc-legend .pc-lm i{background:transparent;border-top:3px dashed var(--accent-secondary);height:0}
.pc-legend .pc-lq i{background:var(--accent-primary)}
.pc-legend .pc-lg i{background:var(--accent-warm)}
`;

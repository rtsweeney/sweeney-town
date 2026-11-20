// ── Carton drawings ───────────────────────────────────────────────────────────
// Builds the drawing set — a carton schedule, then one sheet per carton — as a
// list of simple shapes in millimetres on a fixed 264 × 186 mm frame. The page
// renders those shapes as SVG and the download writes the same shapes into a
// PDF, so the preview is the print. The PDF uses the base-14 Helvetica fonts,
// which every reader has, laid out with their published glyph widths.

import type { BlankSpec, CartonSpec, MemberPack, SolutionK } from './engine';
import { blankDims, fmt, fmtArea, specDim, type Paper, type Units } from './format';

// Glyph widths (1/1000 em) for WinAnsi codes 32–255, from the standard
// Adobe metrics for the PDF base-14 fonts, so layout matches the PDF.
const HELVETICA = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
  1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
  333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
  556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584, 350,
  556, 350, 222, 556, 333, 1000, 556, 556, 333, 1000, 667, 333, 1000, 350, 611, 350,
  350, 222, 222, 333, 333, 350, 556, 1000, 333, 1000, 500, 333, 944, 350, 500, 667,
  278, 333, 556, 556, 556, 556, 260, 556, 333, 737, 370, 556, 584, 333, 737, 333,
  400, 584, 333, 333, 333, 556, 537, 278, 333, 333, 365, 556, 834, 834, 834, 611,
  667, 667, 667, 667, 667, 667, 1000, 722, 667, 667, 667, 667, 278, 278, 278, 278,
  722, 722, 778, 778, 778, 778, 778, 584, 778, 722, 722, 722, 722, 667, 667, 611,
  556, 556, 556, 556, 556, 556, 889, 500, 556, 556, 556, 556, 278, 278, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 584, 611, 556, 556, 556, 556, 500, 556, 500,
];
const HELVETICA_BOLD = [
  278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611,
  975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556,
  333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611,
  611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584, 350,
  556, 350, 278, 556, 500, 1000, 556, 556, 333, 1000, 667, 333, 1000, 350, 611, 350,
  350, 278, 278, 500, 500, 350, 556, 1000, 333, 1000, 556, 333, 944, 350, 500, 667,
  278, 333, 556, 556, 556, 556, 280, 556, 333, 737, 370, 556, 584, 333, 737, 333,
  400, 584, 333, 333, 333, 611, 556, 278, 333, 333, 365, 556, 834, 834, 834, 611,
  722, 722, 722, 722, 722, 722, 1000, 722, 667, 667, 667, 667, 278, 278, 278, 278,
  722, 722, 778, 778, 778, 778, 778, 584, 778, 722, 722, 722, 722, 667, 667, 611,
  556, 556, 556, 556, 556, 556, 889, 556, 556, 556, 556, 556, 278, 278, 278, 278,
  611, 611, 611, 611, 611, 611, 611, 584, 611, 611, 611, 611, 611, 556, 611, 556,
];
/** Unicode → WinAnsi byte for the 0x80–0x9F block (0xA0–0xFF match Latin-1). */
const WIN_ANSI_EXTRA: Record<number, number> = {
  0x0152: 0x8c, 0x0153: 0x9c, 0x0160: 0x8a, 0x0161: 0x9a, 0x0178: 0x9f, 0x017d: 0x8e, 0x017e: 0x9e, 0x0192: 0x83, 0x02c6: 0x88, 0x02dc: 0x98, 0x2013: 0x96, 0x2014: 0x97, 0x2018: 0x91, 0x2019: 0x92, 0x201a: 0x82, 0x201c: 0x93, 0x201d: 0x94, 0x201e: 0x84, 0x2020: 0x86, 0x2021: 0x87, 0x2022: 0x95, 0x2026: 0x85, 0x2030: 0x89, 0x2039: 0x8b, 0x203a: 0x9b, 0x20ac: 0x80, 0x2122: 0x99,
};

/** WinAnsi byte for a character; '?' when Helvetica has no glyph for it. */
function winAnsi(ch: string): number {
  const cp = ch.codePointAt(0) ?? 63;
  if (cp >= 32 && cp < 127) return cp;
  if (cp >= 0xa0 && cp <= 0xff) return cp;
  const extra = WIN_ANSI_EXTRA[cp];
  if (extra !== undefined) return extra;
  if (cp === 0x2033) return 0x22; // ″ → "
  if (cp === 0x2032) return 0x27; // ′ → '
  return 63;
}

export function textWidth(s: string, size: number, bold = false): number {
  const table = bold ? HELVETICA_BOLD : HELVETICA;
  let w = 0;
  for (const ch of s) w += table[winAnsi(ch) - 32] ?? 556;
  return (w / 1000) * size;
}

/** `s`, cut short with an ellipsis so it fits `maxW`. */
export function fitText(s: string, size: number, maxW: number, bold = false): string {
  if (textWidth(s, size, bold) <= maxW) return s;
  const chars = [...s];
  while (chars.length > 1 && textWidth(chars.join('') + '…', size, bold) > maxW) chars.pop();
  return chars.join('').trimEnd() + '…';
}

/** Greedy word wrap to `maxW`; a word longer than a line is cut to fit. */
export function wrapText(s: string, size: number, maxW: number, bold = false): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of s.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (textWidth(next, size, bold) <= maxW) line = next;
    else {
      if (line) lines.push(line);
      line = fitText(word, size, maxW, bold);
    }
  }
  if (line) lines.push(line);
  return lines;
}

// ── Sheet model ───────────────────────────────────────────────────────────────

export type Pt = [number, number];
export type Prim =
  | { k: 'line'; a: Pt; b: Pt; w: number; c: string; dash?: number[] }
  | { k: 'poly'; pts: Pt[]; closed: boolean; stroke?: string; fill?: string; lw?: number; opacity?: number }
  | { k: 'text'; x: number; y: number; s: string; size: number; bold?: boolean; anchor?: 'start' | 'middle' | 'end'; c?: string; rot?: number }
  | { k: 'qr'; x: number; y: number; size: number; m: boolean[][] };

export interface Sheet {
  /** Drawing number in the title block: the base number on the schedule, base-CTN-A on carton A. */
  number: string;
  title: string;
  /** Set on a carton sheet. */
  carton?: string;
  prims: Prim[];
}

/** The drawing frame, centred on the page; it fits both A4 and Letter landscape. */
export const FRAME = { w: 264, h: 186 };
export const PAPER: Record<Paper, { w: number; h: number; label: string }> = {
  letter: { w: 279.4, h: 215.9, label: 'Letter' },
  a4: { w: 297, h: 210, label: 'A4' },
};

export interface TitleInfo {
  company: string;
  project: string;
  drawingNo: string;
  revision: string;
  date: string;
}

export interface DrawingInput {
  solution: SolutionK;
  units: Units;
  wall: number;
  glueFlap: number;
  /** Prism SKUs submitted (some may have been skipped as unpackable). */
  totalPrisms: number;
  objective: string;
  /** Label/value pairs for the schedule's parameter block. */
  params: [string, string][];
  title: TitleInfo;
  /** QR modules for each sheet's scenario link, or null when the link is too long for one. */
  qr: { schedule: boolean[][] | null; cartons: Record<string, boolean[][] | null> };
}

const INK = '#1d1d24';
const MUTED = '#6b6b7b';
const RULE = '#a5a5b2';
const HEAD = '#efedf8';
const DIM = '#3d3d4a';
const PRISM_TOP = '#b6aef4';
const PRISM_PX = '#8d80ee';
const PRISM_PY = '#6c5ce7';
const PRISM_EDGE = '#5142c9';
const KRAFT_BACK = '#f2e8d5';
const KRAFT_BOTTOM = '#e7d8ba';
const KRAFT_EDGE = '#b08f60';

class Ink {
  prims: Prim[] = [];
  line(x1: number, y1: number, x2: number, y2: number, w = 0.2, c = INK, dash?: number[]) {
    this.prims.push({ k: 'line', a: [x1, y1], b: [x2, y2], w, c, dash });
  }
  poly(pts: Pt[], closed: boolean, o: { stroke?: string; fill?: string; lw?: number; opacity?: number } = {}) {
    this.prims.push({ k: 'poly', pts, closed, ...o });
  }
  rect(x: number, y: number, w: number, h: number, o: { stroke?: string; fill?: string; lw?: number } = {}) {
    this.poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], true, o);
  }
  text(x: number, y: number, s: string, size: number, o: { bold?: boolean; anchor?: 'start' | 'middle' | 'end'; c?: string; rot?: number } = {}) {
    if (s) this.prims.push({ k: 'text', x, y, s, size, ...o, c: o.c ?? INK });
  }
}

// ── Shared pieces ─────────────────────────────────────────────────────────────

function arrowHead(ink: Ink, tip: Pt, dir: Pt) {
  const len = 1.3;
  const half = 0.42;
  const bx = tip[0] - dir[0] * len;
  const by = tip[1] - dir[1] * len;
  ink.poly([tip, [bx - dir[1] * half, by + dir[0] * half], [bx + dir[1] * half, by - dir[0] * half]], true, { fill: DIM });
}

/** Horizontal dimension x1→x2 on line y, with extension lines from the feature at `from`. */
function dimH(ink: Ink, x1: number, x2: number, y: number, from: number, label: string) {
  const s = y < from ? -1 : 1;
  for (const x of [x1, x2]) ink.line(x, from + s * 0.8, x, y + s * 1.2, 0.13, DIM);
  ink.line(x1, y, x2, y, 0.13, DIM);
  arrowHead(ink, [x1, y], [-1, 0]);
  arrowHead(ink, [x2, y], [1, 0]);
  // A label wider than its span goes beside it, clear of the arrows.
  if (textWidth(label, 2.1) + 1.2 <= Math.abs(x2 - x1)) ink.text((x1 + x2) / 2, y - 0.9, label, 2.1, { anchor: 'middle' });
  else ink.text(Math.min(x1, x2) - 1.8, y + 0.75, label, 2.1, { anchor: 'end' });
}

/** Vertical dimension y1→y2 on line x; the label reads bottom-up, left of the line. */
function dimV(ink: Ink, y1: number, y2: number, x: number, from: number, label: string) {
  const s = x < from ? -1 : 1;
  for (const y of [y1, y2]) ink.line(from + s * 0.8, y, x + s * 1.2, y, 0.13, DIM);
  ink.line(x, y1, x, y2, 0.13, DIM);
  arrowHead(ink, [x, y1], [0, -1]);
  arrowHead(ink, [x, y2], [0, 1]);
  if (textWidth(label, 2.1) + 1.2 <= Math.abs(y2 - y1)) ink.text(x - 0.9, (y1 + y2) / 2, label, 2.1, { anchor: 'middle', rot: -90 });
  else ink.text(x - 0.9, Math.min(y1, y2) - 1.8, label, 2.1, { anchor: 'start', rot: -90 });
}

interface TitleCell {
  sheetTitle: string;
  number: string;
  sheet: string;
  qr: boolean[][] | null;
}

/** Title block in the bottom-right corner, the QR code in the outermost cell. */
function titleBlock(ink: Ink, info: TitleInfo, cell: TitleCell) {
  const x0 = FRAME.w - 130;
  const y0 = FRAME.h - 34;
  const xq = FRAME.w - 34;
  ink.rect(x0, y0, 130, 34, { stroke: INK, lw: 0.35 });
  ink.line(xq, y0, xq, FRAME.h, 0.35);
  for (const y of [y0 + 9, y0 + 17, y0 + 25]) ink.line(x0, y, xq, y, 0.2);
  for (const x of [x0 + 44, x0 + 56, x0 + 78]) ink.line(x, y0 + 25, x, FRAME.h, 0.2);
  const field = (x: number, y: number, w: number, h: number, label: string, value: string, size: number, bold = false) => {
    ink.text(x + 1.2, y + 2.3, label, 1.55, { c: MUTED });
    ink.text(x + 1.2, y + h - 1.8, fitText(value, size, w - 2.4, bold), size, { bold });
  };
  field(x0, y0, 96, 9, 'COMPANY', info.company, 3.2, true);
  field(x0, y0 + 9, 96, 8, 'PROJECT', info.project, 2.6);
  field(x0, y0 + 17, 96, 8, 'TITLE', cell.sheetTitle, 2.6, true);
  field(x0, y0 + 25, 44, 9, 'DWG NO.', cell.number, 2.7, true);
  field(x0 + 44, y0 + 25, 12, 9, 'REV', info.revision, 2.7, true);
  field(x0 + 56, y0 + 25, 22, 9, 'DATE', info.date, 2.3);
  field(x0 + 78, y0 + 25, 18, 9, 'SHEET', cell.sheet, 2.3);
  if (cell.qr) {
    const size = 27.5;
    ink.prims.push({ k: 'qr', x: xq + (34 - size) / 2, y: y0 + 1.2, size, m: cell.qr });
    ink.text(xq + 17, FRAME.h - 1.6, 'SCAN TO OPEN THIS SCENARIO', 1.5, { anchor: 'middle', c: MUTED });
  } else {
    ['SCENARIO TOO LARGE', 'FOR A QR CODE —', 'USE EXPORT SCENARIO', 'IN THE CALCULATOR'].forEach((t, i) =>
      ink.text(xq + 17, y0 + 12 + i * 3, t, 1.6, { anchor: 'middle', c: MUTED }),
    );
  }
}

function sheetFrame(ink: Ink) {
  ink.rect(0, 0, FRAME.w, FRAME.h, { stroke: INK, lw: 0.5 });
}

function dims3(d: { l: number; w: number; d: number }, units: Units): string {
  return `${specDim(d.l, units, units)} × ${specDim(d.w, units, units)} × ${specDim(d.d, units, units)} ${units}`;
}

function packing(m: MemberPack): string {
  return `${m.cols}×${m.tiers}×${m.nPerStack}`;
}

function layerSummary(c: CartonSpec): string {
  return c.pallet.layers.map((l) => `${l.count} × ${l.perLayer} ${l.orientation === 'upright' ? 'upright' : 'on side'}`).join(' + ');
}

/** Carton A's drawing number: the set's number with -CTN-A appended. */
export function cartonNumber(base: string, label: string): string {
  return `${base ? `${base}-` : ''}CTN-${label}`;
}

// ── Carton schedule ───────────────────────────────────────────────────────────

const SCH_X = 8;
const SCH_W = 248;
/** Column widths: carton, inside L, W, D, blank, cartons/yr, SKUs (the rest). */
const SCH_COLS = [16, 21, 21, 21, 34, 19, 116];
const SKU_SIZE = 2.3;

function scheduleRows(input: DrawingInput) {
  return input.solution.cartons.map((c) => {
    const lines = c.members.map((m) => `${m.prism.name} — ${m.unitsPerCarton}/carton (${packing(m)})`);
    const skuW = SCH_COLS[6] - 2.4;
    const wrapped = lines.flatMap((l) => wrapText(l, SKU_SIZE, skuW));
    return { c, wrapped, h: Math.max(7, wrapped.length * 3.3 + 3) };
  });
}

function drawScheduleHeader(ink: Ink, y: number, units: Units) {
  const xs = SCH_COLS.reduce<number[]>((acc, w) => [...acc, acc[acc.length - 1] + w], [SCH_X]);
  ink.rect(SCH_X, y, SCH_W, 10, { fill: HEAD });
  const mid = (i: number) => (xs[i] + xs[i + 1]) / 2;
  const t = (x: number, yy: number, s: string, anchor: 'start' | 'middle' = 'middle') => ink.text(x, yy, s, 1.9, { bold: true, anchor, c: DIM });
  t(mid(0), y + 6.2, 'CARTON');
  t((xs[1] + xs[4]) / 2, y + 3.6, `INSIDE DIMENSIONS (${units.toUpperCase()})`);
  t(mid(1), y + 8.4, 'MAJOR L');
  t(mid(2), y + 8.4, 'MINOR W');
  t(mid(3), y + 8.4, 'DEPTH D');
  t(mid(4), y + 6.2, `BLANK L × W (${units.toUpperCase()})`);
  t(mid(5), y + 6.2, 'CARTONS/YR');
  t(xs[6] + 1.2, y + 6.2, 'PRISM SKUs — UNITS PER CARTON (COLS × TIERS × DEEP)', 'start');
  ink.line(xs[1], y + 5, xs[4], y + 5, 0.15, RULE);
  return xs;
}

type ScheduleRow = ReturnType<typeof scheduleRows>[number];

/** Splits the schedule rows into sheets; the first sheet keeps room for notes and parameters. */
function paginateSchedule(input: DrawingInput): ScheduleRow[][] {
  const rows = scheduleRows(input);
  const pages: ScheduleRow[][] = [];
  const firstBottom = 112; // the notes and parameters sit below the table on the first sheet
  const laterBottom = 146;
  let page: ScheduleRow[] = [];
  let y = 34;
  for (const r of rows) {
    const bottom = pages.length === 0 ? firstBottom : laterBottom;
    if (page.length > 0 && y + r.h > bottom) {
      pages.push(page);
      page = [];
      y = 34;
    }
    page.push(r);
    y += r.h;
  }
  pages.push(page);
  return pages;
}

function scheduleSheets(input: DrawingInput, pages: ScheduleRow[][], total: number): Sheet[] {
  const { units } = input;
  const d = (v: number) => specDim(v, units, units);
  return pages.map((pageRows, pi) => {
    const ink = new Ink();
    sheetFrame(ink);
    ink.text(8, 13, pi === 0 ? 'CARTON SCHEDULE' : 'CARTON SCHEDULE (CONTINUED)', 5.2, { bold: true });
    const sol = input.solution;
    ink.text(
      8,
      19.5,
      `${sol.k} carton SKU${sol.k === 1 ? '' : 's'} for ${sol.cartons.reduce((a, c) => a + c.members.length, 0)} of ${input.totalPrisms} prism SKUs · optimized to ${input.objective.toLowerCase()} · inside dimensions L × W × D = major flap × minor flap × depth`,
      2.5,
      { c: MUTED },
    );
    const xs = drawScheduleHeader(ink, 24, units);
    let yy = 34;
    pageRows.forEach((r, ri) => {
      if (ri % 2 === 1) ink.rect(SCH_X, yy, SCH_W, r.h, { fill: '#f8f7fc' });
      const base = yy + 4.6;
      ink.text((xs[0] + xs[1]) / 2, base + 0.3, r.c.label, 3.4, { bold: true, anchor: 'middle' });
      [r.c.inner.l, r.c.inner.w, r.c.inner.d].forEach((v, i) => ink.text((xs[i + 1] + xs[i + 2]) / 2, base, d(v), 2.6, { anchor: 'middle', bold: true }));
      const bd = blankDims(r.c.blank, units, units);
      ink.text((xs[4] + xs[5]) / 2, base, `${d(bd.length)} × ${d(bd.width)}`, 2.4, { anchor: 'middle' });
      ink.text((xs[5] + xs[6]) / 2, base, fmt(r.c.cartonsPerYear), 2.4, { anchor: 'middle' });
      r.wrapped.forEach((line, li) => ink.text(xs[6] + 1.2, base + li * 3.3, line, SKU_SIZE));
      yy += r.h;
      ink.line(SCH_X, yy, SCH_X + SCH_W, yy, 0.12, RULE);
    });
    // Totals close the table on its last sheet.
    if (pi === pages.length - 1) {
      ink.rect(SCH_X, yy, SCH_W, 7, { fill: HEAD });
      ink.text((xs[0] + xs[1]) / 2, yy + 4.7, 'TOTAL', 2.2, { bold: true, anchor: 'middle' });
      ink.text((xs[5] + xs[6]) / 2, yy + 4.7, fmt(sol.cartonsPerYear), 2.4, { bold: true, anchor: 'middle' });
      ink.text(
        xs[6] + 1.2,
        yy + 4.7,
        `Board ${fmtArea(sol.boardPerYear, units)} per year · ${fmt(sol.pallets, 1)} pallets per year`,
        2.3,
        { bold: true },
      );
      yy += 7;
    }
    ink.rect(SCH_X, 24, SCH_W, yy - 24, { stroke: INK, lw: 0.3 });
    for (const x of xs.slice(1, -1)) ink.line(x, x === xs[2] || x === xs[3] ? 29 : 24, x, yy, 0.12, RULE);

    if (pi === 0) {
      // Notes, bottom left.
      const notes = [
        `Style: regular slotted container (RSC, FEFCO 0201); board caliper t = ${d(input.wall)} ${units}.`,
        `Inside dimensions govern. Outside = inside + 2t on L and W, + 4t on D.`,
        `Blank = glue flap ${d(input.glueFlap)} + 2(L + t) + 2(W + t) long × (W + t) + D + 2t wide; every flap (W + t)/2 deep. Board per year = blank area × cartons per year.`,
        `One prism SKU per carton. Cartons per year round each SKU's annual usage up to whole cartons.`,
        `Scan a sheet's QR code to open this scenario, with 3D carton and pallet views, in the Carton Packing Optimizer.`,
      ];
      let ny = 124;
      ink.text(8, 120, 'NOTES', 2.2, { bold: true });
      notes.forEach((n, i) => {
        wrapText(n, 2.15, 112).forEach((line, li) => {
          if (li === 0) ink.text(8, ny, `${i + 1}.`, 2.15);
          ink.text(12, ny, line, 2.15);
          ny += 3;
        });
        ny += 0.6;
      });
      // Parameters, above the title block.
      ink.text(134, 120, 'PARAMETERS', 2.2, { bold: true });
      const half = Math.ceil(input.params.length / 2);
      input.params.forEach(([k, v], i) => {
        const col = i < half ? 0 : 1;
        const row = i < half ? i : i - half;
        const x = 134 + col * 62;
        const yp = 124 + row * 3.4;
        ink.text(x, yp, k, 1.75, { c: MUTED });
        ink.text(x + 23, yp, fitText(v, 2.0, 38), 2.0);
      });
    }
    titleBlock(ink, input.title, {
      sheetTitle: pi === 0 ? 'CARTON SCHEDULE' : 'CARTON SCHEDULE (CONTINUED)',
      number: input.title.drawingNo || '—',
      sheet: `${pi + 1} OF ${total}`,
      qr: input.qr.schedule,
    });
    return { number: input.title.drawingNo || '—', title: 'Carton schedule', prims: ink.prims };
  });
}

// ── Carton sheet ──────────────────────────────────────────────────────────────

/** Isometric view of the carton with its first SKU packed and the closed top see-through. */
function drawIso(ink: Ink, carton: CartonSpec, member: MemberPack, units: Units, box: { x: number; y: number; w: number; h: number }) {
  const { inner, outer } = carton;
  const OL = outer.l;
  const OW = outer.w;
  const OD = outer.d;
  const cos30 = Math.cos(Math.PI / 6);
  const proj = (p: [number, number, number]): Pt => [(p[0] - p[1]) * cos30, (p[0] + p[1]) * 0.5 - p[2]];
  const corners: [number, number, number][] = [
    [0, 0, 0], [OL, 0, 0], [0, OW, 0], [OL, OW, 0], [0, 0, OD], [OL, 0, OD], [0, OW, OD], [OL, OW, OD],
  ];
  const pts = corners.map(proj);
  const minX = Math.min(...pts.map((p) => p[0]));
  const maxX = Math.max(...pts.map((p) => p[0]));
  const minY = Math.min(...pts.map((p) => p[1]));
  const maxY = Math.max(...pts.map((p) => p[1]));
  const padX = 8;
  const padY = 7;
  const s = Math.min((box.w - 2 * padX) / (maxX - minX), (box.h - 2 * padY) / (maxY - minY));
  const ox = box.x + (box.w - (maxX - minX) * s) / 2;
  const oy = box.y + (box.h - (maxY - minY) * s) / 2;
  const T = (p: [number, number, number]): Pt => {
    const [px, py] = proj(p);
    return [ox + (px - minX) * s, oy + (py - minY) * s];
  };
  const face = (c: [number, number, number][], fill: string, stroke: string, lw: number, opacity?: number) =>
    ink.poly(c.map(T), true, { fill, stroke, lw, opacity });

  // Interior: the two back walls and the floor.
  face([[0, 0, 0], [0, OW, 0], [0, OW, OD], [0, 0, OD]], KRAFT_BACK, KRAFT_EDGE, 0.15);
  face([[0, 0, 0], [OL, 0, 0], [OL, 0, OD], [0, 0, OD]], KRAFT_BACK, KRAFT_EDGE, 0.15);
  face([[0, 0, 0], [OL, 0, 0], [OL, OW, 0], [0, OW, 0]], KRAFT_BOTTOM, KRAFT_EDGE, 0.15);

  // Prisms, back to front.
  const blockL = member.cols * member.dl;
  const blockW = member.nPerStack * member.dw;
  const wall = (OL - inner.l) / 2;
  const offX = wall + (inner.l - blockL) / 2;
  const offY = wall + (inner.w - blockW) / 2;
  const offZ = (OD - inner.d) / 2;
  const boxes: { x: number; y: number; z: number }[] = [];
  for (let st = 0; st < member.nPerStack; st++)
    for (let ci = 0; ci < member.cols; ci++)
      for (let t = 0; t < member.tiers; t++) boxes.push({ x: offX + ci * member.dl, y: offY + st * member.dw, z: offZ + t * member.dd });
  boxes.sort((u, v) => u.x + u.y - (v.x + v.y) || u.z - v.z);
  const a = member.dl;
  const b = member.dw;
  const c = member.dd;
  for (const { x, y, z } of boxes) {
    face([[x, y + b, z], [x + a, y + b, z], [x + a, y + b, z + c], [x, y + b, z + c]], PRISM_PY, PRISM_EDGE, 0.08);
    face([[x + a, y, z], [x + a, y + b, z], [x + a, y + b, z + c], [x + a, y, z + c]], PRISM_PX, PRISM_EDGE, 0.08);
    face([[x, y, z + c], [x + a, y, z + c], [x + a, y + b, z + c], [x, y + b, z + c]], PRISM_TOP, PRISM_EDGE, 0.08);
  }

  // Closed top, see-through, with the major-flap seam down the middle of W.
  face([[0, 0, OD], [OL, 0, OD], [OL, OW, OD], [0, OW, OD]], KRAFT_BACK, KRAFT_EDGE, 0, 0.45);
  const sa = T([0, OW / 2, OD]);
  const sb = T([OL, OW / 2, OD]);
  ink.line(sa[0], sa[1], sb[0], sb[1], 0.3, KRAFT_EDGE);

  // Carton edges.
  const E: [[number, number, number], [number, number, number]][] = [
    [[0, OW, 0], [OL, OW, 0]], [[OL, 0, 0], [OL, OW, 0]], [[OL, OW, 0], [OL, OW, OD]], [[0, OW, OD], [OL, OW, OD]],
    [[OL, 0, OD], [OL, OW, OD]], [[0, OW, 0], [0, OW, OD]], [[OL, 0, 0], [OL, 0, OD]], [[0, 0, OD], [0, OW, OD]],
    [[0, 0, OD], [OL, 0, OD]],
  ];
  for (const [p, q] of E) {
    const [x1, y1] = T(p);
    const [x2, y2] = T(q);
    ink.line(x1, y1, x2, y2, 0.3, KRAFT_EDGE);
  }

  // Outside dimensions.
  const l = T([OL / 2, OW, 0]);
  const w = T([OL, OW / 2, 0]);
  const dd = T([OL, 0, OD / 2]);
  ink.text(l[0] - 2.5, l[1] + 4.2, `L ${specDim(OL, units, units)}`, 2.3, { anchor: 'middle', c: MUTED });
  ink.text(w[0] + 3, w[1] + 4.2, `W ${specDim(OW, units, units)}`, 2.3, { anchor: 'middle', c: MUTED });
  ink.text(dd[0] + 3.4, dd[1], `D ${specDim(OD, units, units)}`, 2.3, { anchor: 'middle', c: MUTED, rot: -90 });
}

const SCALES = [1, 2, 2.5, 4, 5, 8, 10, 15, 20, 25, 30, 40, 50, 75, 100, 150, 200, 300];

/**
 * The flat RSC blank as a die-line at a standard scale: cuts solid, scores
 * dashed, slots between the flaps, a tapered glue flap, flute direction, and
 * dimension chains. Returns the scale denominator (1:n).
 */
function drawBlank(ink: Ink, blank: BlankSpec, units: Units, box: { x: number; y: number; w: number; h: number }): number {
  const toMm = units === 'in' ? 25.4 : 1;
  const pad = { l: 15, r: 11, t: 12, b: 12 };
  const availW = box.w - pad.l - pad.r;
  const availH = box.h - pad.t - pad.b;
  // Snapped parts, so every dimension chain adds up to its overall.
  const bd = blankDims(blank, units, units);
  const n = SCALES.find((sc) => (bd.length * toMm) / sc <= availW && (bd.width * toMm) / sc <= availH) ?? SCALES[SCALES.length - 1];
  const k = toMm / n;
  const ox = box.x + pad.l + (availW - bd.length * k) / 2;
  const oy = box.y + pad.t + (availH - bd.width * k) / 2;
  const X = (v: number) => ox + v * k;
  const Y = (v: number) => oy + v * k;
  const { glueFlap: g, panelL: Lp, panelW: Wp, flap: f, length: Lb, width: Wb } = bd;
  const edges = [g, g + Lp, g + Lp + Wp, g + 2 * Lp + Wp, Lb];
  const panels = [0, 1, 2, 3].map((i) => ({ a: edges[i], b: edges[i + 1], major: i % 2 === 0 }));
  const slot = Math.min(units === 'in' ? 0.25 : 6, Math.min(Lp, Wp) * 0.05);
  const cut = (p: Pt[]) => ink.poly(p.map(([x, y]) => [X(x), Y(y)] as Pt), false, { stroke: INK, lw: 0.3 });
  const score = (x1: number, y1: number, x2: number, y2: number) => ink.line(X(x1), Y(y1), X(x2), Y(y2), 0.2, INK, [1.4, 0.9]);

  panels.forEach((p, i) => {
    const xl = p.a + (i > 0 ? slot / 2 : 0);
    const xr = p.b - (i < 3 ? slot / 2 : 0);
    cut([[xl, f], [xl, 0], [xr, 0], [xr, f]]);
    cut([[xl, Wb - f], [xl, Wb], [xr, Wb], [xr, Wb - f]]);
    if (i < 3) {
      const nxt = panels[i + 1].a + slot / 2;
      cut([[xr, f], [nxt, f]]);
      cut([[xr, Wb - f], [nxt, Wb - f]]);
    }
  });
  cut([[Lb, f], [Lb, Wb - f]]);
  const taper = Math.min(g * 0.9, (Wb - 2 * f) * 0.2);
  cut([[g, f], [0, f + taper], [0, Wb - f - taper], [g, Wb - f]]);
  score(g, f, Lb, f);
  score(g, Wb - f, Lb, Wb - f);
  for (const x of edges.slice(0, 4)) score(x, f, x, Wb - f);

  // Labels: flap type on each flap, panel type on the body.
  const fh = f * k;
  panels.forEach((p) => {
    const cx = X((p.a + p.b) / 2);
    if (fh > 3.2) {
      const label = p.major ? 'MAJOR FLAP' : 'MINOR FLAP';
      ink.text(cx, Y(f / 2) + 0.7, label, 1.9, { anchor: 'middle', c: MUTED });
      ink.text(cx, Y(Wb - f / 2) + 0.7, label, 1.9, { anchor: 'middle', c: MUTED });
    }
    ink.text(cx, Y(Wb / 2) + 0.8, p.major ? 'SIDE · L' : 'END · W', 2.2, { anchor: 'middle', c: MUTED });
  });
  if (g * k > 2.6) ink.text(X(g / 2) + 0.7, Y(Wb / 2), 'GLUE FLAP', 1.7, { anchor: 'middle', c: MUTED, rot: -90 });
  // Flute direction: vertical, along D. It sits in the second side panel (L ≥ W,
  // so the roomier one), right of centre and above mid-height, clear of the
  // panel's label.
  const fx = X(panels[2].a + (panels[2].b - panels[2].a) * 0.84);
  const fy1 = Y(f + (Wb - 2 * f) * 0.1);
  const fy2 = Y(f + (Wb - 2 * f) * 0.38);
  ink.line(fx, fy1, fx, fy2, 0.18, DIM);
  arrowHead(ink, [fx, fy1], [0, -1]);
  arrowHead(ink, [fx, fy2], [0, 1]);
  ink.text(fx - 1.1, (fy1 + fy2) / 2, 'FLUTES', 1.7, { anchor: 'middle', c: DIM, rot: -90 });

  // Dimension chains.
  const d = (v: number) => specDim(v, units, units);
  const top = Y(0) - 5.5;
  [g, Lp, Wp, Lp, Wp].forEach((v, i) => dimH(ink, X(i === 0 ? 0 : edges[i - 1]), X(edges[i]), top, Y(0), d(v)));
  dimH(ink, X(0), X(Lb), Y(Wb) + 6.5, Y(Wb), `${d(Lb)}  BLANK LENGTH`);
  const left = X(0) - 5.5;
  [[0, f], [f, Wb - f], [Wb - f, Wb]].forEach(([a, b]) => dimV(ink, Y(a), Y(b), left, X(0), d(b - a)));
  dimV(ink, Y(0), Y(Wb), X(Lb) + 7, X(Lb), `${d(Wb)}  BLANK WIDTH`);
  return n;
}

function cartonSheet(input: DrawingInput, carton: CartonSpec, sheetNo: number, total: number): Sheet {
  const { units } = input;
  const ink = new Ink();
  sheetFrame(ink);
  const d = (v: number) => specDim(v, units, units);
  const number = cartonNumber(input.title.drawingNo, carton.label);
  ink.text(8, 13, `CARTON ${carton.label}`, 6, { bold: true });
  ink.text(8, 19.5, `RSC (FEFCO 0201) · inside ${dims3(carton.inner, units)} · outside ${dims3(carton.outer, units)} · L × W × D = major flap × minor flap × depth`, 2.5, { c: MUTED });

  // Packed view.
  const top = carton.members[0];
  ink.text(8, 26.5, 'PACKED VIEW — TOP DRAWN SEE-THROUGH', 1.9, { bold: true, c: DIM });
  drawIso(ink, carton, top, units, { x: 8, y: 28, w: 92, h: 80 });
  const more = carton.members.length > 1 ? ` · +${carton.members.length - 1} more SKU${carton.members.length > 2 ? 's' : ''} below` : '';
  ink.text(54, 112, fitText(`${top.prism.name}: ${packing(top)} = ${top.unitsPerCarton}/carton${more}`, 2.2, 92), 2.2, { anchor: 'middle' });

  // Blank.
  const n = drawBlank(ink, carton.blank, units, { x: 104, y: 28, w: 152, h: 86 });
  ink.text(104, 26.5, `FLAT BLANK · SCALE 1:${n} · DIMENSIONS SCORE TO SCORE`, 1.9, { bold: true, c: DIM });
  const lx = 222;
  ink.line(lx, 25.9, lx + 5, 25.9, 0.3, INK);
  ink.text(lx + 6, 26.5, 'CUT', 1.8, { c: DIM });
  ink.line(lx + 13, 25.9, lx + 19, 25.9, 0.2, INK, [1.4, 0.9]);
  ink.text(lx + 20, 26.5, 'SCORE', 1.8, { c: DIM });

  // Carton data.
  const b = carton.blank;
  const bd = blankDims(b, units, units);
  const rows: [string, string][] = [
    ['INSIDE  L × W × D', dims3(carton.inner, units)],
    ['OUTSIDE  L × W × D', dims3(carton.outer, units)],
    ['BLANK  L × W', `${d(bd.length)} × ${d(bd.width)} ${units}`],
    ['BLANK AREA', fmtArea(b.area, units, 2)],
    ['FLAPS', `${d(bd.flap)} ${units} deep, all four; major flaps meet at mid-W`],
    ['BOARD CALIPER t / GLUE FLAP', `${d(input.wall)} ${units} / ${d(input.glueFlap)} ${units}`],
    ['CARTONS PER YEAR', fmt(carton.cartonsPerYear)],
    ['BOARD PER YEAR', fmtArea(carton.boardPerYear, units)],
    ['CARTONS PER PALLET', `${carton.cartonsPerPallet} — ${layerSummary(carton)}`],
  ];
  const tx = 8;
  const ty = 118;
  ink.text(tx, ty, 'CARTON DATA', 2.2, { bold: true });
  rows.forEach(([k, v], i) => {
    const y = ty + 2.2 + i * 5.6;
    if (i % 2 === 0) ink.rect(tx, y, 120, 5.6, { fill: '#f8f7fc' });
    ink.text(tx + 1.2, y + 3.8, k, 1.8, { c: MUTED });
    ink.text(tx + 42, y + 3.9, fitText(v, 2.35, 76), 2.35, { bold: i < 3 });
  });
  ink.rect(tx, ty + 2.2, 120, rows.length * 5.6, { stroke: RULE, lw: 0.2 });

  // Contents.
  const cx = 134;
  const cy = 118;
  const cols = [50, 18, 17, 16, 21];
  const heads = ['PRISM SKU', 'USAGE/YR', 'PACK', 'PER CTN', 'CARTONS/YR'];
  ink.text(cx, cy, 'CONTENTS', 2.2, { bold: true });
  ink.rect(cx, cy + 2.2, 122, 5, { fill: HEAD });
  let x = cx;
  heads.forEach((h, i) => {
    ink.text(i === 0 ? x + 1.2 : x + cols[i] - 1.2, cy + 5.6, h, 1.75, { bold: true, c: DIM, anchor: i === 0 ? 'start' : 'end' });
    x += cols[i];
  });
  const maxRows = 5;
  const shown = carton.members.slice(0, maxRows);
  shown.forEach((m, i) => {
    const y = cy + 7.2 + i * 4.6;
    const cells = [
      fitText(m.prism.name, 2.2, cols[0] - 2.4),
      fmt(m.prism.usage),
      packing(m),
      String(m.unitsPerCarton),
      fmt(Math.ceil(Math.max(m.prism.usage, 0) / Math.max(m.unitsPerCarton, 1))),
    ];
    let xx = cx;
    cells.forEach((t, ci) => {
      ink.text(ci === 0 ? xx + 1.2 : xx + cols[ci] - 1.2, y + 3.3, t, 2.2, { anchor: ci === 0 ? 'start' : 'end' });
      xx += cols[ci];
    });
    ink.line(cx, y + 4.6, cx + 122, y + 4.6, 0.1, RULE);
  });
  if (carton.members.length > maxRows) {
    ink.text(cx + 1.2, cy + 7.2 + maxRows * 4.6 + 3.3, `+ ${carton.members.length - maxRows} more — see the carton schedule`, 2.1, { c: MUTED });
  }

  titleBlock(ink, input.title, {
    sheetTitle: `CARTON ${carton.label} — RSC ${dims3(carton.inner, units)} INSIDE`,
    number,
    sheet: `${sheetNo} OF ${total}`,
    qr: input.qr.cartons[carton.label] ?? null,
  });
  return { number, title: `Carton ${carton.label}`, carton: carton.label, prims: ink.prims };
}

/** The whole set: schedule sheet(s) first, then one sheet per carton. */
export function buildSheets(input: DrawingInput): Sheet[] {
  const pages = paginateSchedule(input);
  const total = pages.length + input.solution.cartons.length;
  const schedule = scheduleSheets(input, pages, total);
  const cartons = input.solution.cartons.map((c, i) => cartonSheet(input, c, pages.length + i + 1, total));
  return [...schedule, ...cartons];
}

// ── QR helpers ────────────────────────────────────────────────────────────────

/** Horizontal runs of dark modules: [row, firstCol, length]. One shape per run keeps files small. */
export function qrRuns(m: boolean[][]): [number, number, number][] {
  const runs: [number, number, number][] = [];
  m.forEach((row, r) => {
    let c = 0;
    while (c < row.length) {
      if (!row[c]) {
        c++;
        continue;
      }
      const start = c;
      while (c < row.length && row[c]) c++;
      runs.push([r, start, c - start]);
    }
  });
  return runs;
}

// ── PDF ───────────────────────────────────────────────────────────────────────
// A minimal PDF 1.4 writer: one page per sheet, vector paths and the two
// base-14 Helvetica fonts, no compression. Every byte is ASCII (text outside it
// is written as octal escapes), so string length is byte length for the xref.

function num(v: number): string {
  const r = Math.round(v * 1000) / 1000;
  return Object.is(r, -0) ? '0' : String(r);
}

function rgb(hex: string): string {
  const h = hex.replace('#', '');
  const v = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  return v.map((x) => num(x)).join(' ');
}

function pdfText(s: string): string {
  let out = '(';
  for (const ch of s) {
    const code = winAnsi(ch);
    if (code === 0x28 || code === 0x29 || code === 0x5c) out += `\\${String.fromCharCode(code)}`;
    else if (code > 126) out += `\\${code.toString(8).padStart(3, '0')}`;
    else out += String.fromCharCode(code);
  }
  return `${out})`;
}

function pdfAscii(s: string): string {
  return [...s].map((ch) => (ch.charCodeAt(0) < 127 && ch.charCodeAt(0) > 31 && !'()\\'.includes(ch) ? ch : ' ')).join('');
}

function contentStream(sheet: Sheet, paper: { w: number; h: number }, gs: Map<number, string>): string {
  const k = 72 / 25.4;
  const ox = ((paper.w - FRAME.w) / 2) * k;
  const oy = paper.h * k - ((paper.h - FRAME.h) / 2) * k;
  const out: string[] = ['q', `${num(k)} 0 0 ${num(-k)} ${num(ox)} ${num(oy)} cm`, '1 J 1 j'];
  for (const p of sheet.prims) {
    if (p.k === 'line') {
      out.push(`${num(p.w)} w ${rgb(p.c)} RG ${p.dash ? `[${p.dash.map(num).join(' ')}] 0 d` : '[] 0 d'}`);
      out.push(`${num(p.a[0])} ${num(p.a[1])} m ${num(p.b[0])} ${num(p.b[1])} l S`);
    } else if (p.k === 'poly') {
      const path = p.pts.map(([x, y], i) => `${num(x)} ${num(y)} ${i === 0 ? 'm' : 'l'}`).join(' ') + (p.closed ? ' h' : '');
      const fill = !!p.fill;
      const stroke = !!p.stroke && (p.lw ?? 0) > 0;
      if (!fill && !stroke) continue;
      if (p.opacity != null) out.push(`q /${gs.get(p.opacity)} gs`);
      if (fill) out.push(`${rgb(p.fill!)} rg`);
      if (stroke) out.push(`${num(p.lw!)} w ${rgb(p.stroke!)} RG [] 0 d`);
      out.push(`${path} ${fill && stroke ? 'B' : fill ? 'f' : 'S'}`);
      if (p.opacity != null) out.push('Q');
    } else if (p.k === 'text') {
      const w = textWidth(p.s, p.size, p.bold);
      const shift = p.anchor === 'middle' ? w / 2 : p.anchor === 'end' ? w : 0;
      const rad = ((p.rot ?? 0) * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const x = p.x - shift * cos;
      const y = p.y - shift * sin;
      out.push(`${rgb(p.c ?? INK)} rg BT /${p.bold ? 'F2' : 'F1'} ${num(p.size)} Tf ${num(cos)} ${num(sin)} ${num(sin)} ${num(-cos)} ${num(x)} ${num(y)} Tm ${pdfText(p.s)} Tj ET`);
    } else {
      const cell = p.size / p.m.length;
      out.push(`1 1 1 rg ${num(p.x - cell)} ${num(p.y - cell)} ${num(p.size + 2 * cell)} ${num(p.size + 2 * cell)} re f 0 0 0 rg`);
      for (const [r, c, len] of qrRuns(p.m)) out.push(`${num(p.x + c * cell)} ${num(p.y + r * cell)} ${num(len * cell)} ${num(cell)} re f`);
    }
  }
  out.push('Q');
  return out.join('\n');
}

/** The sheets as a PDF, one landscape page each, the frame centred on the paper. */
export function sheetsToPdf(sheets: Sheet[], paperId: Paper, title: string, date = new Date()): Uint8Array {
  const paper = PAPER[paperId];
  const k = 72 / 25.4;
  const opacities = Array.from(
    new Set(sheets.flatMap((s) => s.prims.flatMap((p) => (p.k === 'poly' && p.opacity != null ? [p.opacity] : [])))),
  );
  const gs = new Map(opacities.map((o, i) => [o, `GS${i}`]));
  const gsDict = opacities.map((o, i) => `/GS${i} << /Type /ExtGState /ca ${num(o)} /CA ${num(o)} >>`).join(' ');
  const resources = `<< /Font << /F1 3 0 R /F2 4 0 R >>${gsDict ? ` /ExtGState << ${gsDict} >>` : ''} >>`;

  const objects: string[] = [];
  const pageIds = sheets.map((_, i) => 5 + i * 2);
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${sheets.length} >>`;
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
  objects[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
  sheets.forEach((sheet, i) => {
    const stream = contentStream(sheet, paper, gs);
    objects[pageIds[i]] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${num(paper.w * k)} ${num(paper.h * k)}] /Resources ${resources} /Contents ${pageIds[i] + 1} 0 R >>`;
    objects[pageIds[i] + 1] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  });
  const infoId = objects.length;
  const pad = (v: number) => String(v).padStart(2, '0');
  const stamp = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  objects[infoId] = `<< /Title (${pdfAscii(title)}) /Producer (Carton Packing Optimizer) /CreationDate (D:${stamp}) >>`;

  let out = '%PDF-1.4\n';
  const offsets: number[] = [];
  for (let id = 1; id < objects.length; id++) {
    offsets[id] = out.length;
    out += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xref = out.length;
  out += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objects.length; id++) out += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  out += `trailer\n<< /Size ${objects.length} /Root 1 0 R /Info ${infoId} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  const bytes = new Uint8Array(out.length);
  for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i);
  return bytes;
}

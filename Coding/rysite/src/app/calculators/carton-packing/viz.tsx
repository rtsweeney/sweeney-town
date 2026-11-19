'use client';

// SVG visualization components for the carton packing optimizer.
// All rendering is client-side; colors lean on the site palette
// (purple = prisms/data and upright cartons, kraft tans = corrugated,
// teal = cartons lying on their side). Carton hue tracks orientation only —
// a 90° turn within a layer shows in the direction of the major-flap seam
// (or, for a carton on its side, of its flap faces), never in color.

import { useMemo, useState } from 'react';
import type { CartonSpec, MemberPack, PalletPlan, SolutionK } from './engine';

// ── Shared helpers ────────────────────────────────────────────────────────────

export function fmt(x: number, digits = 0): string {
  return x.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}

export function fmtDim(x: number, units: string): string {
  const rounded = Math.round(x * 10) / 10;
  return `${fmt(rounded, Math.abs(rounded % 1) > 1e-9 ? 1 : 0)}${units === 'in' ? '″' : ' mm'}`;
}

// ── Isometric packed-carton view ──────────────────────────────────────────────

const COS30 = Math.cos(Math.PI / 6);
const SIN30 = 0.5;

type P3 = [number, number, number];

function proj([x, y, z]: P3): [number, number] {
  return [(x - y) * COS30, (x + y) * SIN30 - z];
}

function facePath(corners: P3[]): string {
  return (
    corners
      .map((c, i) => {
        const [px, py] = proj(c);
        return `${i === 0 ? 'M' : 'L'}${px.toFixed(2)},${py.toFixed(2)}`;
      })
      .join(' ') + ' Z'
  );
}

interface Box3 {
  x: number;
  y: number;
  z: number;
  a: number;
  b: number;
  c: number;
}

function boxFaces(v: Box3): { top: string; px: string; py: string } {
  const { x, y, z, a, b, c } = v;
  return {
    top: facePath([
      [x, y, z + c],
      [x + a, y, z + c],
      [x + a, y + b, z + c],
      [x, y + b, z + c],
    ]),
    px: facePath([
      [x + a, y, z],
      [x + a, y + b, z],
      [x + a, y + b, z + c],
      [x + a, y, z + c],
    ]),
    py: facePath([
      [x, y + b, z],
      [x + a, y + b, z],
      [x + a, y + b, z + c],
      [x, y + b, z + c],
    ]),
  };
}

const PRISM_TOP = '#b6aef4';
const PRISM_PX = '#8d80ee';
const PRISM_PY = '#6c5ce7';
const PRISM_EDGE = '#5142c9';
const KRAFT_BACK = '#f2e8d5';
const KRAFT_BOTTOM = '#e7d8ba';
const KRAFT_EDGE = '#b08f60';

export interface IsoCartonViewProps {
  carton: CartonSpec;
  member: MemberPack;
  units: string;
}

/** Isometric cutaway of one carton SKU packed with one prism SKU. */
export function IsoCartonView({ carton, member, units }: IsoCartonViewProps) {
  const view = useMemo(() => {
    const { inner, outer } = carton;
    const OL = outer.l;
    const OW = outer.w;
    const OD = outer.d;

    // Content block, centered in L and W, resting on the carton bottom.
    const blockL = member.cols * member.dl;
    const blockW = member.nPerStack * member.dw;
    const wall = (OL - inner.l) / 2;
    const offX = wall + (inner.l - blockL) / 2;
    const offY = wall + (inner.w - blockW) / 2;
    const offZ = (OD - inner.d) / 2;

    const boxes: Box3[] = [];
    for (let s = 0; s < member.nPerStack; s++) {
      for (let ci = 0; ci < member.cols; ci++) {
        for (let t = 0; t < member.tiers; t++) {
          boxes.push({
            x: offX + ci * member.dl,
            y: offY + s * member.dw,
            z: offZ + t * member.dd,
            a: member.dl,
            b: member.dw,
            c: member.dd,
          });
        }
      }
    }
    boxes.sort((u, v) => u.x + u.y - (v.x + v.y) || u.z - v.z);

    const corners: P3[] = [
      [0, 0, 0],
      [OL, 0, 0],
      [0, OW, 0],
      [OL, OW, 0],
      [0, 0, OD],
      [OL, 0, OD],
      [0, OW, OD],
      [OL, OW, OD],
    ];
    const pts = corners.map(proj);
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const margin = Math.max(OL, OW, OD) * 0.16;
    const fs = Math.max(maxX - minX, maxY - minY) * 0.052;

    return { OL, OW, OD, boxes, minX, maxX, minY, maxY, margin, fs };
  }, [carton, member]);

  const { OL, OW, OD, boxes, minX, maxX, minY, maxY, margin, fs } = view;
  const edge = (a: P3, b: P3, key: string) => {
    const [x1, y1] = proj(a);
    const [x2, y2] = proj(b);
    return <line key={key} x1={x1} y1={y1} x2={x2} y2={y2} stroke={KRAFT_EDGE} strokeWidth={fs * 0.09} strokeLinecap="round" />;
  };

  // Back (interior) faces: floor, x=0 wall, y=0 wall.
  const floor = facePath([
    [0, 0, 0],
    [OL, 0, 0],
    [OL, OW, 0],
    [0, OW, 0],
  ]);
  const wallX0 = facePath([
    [0, 0, 0],
    [0, OW, 0],
    [0, OW, OD],
    [0, 0, OD],
  ]);
  const wallY0 = facePath([
    [0, 0, 0],
    [OL, 0, 0],
    [OL, 0, OD],
    [0, 0, OD],
  ]);

  const labelL = proj([OL / 2, OW, 0]);
  const labelW = proj([OL, OW / 2, 0]);
  // The right silhouette edge (x = OL, y = 0) keeps the depth label off the contents.
  const labelD = proj([OL, 0, OD / 2]);

  return (
    <svg
      viewBox={`${minX - margin} ${minY - margin * 0.7} ${maxX - minX + margin * 2.6} ${maxY - minY + margin * 1.7}`}
      role="img"
      aria-label={`Carton ${carton.label} packed with ${member.prism.name}: ${member.cols} across the major flaps × ${member.tiers} tiers × ${member.nPerStack} per stack`}
      style={{ width: '100%', height: 'auto', display: 'block' }}
    >
      {/* carton interior */}
      <path d={wallX0} fill={KRAFT_BACK} stroke={KRAFT_EDGE} strokeWidth={fs * 0.05} />
      <path d={wallY0} fill={KRAFT_BACK} stroke={KRAFT_EDGE} strokeWidth={fs * 0.05} />
      <path d={floor} fill={KRAFT_BOTTOM} stroke={KRAFT_EDGE} strokeWidth={fs * 0.05} />
      {/* prisms */}
      {boxes.map((b, i) => {
        const f = boxFaces(b);
        const sw = fs * 0.045;
        return (
          <g key={i}>
            <path d={f.py} fill={PRISM_PY} stroke={PRISM_EDGE} strokeWidth={sw} strokeLinejoin="round" />
            <path d={f.px} fill={PRISM_PX} stroke={PRISM_EDGE} strokeWidth={sw} strokeLinejoin="round" />
            <path d={f.top} fill={PRISM_TOP} stroke={PRISM_EDGE} strokeWidth={sw} strokeLinejoin="round" />
          </g>
        );
      })}
      {/* carton front edges (silhouette) */}
      {edge([0, OW, 0], [OL, OW, 0], 'e1')}
      {edge([OL, 0, 0], [OL, OW, 0], 'e2')}
      {edge([OL, OW, 0], [OL, OW, OD], 'e3')}
      {edge([0, OW, OD], [OL, OW, OD], 'e4')}
      {edge([OL, 0, OD], [OL, OW, OD], 'e5')}
      {edge([0, OW, 0], [0, OW, OD], 'e6')}
      {edge([OL, 0, 0], [OL, 0, OD], 'e7')}
      {edge([0, 0, OD], [0, OW, OD], 'e8')}
      {edge([0, 0, OD], [OL, 0, OD], 'e9')}
      {/* dimension labels */}
      <text x={labelL[0] - fs * 0.4} y={labelL[1] + fs * 1.5} fontSize={fs} fill="var(--text-muted, #8888a4)" textAnchor="middle" fontFamily="inherit">
        L {fmtDim(OL, units)}
      </text>
      <text x={labelW[0] + fs * 1.6} y={labelW[1] + fs * 1.35} fontSize={fs} fill="var(--text-muted, #8888a4)" textAnchor="middle" fontFamily="inherit">
        W {fmtDim(OW, units)}
      </text>
      <text
        x={labelD[0] + fs * 0.9}
        y={labelD[1]}
        fontSize={fs}
        fill="var(--text-muted, #8888a4)"
        textAnchor="middle"
        fontFamily="inherit"
        transform={`rotate(-90 ${labelD[0] + fs * 0.9} ${labelD[1]})`}
      >
        D {fmtDim(OD, units)}
      </text>
    </svg>
  );
}

// ── Pallet top view ───────────────────────────────────────────────────────────

const CARTON_FILL = '#eae7fc';
const CARTON_STROKE = '#6c5ce7';
const CARTON_SIDE_FILL = '#d9f3ec';
const CARTON_SIDE_STROKE = '#0a9a7f';
const WOOD_FILL = '#e3c9a2';
const WOOD_STROKE = '#b5905e';

export interface PalletTopViewProps {
  plan: PalletPlan;
  layerIndex: number;
  palletLen: number;
  palletWid: number;
  units: string;
}

/** Top-down view of one layer pattern on the pallet. */
export function PalletTopView({ plan, layerIndex, palletLen, palletWid, units }: PalletTopViewProps) {
  const layer = plan.layers[layerIndex];
  const { usable } = plan;
  const ohX = (usable.x - palletLen) / 2;
  const ohY = (usable.y - palletWid) / 2;

  // Center the placed block on the usable area.
  const rects = layer.placements;
  let shiftX = 0;
  let shiftY = 0;
  if (rects.length > 0) {
    const maxX = Math.max(...rects.map((r) => r.x + r.w));
    const maxY = Math.max(...rects.map((r) => r.y + r.h));
    const minX = Math.min(...rects.map((r) => r.x));
    const minY = Math.min(...rects.map((r) => r.y));
    shiftX = (usable.x - (maxX - minX)) / 2 - minX;
    shiftY = (usable.y - (maxY - minY)) / 2 - minY;
  }

  const margin = Math.max(usable.x, usable.y) * 0.05;
  const fs = Math.max(usable.x, usable.y) * 0.032;
  // One hue per layer orientation: upright keeps the base colour, on-side
  // layers switch so they read at a glance in a mixed stack.
  const onSide = layer.orientation === 'onSide';
  const fill = onSide ? CARTON_SIDE_FILL : CARTON_FILL;
  const stroke = onSide ? CARTON_SIDE_STROKE : CARTON_STROKE;
  const outline = fs * 0.09;

  // Flap marks for a carton drawn in the box (x, y, w, h), with its
  // major-flap side L along x unless `lAlongY`.
  //  · Upright, the top is the closed flap face. The major flaps close last
  //    and meet down the middle of W, so their seam runs the full length L.
  //  · On its side, the top is a plain side panel and the flap faces stand
  //    vertical along the two L edges, so the seam faces sideways (the stack
  //    elevation shows it). Those two edges are drawn heavier instead.
  const flapMarks = (x: number, y: number, w: number, h: number, lAlongY: boolean) => {
    if (!onSide) {
      // Lighter than the outline, so a seam never reads as the edge between two cartons.
      return lAlongY ? (
        <line x1={x + w / 2} y1={y} x2={x + w / 2} y2={y + h} stroke={stroke} strokeWidth={outline * 0.65} opacity={0.9} />
      ) : (
        <line x1={x} y1={y + h / 2} x2={x + w} y2={y + h / 2} stroke={stroke} strokeWidth={outline * 0.65} opacity={0.9} />
      );
    }
    const t = Math.min(fs * 0.26, Math.min(w, h) * 0.2); // heavy edge, outer side flush with the outline's
    const o = t / 2 - outline / 2;
    const c = Math.min(fs * 0.22, Math.min(w, h) / 2); // stop short of the rounded corners
    return lAlongY ? (
      <>
        <line x1={x + o} y1={y + c} x2={x + o} y2={y + h - c} stroke={stroke} strokeWidth={t} />
        <line x1={x + w - o} y1={y + c} x2={x + w - o} y2={y + h - c} stroke={stroke} strokeWidth={t} />
      </>
    ) : (
      <>
        <line x1={x + c} y1={y + o} x2={x + w - c} y2={y + o} stroke={stroke} strokeWidth={t} />
        <line x1={x + c} y1={y + h - o} x2={x + w - c} y2={y + h - o} stroke={stroke} strokeWidth={t} />
      </>
    );
  };

  return (
    <svg
      viewBox={`${-ohX - margin} ${-ohY - margin} ${usable.x + margin * 2} ${usable.y + margin * 2 + fs * 2.4}`}
      role="img"
      aria-label={`Pallet layer pattern: ${layer.perLayer} cartons per layer, ${onSide ? 'lying on their side' : 'upright'}`}
      style={{ width: '100%', height: 'auto', display: 'block' }}
    >
      {/* pallet deck with slat hints */}
      <rect x={0} y={0} width={palletLen} height={palletWid} rx={fs * 0.4} fill={WOOD_FILL} stroke={WOOD_STROKE} strokeWidth={fs * 0.1} />
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1={palletLen * f} y1={fs * 0.35} x2={palletLen * f} y2={palletWid - fs * 0.35} stroke={WOOD_STROKE} strokeWidth={fs * 0.06} opacity={0.55} />
      ))}
      {/* usable (overhang) boundary */}
      {(ohX > 0.01 || ohY > 0.01) && (
        <rect x={-ohX} y={-ohY} width={usable.x} height={usable.y} fill="none" stroke="var(--text-muted, #8888a4)" strokeWidth={fs * 0.07} strokeDasharray={`${fs * 0.5} ${fs * 0.4}`} />
      )}
      {/* Cartons. Colour encodes orientation only — every carton in a layer
          shares it — so on-side layers stand out in a mixed stack. A 90° turn
          within a layer shows in the direction of the flap marks, not by hue. */}
      {rects.map((r, i) => {
        const x = r.x + shiftX - ohX + fs * 0.06;
        const y = r.y + shiftY - ohY + fs * 0.06;
        const w = r.w - fs * 0.12;
        const h = r.h - fs * 0.12;
        return (
          <g key={i}>
            <rect x={x} y={y} width={w} height={h} rx={fs * 0.22} fill={fill} stroke={stroke} strokeWidth={outline} />
            {flapMarks(x, y, w, h, r.rotated)}
          </g>
        );
      })}
      {/* legend */}
      <g fontFamily="inherit" fontSize={fs} fill="var(--text-secondary, #4a4a68)">
        <g>
          <rect x={-ohX} y={usable.y - ohY + margin * 0.5} width={fs * 1.15} height={fs * 0.8} rx={fs * 0.15} fill={fill} stroke={stroke} strokeWidth={fs * 0.06} />
          <text x={-ohX + fs * 1.55} y={usable.y - ohY + margin * 0.5 + fs * 0.7}>
            {onSide ? 'on side · flutes horizontal' : 'upright · flutes vertical'}
          </text>
        </g>
        <g>
          <rect x={-ohX + usable.x * 0.52} y={usable.y - ohY + margin * 0.5} width={fs * 1.15} height={fs * 0.8} rx={fs * 0.15} fill={fill} stroke={stroke} strokeWidth={outline} />
          {flapMarks(-ohX + usable.x * 0.52, usable.y - ohY + margin * 0.5, fs * 1.15, fs * 0.8, false)}
          <text x={-ohX + usable.x * 0.52 + fs * 1.55} y={usable.y - ohY + margin * 0.5 + fs * 0.7}>
            {onSide ? 'flap faces · seam on side' : 'major-flap seam'}
          </text>
        </g>
      </g>
      <title>{`Pallet ${fmtDim(palletLen, units)} × ${fmtDim(palletWid, units)} — ${layer.perLayer} cartons per layer`}</title>
    </svg>
  );
}

// ── Pallet side elevation ─────────────────────────────────────────────────────

export interface PalletSideViewProps {
  plan: PalletPlan;
  maxLoadHeight: number;
  padThickness: number;
  units: string;
  /** Real pallet height (e.g. 127 mm / 5 in), drawn to scale. */
  palletHeight: number;
}

/** Side elevation of the full stack: layers, pads, and the height limit. */
export function PalletSideView({ plan, maxLoadHeight, padThickness, units, palletHeight }: PalletSideViewProps) {
  const W = plan.usable.x;
  const palletH = palletHeight > 0 ? palletHeight : Math.max(maxLoadHeight * 0.05, W * 0.05);
  const fs = Math.max(W, maxLoadHeight + palletH) * 0.033;

  // Build the stack bottom-up: [pad?] layer × count … [pad?]
  const rows: { kind: 'pad' | 'layer'; h: number; layer?: number; no?: number }[] = [];
  const everyPad = plan.padCount > plan.layers.reduce((a, l) => a + l.count, 0);
  const hasPads = plan.padCount > 0;
  if (hasPads) rows.push({ kind: 'pad', h: padThickness });
  let layerNo = 0;
  plan.layers.forEach((l, li) => {
    for (let i = 0; i < l.count; i++) {
      layerNo++;
      rows.push({ kind: 'layer', h: l.height, layer: li, no: layerNo });
      if (everyPad) rows.push({ kind: 'pad', h: padThickness });
    }
  });
  if (hasPads && !everyPad) rows.push({ kind: 'pad', h: padThickness });

  let y = 0;
  const drawn = rows.map((r, i) => {
    const yy = y;
    y += r.h;
    return { ...r, y0: yy, key: i };
  });

  const totalH = maxLoadHeight + palletH;
  const margin = Math.max(W, totalH) * 0.06;

  return (
    <svg
      viewBox={`${-margin} ${-margin} ${W + margin * 2 + fs * 9} ${totalH + margin * 2}`}
      role="img"
      aria-label={`Stack elevation: ${plan.totalLayers} layers, ${fmtDim(plan.stackHeight, units)} of ${fmtDim(maxLoadHeight, units)} allowed`}
      style={{ width: '100%', height: 'auto', maxHeight: '380px', display: 'block', margin: '0 auto' }}
    >
      {/* height limit */}
      <line x1={0} y1={totalH - palletH - maxLoadHeight} x2={W} y2={totalH - palletH - maxLoadHeight} stroke="var(--text-muted, #8888a4)" strokeWidth={fs * 0.07} strokeDasharray={`${fs * 0.5} ${fs * 0.4}`} />
      <text x={W + fs * 0.4} y={totalH - palletH - maxLoadHeight + fs * 0.35} fontSize={fs} fill="var(--text-muted, #8888a4)" fontFamily="inherit">
        max {fmtDim(maxLoadHeight, units)}
      </text>
      {/* stack */}
      {drawn.map((r) => {
        const yTop = totalH - palletH - r.y0 - r.h;
        if (r.kind === 'pad') {
          return <rect key={r.key} x={0} y={yTop} width={W} height={Math.max(r.h, totalH * 0.006)} fill="#c9c4de" />;
        }
        const layer = plan.layers[r.layer ?? 0];
        // One rect per distinct x-span. The carton nearest the viewer (the
        // bottom edge of the top view) decides which face is seen.
        const spans = new Map<string, { x: number; w: number; front: number; rotated: boolean }>();
        layer.placements.forEach((p) => {
          const key = `${Math.round(p.x)}|${Math.round(p.w)}`;
          const cur = spans.get(key);
          if (!cur || p.y + p.h > cur.front) spans.set(key, { x: p.x, w: p.w, front: p.y + p.h, rotated: p.rotated });
        });
        const rot = layer.orientation === 'onSide';
        return (
          <g key={r.key}>
            {Array.from(spans.values()).map((s, si) => (
              <g key={si}>
                <rect
                  x={s.x + fs * 0.08}
                  y={yTop + fs * 0.06}
                  width={s.w - fs * 0.16}
                  height={r.h - fs * 0.12}
                  rx={fs * 0.18}
                  fill={rot ? CARTON_SIDE_FILL : CARTON_FILL}
                  stroke={rot ? CARTON_SIDE_STROKE : CARTON_STROKE}
                  strokeWidth={fs * 0.07}
                />
                {/* On its side with L across the view, a carton shows its
                    closed flap face: the major-flap seam runs across it at
                    mid-height. Upright cartons keep the seam on top, edge-on. */}
                {rot && !s.rotated && (
                  <line
                    x1={s.x + fs * 0.08}
                    y1={yTop + r.h / 2}
                    x2={s.x + s.w - fs * 0.08}
                    y2={yTop + r.h / 2}
                    stroke={CARTON_SIDE_STROKE}
                    strokeWidth={fs * 0.045}
                    opacity={0.9}
                  />
                )}
              </g>
            ))}
            {r.h > fs * 1.3 && (
              <text x={-fs * 0.35} y={yTop + r.h / 2 + fs * 0.32} fontSize={fs * 0.85} fill="var(--text-muted, #8888a4)" textAnchor="end" fontFamily="inherit">
                L{r.no}
              </text>
            )}
          </g>
        );
      })}
      {/* pallet profile */}
      <rect x={0} y={totalH - palletH} width={W} height={palletH * 0.45} fill={WOOD_FILL} stroke={WOOD_STROKE} strokeWidth={fs * 0.06} />
      {[0.02, 0.45, 0.88].map((f) => (
        <rect key={f} x={W * f} y={totalH - palletH * 0.55} width={W * 0.1} height={palletH * 0.55} fill={WOOD_FILL} stroke={WOOD_STROKE} strokeWidth={fs * 0.06} />
      ))}
      {/* stack height marker */}
      <text x={W + fs * 0.4} y={totalH - palletH - plan.stackHeight + fs * 1.2} fontSize={fs} fill="var(--text-secondary, #4a4a68)" fontFamily="inherit">
        stack {fmtDim(plan.stackHeight, units)}
      </text>
      {palletHeight > 0 && (
        <text x={W + fs * 0.4} y={totalH - palletH * 0.15} fontSize={fs * 0.92} fill="var(--text-muted, #8888a4)" fontFamily="inherit">
          {fmtDim(plan.stackHeight + palletHeight, units)} incl. pallet
        </text>
      )}
    </svg>
  );
}

// ── Column-configuration glyph (carton face cross-section) ────────────────────

/**
 * Cross-section of the carton's L × D face with the top open — flaps splayed
 * outward where the prisms are loaded in from above.
 */
export function ConfigGlyph({ cols, tiers }: { cols: number; tiers: number }) {
  const w = 40;
  const h = 30;
  const flap = 7;
  const top = flap + 1.5;
  const pad = 3.2;
  const boxL = 3.5;
  const boxR = w - 3.5;
  const cw = (boxR - boxL - pad * 2) / cols;
  const ch = (h - top - pad * 1.6) / tiers;
  const cells: { x: number; y: number }[] = [];
  for (let i = 0; i < cols; i++) for (let j = 0; j < tiers; j++) cells.push({ x: boxL + pad + i * cw, y: top + pad * 0.6 + j * ch });
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" style={{ flexShrink: 0 }}>
      {/* open-top carton: side + bottom walls, flaps splayed outward */}
      <path
        d={`M${boxL},${top} L${boxL},${h - 1.2} L${boxR},${h - 1.2} L${boxR},${top}`}
        fill="none"
        stroke={KRAFT_EDGE}
        strokeWidth={1.6}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <line x1={boxL} y1={top} x2={boxL - 2.4} y2={top - flap} stroke={KRAFT_EDGE} strokeWidth={1.6} strokeLinecap="round" />
      <line x1={boxR} y1={top} x2={boxR + 2.4} y2={top - flap} stroke={KRAFT_EDGE} strokeWidth={1.6} strokeLinecap="round" />
      {/* load-direction arrow into the opening */}
      <line x1={w / 2} y1={1.4} x2={w / 2} y2={top - 2.2} stroke={CARTON_STROKE} strokeWidth={1.2} strokeLinecap="round" opacity={0.75} />
      <path d={`M${w / 2 - 2.1},${top - 4.4} L${w / 2},${top - 1.6} L${w / 2 + 2.1},${top - 4.4}`} fill="none" stroke={CARTON_STROKE} strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" opacity={0.75} />
      {cells.map((c, i) => (
        <rect key={i} x={c.x + 0.6} y={c.y + 0.6} width={cw - 1.2} height={ch - 1.2} rx={1.5} fill={CARTON_FILL} stroke={CARTON_STROKE} strokeWidth={1.1} />
      ))}
    </svg>
  );
}

// ── Allowance diagram ─────────────────────────────────────────────────────────

const ALLOW_FILL = '#d9f3ec';
const ALLOW_STROKE = '#0a9a7f';

export interface AllowanceDiagramProps {
  allowMajor: string;
  allowMinor: string;
  allowDepth: string;
  units: string;
}

/**
 * Where each allowance is added: top view (major × minor) and front view
 * (major × depth), prism block in purple, extra space in teal.
 */
export function AllowanceDiagram({ allowMajor, allowMinor, allowDepth, units }: AllowanceDiagramProps) {
  const uu = units === 'in' ? '″' : ' mm';
  const val = (v: string) => (isFinite(parseFloat(v)) ? `+${parseFloat(v)}${uu}` : '+?');
  const panel = (
    x0: number,
    title: string,
    rightLabel: string,
    topLabel: string,
    axisX: string,
    axisY: string,
  ) => {
    const bw = 150;
    const bh = 96;
    const gapR = 26;
    const gapT = 16;
    const y0 = 26;
    return (
      <g key={title}>
        <text x={x0 + (bw + gapR) / 2} y={13} textAnchor="middle" fontSize={10.5} fontWeight={700} fill="var(--text-secondary, #4a4a68)" fontFamily="inherit" letterSpacing="0.05em">
          {title}
        </text>
        {/* carton inner boundary */}
        <rect x={x0} y={y0} width={bw + gapR} height={bh + gapT} fill="none" stroke={KRAFT_EDGE} strokeWidth={1.8} rx={2.5} />
        {/* allowance strips */}
        <rect x={x0 + bw} y={y0} width={gapR} height={bh + gapT} fill={ALLOW_FILL} opacity={0.85} />
        <rect x={x0} y={y0} width={bw} height={gapT} fill={ALLOW_FILL} opacity={0.85} />
        <line x1={x0 + bw} y1={y0} x2={x0 + bw} y2={y0 + bh + gapT} stroke={ALLOW_STROKE} strokeWidth={1} strokeDasharray="3 2.4" />
        <line x1={x0} y1={y0 + gapT} x2={x0 + bw} y2={y0 + gapT} stroke={ALLOW_STROKE} strokeWidth={1} strokeDasharray="3 2.4" />
        {/* prism block */}
        <rect x={x0 + 1.6} y={y0 + gapT + 1.6} width={bw - 3.2} height={bh - 3.2} rx={2} fill={PRISM_PX} opacity={0.92} />
        <text x={x0 + bw / 2} y={y0 + gapT + bh / 2 + 3.5} textAnchor="middle" fontSize={9.5} fontWeight={600} fill="#fff" fontFamily="inherit">
          prisms
        </text>
        {/* allowance labels */}
        <text x={x0 + bw + gapR / 2} y={y0 + bh * 0.62} textAnchor="middle" fontSize={9.5} fontWeight={700} fill={ALLOW_STROKE} fontFamily="inherit" transform={`rotate(-90 ${x0 + bw + gapR / 2} ${y0 + bh * 0.62})`}>
          {rightLabel}
        </text>
        <text x={x0 + bw * 0.5} y={y0 + gapT - 4.5} textAnchor="middle" fontSize={9.5} fontWeight={700} fill={ALLOW_STROKE} fontFamily="inherit">
          {topLabel}
        </text>
        {/* axes */}
        <text x={x0 + (bw + gapR) / 2} y={y0 + bh + gapT + 13} textAnchor="middle" fontSize={9} fill="var(--text-muted, #8888a4)" fontFamily="inherit">
          {axisX}
        </text>
        <text x={x0 - 7} y={y0 + (bh + gapT) / 2} textAnchor="middle" fontSize={9} fill="var(--text-muted, #8888a4)" fontFamily="inherit" transform={`rotate(-90 ${x0 - 7} ${y0 + (bh + gapT) / 2})`}>
          {axisY}
        </text>
      </g>
    );
  };
  return (
    <svg viewBox="0 0 420 156" role="img" aria-label="Diagram of where each allowance adds space inside the carton" style={{ width: '100%', maxWidth: '460px', height: 'auto', display: 'block' }}>
      {panel(18, 'TOP VIEW', val(allowMajor), val(allowMinor), 'major flaps (L) →', 'minor flaps (W) →')}
      {panel(240, 'FRONT VIEW', val(allowMajor), val(allowDepth), 'major flaps (L) →', 'depth (D) →')}
    </svg>
  );
}

// ── Efficiency meter ──────────────────────────────────────────────────────────

export function EffMeter({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <span className="cpk-meter" title={`${(value * 100).toFixed(1)}% of this SKU's best possible units per pallet`}>
      <span className="cpk-meter-track">
        <span className="cpk-meter-fill" style={{ width: `${pct}%` }} />
      </span>
      <span className="cpk-meter-num">{(value * 100).toFixed(0)}%</span>
    </span>
  );
}

// ── K-sweep chart ─────────────────────────────────────────────────────────────

function niceTicks(lo: number, hi: number, count: number): number[] {
  if (!(hi > lo)) {
    const v = lo || 1;
    return [v * 0.9, v, v * 1.1];
  }
  const span = hi - lo;
  const step0 = span / Math.max(count - 1, 1);
  const mag = Math.pow(10, Math.floor(Math.log10(step0)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= count) ?? 10 * mag;
  const start = Math.ceil(lo / step) * step;
  const out: number[] = [];
  for (let v = start; v <= hi + 1e-9; v += step) out.push(Math.round(v * 1e6) / 1e6);
  return out;
}

export interface KChartProps {
  solutions: SolutionK[];
  goalK: number;
  selectedK: number;
  onSelect: (k: number) => void;
  /** Formats a pallets-per-year figure as an annual freight cost. */
  freightFor?: (pallets: number) => string;
}

/**
 * Weighted units/pallet vs carton SKU count. Single series (site purple),
 * clickable markers select the K whose solution is shown below.
 */
export function KChart({ solutions, goalK, selectedK, onSelect, freightFor }: KChartProps) {
  const [hover, setHover] = useState<number | null>(null);
  const feasible = solutions.filter((s) => s.feasible);

  const W = 640;
  const H = 250;
  const m = { l: 62, r: 20, t: 20, b: 42 };

  const values = feasible.map((s) => s.weightedFpp);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pad = Math.max((hi - lo) * 0.18, hi * 0.02, 1e-6);
  const y0 = lo - pad;
  const y1 = hi + pad;
  const ticks = niceTicks(y0, y1, 5);

  const xFor = (i: number) => m.l + ((W - m.l - m.r) * (feasible.length === 1 ? 0.5 : i / (feasible.length - 1)));
  const yFor = (v: number) => H - m.b - ((H - m.b - m.t) * (v - y0)) / (y1 - y0);

  const path = feasible.map((s, i) => `${i === 0 ? 'M' : 'L'}${xFor(i).toFixed(1)},${yFor(s.weightedFpp).toFixed(1)}`).join(' ');
  const hovered = hover !== null ? feasible[hover] : null;

  if (feasible.length === 0) return null;

  return (
    <div className="cpk-chartwrap" style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Usage-weighted units per pallet for each carton SKU count" style={{ width: '100%', height: 'auto', display: 'block' }}>
        {/* gridlines + y ticks */}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={m.l} x2={W - m.r} y1={yFor(t)} y2={yFor(t)} stroke="var(--border-subtle, rgba(0,0,0,0.06))" strokeWidth={1} />
            <text x={m.l - 8} y={yFor(t) + 3.5} textAnchor="end" fontSize={11} fill="var(--text-muted, #8888a4)" fontFamily="inherit" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {fmt(t, t < 10 ? 1 : 0)}
            </text>
          </g>
        ))}
        {/* x axis */}
        <line x1={m.l} x2={W - m.r} y1={H - m.b} y2={H - m.b} stroke="var(--border, rgba(108,92,231,0.18))" strokeWidth={1} />
        {feasible.map((s, i) => (
          <g key={s.k}>
            <text x={xFor(i)} y={H - m.b + 16} textAnchor="middle" fontSize={11.5} fill={s.k === selectedK ? 'var(--text-primary, #1a1a2e)' : 'var(--text-muted, #8888a4)'} fontWeight={s.k === selectedK ? 700 : 400} fontFamily="inherit">
              {s.k}
            </text>
            {s.k === goalK && (
              <text x={xFor(i)} y={H - m.b + 29} textAnchor="middle" fontSize={9.5} fill="var(--accent-secondary, #00b894)" fontWeight={700} fontFamily="inherit" letterSpacing="0.06em">
                GOAL
              </text>
            )}
          </g>
        ))}
        <text x={(m.l + W - m.r) / 2} y={H - 3} textAnchor="middle" fontSize={11} fill="var(--text-muted, #8888a4)" fontFamily="inherit">
          carton SKU count
        </text>
        {/* series */}
        <path d={path} fill="none" stroke="#6c5ce7" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {feasible.map((s, i) => {
          const sel = s.k === selectedK;
          return (
            <g key={s.k}>
              <circle cx={xFor(i)} cy={yFor(s.weightedFpp)} r={sel ? 6.5 : 4.5} fill="#6c5ce7" stroke="var(--surface-raised, #ffffff)" strokeWidth={2} />
              {sel && (
                <text x={xFor(i)} y={yFor(s.weightedFpp) - 12} textAnchor="middle" fontSize={12} fontWeight={700} fill="var(--text-primary, #1a1a2e)" fontFamily="inherit" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {fmt(s.weightedFpp, 1)}
                </text>
              )}
              {/* generous hit target */}
              <rect
                x={xFor(i) - (W - m.l - m.r) / Math.max(feasible.length, 1) / 2}
                y={m.t}
                width={(W - m.l - m.r) / Math.max(feasible.length, 1)}
                height={H - m.t - m.b}
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onClick={() => onSelect(s.k)}
              />
            </g>
          );
        })}
        {/* crosshair on hover */}
        {hover !== null && <line x1={xFor(hover)} x2={xFor(hover)} y1={m.t} y2={H - m.b} stroke="var(--text-muted, #8888a4)" strokeWidth={1} opacity={0.4} pointerEvents="none" />}
      </svg>
      {hovered && hover !== null && (
        <div
          className="cpk-tooltip"
          style={{
            left: `${(xFor(hover) / W) * 100}%`,
            transform: `translate(${hover > feasible.length / 2 ? '-108%' : '8%'}, 0)`,
          }}
        >
          <div className="cpk-tooltip-title">{hovered.k} carton SKU{hovered.k === 1 ? '' : 's'}</div>
          <div>{fmt(hovered.weightedFpp, 1)} weighted units/pallet</div>
          <div>{fmt(hovered.pallets, 1)} pallets per year</div>
          {freightFor && <div>{freightFor(hovered.pallets)} freight per year</div>}
          <div>{(hovered.weightedEff * 100).toFixed(1)}% of ideal</div>
          <div className="cpk-tooltip-hint">click to inspect</div>
        </div>
      )}
    </div>
  );
}

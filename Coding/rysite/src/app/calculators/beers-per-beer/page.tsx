'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Footer from '@/components/Footer';

// ── Constants ────────────────────────────────────────────────────────────────

const ML_PER_OZ = 29.5735295625;
const ETHANOL_DENSITY = 0.789; // g/mL at 20 °C
const G_PER_LB = 453.59237;

/** A "standard beer" on this site: 12 oz at 4.2% ABV. */
const STANDARD_ABV = 4.2;
const STANDARD_OZ = 12;
const STANDARD_ML = STANDARD_OZ * ML_PER_OZ;
/** A US standard drink is 14 g of pure ethanol (12 oz at 5%). */
const US_STANDARD_DRINK_G = 14;

/** Widmark elimination is zero-order — a flat %BAC burned off per hour. */
const ELIMINATION_PER_HOUR = 0.015;
/** First-order stomach → blood uptake. τ = 15 min puts the peak ~30–45 min out. */
const ABSORPTION_TAU_MIN = 15;

const MINUTE = 60_000;
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

const OZ_MIN = 1;
const OZ_MAX = 40;
const ML_MIN = 30;
const ML_MAX = 1183; // 40 oz, so both sliders hit their ends together
const ABV_MIN = 0.5;
const ABV_MAX = 20;
const WEIGHT_MIN = 80;
const WEIGHT_MAX = 400;
const TIME_SPAN_MIN = 1440; // the time slider covers the last 24 hours

const DEFAULT_ML = STANDARD_OZ * ML_PER_OZ; // reads 12.0 oz / 355 mL
const DEFAULT_ABV = 5;
const DEFAULT_WEIGHT = 185;
const DEFAULT_BODY: BodyKey = 'male';

const STORAGE_KEY = 'bpb-night-v1';

/** What a slider fades to when the other unit is driving. */
const MUTED_ACCENT = '#b4b6c8';

/** Widmark r — the fraction of body mass that behaves like water. */
const BODY_TYPES = [
  { key: 'male', label: 'Typical male build', r: 0.68 },
  { key: 'female', label: 'Typical female build', r: 0.55 },
  { key: 'lean', label: 'Lean / athletic build', r: 0.73 },
  { key: 'heavy', label: 'Higher body-fat build', r: 0.5 },
] as const;

type BodyKey = (typeof BODY_TYPES)[number]['key'];

const DRIVING_LIMITS = [
  { bac: 0.08, color: '#e84393', label: '0.08 — legal limit, most US states' },
  { bac: 0.05, color: '#e17055', label: '0.05 — Utah and much of the world' },
];

// ── Types ────────────────────────────────────────────────────────────────────

type Driver = 'oz' | 'mL';

interface Drink {
  id: string;
  ts: number; // epoch ms the drink was consumed
  ml: number;
  abv: number;
}

interface BacPoint {
  t: number;
  bac: number;
}

interface Simulation {
  points: BacPoint[];
  start: number;
  bacNow: number;
  /** BAC at the far end of the projection — says whether the curve got there. */
  endBac: number;
  peak: number;
  peakAt: number;
  soberAt: number | null;
  /** When the curve next drops under each driving limit, if it is over it now. */
  clearsAt: Record<string, number | null>;
}

// ── Math ─────────────────────────────────────────────────────────────────────

function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

/** Grams of pure ethanol in a pour. */
function ethanolGrams(ml: number, abv: number): number {
  return ml * (abv / 100) * ETHANOL_DENSITY;
}

/**
 * Widmark peak: grams of ethanol spread through (body mass × r) of water,
 * expressed as g per 100 g of blood — i.e. the familiar "0.08" number.
 * Equivalent to the textbook  BAC = 5.14 × fl-oz-ethanol / (lb × r).
 */
function peakBac(grams: number, weightLb: number, r: number): number {
  return (grams / (weightLb * G_PER_LB * r)) * 100;
}

/**
 * Steps the whole night minute by minute. Alcohol arrives in the blood on a
 * first-order curve per drink; the liver takes it out at a flat rate for the
 * body as a whole, which is why this has to be integrated rather than summed.
 */
function simulate(drinks: Drink[], weightLb: number, r: number, now: number): Simulation | null {
  if (drinks.length === 0) return null;

  const sorted = [...drinks].sort((a, b) => a.ts - b.ts);
  const doses = sorted.map((d) => ({
    ts: d.ts,
    peak: peakBac(ethanolGrams(d.ml, d.abv), weightLb, r),
  }));
  const totalPeak = doses.reduce((s, d) => s + d.peak, 0);

  const start = sorted[0].ts;
  const step = MINUTE;
  const tau = ABSORPTION_TAU_MIN * MINUTE;
  const perStep = ELIMINATION_PER_HOUR * (step / HOUR);
  const hardStop = Math.max(now, sorted[sorted.length - 1].ts) + 30 * HOUR;

  const points: BacPoint[] = [];
  let bac = 0;
  let absorbedPrev = 0;

  for (let t = start; t <= hardStop; t += step) {
    let absorbed = 0;
    for (const d of doses) {
      if (t >= d.ts) absorbed += d.peak * (1 - Math.exp(-(t - d.ts) / tau));
    }
    if (t > start) bac = Math.max(0, bac + (absorbed - absorbedPrev) - perStep);
    absorbedPrev = absorbed;
    points.push({ t, bac });
    // Once everything is in the blood and the blood is empty, the rest is a flat line.
    if (t > now && bac <= 1e-4 && absorbed >= totalPeak - 1e-6) break;
  }

  const lastPoint = points[points.length - 1];
  const nowIdx = clamp(Math.round((now - start) / step), 0, points.length - 1);

  let peak = 0;
  let peakAt = start;
  for (const p of points) {
    if (p.bac > peak) {
      peak = p.bac;
      peakAt = p.t;
    }
  }

  /**
   * The honest answer to "when am I under X" is the last time the curve is at
   * or above it, not the first time it dips — BAC keeps climbing for a while
   * after the last sip, so an early dip can be followed by another crossing.
   */
  const settlesUnder = (limit: number): number | null => {
    let lastOver = -1;
    for (let i = 0; i < points.length; i += 1) if (points[i].bac >= limit) lastOver = i;
    if (lastOver === -1) return null; // never at or above it in the first place
    const next = points[lastOver + 1];
    if (!next || next.t <= now) return null; // never comes down in range, or long past
    return next.t;
  };

  const clearsAt: Record<string, number | null> = {};
  for (const limit of DRIVING_LIMITS) clearsAt[String(limit.bac)] = settlesUnder(limit.bac);

  return {
    points,
    start,
    bacNow: points[nowIdx].bac,
    endBac: lastPoint.bac,
    peak,
    peakAt,
    soberAt: settlesUnder(1e-4),
    clearsAt,
  };
}

// ── Formatting ───────────────────────────────────────────────────────────────

function fmtBac(x: number): string {
  return x.toFixed(3);
}

function fmtBeers(x: number): string {
  return x >= 100 ? x.toFixed(0) : x >= 10 ? x.toFixed(1) : x.toFixed(2);
}

function fmtClock(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function fmtDuration(ms: number): string {
  const mins = Math.max(0, Math.round(ms / MINUTE));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Turns a projected crossing time into something readable in a stat tile. */
function describeCrossing(at: number | null, alreadyUnder: boolean, now: number): string {
  if (at !== null) return `${fmtClock(at)} · in ${fmtDuration(at - now)}`;
  return alreadyUnder ? 'already there' : 'past this chart';
}

function statusFor(bac: number): { label: string; tone: string; blurb: string } {
  if (bac < 0.005) return { label: 'Stone cold', tone: 'good', blurb: 'Nothing measurable on board.' };
  if (bac < 0.02) return { label: 'Barely there', tone: 'good', blurb: 'A trace — still not a green light to drive.' };
  if (bac < 0.05) return { label: 'Feeling it', tone: 'warn', blurb: 'Reaction time and judgment are already slipping.' };
  if (bac < 0.08) return { label: 'Impaired', tone: 'hot', blurb: 'Over the limit in Utah and most of Europe.' };
  if (bac < 0.15) return { label: 'Over the limit', tone: 'bad', blurb: 'Above 0.08 — a DUI in every US state.' };
  return { label: 'Way over', tone: 'bad', blurb: 'Get water, get food, and get a ride.' };
}

// ── Slider ───────────────────────────────────────────────────────────────────

interface SliderProps {
  label: string;
  readout: string;
  value: number;
  min: number;
  max: number;
  step: number;
  accent: string;
  muted?: boolean;
  badge?: string;
  hint?: string;
  onChange: (value: number) => void;
}

function Slider({ label, readout, value, min, max, step, accent, muted, badge, hint, onChange }: SliderProps) {
  const pct = clamp(((value - min) / (max - min)) * 100, 0, 100);
  // The vars live on the wrapper, not the input: an inline var on the input would
  // outrank the .is-muted rule, and the badge needs to read the same accent.
  const vars = {
    '--bpb-accent': muted ? MUTED_ACCENT : accent,
    '--bpb-pct': `${pct}%`,
  } as React.CSSProperties;
  return (
    <div className={`bpb-slider${muted ? ' is-muted' : ''}`} style={vars}>
      <div className="bpb-sliderhead">
        <span className="bpb-sliderlabel">
          {label}
          {badge && <span className="bpb-badge">{badge}</span>}
        </span>
        <span className="bpb-sliderval">{readout}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
      {hint && <p className="bpb-sliderhint">{hint}</p>}
    </div>
  );
}

// ── BAC chart ────────────────────────────────────────────────────────────────

interface ChartProps {
  sim: Simulation;
  drinks: Drink[];
  now: number;
  /** Phone-width layout: a squarer viewBox so the labels do not scale to nothing. */
  compact: boolean;
}

function BacChart({ sim, drinks, now, compact }: ChartProps) {
  const [hover, setHover] = useState<number | null>(null);

  const width = compact ? 430 : 880;
  const height = compact ? 300 : 330;
  const pad = compact
    ? { top: 20, right: 14, bottom: 30, left: 40 }
    : { top: 24, right: 22, bottom: 34, left: 54 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const t0 = sim.start;
  const last = sim.points[sim.points.length - 1].t;
  const t1 = Math.max(last, now + 30 * MINUTE, t0 + 2 * HOUR);
  const yMax = Math.max(0.1, Math.ceil(sim.peak * 1.25 * 100) / 100);

  const x = (t: number) => pad.left + ((t - t0) / (t1 - t0)) * plotW;
  const y = (b: number) => pad.top + plotH - (clamp(b, 0, yMax) / yMax) * plotH;
  const baseline = pad.top + plotH;

  const line = (pts: BacPoint[]) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.t).toFixed(1)},${y(p.bac).toFixed(1)}`).join('');

  const past = sim.points.filter((p) => p.t <= now);
  const future = sim.points.filter((p) => p.t >= now);
  const area = `${line(sim.points)}L${x(last).toFixed(1)},${baseline}L${x(t0).toFixed(1)},${baseline}Z`;

  const yStep = yMax <= 0.12 ? 0.02 : yMax <= 0.3 ? 0.05 : 0.1;
  const yTicks: number[] = [];
  for (let v = 0; v <= yMax + 1e-9; v += yStep) yTicks.push(Math.round(v * 1000) / 1000);

  const spanH = (t1 - t0) / HOUR;
  const bands = compact ? [1.5, 5, 11, 20] : [3, 7, 14, 24];
  const tickH = spanH <= bands[0] ? 0.5 : spanH <= bands[1] ? 1 : spanH <= bands[2] ? 2 : spanH <= bands[3] ? 3 : 6;
  const tickMs = tickH * HOUR;
  const xTicks: number[] = [];
  for (let t = Math.ceil(t0 / tickMs) * tickMs; t <= t1; t += tickMs) xTicks.push(t);

  const hoverPoint = hover === null ? null : sim.points[hover];
  const tipW = 146;
  const tipFlip = hoverPoint !== null && x(hoverPoint.t) + tipW + 20 > width;

  const handleMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * width;
    const t = t0 + ((px - pad.left) / plotW) * (t1 - t0);
    setHover(clamp(Math.round((t - t0) / MINUTE), 0, sim.points.length - 1));
  };

  return (
    <svg
      className={`bpb-chart${compact ? ' is-compact' : ''}`}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`Blood alcohol curve. Estimated ${fmtBac(sim.bacNow)} percent right now, peaking at ${fmtBac(sim.peak)} percent.`}
      onPointerMove={handleMove}
      onPointerLeave={() => setHover(null)}
    >
      <defs>
        {/*
          Both gradients run in user space over the full BAC scale, so the colour
          means something — the curve warms up as it climbs past 0.05 and 0.08 —
          and the solid and dashed halves stay one continuous ramp instead of
          each restarting inside its own bounding box.
        */}
        <linearGradient id="bpbArea" gradientUnits="userSpaceOnUse" x1="0" y1={pad.top} x2="0" y2={baseline}>
          <stop offset="0%" stopColor="#e84393" stopOpacity="0.4" />
          <stop offset={`${(1 - 0.05 / yMax) * 100}%`} stopColor="#6c5ce7" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#00b894" stopOpacity="0.04" />
        </linearGradient>
        <linearGradient id="bpbLine" gradientUnits="userSpaceOnUse" x1="0" y1={baseline} x2="0" y2={pad.top}>
          <stop offset="0%" stopColor="#00b894" />
          <stop offset={`${(0.05 / yMax) * 100}%`} stopColor="#6c5ce7" />
          <stop offset={`${(0.08 / yMax) * 100}%`} stopColor="#e84393" />
          <stop offset="100%" stopColor="#d63031" />
        </linearGradient>
        <filter id="bpbGlow" x="-20%" y="-40%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Blank SVG never hit-tests, so the plot needs something painted to catch the pointer. */}
      <rect x={pad.left} y={pad.top} width={plotW} height={plotH} fill="transparent" />

      {yTicks.map((v) => (
        <g key={`y${v}`}>
          <line x1={pad.left} x2={width - pad.right} y1={y(v)} y2={y(v)} className="bpb-grid" />
          <text x={pad.left - 8} y={y(v) + 4} className="bpb-axis" textAnchor="end">
            {v.toFixed(2)}
          </text>
        </g>
      ))}

      <line x1={pad.left} x2={width - pad.right} y1={baseline} y2={baseline} className="bpb-axisline" />
      {xTicks.map((t) => (
        <text key={`x${t}`} x={x(t)} y={baseline + 19} className="bpb-axis" textAnchor="middle">
          {new Date(t).getMinutes() === 0
            ? new Date(t).toLocaleTimeString('en-US', { hour: 'numeric' })
            : fmtClock(t)}
        </text>
      ))}

      <path d={area} fill="url(#bpbArea)" />
      <path d={line(past)} className="bpb-curve" filter="url(#bpbGlow)" />
      {future.length > 1 && <path d={line(future)} className="bpb-curve bpb-curve-future" />}

      {/* driving limits */}
      {DRIVING_LIMITS.filter((l) => l.bac <= yMax).map((l) => (
        <g key={l.bac}>
          <line
            x1={pad.left}
            x2={width - pad.right}
            y1={y(l.bac)}
            y2={y(l.bac)}
            stroke={l.color}
            strokeWidth="2"
            strokeDasharray="7 6"
            opacity="0.85"
          />
          <text x={width - pad.right} y={y(l.bac) - 6} textAnchor="end" className="bpb-limitlabel" fill={l.color}>
            {compact ? l.bac.toFixed(2) : l.label}
          </text>
        </g>
      ))}

      {/* each drink, sitting on the time axis */}
      {drinks.map((d) => (
        <g key={d.id}>
          <line x1={x(d.ts)} x2={x(d.ts)} y1={baseline} y2={baseline - 11} stroke="#fdcb6e" strokeWidth="2" />
          <circle cx={x(d.ts)} cy={baseline - 14} r="4.5" fill="#fdcb6e" stroke="#fff" strokeWidth="1.5" />
        </g>
      ))}

      {/* now */}
      <line x1={x(now)} x2={x(now)} y1={pad.top - 6} y2={baseline} className="bpb-nowline" />
      <text x={x(now)} y={pad.top - 10} textAnchor="middle" className="bpb-nowlabel">
        now
      </text>
      <circle cx={x(now)} cy={y(sim.bacNow)} r="10" className="bpb-nowhalo" />
      <circle cx={x(now)} cy={y(sim.bacNow)} r="5" className="bpb-nowdot" />

      {/* hover readout */}
      {hoverPoint && (
        <g pointerEvents="none">
          <line x1={x(hoverPoint.t)} x2={x(hoverPoint.t)} y1={pad.top} y2={baseline} className="bpb-crosshair" />
          <circle cx={x(hoverPoint.t)} cy={y(hoverPoint.bac)} r="4" fill="#fff" stroke="#6c5ce7" strokeWidth="2.5" />
          <g
            transform={`translate(${tipFlip ? x(hoverPoint.t) - tipW - 12 : x(hoverPoint.t) + 12}, ${clamp(
              y(hoverPoint.bac) - 46,
              pad.top,
              baseline - 52,
            )})`}
          >
            <rect width={tipW} height="46" rx="9" className="bpb-tip" />
            <text x="12" y="20" className="bpb-tiptime">
              {fmtClock(hoverPoint.t)}
            </text>
            <text x="12" y="37" className="bpb-tipbac">
              {fmtBac(hoverPoint.bac)}% BAC
            </text>
          </g>
        </g>
      )}
    </svg>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

function isDrink(value: unknown): value is Drink {
  if (typeof value !== 'object' || value === null) return false;
  const d = value as Record<string, unknown>;
  return (
    typeof d.id === 'string' &&
    typeof d.ts === 'number' &&
    typeof d.ml === 'number' &&
    typeof d.abv === 'number' &&
    Number.isFinite(d.ts) &&
    d.ml > 0 &&
    d.abv >= 0
  );
}

export default function BeersPerBeerPage() {
  // The pour — mL is the single source of truth, `driver` says which slider owns it.
  const [volumeMl, setVolumeMl] = useState(DEFAULT_ML);
  const [driver, setDriver] = useState<Driver>('oz');
  const [abv, setAbv] = useState(DEFAULT_ABV);

  // The drinker
  const [bodyKey, setBodyKey] = useState<BodyKey>(DEFAULT_BODY);
  const [weightLb, setWeightLb] = useState(DEFAULT_WEIGHT);
  const [minutesAgo, setMinutesAgo] = useState(0);

  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [now, setNow] = useState(0); // 0 until mounted, which keeps SSR and the client in step
  const [flashId, setFlashId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [compact, setCompact] = useState(false);

  const loadedRef = useRef(false);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Persistence: the log has to survive closing the tab mid-night ──
  useEffect(() => {
    const t = Date.now();
    setNow(t);
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw) as Record<string, unknown>;
        if (Array.isArray(data.drinks)) {
          setDrinks(
            data.drinks
              .filter(isDrink)
              .filter((d) => t - d.ts < DAY) // anything older is long gone from the blood
              .sort((a, b) => a.ts - b.ts),
          );
        }
        if (typeof data.weightLb === 'number') setWeightLb(clamp(data.weightLb, WEIGHT_MIN, WEIGHT_MAX));
        if (typeof data.bodyKey === 'string' && BODY_TYPES.some((b) => b.key === data.bodyKey)) {
          setBodyKey(data.bodyKey as BodyKey);
        }
      }
    } catch {
      /* ignore corrupt storage */
    }
    loadedRef.current = true;
  }, []);

  useEffect(() => {
    if (!loadedRef.current) return;
    try {
      // Nothing worth remembering leaves nothing behind, so Clear really is clear.
      if (drinks.length === 0 && weightLb === DEFAULT_WEIGHT && bodyKey === DEFAULT_BODY) {
        localStorage.removeItem(STORAGE_KEY);
        return;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 1, drinks, weightLb, bodyKey }));
    } catch {
      /* storage full or unavailable */
    }
  }, [drinks, weightLb, bodyKey]);

  // The whole page is "live" because the clock is state.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);

  // The chart swaps to a squarer viewBox on phones so its labels stay readable.
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 600px)');
    const sync = () => setCompact(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => () => {
    if (confirmTimer.current) clearTimeout(confirmTimer.current);
  }, []);

  const mounted = now > 0;

  // ── Derived pour values — both volume sliders always read the same drink ──
  const ozValue = Math.round((volumeMl / ML_PER_OZ) * 10) / 10;
  const mlValue = Math.round(volumeMl);
  const grams = ethanolGrams(volumeMl, abv);
  const beers = (volumeMl * abv) / (STANDARD_ML * STANDARD_ABV);
  const usDrinks = grams / US_STANDARD_DRINK_G;

  const handleOz = useCallback((oz: number) => {
    setDriver('oz');
    setVolumeMl(clamp(oz * ML_PER_OZ, ML_MIN, ML_MAX));
  }, []);

  const handleMl = useCallback((ml: number) => {
    setDriver('mL');
    setVolumeMl(clamp(ml, ML_MIN, ML_MAX));
  }, []);

  // ── The night ──
  const r = BODY_TYPES.find((b) => b.key === bodyKey)?.r ?? 0.68;
  const sim = useMemo(
    () => (mounted ? simulate(drinks, weightLb, r, now) : null),
    [drinks, weightLb, r, now, mounted],
  );

  const drinkTime = now - minutesAgo * MINUTE;

  const handleDrink = () => {
    const ts = Date.now() - minutesAgo * MINUTE;
    const drink: Drink = {
      id: `${ts}-${Math.random().toString(36).slice(2, 8)}`,
      ts,
      ml: volumeMl,
      abv,
    };
    setDrinks((list) => [...list, drink].sort((a, b) => a.ts - b.ts));
    setNow(Date.now());
    setFlashId(drink.id);
    setTimeout(() => setFlashId((id) => (id === drink.id ? null : id)), 1600);
  };

  const handleRemove = (id: string) => setDrinks((list) => list.filter((d) => d.id !== id));

  const handleClear = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      confirmTimer.current = setTimeout(() => setConfirmClear(false), 4000);
      return;
    }
    if (confirmTimer.current) clearTimeout(confirmTimer.current);
    setConfirmClear(false);
    setDrinks([]);
    setWeightLb(DEFAULT_WEIGHT);
    setBodyKey(DEFAULT_BODY);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* nothing to remove */
    }
  };

  const totals = drinks.reduce(
    (acc, d) => {
      acc.beers += (d.ml * d.abv) / (STANDARD_ML * STANDARD_ABV);
      acc.grams += ethanolGrams(d.ml, d.abv);
      return acc;
    },
    { beers: 0, grams: 0 },
  );

  const status = statusFor(sim?.bacNow ?? 0);

  return (
    <main>
      <div className="container bpb-root">
        <div className="page-header">
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            <Link href="/calculators" style={{ color: 'var(--accent-secondary)' }}>
              Calculators
            </Link>
            {' / '}Beers Per Beer
          </p>
          <h1 className="section-title">
            <span className="gradient-text">Beers Per Beer</span>
          </h1>
          <p className="section-subtitle" style={{ marginBottom: 0 }}>
            Slide a pour and watch it convert to standard beers in real time. Log what you actually drink and it
            sketches your blood alcohol curve for the rest of the night. Everything stays in your browser.
          </p>
        </div>

        {/* ── 1 · The pour ── */}
        <section className="bpb-card">
          <div className="bpb-cardhead">
            <h2>1 &middot; The pour</h2>
            <span className="bpb-cardnote">updates as you drag</span>
          </div>

          <Slider
            label="Volume (oz)"
            readout={`${ozValue.toFixed(1)} oz`}
            value={ozValue}
            min={OZ_MIN}
            max={OZ_MAX}
            step={0.1}
            accent="#6c5ce7"
            muted={driver !== 'oz'}
            badge={driver === 'oz' ? 'driving' : undefined}
            onChange={handleOz}
          />
          <Slider
            label="Volume (mL)"
            readout={`${mlValue} mL`}
            value={mlValue}
            min={ML_MIN}
            max={ML_MAX}
            step={1}
            accent="#00b894"
            muted={driver !== 'mL'}
            badge={driver === 'mL' ? 'driving' : undefined}
            hint={
              driver === 'oz'
                ? 'Ounces are driving. Nudge this one and metric takes over — both always read the same pour.'
                : 'Millilitres are driving. Nudge the ounce slider to hand it back.'
            }
            onChange={handleMl}
          />
          <Slider
            label="ABV"
            readout={`${abv.toFixed(1)}%`}
            value={abv}
            min={ABV_MIN}
            max={ABV_MAX}
            step={0.1}
            accent="#e84393"
            onChange={setAbv}
          />

          <div className="bpb-readout">
            <div className="bpb-bignum">{fmtBeers(beers)}</div>
            <div className="bpb-bignumlabel">standard beers</div>
            <p className="bpb-readoutdetail">
              {ozValue.toFixed(1)} oz &middot; {mlValue} mL &middot; {abv.toFixed(1)}% ABV &rarr;{' '}
              <b>{grams.toFixed(1)} g</b> of pure alcohol, or <b>{usDrinks.toFixed(2)}</b> US standard drinks.
            </p>
            <p className="bpb-readoutdetail bpb-muted">
              A standard beer here is {STANDARD_OZ} oz / {Math.round(STANDARD_ML)} mL at {STANDARD_ABV}% ABV.
            </p>
          </div>
        </section>

        {/* ── 2 · The drinker ── */}
        <section className="bpb-card">
          <div className="bpb-cardhead">
            <h2>2 &middot; You, and when you drank it</h2>
          </div>

          <label className="bpb-field">
            <span className="bpb-fieldlabel">Body build (Widmark r)</span>
            <select value={bodyKey} onChange={(e) => setBodyKey(e.target.value as BodyKey)}>
              {BODY_TYPES.map((b) => (
                <option key={b.key} value={b.key}>
                  {b.label} — r {b.r.toFixed(2)}
                </option>
              ))}
            </select>
            <span className="bpb-fieldhint">
              Widmark&rsquo;s r is the share of your body that acts like water and dilutes the alcohol. More lean
              mass means a lower BAC from the same drink.
            </span>
          </label>

          <Slider
            label="Body weight"
            readout={`${weightLb} lb`}
            value={weightLb}
            min={WEIGHT_MIN}
            max={WEIGHT_MAX}
            step={1}
            accent="#00b894"
            onChange={(v) => setWeightLb(Math.round(v))}
            hint={`${Math.round(weightLb * 0.45359237)} kg`}
          />
          <Slider
            label="When did you drink it?"
            readout={
              mounted ? (minutesAgo === 0 ? 'right now' : `${fmtClock(drinkTime)} · ${fmtDuration(minutesAgo * MINUTE)} ago`) : '—'
            }
            value={TIME_SPAN_MIN - minutesAgo}
            min={0}
            max={TIME_SPAN_MIN}
            step={5}
            accent="#fdcb6e"
            onChange={(v) => setMinutesAgo(TIME_SPAN_MIN - Math.round(v))}
            hint="Left is 24 hours ago, right is this second. Backfill the ones you forgot to log."
          />

          <button type="button" className="bpb-drinkbtn" onClick={handleDrink}>
            <span className="bpb-drinkicon">&#127866;</span> Drink it
          </button>
          <p className="bpb-sliderhint" style={{ textAlign: 'center', marginTop: '0.5rem' }}>
            Adds this exact pour to the log at that time and redraws the curve.
          </p>
        </section>

        {/* ── 3 · Right now ── */}
        <section className="bpb-card">
          <div className="bpb-cardhead">
            <h2>3 &middot; Right now</h2>
            {mounted && <span className="bpb-cardnote">{fmtClock(now)}</span>}
          </div>

          {!mounted ? (
            <p className="bpb-empty">Reading the clock&hellip;</p>
          ) : !sim ? (
            <p className="bpb-empty">
              Nothing logged yet. Set a pour above, pick a time, and hit <b>Drink it</b> &mdash; the curve starts at
              your first beer.
            </p>
          ) : (
            <>
              <div className="bpb-bacgrid">
                <div className={`bpb-bactile tone-${status.tone}`}>
                  <div className="bpb-bactilelabel">Estimated BAC</div>
                  <div className="bpb-bacvalue">{fmtBac(sim.bacNow)}%</div>
                  <div className="bpb-bacstatus">{status.label}</div>
                  <div className="bpb-bacblurb">{status.blurb}</div>
                </div>
                <div className="bpb-stats">
                  <div className="bpb-stat">
                    <span>Peak</span>
                    <b>
                      {fmtBac(sim.peak)}%{' '}
                      <small>
                        {sim.peakAt > now ? 'projected ' : ''}
                        {fmtClock(sim.peakAt)}
                      </small>
                    </b>
                  </div>
                  <div className="bpb-stat">
                    <span>Under 0.08</span>
                    <b>{describeCrossing(sim.clearsAt['0.08'], sim.endBac < 0.08, now)}</b>
                  </div>
                  <div className="bpb-stat">
                    <span>Back to zero</span>
                    <b>{describeCrossing(sim.soberAt, sim.endBac <= 1e-4, now)}</b>
                  </div>
                  <div className="bpb-stat">
                    <span>Logged tonight</span>
                    <b>
                      {drinks.length} drink{drinks.length === 1 ? '' : 's'} · {fmtBeers(totals.beers)} standard beers
                    </b>
                  </div>
                </div>
              </div>

              <div className="bpb-warn">
                <span className="bpb-warnicon">&#9888;</span>
                <p>
                  <b>Do not trust this number.</b> It is a Widmark estimate from a slider, not a breathalyzer.
                  Food, sleep, medication, hydration, genetics, how fast you drank, and plain measurement error move
                  real BAC well outside anything modelled here. It is not legal advice, not a defense, and never a
                  reason to decide you are fine to drive. If you have been drinking, get a ride.
                </p>
              </div>

              <BacChart sim={sim} drinks={drinks} now={now} compact={compact} />

              <div className="bpb-legend">
                <span className="bpb-lg bpb-lg-curve">estimated BAC</span>
                <span className="bpb-lg bpb-lg-future">projection</span>
                <span className="bpb-lg bpb-lg-drink">a drink</span>
                <span className="bpb-lg bpb-lg-limit">0.08 limit</span>
                <span className="bpb-lg bpb-lg-limit2">0.05 limit</span>
              </div>
            </>
          )}
        </section>

        {/* ── 4 · The log ── */}
        <section className="bpb-card">
          <div className="bpb-cardhead">
            <h2>4 &middot; Tonight&rsquo;s log</h2>
            {drinks.length > 0 && (
              <span className="bpb-cardnote">
                {fmtBeers(totals.beers)} standard beers &middot; {totals.grams.toFixed(0)} g alcohol
              </span>
            )}
          </div>

          {drinks.length === 0 ? (
            <p className="bpb-empty">Empty. Nothing saved in this browser.</p>
          ) : (
            <div className="bpb-tablewrap">
              <table className="bpb-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Pour</th>
                    <th>ABV</th>
                    <th className="bpb-num">Beers</th>
                    <th className="bpb-num bpb-hide-sm">Alcohol</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {drinks.map((d) => (
                    <tr key={d.id} className={flashId === d.id ? 'is-new' : undefined}>
                      <td>{mounted ? fmtClock(d.ts) : '—'}</td>
                      <td>
                        {(d.ml / ML_PER_OZ).toFixed(1)} oz &middot; {Math.round(d.ml)} mL
                      </td>
                      <td>{d.abv.toFixed(1)}%</td>
                      <td className="bpb-num">{fmtBeers((d.ml * d.abv) / (STANDARD_ML * STANDARD_ABV))}</td>
                      <td className="bpb-num bpb-hide-sm">{ethanolGrams(d.ml, d.abv).toFixed(1)} g</td>
                      <td className="bpb-num">
                        <button type="button" className="bpb-remove" onClick={() => handleRemove(d.id)} aria-label="Remove this drink">
                          &times;
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="bpb-storagerow">
            <p className="bpb-sliderhint" style={{ margin: 0 }}>
              Saved in this browser&rsquo;s local storage under <code>{STORAGE_KEY}</code> &mdash; no server, no
              account, nothing leaves your device. Close the tab and come back later and the night is still here.
              Drinks older than 24 hours are dropped when the page loads.
            </p>
            <button type="button" className={`bpb-clearbtn${confirmClear ? ' is-armed' : ''}`} onClick={handleClear}>
              {confirmClear ? 'Tap again to wipe' : 'Clear everything'}
            </button>
          </div>
        </section>

        <p className="bpb-fineprint">
          Widmark (1932) with first-order absorption (&tau; = {ABSORPTION_TAU_MIN} min) and zero-order elimination
          at {ELIMINATION_PER_HOUR.toFixed(3)}%/hour. Individual elimination rates run roughly 0.010&ndash;0.020%/hour,
          so the tail of that curve could be hours off in either direction. Entertainment only &mdash; when it matters,
          don&rsquo;t drive.
        </p>
      </div>

      <Footer />
      <style>{BPB_CSS}</style>
    </main>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const BPB_CSS = `
.bpb-root{max-width:920px;margin-bottom:4rem}
.bpb-card{background:var(--glass-bg);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border:1px solid var(--glass-border);border-radius:var(--radius-lg);padding:1.4rem 1.5rem;margin-bottom:1.1rem}
.bpb-cardhead{display:flex;align-items:baseline;justify-content:space-between;gap:0.8rem;flex-wrap:wrap;margin-bottom:1rem}
.bpb-cardhead h2{font-size:0.85rem;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:var(--text-primary)}
.bpb-cardnote{font-size:0.72rem;font-weight:600;color:var(--text-muted);font-variant-numeric:tabular-nums}
.bpb-empty{font-size:0.85rem;color:var(--text-secondary);line-height:1.6;padding:0.6rem 0}

/* ── Sliders ── */
.bpb-slider{margin-bottom:1.15rem;--bpb-accent:var(--accent-primary);--bpb-rail:rgba(108,92,231,0.12)}
.bpb-slider.is-muted{--bpb-rail:rgba(0,0,0,0.05)}
.bpb-slider.is-muted .bpb-sliderlabel,.bpb-slider.is-muted .bpb-sliderval{color:var(--text-muted)}
.bpb-slider.is-muted input[type=range]{opacity:0.75}
.bpb-sliderhead{display:flex;align-items:baseline;justify-content:space-between;gap:0.6rem;margin-bottom:0.15rem}
.bpb-sliderlabel{font-size:0.72rem;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:var(--text-secondary);display:flex;align-items:center;gap:0.45rem}
.bpb-sliderval{font-size:1.05rem;font-weight:800;color:var(--text-primary);font-variant-numeric:tabular-nums}
.bpb-badge{font-size:0.58rem;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#fff;background:var(--bpb-accent);border-radius:999px;padding:0.1rem 0.42rem}
.bpb-sliderhint{font-size:0.72rem;color:var(--text-muted);line-height:1.5;margin:0.15rem 0 0}

.bpb-slider input[type=range]{-webkit-appearance:none;appearance:none;width:100%;height:26px;background:transparent;cursor:pointer;margin:0;display:block}
.bpb-slider input[type=range]:focus{outline:none}
.bpb-slider input[type=range]::-webkit-slider-runnable-track{height:9px;border-radius:999px;background:linear-gradient(90deg,var(--bpb-accent) 0 var(--bpb-pct),var(--bpb-rail) var(--bpb-pct) 100%);border:1px solid var(--border-subtle)}
.bpb-slider input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:22px;height:22px;margin-top:-7.5px;border-radius:50%;background:#fff;border:4px solid var(--bpb-accent);box-shadow:0 2px 8px rgba(0,0,0,0.18);transition:transform var(--transition-fast,0.15s ease)}
.bpb-slider input[type=range]:hover::-webkit-slider-thumb{transform:scale(1.12)}
.bpb-slider input[type=range]:active::-webkit-slider-thumb{transform:scale(1.2)}
.bpb-slider input[type=range]:focus-visible::-webkit-slider-thumb{box-shadow:0 0 0 4px rgba(108,92,231,0.28)}
.bpb-slider input[type=range]::-moz-range-track{height:9px;border-radius:999px;background:linear-gradient(90deg,var(--bpb-accent) 0 var(--bpb-pct),var(--bpb-rail) var(--bpb-pct) 100%);border:1px solid var(--border-subtle)}
.bpb-slider input[type=range]::-moz-range-thumb{width:18px;height:18px;border-radius:50%;background:#fff;border:4px solid var(--bpb-accent);box-shadow:0 2px 8px rgba(0,0,0,0.18)}
.bpb-slider input[type=range]:focus-visible::-moz-range-thumb{box-shadow:0 0 0 4px rgba(108,92,231,0.28)}

/* ── Live pour readout ── */
.bpb-readout{margin-top:1.4rem;padding:1.15rem 1.25rem;border-radius:var(--radius-md);background:linear-gradient(135deg,rgba(108,92,231,0.09),rgba(0,184,148,0.08) 55%,rgba(232,67,147,0.09));border:1px solid var(--glass-border);text-align:center}
.bpb-bignum{font-size:3.1rem;line-height:1;font-weight:900;letter-spacing:-0.03em;font-variant-numeric:tabular-nums;background:linear-gradient(120deg,var(--gradient-start),var(--gradient-mid) 50%,var(--gradient-end));-webkit-background-clip:text;background-clip:text;color:transparent}
.bpb-bignumlabel{font-size:0.7rem;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:var(--text-secondary);margin-top:0.35rem}
.bpb-readoutdetail{font-size:0.8rem;color:var(--text-secondary);line-height:1.6;margin:0.7rem 0 0}
.bpb-muted{color:var(--text-muted);font-size:0.74rem;margin-top:0.25rem}

/* ── Fields ── */
.bpb-field{display:block;margin-bottom:1.2rem}
.bpb-fieldlabel{display:block;font-size:0.72rem;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:var(--text-secondary);margin-bottom:0.35rem}
.bpb-field select{width:100%;padding:0.6rem 2.2rem 0.6rem 0.8rem;font-size:0.92rem;font-family:inherit;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-md);color:var(--text-primary);cursor:pointer;outline:none;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%238b8fa3' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 0.8rem center}
.bpb-field select:focus{border-color:var(--accent-primary);box-shadow:0 0 0 3px rgba(108,92,231,0.15)}
.bpb-fieldhint{display:block;font-size:0.72rem;color:var(--text-muted);line-height:1.5;margin-top:0.3rem}

/* ── Drink button ── */
.bpb-drinkbtn{width:100%;margin-top:0.6rem;padding:0.95rem;font-size:1.05rem;font-weight:800;font-family:inherit;letter-spacing:0.02em;border:none;border-radius:var(--radius-md);cursor:pointer;color:#fff;background:linear-gradient(135deg,var(--accent-primary),#8b5cf6 45%,var(--accent-warm));box-shadow:0 4px 18px rgba(108,92,231,0.3);transition:transform var(--transition-fast,0.15s ease),box-shadow var(--transition-fast,0.15s ease)}
.bpb-drinkbtn:hover{transform:translateY(-2px);box-shadow:0 8px 26px rgba(108,92,231,0.4)}
.bpb-drinkbtn:active{transform:translateY(0) scale(0.985)}
.bpb-drinkicon{font-size:1.15rem;margin-right:0.3rem}

/* ── BAC summary ── */
.bpb-bacgrid{display:grid;grid-template-columns:minmax(0,0.95fr) minmax(0,1.05fr);gap:1rem;margin-bottom:1rem}
@media(max-width:680px){.bpb-bacgrid{grid-template-columns:1fr}}
.bpb-bactile{border-radius:var(--radius-md);padding:1.1rem 1.2rem;border:1px solid var(--border-subtle);background:var(--surface)}
.bpb-bactile.tone-good{background:rgba(0,184,148,0.09);border-color:rgba(0,184,148,0.3)}
.bpb-bactile.tone-warn{background:rgba(253,203,110,0.16);border-color:rgba(253,203,110,0.5)}
.bpb-bactile.tone-hot{background:rgba(225,112,85,0.12);border-color:rgba(225,112,85,0.38)}
.bpb-bactile.tone-bad{background:rgba(232,67,147,0.12);border-color:rgba(232,67,147,0.4)}
.bpb-bactilelabel{font-size:0.66rem;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:var(--text-secondary)}
.bpb-bacvalue{font-size:2.9rem;line-height:1.05;font-weight:900;letter-spacing:-0.03em;color:var(--text-primary);font-variant-numeric:tabular-nums;margin-top:0.2rem}
.bpb-bacstatus{font-size:0.95rem;font-weight:800;color:var(--text-primary);margin-top:0.1rem}
.bpb-bacblurb{font-size:0.76rem;color:var(--text-secondary);line-height:1.5;margin-top:0.25rem}
.bpb-stats{display:flex;flex-direction:column;gap:0.5rem}
.bpb-stat{display:flex;align-items:baseline;justify-content:space-between;gap:0.8rem;padding:0.5rem 0.75rem;border:1px solid var(--border-subtle);border-radius:var(--radius-sm);background:var(--surface)}
.bpb-stat span{font-size:0.68rem;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:var(--text-muted);flex-shrink:0}
.bpb-stat b{font-size:0.82rem;font-weight:700;color:var(--text-primary);text-align:right;font-variant-numeric:tabular-nums}
.bpb-stat b small{font-weight:600;color:var(--text-muted)}

/* ── Disclaimer ── */
.bpb-warn{display:flex;gap:0.7rem;align-items:flex-start;background:rgba(232,67,147,0.07);border:1px solid rgba(232,67,147,0.32);border-radius:var(--radius-md);padding:0.8rem 0.95rem;margin-bottom:1.1rem}
.bpb-warnicon{font-size:1.05rem;line-height:1.4;color:var(--accent-warm);flex-shrink:0}
.bpb-warn p{font-size:0.78rem;line-height:1.6;color:var(--text-primary);margin:0}

/* ── Chart ── */
.bpb-chart{width:100%;height:auto;display:block;touch-action:pan-y;overflow:visible}
.bpb-chart.is-compact .bpb-axis{font-size:11px}
.bpb-chart.is-compact .bpb-limitlabel{font-size:11px}
.bpb-chart.is-compact .bpb-nowlabel{font-size:10px}
.bpb-chart.is-compact .bpb-curve{stroke-width:3}
.bpb-grid{stroke:var(--border-subtle);stroke-width:1}
.bpb-axisline{stroke:var(--border);stroke-width:1.5}
.bpb-axis{font-size:12px;font-weight:600;fill:var(--text-muted);font-family:var(--font-sans)}
.bpb-limitlabel{font-size:12px;font-weight:700;font-family:var(--font-sans);paint-order:stroke;stroke:var(--surface-raised);stroke-width:4px;stroke-linejoin:round}
.bpb-curve{fill:none;stroke:url(#bpbLine);stroke-width:3.5;stroke-linecap:round;stroke-linejoin:round}
.bpb-curve-future{stroke-dasharray:6 7;stroke-width:2.5;opacity:0.65;filter:none}
.bpb-nowline{stroke:var(--text-muted);stroke-width:1.5;stroke-dasharray:3 4;opacity:0.8}
.bpb-nowlabel{font-size:11px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;fill:var(--text-muted);font-family:var(--font-sans)}
.bpb-nowdot{fill:#6c5ce7;stroke:#fff;stroke-width:2.5}
.bpb-nowhalo{fill:rgba(108,92,231,0.28);animation:bpb-pulse 2.4s ease-out infinite}
@keyframes bpb-pulse{0%{r:8;opacity:0.55}70%{r:18;opacity:0}100%{r:18;opacity:0}}
@media(prefers-reduced-motion:reduce){.bpb-nowhalo{animation:none;opacity:0.4}}
.bpb-crosshair{stroke:var(--accent-primary);stroke-width:1.5;stroke-dasharray:2 4;opacity:0.7}
.bpb-tip{fill:var(--surface-raised);stroke:var(--border);stroke-width:1;filter:drop-shadow(0 4px 12px rgba(0,0,0,0.12))}
.bpb-tiptime{font-size:12px;font-weight:700;fill:var(--text-secondary);font-family:var(--font-sans)}
.bpb-tipbac{font-size:14px;font-weight:800;fill:var(--text-primary);font-family:var(--font-sans);font-variant-numeric:tabular-nums}

.bpb-legend{display:flex;flex-wrap:wrap;gap:0.5rem 1.1rem;margin-top:0.6rem;padding-top:0.7rem;border-top:1px solid var(--border-subtle)}
.bpb-lg{font-size:0.7rem;font-weight:600;color:var(--text-secondary);display:inline-flex;align-items:center;gap:0.35rem}
.bpb-lg::before{content:'';width:16px;height:3px;border-radius:2px;flex-shrink:0}
.bpb-lg-curve::before{background:linear-gradient(90deg,#00b894,#6c5ce7,#e84393,#d63031)}
.bpb-lg-future::before{background:repeating-linear-gradient(90deg,#8b5cf6 0 4px,transparent 4px 7px)}
.bpb-lg-drink::before{background:#fdcb6e;width:9px;height:9px;border-radius:50%}
.bpb-lg-limit::before{background:repeating-linear-gradient(90deg,#e84393 0 5px,transparent 5px 9px)}
.bpb-lg-limit2::before{background:repeating-linear-gradient(90deg,#e17055 0 5px,transparent 5px 9px)}

/* ── Log ── */
.bpb-tablewrap{overflow-x:auto}
.bpb-table{width:100%;border-collapse:collapse;font-size:0.85rem}
.bpb-table th{font-size:0.64rem;font-weight:700;letter-spacing:0.07em;text-transform:uppercase;color:var(--text-muted);text-align:left;padding:0.4rem 0.55rem;border-bottom:1px solid var(--border);white-space:nowrap}
.bpb-table td{padding:0.45rem 0.55rem;border-bottom:1px solid var(--border-subtle);color:var(--text-primary);font-variant-numeric:tabular-nums;white-space:nowrap}
.bpb-table .bpb-num{text-align:right}
.bpb-table tr.is-new td{animation:bpb-flash 1.6s ease-out}
@keyframes bpb-flash{0%{background:rgba(253,203,110,0.55)}100%{background:transparent}}
.bpb-remove{background:transparent;border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text-muted);font-size:1rem;line-height:1;font-family:inherit;padding:0.1rem 0.45rem;cursor:pointer;transition:all var(--transition-fast,0.15s ease)}
.bpb-remove:hover{border-color:var(--accent-warm);color:var(--accent-warm);background:rgba(232,67,147,0.08)}

.bpb-storagerow{display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;margin-top:1.1rem;padding-top:0.9rem;border-top:1px solid var(--border-subtle)}
.bpb-storagerow p{flex:1;min-width:240px}
.bpb-storagerow code{font-size:0.68rem;background:var(--surface);border:1px solid var(--border-subtle);border-radius:4px;padding:0.05rem 0.3rem}
.bpb-clearbtn{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text-secondary);font-family:inherit;font-size:0.78rem;font-weight:700;padding:0.5rem 0.9rem;cursor:pointer;white-space:nowrap;transition:all var(--transition-fast,0.15s ease)}
.bpb-clearbtn:hover{border-color:var(--accent-warm);color:var(--accent-warm)}
.bpb-clearbtn.is-armed{background:var(--accent-warm);border-color:var(--accent-warm);color:#fff}

.bpb-fineprint{font-size:0.72rem;line-height:1.65;color:var(--text-muted);margin-top:0.4rem}

@media(max-width:600px){
  .bpb-card{padding:1.1rem 1rem}
  .bpb-bignum{font-size:2.5rem}
  .bpb-bacvalue{font-size:2.3rem}
  .bpb-hide-sm{display:none}
  .bpb-table td,.bpb-table th{padding:0.45rem 0.35rem}
}
`;

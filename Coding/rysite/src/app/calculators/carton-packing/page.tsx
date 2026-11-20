'use client';

// Carton Packing Optimizer — plan the smallest set of carton SKUs that packs a
// list of rectangular prisms efficiently, weighted by how heavily each prism is
// used, and see how they load onto pallets. All computation is client-side.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import Footer from '@/components/Footer';
import {
  COLUMN_CONFIGS,
  DEFAULT_MAPPING,
  solve,
  SolveCancelled,
  type AxisMapping,
  type CancelToken,
  type CartonSpec,
  type MemberPack,
  type ObjectiveId,
  type PrismAxis,
  type PrismSku,
  type ProgressUpdate,
  type Settings,
  type SolveResult,
  type SolutionK,
} from './engine';
import { AllowanceDiagram, ConfigGlyph, EffMeter, fmt, fmtDim, IsoCartonView, KChart, PalletSideView, PalletTopView } from './viz';
import { areaUnit, areaValue, blankDims, fmtArea, specArea, specDim, specDims3, type Paper, type Units } from './format';
import { decodePayload, encodePayload, shareUrl, solutionFingerprint, tokenFromHash, type SharePayload } from './share';

// The drawing set (QR encoder + PDF writer) loads only once drawings are switched on.
const DrawingSheets = dynamic(() => import('./DrawingSheets'), {
  ssr: false,
  loading: () => (
    <section className="cpk-card">
      <p className="cpk-hint" style={{ margin: 0 }}>Preparing drawings…</p>
    </section>
  ),
});

// ── Form state ────────────────────────────────────────────────────────────────

interface PrismRow {
  id: number;
  name: string;
  width: string;
  height: string;
  depth: string;
  usage: string;
  /** Optional prescribed count per carton; blank lets the optimizer choose. */
  perCarton: string;
}

function normalizeRows(rows: PrismRow[]): PrismRow[] {
  return rows.map((r) => ({ ...r, perCarton: r.perCarton ?? '' }));
}

interface FormState {
  units: Units;
  mapMajor: PrismAxis;
  mapDepth: PrismAxis;
  mapMinor: PrismAxis;
  /** Max outer length of each carton side: major flap (L), minor flap (W), depth (D). */
  maxMajor: string;
  maxMinor: string;
  maxDepth: string;
  goalSkus: string;
  minUnits: string;
  configs: Record<string, boolean>;
  allowMajor: string;
  allowMinor: string;
  allowDepth: string;
  wall: string;
  /** RSC manufacturer's joint width, for the blank size. */
  glueFlap: string;
  /** Board-saving tolerance, in percent of the best objective score. */
  boardTolerance: string;
  flutesVertical: boolean;
  palletPreset: string;
  palletLen: string;
  palletWid: string;
  maxLoadHeight: string;
  overhangLen: string;
  overhangWid: string;
  maxOnSideLayers: string;
  onSideUnlimited: boolean;
  padsEnabled: boolean;
  padThickness: string;
  padMode: 'every' | 'topBottom';
  palletsPerTrailer: string;
  costPerTrailer: string;
  objective: ObjectiveId;
  /** Carton drawings: off until asked for, plus the sheets' title-block fields. */
  drawings: boolean;
  company: string;
  project: string;
  drawingNo: string;
  revision: string;
  paper: Paper;
}

const PALLET_PRESETS: { id: string; label: string; len: number; wid: number }[] = [
  { id: 'gma', label: 'GMA 48 × 40 in (1219 × 1016 mm)', len: 1219, wid: 1016 },
  { id: 'eur', label: 'EUR 1200 × 800 mm', len: 1200, wid: 800 },
  { id: 'eur2', label: 'EUR2 1200 × 1000 mm', len: 1200, wid: 1000 },
  { id: 'sq42', label: '42 × 42 in (1067 × 1067 mm)', len: 1067, wid: 1067 },
  { id: 'sq48', label: '48 × 48 in (1219 × 1219 mm)', len: 1219, wid: 1219 },
  { id: 'custom', label: 'Custom', len: 0, wid: 0 },
];

const DEFAULT_FORM: FormState = {
  units: 'mm',
  mapMajor: DEFAULT_MAPPING.major,
  mapDepth: DEFAULT_MAPPING.depth,
  mapMinor: DEFAULT_MAPPING.minor,
  maxMajor: '650',
  maxMinor: '610',
  maxDepth: '650',
  goalSkus: '4',
  minUnits: '4',
  configs: Object.fromEntries(COLUMN_CONFIGS.map((c) => [c.id, c.defaultOn])),
  allowMajor: '20',
  allowMinor: '10',
  allowDepth: '10',
  wall: '4',
  glueFlap: '35',
  boardTolerance: '0',
  flutesVertical: true,
  palletPreset: 'gma',
  palletLen: '1219',
  palletWid: '1016',
  maxLoadHeight: '2370',
  overhangLen: '0',
  overhangWid: '0',
  maxOnSideLayers: '2',
  onSideUnlimited: false,
  padsEnabled: false,
  padThickness: '5',
  padMode: 'topBottom',
  palletsPerTrailer: '26',
  costPerTrailer: '3000',
  objective: 'pallets',
  drawings: false,
  company: '',
  project: '',
  drawingNo: '',
  revision: 'A',
  paper: 'letter',
};

/**
 * Title-block fields: they label the drawings but never change the results,
 * so a scenario link leaves them out (the drawing number and revision travel
 * separately, to name the drawing on arrival).
 */
const DRAWING_FIELDS = ['drawings', 'company', 'project', 'drawingNo', 'revision', 'paper'] as const;

/** Assumed pallet height: 5 in / 127 mm. Max stack height applies above the deck. */
const PALLET_HEIGHT_MM = 127;
const PALLET_HEIGHT_IN = 5;

const SAMPLE_PRISMS: PrismRow[] = [
  { id: 1, name: '594 × 594 × 44', width: '594', height: '594', depth: '44', usage: '5200', perCarton: '' },
  { id: 2, name: '594 × 594 × 21', width: '594', height: '594', depth: '21', usage: '3100', perCarton: '' },
  { id: 3, name: '594 × 594 × 95', width: '594', height: '594', depth: '95', usage: '2600', perCarton: '' },
  { id: 4, name: '494 × 494 × 44', width: '494', height: '494', depth: '44', usage: '2400', perCarton: '' },
  { id: 5, name: '594 × 494 × 44', width: '594', height: '494', depth: '44', usage: '1800', perCarton: '' },
  { id: 6, name: '494 × 494 × 21', width: '494', height: '494', depth: '21', usage: '900', perCarton: '' },
  { id: 7, name: '594 × 294 × 44', width: '594', height: '294', depth: '44', usage: '700', perCarton: '' },
  { id: 8, name: '494 × 394 × 21', width: '494', height: '394', depth: '21', usage: '450', perCarton: '' },
];

const STORAGE_KEY = 'carton-packing-optimizer-v2';

const AXIS_LABELS: Record<PrismAxis, string> = {
  width: 'Prism width',
  height: 'Prism height',
  depth: 'Prism depth (stacked)',
};

const OBJECTIVES: { id: ObjectiveId; label: string; hint: string }[] = [
  {
    id: 'pallets',
    label: 'Minimize total pallets per year',
    hint:
      'Adds up the pallet positions a year of volume needs — each SKU’s annual usage ÷ its units per pallet — and makes that total as small as possible. Choose this when floor space, racking, or trailer cube is the real cost: high-volume SKUs steer the carton dimensions in exact proportion to the space they consume, and low-volume SKUs are allowed a looser fit if it saves pallets overall.',
  },
  {
    id: 'wfpp',
    label: 'Maximize weighted units per pallet',
    hint:
      'Maximizes the average units-per-pallet across SKUs, weighted by annual usage. It pushes your highest-volume SKUs toward the densest possible packing, but physically small SKUs (which naturally fit more per pallet) pull on the average harder than they do on the pallet-count objective — pick this when the number on the pallet sheet is the metric you report.',
  },
  {
    id: 'weff',
    label: 'Maximize weighted efficiency vs. ideal',
    hint:
      'Scores each SKU as a percentage of the best it could achieve in its own perfectly sized dedicated carton (100% = nothing lost by sharing), then maximizes the usage-weighted average. Size-neutral: a small or low-volume SKU counts the same per point of efficiency as a large one, so nothing in the catalog gets a badly compromised fit — sometimes at the cost of a few more total pallets.',
  },
];

// ── Small reusable inputs ─────────────────────────────────────────────────────

interface NumFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
  step?: string;
  hint?: string;
}

function NumField({ label, value, onChange, suffix, step, hint }: NumFieldProps) {
  return (
    <label className="cpk-field">
      <span className="cpk-label">{label}</span>
      <span className="cpk-inputwrap">
        <input type="number" inputMode="decimal" step={step ?? 'any'} value={value} onChange={(e) => onChange(e.target.value)} />
        {suffix && <span className="cpk-suffix">{suffix}</span>}
      </span>
      {hint && <span className="cpk-hint">{hint}</span>}
    </label>
  );
}

function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="cpk-field">
      <span className="cpk-label">{label}</span>
      <input type="text" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label className="cpk-toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        {label}
        {hint && <span className="cpk-hint" style={{ display: 'block' }}>{hint}</span>}
      </span>
    </label>
  );
}

// ── Unit conversion ───────────────────────────────────────────────────────────

const LENGTH_FIELDS = [
  'maxMajor',
  'maxMinor',
  'maxDepth',
  'allowMajor',
  'allowMinor',
  'allowDepth',
  'wall',
  'glueFlap',
  'palletLen',
  'palletWid',
  'maxLoadHeight',
  'overhangLen',
  'overhangWid',
  'padThickness',
] as const;

function convertValue(v: string, to: Units): string {
  const n = parseFloat(v);
  if (!isFinite(n)) return v;
  const converted = to === 'in' ? n / 25.4 : n * 25.4;
  return String(Math.round(converted * (to === 'in' ? 1000 : 10)) / (to === 'in' ? 1000 : 10));
}

/**
 * Merge a saved or imported form over the defaults. A length field the save
 * lacks takes its default converted into the saved units, so an inch scenario
 * never picks up a millimeter value. Saves from before the per-side caps hold
 * one `maxSide`; it can't map onto three different caps, so it is dropped and
 * the per-side defaults apply.
 */
function restoreForm(saved: Partial<FormState> & { maxSide?: string }): FormState {
  const fields = { ...saved };
  delete fields.maxSide;
  const form: FormState = { ...DEFAULT_FORM, ...fields, configs: { ...DEFAULT_FORM.configs, ...(fields.configs ?? {}) } };
  if (form.units === 'in') {
    for (const key of LENGTH_FIELDS) {
      if (fields[key] === undefined) form[key] = convertValue(DEFAULT_FORM[key], 'in');
    }
  }
  return form;
}

/**
 * Link payload for a scenario: the inputs that differ from what restoreForm
 * would fill in, and the prism rows. Lengths are compared with the defaults
 * converted into the scenario's units, mirroring restoreForm; `units` itself
 * is compared with the mm default, so an inch scenario always says so.
 */
function scenarioPayload(form: FormState, rows: PrismRow[], dropNames = false): SharePayload {
  const base: FormState = { ...DEFAULT_FORM };
  if (form.units === 'in') for (const key of LENGTH_FIELDS) base[key] = convertValue(DEFAULT_FORM[key], 'in');
  const skip: readonly string[] = DRAWING_FIELDS;
  const f: Record<string, unknown> = {};
  for (const key of Object.keys(form) as (keyof FormState)[]) {
    if (skip.includes(key)) continue;
    if (JSON.stringify(form[key]) !== JSON.stringify(base[key])) f[key] = form[key];
  }
  return { f, p: rows.map((r) => [dropNames ? '' : r.name, r.width, r.height, r.depth, r.usage, r.perCarton]) };
}

function rowsFromPayload(p: string[][]): PrismRow[] {
  return p.map((a, i) => ({ id: i + 1, name: a[0] ?? '', width: a[1] ?? '', height: a[2] ?? '', depth: a[3] ?? '', usage: a[4] ?? '', perCarton: a[5] ?? '' }));
}

/** Where a scenario link should land, and what to tell the visitor. */
interface LinkTarget {
  k?: number;
  carton?: string;
  fp?: string;
  drawing?: string;
  rev?: string;
}

interface LinkNotice {
  drawing?: string;
  rev?: string;
  carton?: string;
  /** The optimizer now gives different cartons than when the link was made. */
  changed?: boolean;
  unreadable?: boolean;
}

// ── Page ──────────────────────────────────────────────────────────────────────

interface RunContext {
  settings: Settings;
  units: Units;
  palletsPerTrailer: number;
  costPerTrailer: number;
  /** The inputs as they were when this run started, for scenario links. */
  form: FormState;
  prisms: PrismRow[];
}

/** Annual freight: pallets per year ÷ pallets per trailer × cost per trailer. */
function freightPerYear(pallets: number, ctx: RunContext): number {
  if (!(ctx.palletsPerTrailer > 0)) return 0;
  return (pallets / ctx.palletsPerTrailer) * ctx.costPerTrailer;
}

function money(v: number): string {
  return `$${Math.round(v).toLocaleString('en-US')}`;
}

function annualPalletsFor(c: CartonSpec): number {
  return c.members.reduce((a, m) => a + m.prism.usage / Math.max(m.fpp, 1e-9), 0);
}

/** Overall footprint of the placed load (max extent over the layer patterns). */
function loadExtents(c: CartonSpec): { x: number; y: number } {
  let x = 0;
  let y = 0;
  for (const l of c.pallet.layers) {
    const xs = l.placements.map((r) => [r.x, r.x + r.w]).flat();
    const ys = l.placements.map((r) => [r.y, r.y + r.h]).flat();
    if (xs.length > 0) x = Math.max(x, Math.max(...xs) - Math.min(...xs));
    if (ys.length > 0) y = Math.max(y, Math.max(...ys) - Math.min(...ys));
  }
  return { x, y };
}

function buildSpecText(sol: SolutionK, units: Units, specUnits: Units, palletLen: number, palletWid: number, palletH: number): string {
  const lines: string[] = [];
  lines.push(`Carton specifications — ${sol.k} carton SKU${sol.k === 1 ? '' : 's'}`);
  lines.push(
    `Dimensions are L × W × D (major flap × minor flap × depth) in ${specUnits === 'in' ? 'inches, rounded to the nearest 1/16' : 'millimeters'}.`,
  );
  lines.push('');
  for (const c of sol.cartons) {
    const ext = loadExtents(c);
    const ohL = Math.max(0, (ext.x - palletLen) / 2);
    const ohW = Math.max(0, (ext.y - palletWid) / 2);
    const oh = (v: number) => (v > 0.049 ? `${specDim(v, units, specUnits)} ${specUnits} per side` : 'none');
    lines.push(`Carton ${c.label}`);
    lines.push(`  Inner: ${specDims3(c.inner, units, specUnits)}`);
    lines.push(`  Outer: ${specDims3(c.outer, units, specUnits)}`);
    const bd = blankDims(c.blank, units, specUnits);
    lines.push(
      `  Blank (RSC): ${specDim(bd.length, specUnits, specUnits)} × ${specDim(bd.width, specUnits, specUnits)} ${specUnits} (${specArea(c.blank.area, units, specUnits, 2)} per carton)`,
    );
    lines.push(`  Est. cartons per year: ${fmt(c.cartonsPerYear)}`);
    lines.push(`  Board per year: ${specArea(c.boardPerYear, units, specUnits)}`);
    lines.push(`  Cartons per pallet: ${fmt(c.cartonsPerPallet)}`);
    lines.push(`  Load bounding box: ${specDims3({ l: ext.x, w: ext.y, d: c.pallet.stackHeight }, units, specUnits)} (${specDim(c.pallet.stackHeight + palletH, units, specUnits)} ${specUnits} incl. pallet)`);
    lines.push(`  Overhang: length ${oh(ohL)}; width ${oh(ohW)}`);
    lines.push(`  Serves: ${c.members.map((m) => `${m.prism.name} (${fmt(m.prism.usage)}/yr${m.prism.perCarton != null ? `, set ${m.prism.perCarton}/carton` : ''})`).join(', ')}`);
    lines.push('');
  }
  lines.push(`Total cartons per year: ${fmt(sol.cartonsPerYear)}`);
  lines.push(`Total board per year: ${specArea(sol.boardPerYear, units, specUnits)}`);
  lines.push(`Total pallets per year: ${fmt(sol.pallets, 1)}`);
  return lines.join('\n');
}

export default function CartonPackingPage() {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [prisms, setPrisms] = useState<PrismRow[]>(SAMPLE_PRISMS);
  const [nextId, setNextId] = useState(100);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<ProgressUpdate>({ label: '', frac: 0 });
  const [result, setResult] = useState<SolveResult | null>(null);
  const [runCtx, setRunCtx] = useState<RunContext | null>(null);
  const [selectedK, setSelectedK] = useState(4);
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  /** Supplier spec sheets default to fractional inches (nearest 1/16). */
  const [specUnits, setSpecUnits] = useState<Units>('in');
  const tokenRef = useRef<CancelToken>({ cancelled: false });
  const loadedRef = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);
  /** A scenario link to run once its inputs are in state. */
  const [autoRun, setAutoRun] = useState<LinkTarget | null>(null);
  const [linkNotice, setLinkNotice] = useState<LinkNotice | null>(null);
  /** Element id to bring into view once results render. */
  const [scrollTo, setScrollTo] = useState<string | null>(null);
  /**
   * While the page shows a scenario opened from a link, the visitor's own
   * saved session is left alone; the first edit saves as usual and drops the
   * hash, since the URL no longer describes what is on screen.
   */
  const fromLinkRef = useRef(false);
  const linkSnapshotRef = useRef<string | null>(null);

  const set = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  }, []);

  // ── Persistence ──
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw) as { form?: Partial<FormState>; prisms?: PrismRow[]; nextId?: number };
        if (data.form) setForm(restoreForm(data.form));
        if (Array.isArray(data.prisms) && data.prisms.length > 0) setPrisms(normalizeRows(data.prisms));
        if (typeof data.nextId === 'number') setNextId(data.nextId);
      }
    } catch {
      /* ignore corrupt storage */
    }
    loadedRef.current = true;

    // A scenario link (e.g. a drawing's QR code) replaces the inputs and runs
    // them. The visitor's own title-block fields are kept.
    const token = tokenFromHash(window.location.hash);
    if (token) {
      decodePayload(token).then((payload) => {
        if (!payload) {
          setLinkNotice({ unreadable: true });
          return;
        }
        const rows = rowsFromPayload(payload.p);
        fromLinkRef.current = true;
        linkSnapshotRef.current = null;
        setForm((current) => {
          const keep = Object.fromEntries(DRAWING_FIELDS.map((k) => [k, current[k]])) as Pick<FormState, (typeof DRAWING_FIELDS)[number]>;
          return { ...restoreForm(payload.f as Partial<FormState>), ...keep };
        });
        setPrisms(rows);
        setNextId((n) => Math.max(n, rows.length + 1));
        setAutoRun({ k: payload.k, carton: payload.c, fp: payload.fp, drawing: payload.d, rev: payload.r });
      });
    }
  }, []);

  useEffect(() => {
    if (!loadedRef.current) return;
    if (fromLinkRef.current) {
      const snapshot = JSON.stringify({ form, prisms });
      if (linkSnapshotRef.current === null) {
        linkSnapshotRef.current = snapshot;
        return;
      }
      if (snapshot === linkSnapshotRef.current) return;
      fromLinkRef.current = false;
      linkSnapshotRef.current = null;
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ form, prisms, nextId }));
      } catch {
        /* storage full or unavailable */
      }
    }, 400);
    return () => clearTimeout(t);
  }, [form, prisms, nextId]);

  // ── Unit toggle converts every length field ──
  const handleUnits = (to: Units) => {
    if (to === form.units) return;
    setForm((f) => {
      const next = { ...f, units: to };
      for (const key of LENGTH_FIELDS) {
        next[key] = convertValue(f[key], to);
      }
      if (f.palletPreset !== 'custom') next.palletPreset = 'custom';
      return next;
    });
    setPrisms((ps) =>
      ps.map((p) => ({
        ...p,
        width: convertValue(p.width, to),
        height: convertValue(p.height, to),
        depth: convertValue(p.depth, to),
      })),
    );
  };

  // ── Axis mapping keeps a valid permutation by swapping ──
  const handleMapping = (axis: 'mapMajor' | 'mapDepth' | 'mapMinor', value: PrismAxis) => {
    setForm((f) => {
      const next = { ...f };
      const axes: ('mapMajor' | 'mapDepth' | 'mapMinor')[] = ['mapMajor', 'mapDepth', 'mapMinor'];
      const holder = axes.find((a) => f[a] === value);
      if (holder && holder !== axis) next[holder] = f[axis];
      next[axis] = value;
      return next;
    });
  };

  // ── Prism table ──
  const updatePrism = (id: number, key: keyof PrismRow, value: string) => {
    setPrisms((ps) => ps.map((p) => (p.id === id ? { ...p, [key]: value } : p)));
  };
  const addPrism = () => {
    setPrisms((ps) => [...ps, { id: nextId, name: '', width: '', height: '', depth: '', usage: '', perCarton: '' }]);
    setNextId((n) => n + 1);
  };
  const removePrism = (id: number) => setPrisms((ps) => ps.filter((p) => p.id !== id));
  const duplicatePrism = (id: number) => {
    const src = prisms.find((p) => p.id === id);
    if (!src) return;
    setPrisms((ps) => [...ps, { ...src, id: nextId, name: src.name ? `${src.name} copy` : '' }]);
    setNextId((n) => n + 1);
  };

  const handleImportRows = () => {
    const rows: PrismRow[] = [];
    let id = nextId;
    // Strict: parseFloat would accept a name like "24x24x2" as the number 24.
    const isNumeric = (s: string) => /^[+-]?(\d+\.?\d*|\.\d+)$/.test(s);
    for (const line of importText.split(/\n+/)) {
      const parts = line.split(/[\t,;]/).map((s) => s.trim()).filter((s) => s.length > 0);
      if (parts.length < 4) continue;
      // Trailing numeric run is w, h, d, usage, and optionally per-carton count.
      let numCount = 0;
      while (numCount < parts.length && numCount < 5 && isNumeric(parts[parts.length - 1 - numCount])) numCount++;
      if (numCount < 4) continue;
      const nums = parts.slice(parts.length - numCount);
      const name = parts.length > numCount ? parts.slice(0, parts.length - numCount).join(' ') : `${nums[0]} × ${nums[1]} × ${nums[2]}`;
      rows.push({ id: id++, name, width: nums[0], height: nums[1], depth: nums[2], usage: nums[3], perCarton: nums[4] ?? '' });
    }
    if (rows.length > 0) {
      setPrisms((ps) => [...ps, ...rows]);
      setNextId(id);
      setImportText('');
      setImportOpen(false);
    }
  };

  // ── Scenario file export / import ──
  const handleExport = () => {
    const blob = new Blob([JSON.stringify({ version: 1, form, prisms, nextId }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'carton-packing-scenario.json';
    a.click();
    URL.revokeObjectURL(url);
  };
  const handleImportFile = (file: File) => {
    file.text().then((text) => {
      try {
        const data = JSON.parse(text) as { form?: Partial<FormState>; prisms?: PrismRow[]; nextId?: number };
        if (data.form) setForm(restoreForm(data.form));
        if (Array.isArray(data.prisms)) setPrisms(normalizeRows(data.prisms));
        if (typeof data.nextId === 'number') setNextId(data.nextId);
        setErrors([]);
      } catch {
        setErrors(['That file is not a valid scenario JSON export.']);
      }
    });
  };

  // ── Scenario link ──
  // The inputs on screen as a link. When they are the ones last run, the link
  // also opens the selected solution and carries its fingerprint.
  const handleCopyLink = async () => {
    const payload = scenarioPayload(form, prisms);
    const sameAsRun = runCtx && JSON.stringify(scenarioPayload(runCtx.form, runCtx.prisms)) === JSON.stringify(payload);
    const sol = sameAsRun ? result?.solutions.find((x) => x.k === selectedK && x.feasible) : undefined;
    if (sol) {
      payload.k = sol.k;
      payload.fp = solutionFingerprint(sol);
    }
    const url = shareUrl(window.location.origin + window.location.pathname, await encodePayload(payload));
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 1800);
    } catch {
      window.prompt('Copy this link to the scenario:', url);
    }
  };

  // ── Validation + run ──
  const parseAll = (): { prismSkus: PrismSku[]; settings: Settings; problems: string[] } => {
    const problems: string[] = [];
    const num = (label: string, v: string, min = 0): number => {
      const n = parseFloat(v);
      if (!isFinite(n) || n < min) problems.push(`${label} must be a number ≥ ${min}.`);
      return n;
    };

    const prismSkus: PrismSku[] = [];
    // parseFloat("24x24x2") is 24, so a stray label in a numeric column would
    // otherwise be silently accepted; require the whole field to be a number.
    const strictNum = (s: string) => (/^\s*[+-]?(\d+\.?\d*|\.\d+)\s*$/.test(s) ? parseFloat(s) : NaN);
    prisms.forEach((p, i) => {
      const w = strictNum(p.width);
      const h = strictNum(p.height);
      const d = strictNum(p.depth);
      const u = strictNum(p.usage);
      const label = p.name.trim() || `row ${i + 1}`;
      if (![w, h, d].every((x) => isFinite(x) && x > 0)) {
        problems.push(`Prism ${label}: width, height, and depth must be positive numbers.`);
        return;
      }
      if (!isFinite(u) || u < 0) {
        problems.push(`Prism ${label}: annual usage must be a number ≥ 0.`);
        return;
      }
      let perCarton: number | null = null;
      if (p.perCarton.trim() !== '') {
        const q = strictNum(p.perCarton);
        if (!isFinite(q) || q < 1 || Math.abs(q - Math.round(q)) > 1e-9) {
          problems.push(`Prism ${label}: per-carton count must be a whole number ≥ 1 (or blank).`);
          return;
        }
        perCarton = Math.round(q);
      }
      prismSkus.push({ id: String(p.id), name: p.name.trim() || `${p.width} × ${p.height} × ${p.depth}`, width: w, height: h, depth: d, usage: u, perCarton });
    });
    if (prismSkus.length === 0) problems.push('Add at least one prism SKU.');

    const goal = Math.round(num('Goal carton SKUs', form.goalSkus, 1));
    const allowed = COLUMN_CONFIGS.filter((c) => form.configs[c.id]).map((c) => c.id);
    if (allowed.length === 0) problems.push('Enable at least one packing orientation.');

    const mapping: AxisMapping = { major: form.mapMajor, depth: form.mapDepth, minor: form.mapMinor };
    if (new Set([mapping.major, mapping.depth, mapping.minor]).size !== 3) problems.push('Axis mapping must use each prism dimension exactly once.');

    const settings: Settings = {
      mapping,
      goalSkus: goal,
      kSpread: 5,
      maxMajor: num('Max outer L (major flaps)', form.maxMajor, 1),
      maxMinor: num('Max outer W (minor flaps)', form.maxMinor, 1),
      maxDepth: num('Max outer D (depth)', form.maxDepth, 1),
      minUnitsPerCarton: Math.round(num('Minimum prisms per carton', form.minUnits, 1)),
      allowedConfigs: allowed,
      allowMajor: num('Major-flap allowance', form.allowMajor),
      allowMinor: num('Minor-flap allowance', form.allowMinor),
      allowDepth: num('Depth allowance', form.allowDepth),
      wall: num('Carton wall thickness', form.wall),
      glueFlap: num('Glue flap width', form.glueFlap),
      boardTolerance: num('Board-saving tolerance', form.boardTolerance) / 100,
      flutesVertical: form.flutesVertical,
      maxOnSideLayers: form.onSideUnlimited
        ? null
        : Math.max(0, Math.round(num('Max layers on their side', form.maxOnSideLayers))),
      palletLen: num('Pallet length', form.palletLen, 1),
      palletWid: num('Pallet width', form.palletWid, 1),
      maxLoadHeight: num('Max stack height', form.maxLoadHeight, 1),
      overhangLen: num('Overhang (length)', form.overhangLen),
      overhangWid: num('Overhang (width)', form.overhangWid),
      pads: { enabled: form.padsEnabled, thickness: form.padsEnabled ? num('Pad thickness', form.padThickness) : 0, mode: form.padMode },
      objective: form.objective,
    };
    return { prismSkus, settings, problems };
  };

  /** Runs the optimizer; `link` is set when the run opens a scenario link. */
  const handleRun = async (link?: LinkTarget) => {
    const { prismSkus, settings, problems } = parseAll();
    if (problems.length > 0) {
      setErrors(problems);
      return;
    }
    setErrors([]);
    setRunning(true);
    setResult(null);
    setLinkNotice(null);
    setProgress({ label: 'Starting…', frac: 0 });
    tokenRef.current = { cancelled: false };
    try {
      const res = await solve(prismSkus, settings, (u) => setProgress(u), tokenRef.current);
      setResult(res);
      setRunCtx({
        settings,
        units: form.units,
        palletsPerTrailer: Math.max(parseFloat(form.palletsPerTrailer) || 0, 0),
        costPerTrailer: Math.max(parseFloat(form.costPerTrailer) || 0, 0),
        form,
        prisms,
      });
      const feasibleKs = res.solutions.filter((s) => s.feasible).map((s) => s.k);
      if (feasibleKs.length > 0) {
        // A link opens the solution it was drawn from; otherwise the goal, or the nearest feasible count.
        const want = link?.k != null && feasibleKs.includes(link.k) ? link.k : settings.goalSkus;
        const target = feasibleKs.includes(want)
          ? want
          : feasibleKs.reduce((best, k) => (Math.abs(k - want) < Math.abs(best - want) ? k : best), feasibleKs[0]);
        setSelectedK(target);
      }
      if (link) {
        const sol = res.solutions.find((s) => s.k === link.k && s.feasible);
        setLinkNotice({
          drawing: link.drawing,
          rev: link.rev,
          carton: link.carton,
          changed: !!link.fp && (!sol || solutionFingerprint(sol) !== link.fp),
        });
        setScrollTo(link.carton && sol?.cartons.some((c) => c.label === link.carton) ? `cpk-carton-${link.carton}` : 'cpk-results');
      }
    } catch (e) {
      if (!(e instanceof SolveCancelled)) {
        setErrors(['Something went wrong while optimizing. Check the inputs and try again.']);
      }
    } finally {
      setRunning(false);
    }
  };

  // A decoded link sets its inputs and autoRun in one batch; by this effect
  // the inputs are in state, so the run sees them. The ref keeps the effect
  // calling the current handleRun without re-running on every render.
  const runRef = useRef(handleRun);
  useEffect(() => {
    runRef.current = handleRun;
  });
  useEffect(() => {
    if (!autoRun) return;
    setAutoRun(null);
    void runRef.current(autoRun);
  }, [autoRun]);
  useEffect(() => {
    if (!scrollTo || !result) return;
    const el = document.getElementById(scrollTo);
    if (!el) return;
    // The site's sticky nav covers the top of the viewport; land just below it.
    const nav = document.querySelector('nav');
    const navBottom = nav ? Math.max(0, nav.getBoundingClientRect().bottom) : 0;
    window.scrollTo({ top: window.scrollY + el.getBoundingClientRect().top - navBottom - 12, behavior: 'smooth' });
    setScrollTo(null);
  }, [scrollTo, result, selectedK]);

  const handleCancel = () => {
    tokenRef.current.cancelled = true;
  };

  const handleReset = () => {
    setForm(DEFAULT_FORM);
    setPrisms(SAMPLE_PRISMS);
    setNextId(100);
    setResult(null);
    setRunCtx(null);
    setErrors([]);
  };

  const u = form.units;
  const selectedSolution = useMemo(
    () => result?.solutions.find((s) => s.k === selectedK && s.feasible) ?? null,
    [result, selectedK],
  );
  const goalSolution = useMemo(
    () => result?.solutions.find((s) => s.k === result.goalK && s.feasible) ?? null,
    [result],
  );

  // Top 3 prisms by annual volume — bolded wherever they appear.
  const liveTop3 = useMemo(() => {
    const ranked = prisms
      .map((p) => ({ id: p.id, usage: parseFloat(p.usage) }))
      .filter((p) => isFinite(p.usage) && p.usage > 0)
      .sort((a, b) => b.usage - a.usage)
      .slice(0, 3);
    return new Set(ranked.map((p) => p.id));
  }, [prisms]);
  const drawingLinks = useMemo(
    () => (runCtx ? { full: scenarioPayload(runCtx.form, runCtx.prisms), noNames: scenarioPayload(runCtx.form, runCtx.prisms, true) } : null),
    [runCtx],
  );
  const drawingParams = useMemo((): [string, string][] => {
    if (!runCtx) return [];
    const st = runCtx.settings;
    const du = runCtx.units;
    const d = (v: number) => specDim(v, du, du);
    const preset = PALLET_PRESETS.find((p) => p.id === runCtx.form.palletPreset && p.id !== 'custom');
    return [
      ['PALLET', `${preset ? `${preset.label.split(' ')[0]} · ` : ''}${d(st.palletLen)} × ${d(st.palletWid)} ${du}`],
      ['MAX STACK', `${d(st.maxLoadHeight)} ${du}`],
      ['OVERHANG L / W', `${d(st.overhangLen)} / ${d(st.overhangWid)} ${du}`],
      ['MAX OUTSIDE L / W / D', `${d(st.maxMajor)} / ${d(st.maxMinor)} / ${d(st.maxDepth)} ${du}`],
      ['ALLOWANCE L / W / D', `${d(st.allowMajor)} / ${d(st.allowMinor)} / ${d(st.allowDepth)} ${du}`],
      ['MIN PER CARTON', String(st.minUnitsPerCarton)],
      ['FLUTES', st.flutesVertical ? 'vertical (upright only)' : 'may lie on side'],
      ['ORIENTATIONS', COLUMN_CONFIGS.filter((c) => st.allowedConfigs.includes(c.id)).map((c) => `${c.cols}×${c.tiers}`).join(', ')],
      ['BOARD TOLERANCE', `${fmt(st.boardTolerance * 100, 1)}%`],
      ['PALLET PADS', st.pads.enabled ? `${d(st.pads.thickness)} ${du}, ${st.pads.mode === 'every' ? 'every layer' : 'top and bottom'}` : 'none'],
    ];
  }, [runCtx]);
  const drawingTitle = useMemo(
    () => ({ company: form.company.trim(), project: form.project.trim(), drawingNo: form.drawingNo.trim(), revision: form.revision.trim() }),
    [form.company, form.project, form.drawingNo, form.revision],
  );

  const resultTop3 = useMemo(() => {
    const sol = result?.solutions.find((s) => s.feasible);
    if (!sol) return new Set<string>();
    const all = sol.cartons.flatMap((c) => c.members.map((m) => m.prism));
    return new Set(all.sort((a, b) => b.usage - a.usage).slice(0, 3).map((p) => p.id));
  }, [result]);

  return (
    <main>
      <div className="container cpk-root">
        <div className="page-header">
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            <Link href="/calculators" style={{ color: 'var(--accent-secondary)' }}>Calculators</Link>
            {' / '}Carton Packing Optimizer
          </p>
          <h1 className="section-title"><span className="gradient-text">Carton Packing Optimizer</span></h1>
          <p className="section-subtitle" style={{ marginBottom: 0 }}>
            A free box size and pallet load calculator. Enter your product dimensions and annual volumes, and it
            designs the best small set of carton sizes, shows how many units fit per carton and per pallet, compares
            carton SKU counts, and writes up supplier-ready carton specs. Everything runs in your browser — nothing
            is uploaded.
          </p>
        </div>

        {/* ── Prism list ── */}
        <section className="cpk-card">
          <div className="cpk-cardhead">
            <h2>1 · Prism SKUs</h2>
            <div className="cpk-btnrow">
              <span className="cpk-unittoggle" role="radiogroup" aria-label="Units">
                <button type="button" className={u === 'mm' ? 'active' : ''} onClick={() => handleUnits('mm')}>mm</button>
                <button type="button" className={u === 'in' ? 'active' : ''} onClick={() => handleUnits('in')}>in</button>
              </span>
              <button type="button" onClick={() => setImportOpen((o) => !o)}>Paste CSV</button>
              <button type="button" onClick={() => { setPrisms(SAMPLE_PRISMS); setNextId(100); }}>Sample data</button>
              <button type="button" onClick={() => setPrisms([])}>Clear</button>
            </div>
          </div>
          <p className="cpk-hint">
            Dimensions are the prism&apos;s width × height × depth in {u === 'mm' ? 'millimeters' : 'inches'}. Annual usage
            is the number of units shipped per year — it weights the optimization, so the highest-volume SKUs get packed
            most efficiently. Set <b>per carton</b> to lock a SKU to an exact count per carton (it must split evenly
            across an enabled packing orientation); leave it blank and the optimizer chooses. The three highest-volume
            SKUs are shown in bold here and throughout the results.
          </p>
          {importOpen && (
            <div className="cpk-import">
              <textarea
                rows={4}
                placeholder={'One prism per line: name, width, height, depth, annual usage\ne.g.  SKU-A 24×24×2, 594, 594, 44, 5200'}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
              />
              <div className="cpk-btnrow">
                <button type="button" className="primary" onClick={handleImportRows}>Add rows</button>
                <button type="button" onClick={() => setImportOpen(false)}>Close</button>
              </div>
            </div>
          )}
          <div className="cpk-tablewrap">
            <table className="cpk-table">
              <thead>
                <tr>
                  <th style={{ minWidth: '9rem' }}>Name</th>
                  <th>Width ({u})</th>
                  <th>Height ({u})</th>
                  <th>Depth ({u})</th>
                  <th>Annual usage</th>
                  <th>Per carton (optional)</th>
                  <th aria-label="Row actions" />
                </tr>
              </thead>
              <tbody>
                {prisms.map((p) => (
                  <tr key={p.id}>
                    <td><input type="text" value={p.name} placeholder="e.g. 24×24×2" style={liveTop3.has(p.id) ? { fontWeight: 700 } : undefined} onChange={(e) => updatePrism(p.id, 'name', e.target.value)} /></td>
                    <td><input type="number" inputMode="decimal" value={p.width} onChange={(e) => updatePrism(p.id, 'width', e.target.value)} /></td>
                    <td><input type="number" inputMode="decimal" value={p.height} onChange={(e) => updatePrism(p.id, 'height', e.target.value)} /></td>
                    <td><input type="number" inputMode="decimal" value={p.depth} onChange={(e) => updatePrism(p.id, 'depth', e.target.value)} /></td>
                    <td><input type="number" inputMode="decimal" value={p.usage} onChange={(e) => updatePrism(p.id, 'usage', e.target.value)} /></td>
                    <td><input type="number" inputMode="numeric" value={p.perCarton} placeholder="auto" onChange={(e) => updatePrism(p.id, 'perCarton', e.target.value)} /></td>
                    <td className="cpk-rowactions">
                      <button type="button" title="Duplicate" onClick={() => duplicatePrism(p.id)}>⧉</button>
                      <button type="button" title="Remove" onClick={() => removePrism(p.id)}>✕</button>
                    </td>
                  </tr>
                ))}
                {prisms.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1rem' }}>No prisms yet — add a row or load the sample data.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="cpk-btnrow" style={{ marginTop: '0.6rem' }}>
            <button type="button" className="primary" onClick={addPrism}>+ Add prism</button>
          </div>
        </section>

        <div className="cpk-grid">
          {/* ── Axis mapping + max side lengths + orientations ── */}
          <section className="cpk-card">
            <div className="cpk-cardhead"><h2>2 · Axis mapping &amp; max side lengths</h2></div>
            <p className="cpk-hint">
              How each prism dimension lines up with the erected carton, and the longest each carton side may be.
              Prisms accumulate ({'"'}stack{'"'}) along the minor-flap dimension. Changing one assignment swaps with the
              axis that held it. Each max is measured on the outside of the carton and stays with its carton side
              when the prism dimensions swap.
            </p>
            {(
              [
                ['mapMajor', 'maxMajor', 'Carton major flaps (L)', 'L'],
                ['mapDepth', 'maxDepth', 'Carton depth (D, vertical)', 'D'],
                ['mapMinor', 'maxMinor', 'Carton minor flaps (W) — stacking axis', 'W'],
              ] as const
            ).map(([mapKey, maxKey, label, side]) => (
              <div key={mapKey} className="cpk-maprow">
                <label className="cpk-field">
                  <span className="cpk-label">{label}</span>
                  <select value={form[mapKey]} onChange={(e) => handleMapping(mapKey, e.target.value as PrismAxis)}>
                    {(Object.keys(AXIS_LABELS) as PrismAxis[]).map((ax) => (
                      <option key={ax} value={ax}>{AXIS_LABELS[ax]}</option>
                    ))}
                  </select>
                </label>
                <NumField label={`Max outer ${side} (${u})`} value={form[maxKey]} onChange={(v) => set(maxKey, v)} />
              </div>
            ))}
            {parseFloat(form.maxMinor) > parseFloat(form.maxMajor) && (
              <p className="cpk-hint">
                The minor-flap side can never be longer than the major-flap side, or the carton won&apos;t close — so W
                is effectively held to the L max of {form.maxMajor} {u}.
              </p>
            )}

            <div className="cpk-divider" />
            <div className="cpk-cardhead"><h2>Packing orientations</h2></div>
            <p className="cpk-hint">
              Column layouts the optimizer may use inside a carton, viewed on the L × D face. The flaps are drawn open
              at the top — the opening the prisms load through.
            </p>
            {COLUMN_CONFIGS.map((c) => (
              <label key={c.id} className="cpk-configrow">
                <input type="checkbox" checked={form.configs[c.id] ?? false} onChange={(e) => set('configs', { ...form.configs, [c.id]: e.target.checked })} />
                <ConfigGlyph cols={c.cols} tiers={c.tiers} />
                <span>{c.label}{!c.defaultOn && <span className="cpk-tag">off by default</span>}</span>
              </label>
            ))}
          </section>

          {/* ── Carton parameters ── */}
          <section className="cpk-card">
            <div className="cpk-cardhead"><h2>3 · Cartons</h2></div>
            <NumField label="Goal number of carton SKUs" value={form.goalSkus} onChange={(v) => set('goalSkus', v)} step="1" hint="The simulation also runs ±5 SKUs around this goal." />
            <NumField
              label="Minimum prisms per carton"
              value={form.minUnits}
              onChange={(v) => set('minUnits', v)}
              step="1"
              hint="Every SKU must fit at least this many in its carton — keeps the optimizer from producing impractically small cartons. A per-SKU per-carton count overrides this for that SKU."
            />
            <div className="cpk-divider" />
            <div className="cpk-cardhead"><h2>Loading allowances</h2></div>
            <p className="cpk-hint">
              Total extra space added to each inner carton dimension so the prisms push in and pull out easily. The teal
              bands show where each allowance lands.
            </p>
            <AllowanceDiagram allowMajor={form.allowMajor} allowMinor={form.allowMinor} allowDepth={form.allowDepth} units={u} />
            <div className="cpk-three" style={{ marginTop: '0.7rem' }}>
              <NumField label={`Major flap, L (${u})`} value={form.allowMajor} onChange={(v) => set('allowMajor', v)} />
              <NumField label={`Minor flap, W (${u})`} value={form.allowMinor} onChange={(v) => set('allowMinor', v)} />
              <NumField label={`Depth, D (${u})`} value={form.allowDepth} onChange={(v) => set('allowDepth', v)} />
            </div>
            <p className="cpk-hint" style={{ marginTop: '-0.1rem' }}>
              inner L = columns × prism L + {form.allowMajor || '?'}{u} · inner W = stack count × prism W + {form.allowMinor || '?'}{u} ·
              inner D = tiers × prism D + {form.allowDepth || '?'}{u}
            </p>
            <div className="cpk-divider" />
            <NumField label={`Carton wall thickness (${u})`} value={form.wall} onChange={(v) => set('wall', v)} hint="Outer = inner + 2× wall on L and W, + 4× wall on depth (two flap plies top and bottom)." />
            <NumField
              label={`Glue flap width (${u})`}
              value={form.glueFlap}
              onChange={(v) => set('glueFlap', v)}
              hint="The RSC manufacturer's joint. With wall t, the blank is glue flap + 2(L + t) + 2(W + t) long by (W + t) + D + 2t wide, in inside dims."
            />
          </section>

          {/* ── Pallet ── */}
          <section className="cpk-card">
            <div className="cpk-cardhead"><h2>4 · Pallet</h2></div>
            <label className="cpk-field">
              <span className="cpk-label">Pallet size</span>
              <select
                value={form.palletPreset}
                onChange={(e) => {
                  const preset = PALLET_PRESETS.find((p) => p.id === e.target.value);
                  if (!preset) return;
                  setForm((f) => ({
                    ...f,
                    palletPreset: preset.id,
                    palletLen: preset.id === 'custom' ? f.palletLen : String(u === 'in' ? Math.round((preset.len / 25.4) * 100) / 100 : preset.len),
                    palletWid: preset.id === 'custom' ? f.palletWid : String(u === 'in' ? Math.round((preset.wid / 25.4) * 100) / 100 : preset.wid),
                  }));
                }}
              >
                {PALLET_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </label>
            <div className="cpk-three">
              <NumField label={`Length (${u})`} value={form.palletLen} onChange={(v) => { set('palletLen', v); set('palletPreset', 'custom'); }} />
              <NumField label={`Width (${u})`} value={form.palletWid} onChange={(v) => { set('palletWid', v); set('palletPreset', 'custom'); }} />
              <NumField label={`Max stack height (${u})`} value={form.maxLoadHeight} onChange={(v) => set('maxLoadHeight', v)} hint="Cartons + pads above the deck." />
            </div>
            <div className="cpk-three">
              <NumField label={`Overhang, length side (${u})`} value={form.overhangLen} onChange={(v) => set('overhangLen', v)} hint="Per side." />
              <NumField label={`Overhang, width side (${u})`} value={form.overhangWid} onChange={(v) => set('overhangWid', v)} hint="Per side." />
            </div>
            <Toggle
              label="Flutes orthogonal to ground"
              checked={form.flutesVertical}
              onChange={(v) => set('flutesVertical', v)}
              hint="Checked: cartons always sit upright. Unchecked: cartons may also lie with the depth × major-flap plane on the pallet."
            />
            {!form.flutesVertical && (
              <div className="cpk-subsetting">
                <NumField
                  label="Max layers on their side"
                  value={form.maxOnSideLayers}
                  onChange={(v) => set('maxOnSideLayers', v)}
                  step="1"
                  hint="On-side layers always stack on top of the upright ones."
                />
                <Toggle
                  label="Allow the whole stack on its side"
                  checked={form.onSideUnlimited}
                  onChange={(v) => set('onSideUnlimited', v)}
                  hint="Lifts the cap so every layer may lie on its side when that packs better."
                />
              </div>
            )}
            <div className="cpk-divider" />
            <div className="cpk-cardhead"><h2>Freight</h2></div>
            <p className="cpk-hint">Turns pallets per year into an annual freight cost. Display only — it does not change the packing.</p>
            <div className="cpk-three">
              <NumField label="Pallets per trailer" value={form.palletsPerTrailer} onChange={(v) => set('palletsPerTrailer', v)} step="1" />
              <NumField label="Shipping cost per trailer" value={form.costPerTrailer} onChange={(v) => set('costPerTrailer', v)} suffix="$" />
            </div>
            <div className="cpk-divider" />
            <Toggle label="Pallet pads" checked={form.padsEnabled} onChange={(v) => set('padsEnabled', v)} />
            {form.padsEnabled && (
              <div className="cpk-three" style={{ alignItems: 'end' }}>
                <NumField label={`Pad thickness (${u})`} value={form.padThickness} onChange={(v) => set('padThickness', v)} />
                <label className="cpk-field" style={{ gridColumn: 'span 2' }}>
                  <span className="cpk-label">Placement</span>
                  <select value={form.padMode} onChange={(e) => set('padMode', e.target.value as 'every' | 'topBottom')}>
                    <option value="every">Under first, between every layer, and on top (layers + 1 pads)</option>
                    <option value="topBottom">Under first and on top only (2 pads)</option>
                  </select>
                </label>
              </div>
            )}
          </section>

          {/* ── Objective + run ── */}
          <section className="cpk-card">
            <div className="cpk-cardhead"><h2>5 · Optimize</h2></div>
            <label className="cpk-field">
              <span className="cpk-label">Objective</span>
              <select value={form.objective} onChange={(e) => set('objective', e.target.value as ObjectiveId)}>
                {OBJECTIVES.map((o) => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
              <span className="cpk-hint">{OBJECTIVES.find((o) => o.id === form.objective)?.hint}</span>
            </label>
            <details className="cpk-objcompare">
              <summary>Compare all three objectives</summary>
              <ul>
                {OBJECTIVES.map((o) => (
                  <li key={o.id}>
                    <b>{o.label}{o.id === form.objective ? ' (selected)' : ''}.</b> {o.hint}
                  </li>
                ))}
              </ul>
            </details>
            <div style={{ marginTop: '0.8rem' }}>
              <NumField
                label="Board-saving tolerance"
                value={form.boardTolerance}
                onChange={(v) => set('boardTolerance', v)}
                suffix="%"
                hint="For each carton, the optimizer takes the design with the least corrugated board among those within this much of the best result for your objective. 0% gives up nothing — it only breaks ties toward less board."
              />
            </div>
            <Toggle
              label="Generate carton drawings (PDF)"
              checked={form.drawings}
              onChange={(v) => set('drawings', v)}
              hint="Adds a drawing set at the bottom of the page — a carton schedule, then one sheet per carton with its flat blank — with a PDF download. Each sheet carries a QR code that reopens this scenario."
            />
            {form.drawings && (
              <div className="cpk-subsetting">
                <div className="cpk-two">
                  <TextField label="Company name" value={form.company} onChange={(v) => set('company', v)} />
                  <TextField label="Project" value={form.project} onChange={(v) => set('project', v)} />
                </div>
                <div className="cpk-three">
                  <TextField label="Drawing number" value={form.drawingNo} onChange={(v) => set('drawingNo', v)} placeholder="e.g. PKG-1042" />
                  <TextField label="Revision" value={form.revision} onChange={(v) => set('revision', v)} />
                  <label className="cpk-field">
                    <span className="cpk-label">Paper</span>
                    <select value={form.paper} onChange={(e) => set('paper', e.target.value as Paper)}>
                      <option value="letter">Letter, landscape</option>
                      <option value="a4">A4, landscape</option>
                    </select>
                  </label>
                </div>
                <p className="cpk-hint" style={{ marginBottom: 0 }}>
                  The schedule sheet carries the drawing number; carton A&apos;s sheet is{' '}
                  <span style={{ whiteSpace: 'nowrap' }}>{form.drawingNo.trim() || 'the number'}-CTN-A</span>, carton B&apos;s{' '}
                  <span style={{ whiteSpace: 'nowrap' }}>-CTN-B</span>, and so on.{' '}
                  {result && result.solutions.some((x) => x.feasible) ? (
                    <a href="#cpk-drawings" style={{ color: 'var(--accent-secondary)' }}>Jump to the drawings ↓</a>
                  ) : (
                    'They appear below the results once you run the optimization.'
                  )}
                </p>
              </div>
            )}
            <p className="cpk-hint">
              No SKU mixing: a carton is always packed with a single prism SKU, and each prism SKU is assigned to exactly
              one carton SKU. Cartons may be turned 90° on the pallet, and orientations may be mixed.
            </p>
            {errors.length > 0 && (
              <div className="cpk-errors">
                {errors.map((e, i) => (
                  <div key={i}>⚠ {e}</div>
                ))}
              </div>
            )}
            <div className="cpk-btnrow" style={{ marginTop: '0.75rem' }}>
              {!running ? (
                <button type="button" className="primary cpk-start" onClick={() => handleRun()}>Start optimization</button>
              ) : (
                <button type="button" onClick={handleCancel}>Cancel</button>
              )}
              <button type="button" onClick={handleReset}>Reset defaults</button>
              <button type="button" onClick={handleExport}>Export scenario</button>
              <button type="button" onClick={handleCopyLink} title="A link that reopens these inputs and runs them">
                {linkCopied ? '✓ Link copied' : 'Copy scenario link'}
              </button>
              <button type="button" onClick={() => fileRef.current?.click()}>Import scenario</button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleImportFile(f);
                  e.target.value = '';
                }}
              />
            </div>
            {running && (
              <div className="cpk-progress">
                <div className="cpk-progressbar"><div style={{ width: `${Math.round(progress.frac * 100)}%` }} /></div>
                <span>{progress.label}</span>
              </div>
            )}
          </section>
        </div>

        {/* ── Results ── */}
        {linkNotice && (
          <div className={`cpk-linknote${linkNotice.changed || linkNotice.unreadable ? ' warn' : ''}`} role="status">
            {linkNotice.unreadable ? (
              <>⚠ This scenario link could not be read — it may have been cut short. Your own inputs are unchanged.</>
            ) : (
              <>
                Opened from {linkNotice.drawing ? <>drawing <b>{linkNotice.drawing}</b></> : 'a scenario link'}
                {linkNotice.rev ? <> · rev <b>{linkNotice.rev}</b></> : null} — these are the cartons, prism SKUs and parameters it
                was made from.
                {linkNotice.changed &&
                  ' ⚠ The optimizer now gives different cartons for these inputs than when the link was made, probably because the calculator was updated since. Check the results against the drawing.'}
              </>
            )}
          </div>
        )}
        {result && result.issues.length > 0 && (
          <section className="cpk-card cpk-issues">
            <div className="cpk-cardhead">
              <h2>
                {result.issues.length} prism SKU{result.issues.length === 1 ? '' : 's'} skipped — packed {result.packedPrisms} of {result.totalPrisms}
              </h2>
            </div>
            <p className="cpk-hint">These can&apos;t be packed with the current setup, so the simulation ran without them.</p>
            {result.issues.map((iss) => (
              <p key={iss.prism.id}>
                <b>{iss.prism.name}</b> — {iss.reason}.
              </p>
            ))}
            <p className="cpk-hint">Raise the max side length named in the reason (beside the axis mapping), enable more packing orientations, relax the pallet limits, or remove the SKU.</p>
          </section>
        )}

        {result && runCtx && result.solutions.length > 0 && (
          <div className="cpk-results" id="cpk-results">
            {/* summary tiles */}
            {selectedSolution && (
              <section className="cpk-card">
                <div className="cpk-cardhead">
                  <h2>Results · {selectedSolution.k} carton SKU{selectedSolution.k === 1 ? '' : 's'}</h2>
                  <span className="cpk-elapsed">optimized in {(result.elapsedMs / 1000).toFixed(1)}s</span>
                </div>
                <div className="cpk-tiles">
                  <div className="cpk-tile cpk-hero">
                    <div className="cpk-tile-label">Pallets per year</div>
                    <div className="cpk-tile-value">{fmt(selectedSolution.pallets, 1)}</div>
                    {goalSolution && goalSolution.pallets > 0 && selectedSolution.k !== goalSolution.k && (
                      <div className="cpk-tile-delta">
                        {selectedSolution.pallets <= goalSolution.pallets ? '' : '+'}
                        {fmt(((selectedSolution.pallets - goalSolution.pallets) / goalSolution.pallets) * 100, 1)}% vs. goal of {goalSolution.k} (lower is better)
                      </div>
                    )}
                  </div>
                  <div className="cpk-tile">
                    <div className="cpk-tile-label">Freight cost per year</div>
                    <div className="cpk-tile-value">{money(freightPerYear(selectedSolution.pallets, runCtx))}</div>
                    <div className="cpk-tile-sub">
                      {fmt(Math.ceil(selectedSolution.pallets / Math.max(runCtx.palletsPerTrailer, 1)))} trailers at {money(runCtx.costPerTrailer)}
                    </div>
                  </div>
                  <div className="cpk-tile">
                    <div className="cpk-tile-label">Board per year</div>
                    <div className="cpk-tile-value">{fmtArea(selectedSolution.boardPerYear, runCtx.units)}</div>
                    <div className="cpk-tile-sub">
                      {fmt(selectedSolution.cartonsPerYear)} carton blanks
                      {goalSolution && goalSolution.boardPerYear > 0 && selectedSolution.k !== goalSolution.k && (
                        <>
                          {' · '}
                          {selectedSolution.boardPerYear <= goalSolution.boardPerYear ? '' : '+'}
                          {fmt(((selectedSolution.boardPerYear - goalSolution.boardPerYear) / goalSolution.boardPerYear) * 100, 1)}% vs. goal
                        </>
                      )}
                    </div>
                  </div>
                  <div className="cpk-tile">
                    <div className="cpk-tile-label">Weighted units per pallet</div>
                    <div className="cpk-tile-value">{fmt(selectedSolution.weightedFpp, 1)}</div>
                  </div>
                  <div className="cpk-tile">
                    <div className="cpk-tile-label">Weighted efficiency vs. ideal</div>
                    <div className="cpk-tile-value">{(selectedSolution.weightedEff * 100).toFixed(1)}%</div>
                  </div>
                  <div className={`cpk-tile${result.issues.length > 0 ? ' cpk-tile-warn' : ''}`}>
                    <div className="cpk-tile-label">Prism SKUs packed</div>
                    <div className="cpk-tile-value">
                      {selectedSolution.cartons.reduce((a, c) => a + c.members.length, 0)}/{result.totalPrisms}
                    </div>
                    {result.issues.length > 0 && (
                      <div className="cpk-tile-sub cpk-warn">
                        ⚠ {result.issues.length} SKU{result.issues.length === 1 ? '' : 's'} skipped — see below
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* K sweep chart + table */}
            <section className="cpk-card">
              <div className="cpk-cardhead"><h2>Add or remove carton SKUs?</h2></div>
              <p className="cpk-hint">
                Usage-weighted units per pallet (top) and the corrugated board a year of cartons uses (bottom), for each
                carton SKU count — each on its own scale. Click a point to inspect that solution.
                {runCtx.settings.objective !== 'wfpp' && ' Cartons were optimized for your selected objective; the chart reports what each solution achieves.'}
              </p>
              <KChart
                solutions={result.solutions}
                goalK={result.goalK}
                selectedK={selectedK}
                onSelect={setSelectedK}
                freightFor={(pallets) => money(freightPerYear(pallets, runCtx))}
                panels={[
                  {
                    title: 'Weighted units per pallet',
                    value: (s) => s.weightedFpp,
                    tick: (v) => fmt(v, v < 10 ? 1 : 0),
                    label: (v) => fmt(v, 1),
                    tipName: 'weighted units/pallet',
                  },
                  {
                    title: `Board per year (${areaUnit(runCtx.units)})`,
                    value: (s) => areaValue(s.boardPerYear, runCtx.units),
                    tick: (v) => fmt(v, v < 10 ? 1 : 0),
                    label: (v) => `${fmt(v, 0)} ${areaUnit(runCtx.units)}`,
                    tipName: 'board per year',
                  },
                ]}
              />
              <div className="cpk-tablewrap" style={{ marginTop: '0.9rem' }}>
                <table className="cpk-table cpk-sweeptable">
                  <thead>
                    <tr>
                      <th>Carton SKUs</th>
                      <th className="cpk-num">Weighted units/pallet</th>
                      <th className="cpk-num">vs. goal</th>
                      <th className="cpk-num">Pallets/year</th>
                      <th className="cpk-num">Freight/year</th>
                      <th className="cpk-num">Board/year</th>
                      <th className="cpk-num">Weighted efficiency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.solutions.map((s) => (
                      <tr
                        key={s.k}
                        className={s.k === selectedK ? 'selected' : ''}
                        onClick={() => s.feasible && setSelectedK(s.k)}
                        style={{ cursor: s.feasible ? 'pointer' : 'default' }}
                      >
                        <td>{s.k}{s.k === result.goalK && <span className="cpk-tag goal">goal</span>}</td>
                        {s.feasible ? (
                          <>
                            <td className="cpk-num">{fmt(s.weightedFpp, 1)}</td>
                            <td className="cpk-num">
                              {goalSolution
                                ? `${s.weightedFpp >= goalSolution.weightedFpp ? '+' : ''}${fmt(((s.weightedFpp - goalSolution.weightedFpp) / goalSolution.weightedFpp) * 100, 1)}%`
                                : '—'}
                            </td>
                            <td className="cpk-num">{fmt(s.pallets, 1)}</td>
                            <td className="cpk-num">{money(freightPerYear(s.pallets, runCtx))}</td>
                            <td className="cpk-num">{fmtArea(s.boardPerYear, runCtx.units)}</td>
                            <td className="cpk-num">{(s.weightedEff * 100).toFixed(1)}%</td>
                          </>
                        ) : (
                          <td colSpan={6} style={{ color: 'var(--text-muted)' }}>no feasible grouping found</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* supplier-ready carton specifications */}
            {selectedSolution && (
              <section className="cpk-card">
                <div className="cpk-cardhead">
                  <h2>Carton specifications · ready for suppliers</h2>
                  <div className="cpk-btnrow">
                    <span className="cpk-unittoggle" role="radiogroup" aria-label="Spec sheet units">
                      <button type="button" className={specUnits === 'in' ? 'active' : ''} onClick={() => setSpecUnits('in')}>in</button>
                      <button type="button" className={specUnits === 'mm' ? 'active' : ''} onClick={() => setSpecUnits('mm')}>mm</button>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard
                          .writeText(
                            buildSpecText(
                              selectedSolution,
                              runCtx.units,
                              specUnits,
                              runCtx.settings.palletLen,
                              runCtx.settings.palletWid,
                              runCtx.units === 'in' ? PALLET_HEIGHT_IN : PALLET_HEIGHT_MM,
                            ),
                          )
                          .then(() => {
                            setCopied(true);
                            setTimeout(() => setCopied(false), 1800);
                          })
                          .catch(() => {});
                      }}
                    >
                      {copied ? '✓ Copied' : 'Copy spec sheet'}
                    </button>
                  </div>
                </div>
                <p className="cpk-hint">
                  Every carton dimension in the selected {selectedSolution.k}-SKU solution, with estimated annual carton
                  demand. Dimensions are L × W × D (major flap × minor flap × depth) in{' '}
                  {specUnits === 'in' ? 'inches, rounded to the nearest 1/16' : 'millimeters'}.
                </p>
                <div className="cpk-tablewrap">
                  <table className="cpk-table cpk-spectable">
                    <thead>
                      <tr>
                        <th>Carton</th>
                        <th>Inner L × W × D</th>
                        <th>Outer L × W × D</th>
                        <th>Blank L × W</th>
                        <th className="cpk-num">Prism SKUs</th>
                        <th className="cpk-num">Cartons/pallet</th>
                        <th className="cpk-num">Cartons/year</th>
                        <th className="cpk-num">Board/year</th>
                        <th className="cpk-num">Pallets/year</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSolution.cartons.map((c) => (
                        <tr key={c.label}>
                          <td><b>Carton {c.label}</b></td>
                          <td>{specDims3(c.inner, runCtx.units, specUnits)}</td>
                          <td>{specDims3(c.outer, runCtx.units, specUnits)}</td>
                          <td>
                            {(() => {
                              const bd = blankDims(c.blank, runCtx.units, specUnits);
                              return `${specDim(bd.length, specUnits, specUnits)} × ${specDim(bd.width, specUnits, specUnits)} ${specUnits}`;
                            })()}
                          </td>
                          <td className="cpk-num">{c.members.length}</td>
                          <td className="cpk-num">{fmt(c.cartonsPerPallet)}</td>
                          <td className="cpk-num">{fmt(c.cartonsPerYear)}</td>
                          <td className="cpk-num">{specArea(c.boardPerYear, runCtx.units, specUnits)}</td>
                          <td className="cpk-num">{fmt(annualPalletsFor(c), 1)}</td>
                        </tr>
                      ))}
                      <tr className="cpk-totalrow">
                        <td colSpan={6}>Total</td>
                        <td className="cpk-num">{fmt(selectedSolution.cartonsPerYear)}</td>
                        <td className="cpk-num">{specArea(selectedSolution.boardPerYear, runCtx.units, specUnits)}</td>
                        <td className="cpk-num">{fmt(selectedSolution.pallets, 1)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="cpk-hint" style={{ marginTop: '0.5rem', marginBottom: 0 }}>
                  Cartons/year sums each assigned SKU&apos;s annual usage ÷ units per carton, rounded up per SKU (no SKU
                  mixing inside a carton). Board/year is cartons/year × the flat RSC blank area.
                </p>
              </section>
            )}

            {/* carton cards */}
            {selectedSolution?.cartons.map((carton) => (
              <CartonCard
                key={carton.label}
                carton={carton}
                solution={selectedSolution}
                ctx={runCtx}
                top3={resultTop3}
                linkNotice={linkNotice && !linkNotice.unreadable && linkNotice.carton === carton.label ? linkNotice : null}
              />
            ))}

            {/* modeling notes */}
            <section className="cpk-card">
              <details>
                <summary className="cpk-notes-summary">Modeling notes &amp; assumptions</summary>
                <ul className="cpk-notes">
                  <li>Inner dims: L = columns × prism-L + major allowance; W = stack count × prism-W + minor allowance; D = tiers × prism-D + depth allowance. Each allowance is the total extra space in that dimension, and the stack count is maximized to the carton width for every SKU sharing the carton.</li>
                  <li>Outer dims add 2 × wall on L and W and 4 × wall on depth (two flap plies top and bottom). Each carton side has its own max length — major flap (L), minor flap (W), and depth (D) — measured on the outer dims, so the inner limits are the L and W maxes less 2 × wall and the D max less 4 × wall.</li>
                  <li>The minor-flap dimension (W) is never allowed to exceed the major-flap dimension (L): on an RSC the two minor flaps each span half the width and fold across L, so a carton with a longer minor-flap side could not be closed. The major-flap side does not have to hug the contents — when the stack is deeper than the packed row is wide, L is widened to match W, leaving dead space beside the prisms while keeping them aligned. Because L has to reach W, the stack is also held under the L max: a W max set above the L max has no effect past it.</li>
                  <li>The three highest annual-volume prism SKUs are shown in bold throughout the results.</li>
                  <li>Each carton is packed with one SKU at a time; each prism SKU is assigned to exactly one carton SKU.</li>
                  <li>Every SKU without a set per-carton count must reach the minimum prisms per carton; a set count overrides the minimum for that SKU and must split evenly across an enabled packing orientation (columns × tiers must divide it).</li>
                  <li>When orientations mix on a pallet, upright layers always stack at the bottom and on-side layers on top; layers are numbered from the deck up, and the number of on-side layers is capped by the max-layers-on-their-side setting (or uncapped when the whole stack may lie on its side).</li>
                  <li>Blank size is the flat RSC (FEFCO 0201) sheet, from the inside dims L × W × D and the wall t: four panels L + t, W + t, L + t, W + t score to score plus the glue flap; every flap (W + t) / 2 deep so the major flaps meet in the middle; depth D + 2t between the flap scores. Blank area is the full rectangular sheet, since slots and trim are cut from it, and board per year is that area × cartons per year.</li>
                  <li>The board-saving tolerance works per carton: the optimizer finds the best score for your objective, then takes the design with the least board among those within the tolerance of it. At 0% it only breaks ties, so the objective never gets worse.</li>
                  <li>Carton drawings are made from the selected solution: a carton schedule of inside dimensions and the prism SKUs in each carton, then one sheet per carton with its packed view, flat RSC blank (cuts solid, scores dashed, at a standard scale on A4 or Letter printed at 100%) and data. Blank dimensions are score to score, each rounded to 1/16 in or 0.1 mm, and every overall is the sum of its rounded parts so the chains add up.</li>
                  <li>Scenario links — Copy scenario link, and each drawing&apos;s QR code — carry the inputs and prism list after the # in the URL, which browsers never send to a server, so the page can reopen and rerun the scenario with no database. Company and project names are left out. The optimizer is deterministic, so a link reopens the same cartons; a fingerprint flags it if a later version of the calculator gives different ones. Very long prism lists drop their names from QR links to fit, and past about 100 SKUs a sheet asks for Export scenario instead.</li>
                  <li>The packed-carton view draws the closed top see-through, so the prisms stay visible, with the major-flap seam running the full length L down the middle of W.</li>
                  <li>In the pallet views a carton&apos;s colour shows only its orientation — upright layers in purple, on-side layers in teal. An upright carton shows its major-flap seam: the major flaps close second, over the minor flaps, and meet down the middle of W, so the seam runs the full length L. A carton on its side has its flap faces standing vertical along its two L edges, drawn heavier in the top view, and its seam shows in the stack elevation on the flap faces turned toward you. A 90° turn within a layer reads from these marks, so colour never means two things at once.</li>
                  <li>Pallet patterns mix 90° rotations using a block-pattern search (up to three guillotine splits). Fully interlocked pinwheel patterns are not searched, so a rare layout may fit one more carton than reported.</li>
                  <li>The pallet is assumed 5 in (127 mm) tall; the max stack height applies to cartons and pads above the deck.</li>
                  <li>With flutes not required vertical, cartons may also rest on the depth × major-flap face (minor flaps vertical); layers of different orientations can mix within the height budget.</li>
                  <li>Overhang is allowed per side, so the usable footprint grows by 2 × overhang in that dimension.</li>
                  <li>{'"'}Ideal{'"'} units/pallet for a SKU is what it would achieve with a dedicated, perfectly sized carton under the same rules — the efficiency baseline.</li>
                  <li>Not modeled: carton compression strength, load weight limits, interlocked (rotated-between-layers) stacking for stability, and dunnage inside cartons.</li>
                  <li>The grouping search is heuristic (interval DP over two sort orders plus local moves). Results are deterministic for the same inputs.</li>
                </ul>
              </details>
            </section>

            {/* carton drawings, last on the page */}
            {form.drawings && selectedSolution && drawingLinks && (
              <DrawingSheets
                solution={selectedSolution}
                units={runCtx.units}
                wall={runCtx.settings.wall}
                glueFlap={runCtx.settings.glueFlap}
                totalPrisms={result.totalPrisms}
                objective={OBJECTIVES.find((o) => o.id === runCtx.settings.objective)?.label ?? ''}
                params={drawingParams}
                title={drawingTitle}
                paper={form.paper}
                payload={drawingLinks.full}
                payloadNoNames={drawingLinks.noNames}
              />
            )}
          </div>
        )}
      </div>

      <Footer />
      <style>{CPK_CSS}</style>
    </main>
  );
}

// ── Carton result card ────────────────────────────────────────────────────────

function configPhrase(m: MemberPack): string {
  return `${m.cols} across × ${m.tiers} tier${m.tiers > 1 ? 's' : ''} × ${m.nPerStack} deep`;
}

function CartonCard({
  carton,
  solution,
  ctx,
  top3,
  linkNotice,
}: {
  carton: CartonSpec;
  solution: SolutionK;
  ctx: RunContext;
  top3: Set<string>;
  /** Set on the carton a scenario link opened at. */
  linkNotice: LinkNotice | null;
}) {
  const [memberIdx, setMemberIdx] = useState(0);
  const u = ctx.units;
  const s = ctx.settings;
  const member = carton.members[Math.min(memberIdx, carton.members.length - 1)];
  const totalUsage = solution.cartons.reduce((a, c) => a + c.usageShare, 0);
  const layerSummary = carton.pallet.layers
    .map((l) => `${l.count} layer${l.count > 1 ? 's' : ''} of ${l.perLayer} ${l.orientation === 'upright' ? 'upright' : 'on side'}`)
    .join(' + ');

  // Layer numbering (1 = bottom; upright groups always stack below on-side)
  // and the footprint each pattern actually occupies.
  const groups = carton.pallet.layers;
  let firstLayer = 1;
  const groupInfo = groups.map((l) => {
    const from = firstLayer;
    const to = firstLayer + l.count - 1;
    firstLayer = to + 1;
    const xs = l.placements.map((r) => [r.x, r.x + r.w]).flat();
    const ys = l.placements.map((r) => [r.y, r.y + r.h]).flat();
    const extX = xs.length > 0 ? Math.max(...xs) - Math.min(...xs) : 0;
    const extY = ys.length > 0 ? Math.max(...ys) - Math.min(...ys) : 0;
    return { from, to, extX, extY };
  });
  const totalLayers = carton.pallet.totalLayers;
  const topOnSide = groups.length > 1 && groups[groups.length - 1].orientation === 'onSide';
  const bboxX = Math.max(0, ...groupInfo.map((g) => g.extX));
  const bboxY = Math.max(0, ...groupInfo.map((g) => g.extY));
  const palletH = u === 'in' ? PALLET_HEIGHT_IN : PALLET_HEIGHT_MM;
  const ohL = Math.max(0, (bboxX - s.palletLen) / 2);
  const ohW = Math.max(0, (bboxY - s.palletWid) / 2);
  const overhangNote = (v: number, side: string) =>
    v > 0.049 ? (
      <><b className="cpk-overhang">{fmtDim(v, u)} per side</b> along the pallet {side}</>
    ) : (
      <>none along the pallet {side}</>
    );
  const layerLabel = (gi: number) => {
    const g = groupInfo[gi];
    const pos = g.to === totalLayers ? (g.from === 1 ? '' : ' · top' ) : g.from === 1 ? ' · bottom' : ' · middle';
    return (g.from === g.to ? `Layer ${g.from}` : `Layers ${g.from}–${g.to}`) + pos;
  };

  return (
    <section className={`cpk-card${linkNotice ? ' cpk-focus' : ''}`} id={`cpk-carton-${carton.label}`}>
      {linkNotice && (
        <div className="cpk-focusnote">
          {linkNotice.drawing ? <>From drawing <b>{linkNotice.drawing}</b>{linkNotice.rev ? <> · rev <b>{linkNotice.rev}</b></> : null}</> : 'Opened from a scenario link'}
          {linkNotice.changed && ' · ⚠ results differ from the drawing — see the note above'}
        </div>
      )}
      <div className="cpk-cardhead">
        <h2>
          Carton {carton.label}
          <span className="cpk-carton-dims">
            outer {fmtDim(carton.outer.l, u)} × {fmtDim(carton.outer.w, u)} × {fmtDim(carton.outer.d, u)}
            {' · '}inner {fmtDim(carton.inner.l, u)} × {fmtDim(carton.inner.w, u)} × {fmtDim(carton.inner.d, u)}
            {' · '}blank {fmtDim(carton.blank.length, u)} × {fmtDim(carton.blank.width, u)}
          </span>
        </h2>
        <span className="cpk-elapsed">
          {totalUsage > 0 ? `${((carton.usageShare / totalUsage) * 100).toFixed(0)}% of usage` : ''} · {carton.cartonsPerPallet} cartons/pallet
        </span>
      </div>

      <div className="cpk-carton-grid">
        <div className="cpk-carton-viz">
          <IsoCartonView carton={carton} member={member} units={u} />
          <div className="cpk-viz-caption">
            <b>{member.prism.name}</b> · {configPhrase(member)} = {member.unitsPerCarton}/carton · {fmt(member.fpp)} per pallet
          </div>
          {carton.members.length > 1 && (
            <div className="cpk-chiprow">
              {carton.members.map((m, i) => (
                <button
                  key={m.prism.id}
                  type="button"
                  className={`cpk-chip ${i === Math.min(memberIdx, carton.members.length - 1) ? 'active' : ''}`}
                  onClick={() => setMemberIdx(i)}
                >
                  {m.prism.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="cpk-carton-side">
          <div className="cpk-tablewrap">
            <table className="cpk-table cpk-membertable">
              <thead>
                <tr>
                  <th>Prism SKU</th>
                  <th className="cpk-num">Annual usage</th>
                  <th className="cpk-num">Packing</th>
                  <th className="cpk-num">Per carton</th>
                  <th className="cpk-num">Per pallet</th>
                  <th className="cpk-num">Cartons/year</th>
                  <th>Efficiency vs. ideal</th>
                </tr>
              </thead>
              <tbody>
                {carton.members.map((m) => (
                  <tr key={m.prism.id} className={top3.has(m.prism.id) ? 'cpk-toprow' : undefined}>
                    <td>{m.prism.name}</td>
                    <td className="cpk-num">{fmt(m.prism.usage)}</td>
                    <td className="cpk-num">{m.cols}×{m.tiers}×{m.nPerStack}{m.prism.perCarton != null && <span className="cpk-tag">set</span>}</td>
                    <td className="cpk-num">{m.unitsPerCarton}</td>
                    <td className="cpk-num">{fmt(m.fpp)}</td>
                    <td className="cpk-num">{fmt(Math.ceil(m.prism.usage / Math.max(m.unitsPerCarton, 1)))}</td>
                    <td><EffMeter value={m.efficiency} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="cpk-hint" style={{ marginTop: '0.5rem' }}>
            {carton.cartonsPerPallet} cartons/pallet = {layerSummary}. Stack {fmtDim(carton.pallet.stackHeight, u)} of {fmtDim(s.maxLoadHeight, u)} allowed
            {carton.pallet.padCount > 0 ? `, ${carton.pallet.padCount} pallet pads` : ''}. Volume fill for {member.prism.name}: {(member.volumeFill * 100).toFixed(0)}%.
          </p>
        </div>
      </div>

      {/* per-prism subsections */}
      {carton.members.length > 1 && (
        <div className="cpk-members-grid">
          {carton.members.map((m) => (
            <div key={m.prism.id} className={`cpk-member-tile${top3.has(m.prism.id) ? ' cpk-toptile' : ''}`}>
              <IsoCartonView carton={carton} member={m} units={u} />
              <div className="cpk-member-tile-caption">
                <b>{m.prism.name}</b>
                <span>{configPhrase(m)} = {m.unitsPerCarton}/carton</span>
                <span>{fmt(m.fpp)} per pallet · <EffMeter value={m.efficiency} /></span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* pallet views */}
      <div className="cpk-bbox">
        Load bounding box: <b>{fmt(Math.round(bboxX * 10) / 10, 1)} × {fmt(Math.round(bboxY * 10) / 10, 1)} × {fmt(Math.round(carton.pallet.stackHeight * 10) / 10, 1)} {u}</b>
        {' '}({fmtDim(carton.pallet.stackHeight + palletH, u)} tall incl. the {fmtDim(palletH, u)} pallet) · overhang: {overhangNote(ohL, 'length')}; {overhangNote(ohW, 'width')}.
      </div>
      <div className="cpk-pallet-grid">
        {carton.pallet.layers.map((l, li) => (
          <div key={li} className="cpk-pallet-tile">
            <PalletTopView plan={carton.pallet} layerIndex={li} palletLen={s.palletLen} palletWid={s.palletWid} units={u} />
            <div className="cpk-viz-caption">
              <b>{layerLabel(li)}</b> · {l.perLayer}/layer, {l.orientation === 'upright' ? 'upright' : 'on side (flutes horizontal)'} · extent {fmt(Math.round(groupInfo[li].extX * 10) / 10, 1)} × {fmt(Math.round(groupInfo[li].extY * 10) / 10, 1)} {u}
              {topOnSide && li === carton.pallet.layers.length - 2 && ' — the on-side top layer stacks directly on this pattern'}
            </div>
          </div>
        ))}
        <div className="cpk-pallet-tile">
          <PalletSideView
            plan={carton.pallet}
            maxLoadHeight={s.maxLoadHeight}
            padThickness={s.pads.enabled ? s.pads.thickness : 0}
            units={u}
            palletHeight={u === 'in' ? PALLET_HEIGHT_IN : PALLET_HEIGHT_MM}
          />
          <div className="cpk-viz-caption">Stack elevation · {carton.pallet.totalLayers} layers</div>
        </div>
      </div>
    </section>
  );
}

// ── Page-scoped styles ────────────────────────────────────────────────────────

const CPK_CSS = `
.cpk-root{margin-bottom:4rem}
.cpk-card{background:var(--glass-bg);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border:1px solid var(--glass-border);border-radius:var(--radius-lg);padding:1.2rem 1.35rem;margin-bottom:1.1rem}
.cpk-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1.1rem;margin-bottom:1.1rem}
.cpk-grid .cpk-card{margin-bottom:0}
@media(max-width:900px){.cpk-grid{grid-template-columns:1fr}}

.cpk-cardhead{display:flex;align-items:baseline;justify-content:space-between;gap:0.8rem;flex-wrap:wrap;margin-bottom:0.55rem}
.cpk-cardhead h2{font-size:0.85rem;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:var(--text-primary)}
.cpk-carton-dims{display:block;font-size:0.72rem;font-weight:600;letter-spacing:0.02em;text-transform:none;color:var(--text-secondary);margin-top:0.2rem}
.cpk-elapsed{font-size:0.72rem;color:var(--text-muted);font-weight:600}
.cpk-hint{color:var(--text-secondary);font-size:0.78rem;line-height:1.55;margin-bottom:0.7rem}
.cpk-divider{border-top:1px solid var(--border-subtle);margin:0.9rem 0}

.cpk-field{display:block;margin-bottom:0.65rem}
.cpk-label{display:block;font-size:0.7rem;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:0.25rem}
.cpk-field input[type=number],.cpk-field input[type=text],.cpk-field select,.cpk-import textarea{width:100%;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text-primary);font-family:inherit;font-size:0.85rem;padding:0.45rem 0.55rem;outline:none}
.cpk-field input:focus,.cpk-field select:focus,.cpk-import textarea:focus{border-color:var(--accent-primary);box-shadow:0 0 0 3px rgba(108,92,231,0.15)}
.cpk-inputwrap{display:flex;align-items:center;gap:0.4rem}
.cpk-suffix{font-size:0.75rem;color:var(--text-muted);font-weight:600}
.cpk-field .cpk-hint{display:block;margin:0.25rem 0 0;font-size:0.7rem}
.cpk-three{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0.6rem}
.cpk-two{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0.6rem}
@media(max-width:560px){.cpk-two{grid-template-columns:1fr}}
#cpk-drawings{scroll-margin-top:6.5rem}
.cpk-sheets{display:flex;flex-direction:column;gap:1.1rem}
.cpk-sheet{margin:0;border:1px solid var(--border);border-radius:var(--radius-md);overflow:hidden;background:#fff;box-shadow:0 2px 14px rgba(0,0,0,0.06)}
.cpk-sheet figcaption{font-size:0.74rem;color:var(--text-secondary);padding:0.45rem 0.75rem;border-top:1px solid var(--border-subtle);background:var(--surface)}
.cpk-root a.cpk-linkbtn{font-size:0.78rem;font-weight:600;color:var(--accent-secondary);text-decoration:none;padding:0.48rem 0.4rem}
.cpk-root a.cpk-linkbtn:hover{text-decoration:underline}
.cpk-root button:disabled{opacity:0.5;cursor:default}
.cpk-maprow{display:grid;grid-template-columns:minmax(0,1fr) 8.75rem;gap:0.6rem;align-items:end}
@media(max-width:560px){.cpk-maprow{grid-template-columns:minmax(10rem,1fr) minmax(0,6rem)}}
@media(max-width:560px){.cpk-three{grid-template-columns:1fr}}

.cpk-toggle{display:flex;align-items:flex-start;gap:0.5rem;cursor:pointer;user-select:none;font-size:0.82rem;color:var(--text-primary);line-height:1.45;margin-bottom:0.55rem}
.cpk-toggle input{accent-color:var(--accent-primary);width:15px;height:15px;margin-top:2px;flex-shrink:0}
.cpk-toggle .cpk-hint{margin:0.1rem 0 0}

.cpk-configrow{display:flex;align-items:center;gap:0.6rem;font-size:0.8rem;color:var(--text-primary);padding:0.3rem 0;cursor:pointer;user-select:none}
.cpk-configrow input{accent-color:var(--accent-primary);width:15px;height:15px;flex-shrink:0}
.cpk-tag{display:inline-block;margin-left:0.5rem;font-size:0.62rem;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:var(--text-muted);border:1px solid var(--border);border-radius:999px;padding:0.05rem 0.45rem}
.cpk-tag.goal{color:var(--accent-secondary);border-color:var(--accent-secondary)}

.cpk-btnrow{display:flex;gap:0.5rem;flex-wrap:wrap;align-items:center}
.cpk-root button{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text-primary);font-family:inherit;font-size:0.78rem;font-weight:600;letter-spacing:0.02em;padding:0.48rem 0.8rem;cursor:pointer;transition:all var(--transition-fast, 0.15s ease)}
.cpk-root button:hover{border-color:var(--accent-primary);background:var(--surface-hover)}
.cpk-root button.primary{background:linear-gradient(135deg,var(--accent-primary),#8b5cf6);border-color:transparent;color:#fff;box-shadow:0 2px 12px rgba(108,92,231,0.25)}
.cpk-root button.primary:hover{transform:translateY(-1px);box-shadow:0 4px 18px rgba(108,92,231,0.35)}
.cpk-root button.cpk-start{font-size:0.9rem;padding:0.6rem 1.3rem}
.cpk-unittoggle{display:inline-flex;border:1px solid var(--border);border-radius:var(--radius-sm);overflow:hidden}
.cpk-root .cpk-unittoggle button{border:none;border-radius:0;padding:0.4rem 0.7rem;font-size:0.74rem;background:transparent;color:var(--text-secondary)}
.cpk-root .cpk-unittoggle button.active{background:var(--accent-secondary);color:#fff}

.cpk-tablewrap{overflow-x:auto}
.cpk-table{width:100%;border-collapse:collapse;font-size:0.82rem}
.cpk-table th{font-size:0.66rem;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:var(--text-muted);text-align:left;padding:0.4rem 0.5rem;border-bottom:1px solid var(--border)}
.cpk-table td{padding:0.32rem 0.5rem;border-bottom:1px solid var(--border-subtle);color:var(--text-primary);font-variant-numeric:tabular-nums}
.cpk-table .cpk-num{text-align:right}
.cpk-totalrow td{font-weight:700;color:var(--text-primary);border-top:2px solid var(--border);border-bottom:none}
.cpk-toprow td{font-weight:700}
.cpk-toptile{border-color:rgba(108,92,231,0.35);box-shadow:0 0 0 1px rgba(108,92,231,0.12)}
.cpk-toptile .cpk-member-tile-caption b{font-weight:800}
.cpk-table td input{width:100%;min-width:4.5rem;background:var(--surface);border:1px solid transparent;border-radius:var(--radius-sm);color:var(--text-primary);font-family:inherit;font-size:0.82rem;padding:0.3rem 0.4rem;outline:none}
.cpk-table td input:focus{border-color:var(--accent-primary)}
.cpk-rowactions{white-space:nowrap;text-align:right}
.cpk-root .cpk-rowactions button{padding:0.25rem 0.5rem;font-size:0.75rem;margin-left:0.25rem}
.cpk-sweeptable tr.selected td{background:rgba(108,92,231,0.07)}
.cpk-sweeptable tbody tr:hover td{background:rgba(108,92,231,0.045)}

.cpk-import{background:var(--surface);border:1px solid var(--border-subtle);border-radius:var(--radius-md);padding:0.7rem;margin-bottom:0.8rem}
.cpk-import textarea{margin-bottom:0.5rem;resize:vertical}

.cpk-errors{background:rgba(232,67,147,0.08);border:1px solid rgba(232,67,147,0.35);border-radius:var(--radius-md);padding:0.6rem 0.8rem;font-size:0.8rem;color:var(--text-primary);display:flex;flex-direction:column;gap:0.25rem}
.cpk-issues{border-color:rgba(232,67,147,0.4)}
.cpk-issues p{font-size:0.82rem;color:var(--text-primary);margin-bottom:0.3rem}

.cpk-progress{display:flex;align-items:center;gap:0.8rem;margin-top:0.8rem;font-size:0.76rem;color:var(--text-secondary)}
.cpk-progressbar{flex:1;height:8px;background:var(--surface);border:1px solid var(--border-subtle);border-radius:999px;overflow:hidden}
.cpk-progressbar div{height:100%;background:linear-gradient(90deg,var(--accent-primary),#8b5cf6);border-radius:999px;transition:width 0.2s ease}

.cpk-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(148px,1fr));gap:0.6rem;align-items:stretch}
.cpk-tile{background:var(--surface);border:1px solid var(--border-subtle);border-radius:var(--radius-md);padding:0.75rem 0.9rem;display:flex;flex-direction:column;justify-content:center}
.cpk-tile-label{font-size:0.64rem;font-weight:700;color:var(--text-muted);letter-spacing:0.08em;text-transform:uppercase}
.cpk-tile-value{font-size:1.4rem;font-weight:800;margin-top:0.2rem;color:var(--text-primary);line-height:1.15}
.cpk-tile.cpk-hero{border-color:rgba(108,92,231,0.3);background:linear-gradient(135deg,rgba(108,92,231,0.06),rgba(139,92,246,0.03))}
.cpk-tile.cpk-hero .cpk-tile-value{font-size:1.85rem;color:var(--accent-primary)}
.cpk-tile-delta{font-size:0.72rem;font-weight:600;color:var(--accent-secondary);margin-top:0.2rem}
.cpk-tile-sub{font-size:0.68rem;font-weight:600;color:var(--text-muted);margin-top:0.2rem;line-height:1.4}
.cpk-tile-warn{border-color:rgba(225,112,85,0.5);background:rgba(225,112,85,0.07)}
.cpk-tile-warn .cpk-tile-value{color:var(--accent-orange)}
.cpk-tile-sub.cpk-warn{color:var(--accent-orange)}
.cpk-overhang{font-weight:800;text-decoration:underline;color:var(--accent-orange)}
.cpk-chartwrap{max-width:780px;margin:0 auto}

.cpk-tooltip{position:absolute;top:12%;background:var(--surface-raised);border:1px solid var(--border);border-radius:var(--radius-md);box-shadow:0 8px 30px rgba(0,0,0,0.12);padding:0.5rem 0.7rem;font-size:0.74rem;color:var(--text-secondary);pointer-events:none;white-space:nowrap;z-index:5}
.cpk-tooltip-title{font-weight:700;color:var(--text-primary);margin-bottom:0.15rem}
.cpk-tooltip-hint{color:var(--text-muted);font-size:0.66rem;margin-top:0.2rem}

.cpk-carton-grid{display:grid;grid-template-columns:minmax(220px,300px) minmax(0,1fr);gap:1.3rem;align-items:start;margin-top:0.4rem}
@media(max-width:860px){.cpk-carton-grid{grid-template-columns:1fr}}
.cpk-carton-viz>svg{max-width:300px;display:block;margin:0 auto}
.cpk-viz-caption{font-size:0.74rem;color:var(--text-secondary);margin-top:0.35rem;line-height:1.5;text-align:center}
.cpk-chiprow{display:flex;gap:0.35rem;flex-wrap:wrap;margin-top:0.5rem}
.cpk-root .cpk-chip{padding:0.25rem 0.6rem;font-size:0.7rem;border-radius:999px}
.cpk-root .cpk-chip.active{background:var(--accent-primary);border-color:var(--accent-primary);color:#fff}

.cpk-members-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:0.8rem;margin-top:1.1rem;border-top:1px solid var(--border-subtle);padding-top:1rem}
.cpk-member-tile{background:var(--surface);border:1px solid var(--border-subtle);border-radius:var(--radius-md);padding:0.65rem;display:flex;flex-direction:column}
.cpk-member-tile>svg{max-width:210px;margin:0 auto}
.cpk-member-tile-caption{font-size:0.7rem;color:var(--text-secondary);margin-top:0.45rem;display:flex;flex-direction:column;gap:0.2rem;line-height:1.4}
.cpk-member-tile-caption b{color:var(--text-primary);font-size:0.76rem}

.cpk-pallet-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:1rem;margin-top:1.1rem;border-top:1px solid var(--border-subtle);padding-top:1rem}
.cpk-pallet-tile{background:var(--surface);border:1px solid var(--border-subtle);border-radius:var(--radius-md);padding:0.7rem;display:flex;flex-direction:column;justify-content:space-between}
.cpk-pallet-tile>svg{max-width:420px;margin:0 auto}

.cpk-meter{display:inline-flex;align-items:center;gap:0.4rem}
.cpk-meter-track{width:64px;height:7px;border-radius:999px;background:#e6e2fb;overflow:hidden;display:inline-block}
.cpk-meter-fill{display:block;height:100%;background:var(--accent-primary);border-radius:999px}
.cpk-meter-num{font-size:0.72rem;font-weight:700;color:var(--text-secondary);font-variant-numeric:tabular-nums}

.cpk-bbox{background:var(--surface);border:1px solid var(--border-subtle);border-radius:var(--radius-md);padding:0.55rem 0.8rem;font-size:0.78rem;color:var(--text-secondary);margin-top:1.1rem;line-height:1.55}
.cpk-bbox b{color:var(--text-primary);font-variant-numeric:tabular-nums}

.cpk-subsetting{margin:0.1rem 0 0.6rem 1.6rem;padding-left:0.8rem;border-left:2px solid var(--border)}
.cpk-subsetting .cpk-field{margin-bottom:0.5rem}
.cpk-subsetting input[type=number]{max-width:7rem}

.cpk-linknote{background:rgba(108,92,231,0.06);border:1px solid rgba(108,92,231,0.3);border-radius:var(--radius-md);padding:0.65rem 0.9rem;font-size:0.82rem;color:var(--text-primary);line-height:1.5;margin-bottom:1.1rem}
.cpk-linknote.warn{background:rgba(225,112,85,0.08);border-color:rgba(225,112,85,0.5)}
.cpk-focus{border-color:rgba(108,92,231,0.55);box-shadow:0 0 0 3px rgba(108,92,231,0.12)}
.cpk-focusnote{font-size:0.74rem;font-weight:600;color:var(--accent-primary);margin-bottom:0.45rem}
.cpk-objcompare{margin-top:0.4rem}
.cpk-objcompare summary{cursor:pointer;font-size:0.74rem;font-weight:700;color:var(--accent-secondary)}
.cpk-objcompare ul{margin:0.5rem 0 0 1.1rem;display:flex;flex-direction:column;gap:0.5rem;font-size:0.76rem;color:var(--text-secondary);line-height:1.55}
.cpk-objcompare b{color:var(--text-primary)}

.cpk-notes-summary{cursor:pointer;font-size:0.8rem;font-weight:700;color:var(--text-secondary)}
.cpk-notes{margin:0.7rem 0 0 1.1rem;display:flex;flex-direction:column;gap:0.4rem;font-size:0.78rem;color:var(--text-secondary);line-height:1.55}
`;

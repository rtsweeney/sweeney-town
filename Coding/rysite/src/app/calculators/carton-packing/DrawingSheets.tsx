'use client';

// The carton drawing set, shown below the results: built from the selected
// solution, previewed as SVG and downloadable as a PDF. The page loads this
// module only when drawings are switched on, so the QR encoder and the PDF
// writer cost nothing until then.

import { useEffect, useMemo, useState } from 'react';
import qrcode from 'qrcode-generator';
import type { SolutionK } from './engine';
import { buildSheets, cartonNumber, FRAME, PAPER, qrRuns, sheetsToPdf, type DrawingInput, type Prim, type Sheet, type TitleInfo } from './drawings';
import type { Paper, Units } from './format';
import { encodePayload, shareUrl, solutionFingerprint, type SharePayload } from './share';

/**
 * QR modules for `text`, or null when it would be too dense to scan at the
 * 27.5 mm it prints: error correction M up to version 20, else L up to
 * version 22 (105 modules, about 0.26 mm each).
 */
function qrMatrix(text: string): boolean[][] | null {
  for (const [level, maxVersion] of [['M', 20], ['L', 22]] as const) {
    try {
      const qr = qrcode(0, level);
      qr.addData(text);
      qr.make();
      const n = qr.getModuleCount();
      if ((n - 17) / 4 <= maxVersion) return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => qr.isDark(r, c)));
    } catch {
      /* too long for any version at this level */
    }
  }
  return null;
}

function localDate(d: Date): string {
  const pad = (v: number) => String(v).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function PrimSvg({ p }: { p: Prim }) {
  if (p.k === 'line') {
    return <line x1={p.a[0]} y1={p.a[1]} x2={p.b[0]} y2={p.b[1]} stroke={p.c} strokeWidth={p.w} strokeDasharray={p.dash?.join(' ')} strokeLinecap="round" />;
  }
  if (p.k === 'poly') {
    const points = p.pts.map(([x, y]) => `${x},${y}`).join(' ');
    const stroke = p.stroke && (p.lw ?? 0) > 0 ? p.stroke : 'none';
    return p.closed ? (
      <polygon points={points} fill={p.fill ?? 'none'} fillOpacity={p.opacity} stroke={stroke} strokeWidth={p.lw} strokeLinejoin="round" />
    ) : (
      <polyline points={points} fill="none" stroke={stroke} strokeWidth={p.lw} strokeLinejoin="round" strokeLinecap="round" />
    );
  }
  if (p.k === 'text') {
    return (
      <text
        x={p.x}
        y={p.y}
        fontSize={p.size}
        fontWeight={p.bold ? 700 : 400}
        fill={p.c}
        textAnchor={p.anchor ?? 'start'}
        fontFamily="Helvetica, Arial, sans-serif"
        transform={p.rot ? `rotate(${p.rot} ${p.x} ${p.y})` : undefined}
      >
        {p.s}
      </text>
    );
  }
  const cell = p.size / p.m.length;
  const d = qrRuns(p.m)
    .map(([r, c, len]) => `M${p.x + c * cell} ${p.y + r * cell}h${len * cell}v${cell}h${-len * cell}z`)
    .join('');
  return (
    <g>
      <rect x={p.x - cell} y={p.y - cell} width={p.size + 2 * cell} height={p.size + 2 * cell} fill="#fff" />
      <path d={d} fill="#000" />
    </g>
  );
}

function SheetSvg({ sheet }: { sheet: Sheet }) {
  return (
    <svg
      viewBox={`-3 -3 ${FRAME.w + 6} ${FRAME.h + 6}`}
      role="img"
      aria-label={`Drawing ${sheet.number}: ${sheet.title}`}
      style={{ width: '100%', height: 'auto', display: 'block', background: '#fff' }}
    >
      {sheet.prims.map((p, i) => (
        <PrimSvg key={i} p={p} />
      ))}
    </svg>
  );
}

export interface DrawingSheetsProps {
  solution: SolutionK;
  units: Units;
  wall: number;
  glueFlap: number;
  totalPrisms: number;
  objective: string;
  params: [string, string][];
  title: Omit<TitleInfo, 'date'>;
  paper: Paper;
  /** The scenario as run, for the QR links; the second drops prism names to fit. */
  payload: SharePayload;
  payloadNoNames: SharePayload;
}

export default function DrawingSheets(props: DrawingSheetsProps) {
  const { solution, title, paper, payload, payloadNoNames } = props;
  const [date] = useState(() => localDate(new Date()));
  const [links, setLinks] = useState<{ qr: DrawingInput['qr']; schedule: string | null; namesDropped: boolean; tooLong: boolean } | null>(null);
  const { drawingNo, revision } = title;

  // One link per sheet: the schedule opens the solution, a carton sheet opens
  // at its carton. A link too long for a printable QR code is retried without
  // the prism names, which the page rebuilds from the dimensions.
  useEffect(() => {
    let live = true;
    const base = window.location.origin + window.location.pathname;
    const fp = solutionFingerprint(solution);
    const linkFor = async (p: SharePayload, carton?: string) =>
      shareUrl(
        base,
        await encodePayload({
          ...p,
          k: solution.k,
          fp,
          c: carton,
          d: carton ? cartonNumber(drawingNo, carton) : drawingNo || undefined,
          r: revision || undefined,
        }),
      );
    const qrFor = async (carton?: string) => {
      const full = await linkFor(payload, carton);
      const m = qrMatrix(full);
      if (m) return { m, url: full, dropped: false };
      const short = await linkFor(payloadNoNames, carton);
      const m2 = qrMatrix(short);
      return { m: m2, url: m2 ? short : null, dropped: true };
    };
    (async () => {
      const schedule = await qrFor();
      const cartons: Record<string, boolean[][] | null> = {};
      let dropped = schedule.dropped;
      let tooLong = !schedule.m;
      for (const c of solution.cartons) {
        const r = await qrFor(c.label);
        cartons[c.label] = r.m;
        dropped ||= r.dropped;
        tooLong ||= !r.m;
      }
      if (live) setLinks({ qr: { schedule: schedule.m, cartons }, schedule: schedule.url, namesDropped: dropped && !tooLong, tooLong });
    })();
    return () => {
      live = false;
    };
  }, [solution, payload, payloadNoNames, drawingNo, revision]);

  const sheets = useMemo(() => {
    if (!links) return null;
    return buildSheets({
      solution,
      units: props.units,
      wall: props.wall,
      glueFlap: props.glueFlap,
      totalPrisms: props.totalPrisms,
      objective: props.objective,
      params: props.params,
      title: { ...title, date },
      qr: links.qr,
    });
  }, [links, solution, props.units, props.wall, props.glueFlap, props.totalPrisms, props.objective, props.params, title, date]);

  const download = () => {
    if (!sheets) return;
    const name = drawingNo || 'carton-drawings';
    const bytes = sheetsToPdf(sheets, paper, `${name}${revision ? ` rev ${revision}` : ''}`);
    const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name.replace(/[^\w.-]+/g, '_')}${revision ? `-rev${revision.replace(/[^\w.-]+/g, '_')}` : ''}.pdf`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  return (
    <section className="cpk-card" id="cpk-drawings">
      <div className="cpk-cardhead">
        <h2>Carton drawings{sheets ? ` · ${sheets.length} sheets` : ''}</h2>
        <div className="cpk-btnrow">
          {links?.schedule && (
            <a className="cpk-linkbtn" href={links.schedule} target="_blank" rel="noopener noreferrer">
              Open the QR link
            </a>
          )}
          <button type="button" className="primary" onClick={download} disabled={!sheets}>
            Download PDF ({PAPER[paper].label})
          </button>
        </div>
      </div>
      <p className="cpk-hint">
        A carton schedule, then one sheet per carton, for the selected <span className="cpk-nowrap">{solution.k}-SKU</span>{' '}
        solution. Each QR code reopens this scenario at its carton.
        {links?.namesDropped && ' The prism list is long, so the QR links leave out SKU names; the page names them by size.'}
        {links?.tooLong && ' The prism list is too long for a printable QR code, so some sheets say to use Export scenario.'}
      </p>
      <p className="cpk-hint cpk-show-sm">These are previews: download the PDF to read the sheets on a phone.</p>
      {sheets ? (
        <div className="cpk-sheets">
          {sheets.map((s, i) => (
            <figure key={i} className="cpk-sheet">
              <SheetSvg sheet={s} />
              <figcaption>
                {/* A carton sheet's number already names its carton (…-CTN-A). */}
                <b>{s.number === '—' ? '' : s.number}</b>
                {s.carton ? '' : `${s.number === '—' ? '' : ' · '}carton schedule`}
              </figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <p className="cpk-hint">Preparing drawings…</p>
      )}
    </section>
  );
}

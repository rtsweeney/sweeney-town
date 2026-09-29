'use client';

// ── NFL Elo — charts ─────────────────────────────────────────────────────────
// Hand-drawn SVG: the shapes are simple, and owning every mark keeps the look
// consistent with the rest of the page without pulling in a charting library.
//
// Thirty-two teams is far past what colour alone can tell apart, so identity is
// carried by direct labels (every bump line is labelled at both ends, every
// Elo line at its end) and by a marker shape per division slot. Colour follows
// the team everywhere on the page. A shared spotlight — a conference, a
// division, or whichever team is under the pointer — lifts some teams into
// full colour and greys out the rest.

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Crown } from 'lucide-react';
import { TEAMS, resolveTeam, fullName } from './teams';
import { LEAGUE_MEAN, type TeamRating } from './engine';

// ── shared ───────────────────────────────────────────────────────────────────

export interface Division {
  key: string;
  conference: string;
  teams: string[];
}

export const DIVISIONS: Division[] = ['AFC', 'NFC'].flatMap((conference) =>
  ['East', 'North', 'South', 'West'].map((division) => ({
    key: `${conference} ${division}`,
    conference,
    teams: TEAMS.filter((t) => t.conference === conference && t.division === division).map((t) => t.abbr),
  })));

export interface Spotlight {
  key: string;
  label: string;
  /** Null means the whole league. */
  teams: Set<string> | null;
}

export const SPOTLIGHTS: Spotlight[] = [
  { key: 'ALL', label: 'League', teams: null },
  ...['AFC', 'NFC'].map((c) => ({
    key: c,
    label: c,
    teams: new Set(TEAMS.filter((t) => t.conference === c).map((t) => t.abbr)),
  })),
  ...DIVISIONS.map((d) => ({ key: d.key, label: d.key, teams: new Set(d.teams) })),
];

/** How loudly a team is drawn given the spotlight and the pointer. */
type Emphasis = 'focus' | 'lit' | 'soft' | 'dim';

export function emphasisOf(team: string, spotlight: Set<string> | null, hover: string | null): Emphasis {
  if (hover) {
    if (team === hover) return 'focus';
    return spotlight?.has(team) ? 'soft' : 'dim';
  }
  if (spotlight) return spotlight.has(team) ? 'lit' : 'dim';
  return 'lit';
}

const colorOf = (abbr: string) => resolveTeam(abbr)?.color ?? '#8888a4';

/** A second identity channel beside colour: each division slot gets a shape. */
const shapeOf = (abbr: string) => {
  const d = DIVISIONS.find((x) => x.teams.includes(abbr));
  return d ? d.teams.indexOf(abbr) : 0;
};

export function oddsLabel(p: number): string {
  if (p >= 1) return '100%';
  if (p >= 0.995) return '>99%';
  if (p <= 0) return '0%';
  if (p < 0.005) return '<1%';
  return `${Math.round(p * 100)}%`;
}

const weekLabel = (w: number) => (w === 0 ? 'Preseason' : `Week ${w}`);

/** Track an element's rendered width so charts can lay out in real pixels. */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

function Marker({ shape, x, y, r, fill }: { shape: number; x: number; y: number; r: number; fill: string }) {
  const common = { fill, stroke: 'var(--surface-raised)', strokeWidth: 2 };
  switch (shape) {
    case 1:
      return <rect x={x - r * 0.9} y={y - r * 0.9} width={r * 1.8} height={r * 1.8} rx={1.5} {...common} />;
    case 2:
      return <path d={`M${x},${y - r * 1.15} L${x + r * 1.1},${y + r * 0.8} L${x - r * 1.1},${y + r * 0.8} Z`} strokeLinejoin="round" {...common} />;
    case 3:
      return <path d={`M${x},${y - r * 1.2} L${x + r * 1.2},${y} L${x},${y + r * 1.2} L${x - r * 1.2},${y} Z`} strokeLinejoin="round" {...common} />;
    default:
      return <circle cx={x} cy={y} r={r} {...common} />;
  }
}

/** Spread end-of-line labels so none overlap, keeping each as near its line as it can. */
function dodge(items: { key: string; y: number }[], gap: number, min: number, max: number) {
  const sorted = [...items].sort((a, b) => a.y - b.y);
  const pos = sorted.map((i) => Math.max(min, i.y));
  for (let i = 1; i < pos.length; i++) pos[i] = Math.max(pos[i], pos[i - 1] + gap);
  if (pos.length && pos[pos.length - 1] > max) {
    pos[pos.length - 1] = max;
    for (let i = pos.length - 2; i >= 0; i--) pos[i] = Math.min(pos[i], pos[i + 1] - gap);
  }
  return new Map(sorted.map((item, i) => [item.key, pos[i]]));
}

/**
 * Sweeps the series in from the left once, on mount. The animation lives on
 * this clip rather than on each line because hovering re-orders the lines to
 * bring one to the front, and a browser restarts the animation of any element
 * that is moved in the DOM.
 */
function Reveal({ id, width, height }: { id: string; width: number; height: number }) {
  return (
    <defs>
      <clipPath id={id}>
        <rect x={-8} y={-8} width={width + 16} height={height + 16} className="nfl-reveal" />
      </clipPath>
    </defs>
  );
}

/** useId, made safe to drop into a url(#…) reference. */
function useClipId() {
  return `nfl-clip-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
}

interface ChartProps {
  teams: TeamRating[];
  spotlight: Set<string> | null;
  hover: string | null;
  onHover: (team: string | null) => void;
}

function Tooltip({ x, y, width, children }: { x: number; y: number; width: number; children: React.ReactNode }) {
  // Flip to the left of the pointer when there is no room on the right.
  const flip = x > width - 220;
  return (
    <div
      className="nfl-tip"
      style={{ top: Math.max(0, y), ...(flip ? { right: width - x + 14 } : { left: x + 14 }) }}
      role="status"
    >
      {children}
    </div>
  );
}

function TipRow({ team, value, note, strong }: { team: string; value: string; note?: string; strong?: boolean }) {
  return (
    <div className={`nfl-tip-row ${strong ? 'strong' : ''}`}>
      <span className="nfl-tip-key" style={{ background: colorOf(team) }} />
      <strong>{value}</strong>
      <span className="nfl-tip-name">{fullName(team)}</span>
      {note && <span className="nfl-tip-note">{note}</span>}
    </div>
  );
}

const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '±0');

// ── spotlight picker ─────────────────────────────────────────────────────────

export function SpotlightPicker({ value, onChange }: { value: string; onChange: (key: string) => void }) {
  return (
    <div className="nfl-spot" role="group" aria-label="Spotlight">
      <span className="nfl-spot-label">Spotlight</span>
      {SPOTLIGHTS.map((s) => (
        <button
          key={s.key}
          type="button"
          aria-pressed={value === s.key}
          className={`nfl-spot-btn ${value === s.key ? 'active' : ''} ${s.key.includes(' ') ? 'div' : ''}`}
          onClick={() => onChange(s.key)}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

// ── headline tiles ───────────────────────────────────────────────────────────

export function Highlights({ teams, throughWeek }: { teams: TeamRating[]; throughWeek: number }) {
  const top = teams[0];
  const byChange = [...teams].sort((a, b) => (b.elo - b.eloPreseason) - (a.elo - a.eloPreseason));
  const climb = byChange[0];
  const slide = byChange[byChange.length - 1];
  const surest = [...teams].sort((a, b) => b.playoffOdds - a.playoffOdds)[0];
  const byTeam = new Map(teams.map((t) => [t.team, t]));
  const tightest = [...DIVISIONS]
    .map((d) => ({ d, lead: Math.max(...d.teams.map((t) => byTeam.get(t)?.divisionOdds ?? 0)) }))
    .sort((a, b) => a.lead - b.lead)[0];

  const tiles = [
    { label: 'Top of the league', value: `${Math.round(top.elo)}`, team: top.team, note: `${fullName(top.team)}, #1 in Elo` },
    ...(throughWeek > 0 ? [
      { label: 'Biggest climb', value: signed(Math.round(climb.elo - climb.eloPreseason)), team: climb.team, note: `${fullName(climb.team)} since preseason` },
      { label: 'Biggest slide', value: signed(Math.round(slide.elo - slide.eloPreseason)), team: slide.team, note: `${fullName(slide.team)} since preseason` },
    ] : []),
    { label: 'Surest playoff bet', value: oddsLabel(surest.playoffOdds), team: surest.team, note: `${fullName(surest.team)} to make the field` },
    { label: 'Tightest division race', value: tightest.d.key, team: null, note: `Nobody better than ${oddsLabel(tightest.lead)} to win it` },
  ];

  return (
    <div className="nfl-tiles">
      {tiles.map((t) => (
        <div key={t.label} className="nfl-tile">
          <span className="nfl-tile-label">{t.label}</span>
          <span className="nfl-tile-value">{t.value}</span>
          <span className="nfl-tile-note">
            {t.team && <span className="nfl-tile-swatch" style={{ background: colorOf(t.team) }} />}
            {t.note}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── bump chart: league rank by week ──────────────────────────────────────────

export function BumpChart({ teams, spotlight, hover, onHover }: ChartProps) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [probe, setProbe] = useState<number | null>(null);
  const clipId = useClipId();
  const weeks = teams[0]?.history.length ?? 0;
  const n = teams.length;

  // order[w][i] is the team ranked i+1 after week w.
  const order = useMemo(() => Array.from({ length: weeks }, (_, w) =>
    [...teams].sort((a, b) => b.history[w] - a.history[w] || a.rank - b.rank).map((t) => t.team)), [teams, weeks]);
  const rankOf = useMemo(() => order.map((o) => new Map(o.map((t, i) => [t, i + 1]))), [order]);

  const compact = width < 640;
  const M = { top: 34, right: compact ? 58 : 104, bottom: 10, left: compact ? 40 : 58 };
  const rowH = compact ? 15 : 17;
  const height = M.top + (n - 1) * rowH + M.bottom;
  const plotW = Math.max(1, width - M.left - M.right);
  const step = weeks > 1 ? plotW / (weeks - 1) : 0;
  const x = (w: number) => (weeks > 1 ? M.left + w * step : M.left + plotW / 2);
  const y = (rank: number) => M.top + (rank - 1) * rowH;
  const last = weeks - 1;

  const path = (team: string) => {
    let d = '';
    for (let w = 0; w < weeks; w++) {
      const px = x(w), py = y(rankOf[w].get(team)!);
      if (w === 0) d = `M${px},${py}`;
      else {
        // Horizontal tangents at every week give the classic bump-chart S-curve.
        const prevX = x(w - 1), prevY = y(rankOf[w - 1].get(team)!);
        const mid = (prevX + px) / 2;
        d += ` C${mid},${prevY} ${mid},${py} ${px},${py}`;
      }
    }
    return d;
  };

  const drawOrder = [...teams].sort((a, b) => {
    const rank = (t: string) => ({ dim: 0, soft: 1, lit: 2, focus: 3 })[emphasisOf(t, spotlight, hover)];
    return rank(a.team) - rank(b.team);
  });

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (weeks === 0) return;
    const box = e.currentTarget.getBoundingClientRect();
    const w = weeks > 1 ? Math.round((e.clientX - box.left - M.left) / step) : 0;
    const week = Math.min(Math.max(w, 0), last);
    const rank = Math.min(Math.max(Math.round((e.clientY - box.top - M.top) / rowH) + 1, 1), n);
    setProbe(week);
    onHover(order[week][rank - 1]);
  };
  const onLeave = () => { setProbe(null); onHover(null); };

  const labelEvery = step < 28 ? Math.ceil(28 / Math.max(step, 1)) : 1;
  const hoverRank = hover && probe !== null ? rankOf[probe].get(hover) : undefined;

  return (
    <div className="nfl-chart" ref={ref}>
      {width > 0 && weeks > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={`League rank by Elo after each week. Currently: ${order[last].slice(0, 5).join(', ')} lead.`}
          onPointerMove={onMove}
          onPointerDown={onMove}
          onPointerLeave={onLeave}
        >
          <Reveal id={clipId} width={width} height={height} />
          {/* week columns */}
          {Array.from({ length: weeks }, (_, w) => (
            <g key={w}>
              <line x1={x(w)} x2={x(w)} y1={M.top - 8} y2={height - M.bottom + 4} className="nfl-grid" />
              {(w % labelEvery === 0 || w === last) && (
                <text x={x(w)} y={M.top - 16} className="nfl-axis" textAnchor="middle">
                  {w === 0 ? 'Pre' : compact ? w : `Wk ${w}`}
                </text>
              )}
            </g>
          ))}
          {probe !== null && (
            <line x1={x(probe)} x2={x(probe)} y1={M.top - 8} y2={height - M.bottom + 4} className="nfl-crosshair" />
          )}

          <g clipPath={`url(#${clipId})`}>
          {drawOrder.map((t) => {
            const e = emphasisOf(t.team, spotlight, hover);
            const color = e === 'dim' ? 'var(--nfl-dim)' : colorOf(t.team);
            return (
              <g key={t.team} className={`nfl-series nfl-${e}`}>
                <path d={path(t.team)} className="nfl-line" stroke={color} />
                {e !== 'dim' && Array.from({ length: weeks }, (_, w) => (
                  <circle key={w} cx={x(w)} cy={y(rankOf[w].get(t.team)!)} r={e === 'focus' ? 5 : 4} fill={color} className="nfl-dot" />
                ))}
              </g>
            );
          })}
          </g>

          {/* direct labels, both ends: ranks are unique, so they never collide */}
          {teams.map((t) => {
            const e = emphasisOf(t.team, spotlight, hover);
            const startRank = rankOf[0].get(t.team)!;
            const endRank = rankOf[last].get(t.team)!;
            const move = weeks > 1 ? rankOf[last - 1].get(t.team)! - endRank : 0;
            return (
              <g
                key={t.team}
                className={`nfl-label nfl-${e}`}
                onPointerEnter={() => onHover(t.team)}
              >
                <text x={M.left - 12} y={y(startRank)} dy="0.34em" textAnchor="end">{t.team}</text>
                <text x={x(last) + 12} y={y(endRank)} dy="0.34em">
                  <tspan className="nfl-label-rank">{endRank}</tspan>
                  <tspan dx="5">{t.team}</tspan>
                  {!compact && move !== 0 && (
                    <tspan dx="5" className={move > 0 ? 'nfl-up' : 'nfl-down'}>{move > 0 ? `▲${move}` : `▼${-move}`}</tspan>
                  )}
                </text>
              </g>
            );
          })}
        </svg>
      )}
      {probe !== null && hover && hoverRank !== undefined && (
        <Tooltip x={x(probe)} y={y(hoverRank) - 18} width={width}>
          <div className="nfl-tip-head">{weekLabel(probe)}</div>
          <TipRow
            team={hover}
            value={`#${hoverRank}`}
            note={`${Math.round(teams.find((t) => t.team === hover)!.history[probe])} Elo`}
            strong
          />
          {probe > 0 && (
            <div className="nfl-tip-sub">
              {(() => {
                const moved = rankOf[probe - 1].get(hover)! - hoverRank;
                return moved === 0 ? 'Held its spot' : moved > 0 ? `Up ${moved} from week before` : `Down ${-moved} from week before`;
              })()}
            </div>
          )}
        </Tooltip>
      )}
    </div>
  );
}

// ── line chart: Elo by week ──────────────────────────────────────────────────

export function EloLineChart({ teams, spotlight, hover, onHover }: ChartProps) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [probe, setProbe] = useState<number | null>(null);
  const clipId = useClipId();
  const weeks = teams[0]?.history.length ?? 0;
  const last = weeks - 1;

  const all = teams.flatMap((t) => t.history);
  const lo = Math.floor((Math.min(...all, LEAGUE_MEAN) - 15) / 50) * 50;
  const hi = Math.ceil((Math.max(...all, LEAGUE_MEAN) + 15) / 50) * 50;

  const compact = width < 640;
  const M = { top: 14, right: compact ? 56 : 96, bottom: 30, left: 44 };
  const height = compact ? 400 : 460;
  const plotW = Math.max(1, width - M.left - M.right);
  const plotH = height - M.top - M.bottom;
  const step = weeks > 1 ? plotW / (weeks - 1) : 0;
  const x = (w: number) => (weeks > 1 ? M.left + w * step : M.left + plotW / 2);
  const y = (elo: number) => M.top + ((hi - elo) / (hi - lo)) * plotH;
  const ticks: number[] = [];
  for (let v = lo; v <= hi; v += 50) ticks.push(v);

  const labelled = teams.filter((t) => !spotlight || spotlight.has(t.team));
  const labelY = dodge(
    labelled.map((t) => ({ key: t.team, y: y(t.history[last]) })),
    compact ? 11 : 13,
    M.top + 4,
    height - M.bottom - 2,
  );

  const drawOrder = [...teams].sort((a, b) => {
    const rank = (t: string) => ({ dim: 0, soft: 1, lit: 2, focus: 3 })[emphasisOf(t, spotlight, hover)];
    return rank(a.team) - rank(b.team);
  });

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (weeks === 0) return;
    const box = e.currentTarget.getBoundingClientRect();
    const w = weeks > 1 ? Math.round((e.clientX - box.left - M.left) / step) : 0;
    const week = Math.min(Math.max(w, 0), last);
    const py = e.clientY - box.top;
    // Snap to whichever team's point is nearest the pointer in this week.
    const pool = spotlight ? teams.filter((t) => spotlight.has(t.team)) : teams;
    let best = pool[0], bestD = Infinity;
    for (const t of pool) {
      const d = Math.abs(y(t.history[week]) - py);
      if (d < bestD) { best = t; bestD = d; }
    }
    setProbe(week);
    onHover(best.team);
  };
  const onLeave = () => { setProbe(null); onHover(null); };

  const labelEvery = step < 28 ? Math.ceil(28 / Math.max(step, 1)) : 1;
  const hovered = hover ? teams.find((t) => t.team === hover) : undefined;
  const tipTeams = probe === null ? [] : (spotlight && spotlight.size <= 4
    ? teams.filter((t) => spotlight.has(t.team))
    : hovered ? [hovered] : []
  ).sort((a, b) => b.history[probe] - a.history[probe]);

  return (
    <div className="nfl-chart" ref={ref}>
      {width > 0 && weeks > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label="Every team's Elo rating after each week of the season."
          onPointerMove={onMove}
          onPointerDown={onMove}
          onPointerLeave={onLeave}
        >
          <Reveal id={clipId} width={width} height={height} />
          {ticks.map((v) => (
            <g key={v}>
              <line x1={M.left} x2={M.left + plotW} y1={y(v)} y2={y(v)} className="nfl-grid" />
              <text x={M.left - 8} y={y(v)} dy="0.34em" textAnchor="end" className="nfl-axis">{v}</text>
            </g>
          ))}
          <line x1={M.left} x2={M.left + plotW} y1={y(LEAGUE_MEAN)} y2={y(LEAGUE_MEAN)} className="nfl-mean" />
          <text x={M.left + 6} y={y(LEAGUE_MEAN) - 6} className="nfl-axis nfl-mean-label">League average {LEAGUE_MEAN}</text>

          {Array.from({ length: weeks }, (_, w) => (w % labelEvery === 0 || w === last) && (
            <text key={w} x={x(w)} y={height - 8} textAnchor="middle" className="nfl-axis">
              {w === 0 ? 'Pre' : compact ? w : `Wk ${w}`}
            </text>
          ))}
          {probe !== null && (
            <line x1={x(probe)} x2={x(probe)} y1={M.top} y2={M.top + plotH} className="nfl-crosshair" />
          )}

          <g clipPath={`url(#${clipId})`}>
          {drawOrder.map((t) => {
            const e = emphasisOf(t.team, spotlight, hover);
            const color = e === 'dim' ? 'var(--nfl-dim)' : colorOf(t.team);
            const points = t.history.map((v, w) => `${x(w)},${y(v)}`).join(' ');
            return (
              <g key={t.team} className={`nfl-series nfl-${e}`}>
                <polyline points={points} className="nfl-line" stroke={color} />
                {e !== 'dim' && t.history.map((v, w) => (
                  <Marker key={w} shape={shapeOf(t.team)} x={x(w)} y={y(v)} r={e === 'focus' ? 5 : 4} fill={color} />
                ))}
              </g>
            );
          })}
          </g>

          {/* end labels, spread apart with leader lines back to each line */}
          {labelled.map((t) => {
            const e = emphasisOf(t.team, spotlight, hover);
            const endX = x(last);
            const endY = y(t.history[last]);
            const ly = labelY.get(t.team)!;
            return (
              <g key={t.team} className={`nfl-label nfl-${e}`} onPointerEnter={() => onHover(t.team)}>
                <path d={`M${endX + 7},${endY} L${endX + 14},${ly} L${endX + 18},${ly}`} className="nfl-leader" />
                <text x={endX + 21} y={ly} dy="0.34em">
                  {t.team}
                  {!compact && <tspan dx="5" className="nfl-label-rank">{Math.round(t.history[last])}</tspan>}
                </text>
              </g>
            );
          })}
        </svg>
      )}
      {probe !== null && tipTeams.length > 0 && (
        <Tooltip x={x(probe)} y={y(tipTeams[0].history[probe]) - 18} width={width}>
          <div className="nfl-tip-head">{weekLabel(probe)}</div>
          {tipTeams.map((t) => (
            <TipRow
              key={t.team}
              team={t.team}
              value={`${Math.round(t.history[probe])}`}
              note={probe > 0 ? signed(Math.round(t.history[probe] - t.history[probe - 1])) : undefined}
              strong={t.team === hover}
            />
          ))}
        </Tooltip>
      )}
    </div>
  );
}

/** Chart-free twin of the two league charts, for anyone not using a pointer. */
export function WeeklyTable({ teams }: { teams: TeamRating[] }) {
  const weeks = teams[0]?.history.length ?? 0;
  const ranks = Array.from({ length: weeks }, (_, w) => new Map(
    [...teams].sort((a, b) => b.history[w] - a.history[w] || a.rank - b.rank).map((t, i) => [t.team, i + 1])));
  return (
    <details className="nfl-data">
      <summary>Week-by-week numbers</summary>
      <div className="nfl-table-scroll">
        <table className="nfl-qb-table nfl-weekly">
          <thead>
            <tr>
              <th>Team</th>
              {Array.from({ length: weeks }, (_, w) => <th key={w} className="num">{w === 0 ? 'Pre' : `Wk ${w}`}</th>)}
            </tr>
          </thead>
          <tbody>
            {teams.map((t) => (
              <tr key={t.team}>
                <td className="nfl-qb-name">
                  <span className="nfl-elo-swatch" style={{ background: colorOf(t.team) }} />
                  {fullName(t.team)}
                </td>
                {t.history.map((v, w) => (
                  <td key={w} className="num">
                    {Math.round(v)} <span className="nfl-weekly-rank">#{ranks[w].get(t.team)}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

// ── division races: projected wins ───────────────────────────────────────────

export function DivisionRaces({
  teams, spotlight, hover, onHover, seasonGames,
}: ChartProps & { seasonGames: number }) {
  const byTeam = new Map(teams.map((t) => [t.team, t]));
  const scale = (wins: number) => `${(Math.min(wins, seasonGames) / seasonGames) * 100}%`;

  return (
    <>
      <div className="nfl-legend">
        <span><i className="nfl-legend-won" /> Wins so far</span>
        <span><i className="nfl-legend-proj" /> Projected over the rest of the season</span>
        <span><i className="nfl-legend-500" /> .500</span>
        <span><Crown size={13} className="nfl-crown" aria-hidden="true" /> Projected division winner</span>
      </div>
      <div className="nfl-divs">
        {DIVISIONS.map((d) => {
          const rows = d.teams
            .map((abbr) => byTeam.get(abbr)!)
            .filter(Boolean)
            .sort((a, b) => b.expectedWins - a.expectedWins || b.divisionOdds - a.divisionOdds);
          const leader = [...rows].sort((a, b) => b.divisionOdds - a.divisionOdds || b.expectedWins - a.expectedWins)[0];
          const inSpotlight = !spotlight || d.teams.some((t) => spotlight.has(t));
          return (
            <section key={d.key} className={`nfl-div ${inSpotlight ? '' : 'faded'}`}>
              <header>
                <h4>{d.key}</h4>
                <span>Proj. W</span>
                <span>Win div.</span>
              </header>
              {rows.map((t) => {
                const team = resolveTeam(t.team);
                const banked = t.wins + t.ties / 2;
                const ahead = Math.max(0, t.expectedWins - banked);
                const isLeader = t.team === leader.team;
                const e = emphasisOf(t.team, spotlight, hover);
                return (
                  <div
                    key={t.team}
                    className={`nfl-div-row ${isLeader ? 'leader' : ''} ${hover === t.team ? 'hovered' : ''} ${e === 'dim' && hover ? 'quiet' : ''}`}
                    onPointerEnter={() => onHover(t.team)}
                    onPointerLeave={() => onHover(null)}
                    title={`${fullName(t.team)}: ${t.wins}-${t.losses}${t.ties ? `-${t.ties}` : ''} so far, projects ${t.expectedWins.toFixed(1)} wins, ${oddsLabel(t.divisionOdds)} to win the ${d.key}, ${oddsLabel(t.playoffOdds)} to make the playoffs`}
                  >
                    <span className="nfl-div-team">
                      <span className="nfl-div-abbr">{t.team}</span>
                      <span className="nfl-div-nick">{team?.nickname}</span>
                    </span>
                    <span className="nfl-div-track" aria-hidden="true">
                      <span className="nfl-div-500" style={{ left: scale(seasonGames / 2) }} />
                      <span className="nfl-div-bars nfl-grow">
                        {banked > 0 && (
                          <span
                            className={`nfl-div-won ${ahead < 0.05 ? 'end' : ''}`}
                            style={{ width: scale(banked), background: colorOf(t.team) }}
                          />
                        )}
                        {ahead >= 0.05 && (
                          <span className="nfl-div-proj" style={{ width: scale(ahead), background: colorOf(t.team) }} />
                        )}
                      </span>
                    </span>
                    <span className="nfl-div-xw">{t.expectedWins.toFixed(1)}</span>
                    <span className="nfl-div-odds">
                      {isLeader && <Crown size={12} className="nfl-crown" aria-label="Projected division winner" />}
                      {oddsLabel(t.divisionOdds)}
                    </span>
                  </div>
                );
              })}
            </section>
          );
        })}
      </div>
    </>
  );
}

// ── playoff picture ──────────────────────────────────────────────────────────

/** The likeliest field: each division's favourite, then the three best wild-card bets. */
export function projectedField(teams: TeamRating[], conference: string) {
  const byTeam = new Map(teams.map((t) => [t.team, t]));
  const winners = DIVISIONS
    .filter((d) => d.conference === conference)
    .map((d) => d.teams.map((abbr) => byTeam.get(abbr)!).filter(Boolean)
      .sort((a, b) => b.divisionOdds - a.divisionOdds || b.expectedWins - a.expectedWins)[0])
    .sort((a, b) => b.expectedWins - a.expectedWins || b.elo - a.elo);
  const taken = new Set(winners.map((t) => t.team));
  const rest = teams
    .filter((t) => resolveTeam(t.team)?.conference === conference && !taken.has(t.team))
    .sort((a, b) => b.playoffOdds - a.playoffOdds || b.expectedWins - a.expectedWins);
  return { seeds: [...winners, ...rest.slice(0, 3)], hunt: rest.slice(3, 6) };
}

function Meter({ p }: { p: number }) {
  return (
    <span className="nfl-meter" aria-hidden="true">
      <span style={{ width: `${Math.max(0, Math.min(1, p)) * 100}%` }} />
    </span>
  );
}

export function PlayoffPicture({ teams, spotlight, hover, onHover }: ChartProps) {
  const row = (t: TeamRating, seed: number | null) => {
    const team = resolveTeam(t.team);
    const record = t.ties ? `${t.wins}-${t.losses}-${t.ties}` : `${t.wins}-${t.losses}`;
    const e = emphasisOf(t.team, spotlight, hover);
    return (
      <li
        key={t.team}
        className={`nfl-po-row ${e === 'dim' ? 'faded' : ''} ${hover === t.team ? 'hovered' : ''}`}
        onPointerEnter={() => onHover(t.team)}
        onPointerLeave={() => onHover(null)}
      >
        <span className={`nfl-po-seed ${seed === null ? 'out' : seed <= 4 ? 'div' : 'wc'}`}>{seed ?? '–'}</span>
        <span className="nfl-po-swatch" style={{ background: colorOf(t.team) }} />
        <span className="nfl-po-name">
          <span className="nfl-po-full">{team ? `${team.location} ${team.nickname}` : t.team}</span>
          <span className="nfl-po-abbr">{t.team}</span>
          {seed === 1 && <span className="nfl-po-tag">Bye {oddsLabel(t.seedOdds[0] ?? 0)}</span>}
        </span>
        <span className="nfl-po-record">{record}</span>
        <Meter p={t.playoffOdds} />
        <span className="nfl-po-odds">{oddsLabel(t.playoffOdds)}</span>
      </li>
    );
  };

  return (
    <div className="nfl-po">
      {['AFC', 'NFC'].map((conf) => {
        const { seeds, hunt } = projectedField(teams, conf);
        return (
          <section key={conf} className="nfl-po-conf">
            <h4>{conf}</h4>
            <div className="nfl-po-group">Division leaders</div>
            <ol>{seeds.slice(0, 4).map((t, i) => row(t, i + 1))}</ol>
            <div className="nfl-po-group">Wild cards</div>
            <ol>{seeds.slice(4).map((t, i) => row(t, i + 5))}</ol>
            {hunt.length > 0 && (
              <>
                <div className="nfl-po-group">In the hunt</div>
                <ol>{hunt.map((t) => row(t, null))}</ol>
              </>
            )}
          </section>
        );
      })}
    </div>
  );
}

export function PlayoffMeter({ p }: { p: number }) {
  return (
    <span className="nfl-po-cell">
      <Meter p={p} />
      <span className="nfl-po-odds">{oddsLabel(p)}</span>
    </span>
  );
}

// ── styles ───────────────────────────────────────────────────────────────────

export const CHART_CSS = `
.nfl-root{--nfl-dim:#e2e4ee;--nfl-grid:#eef0f5}
.nfl-section{margin-bottom:2.25rem}
.nfl-section-head{margin-bottom:0.9rem}
.nfl-section-head h3{font-size:1.15rem;font-weight:800;letter-spacing:-0.01em;margin:0 0 0.2rem;color:var(--text-primary)}
.nfl-section-head p{font-size:0.84rem;line-height:1.65;color:var(--text-secondary);margin:0}
.nfl-card{position:relative;background:var(--surface-raised);border:1px solid var(--border-subtle);border-radius:var(--radius-md);padding:1rem 1.1rem 0.75rem;box-shadow:0 1px 2px rgba(26,26,46,0.03),0 8px 28px -18px rgba(108,92,231,0.25)}

/* spotlight picker */
.nfl-spot{position:sticky;top:var(--nav-height);z-index:6;display:flex;flex-wrap:wrap;align-items:center;gap:0.3rem;margin:0 0 1.5rem;padding:0.55rem 0;background:linear-gradient(var(--background) 80%,rgba(255,255,255,0))}
.nfl-spot-label{font-size:0.66rem;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:var(--text-muted);margin-right:0.35rem}
.nfl-spot-btn{padding:0.32rem 0.7rem;background:var(--surface);border:1px solid transparent;border-radius:999px;font-family:inherit;font-size:0.74rem;font-weight:700;color:var(--text-secondary);cursor:pointer;transition:all var(--transition-fast)}
.nfl-spot-btn.div{font-weight:600}
.nfl-spot-btn:hover{background:var(--surface-hover);color:var(--text-primary)}
.nfl-spot-btn.active{background:var(--accent-primary);color:#fff}

/* headline tiles */
.nfl-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:0.75rem;margin-bottom:1.5rem}
.nfl-tile{display:flex;flex-direction:column;gap:0.15rem;padding:0.85rem 1rem;background:var(--surface-raised);border:1px solid var(--border-subtle);border-radius:var(--radius-md)}
.nfl-tile-label{font-size:0.72rem;font-weight:700;color:var(--text-muted)}
.nfl-tile-value{font-size:1.6rem;font-weight:800;letter-spacing:-0.02em;line-height:1.2;color:var(--text-primary)}
.nfl-tile-note{display:flex;align-items:center;gap:0.4rem;font-size:0.74rem;line-height:1.4;color:var(--text-secondary)}
.nfl-tile-swatch{flex:none;width:3px;height:0.9rem;border-radius:2px}

/* svg charts */
.nfl-chart{position:relative;width:100%;touch-action:pan-y}
.nfl-chart svg{display:block;overflow:visible;user-select:none}
.nfl-grid{stroke:var(--nfl-grid);stroke-width:1}
.nfl-crosshair{stroke:var(--text-muted);stroke-width:1;opacity:0.6}
.nfl-mean{stroke:#c9cbd8;stroke-width:1}
.nfl-axis{font-size:11px;fill:var(--text-muted);font-variant-numeric:tabular-nums;paint-order:stroke;stroke:var(--surface-raised);stroke-width:3px;stroke-linejoin:round}
.nfl-mean-label{font-size:10px;font-weight:600}
.nfl-line{fill:none;stroke-width:2;stroke-linejoin:round;stroke-linecap:round;transition:stroke-width var(--transition-fast),opacity var(--transition-fast)}
.nfl-dot{stroke:var(--surface-raised);stroke-width:2}
.nfl-series{transition:opacity var(--transition-fast)}
.nfl-series.nfl-dim .nfl-line{stroke-width:1.5}
.nfl-series.nfl-soft{opacity:0.35}
.nfl-series.nfl-focus .nfl-line{stroke-width:3.5}
.nfl-label text{font-size:11px;font-weight:700;fill:var(--text-primary);cursor:default;font-variant-numeric:tabular-nums}
.nfl-label.nfl-dim text{fill:#b4b7c8;font-weight:600}
.nfl-label.nfl-soft text{fill:var(--text-muted)}
.nfl-label.nfl-focus text{font-weight:800}
.nfl-label-rank{fill:var(--text-muted);font-weight:600}
.nfl-label .nfl-up{fill:var(--accent-secondary);font-size:9.5px}
.nfl-label .nfl-down{fill:var(--accent-warm);font-size:9.5px}
.nfl-leader{fill:none;stroke:#c9cbd8;stroke-width:1}
.nfl-reveal{transform-box:fill-box;transform-origin:left center;animation:nfl-grow 1.2s cubic-bezier(0.16,1,0.3,1) both}

.nfl-tip{position:absolute;z-index:10;min-width:170px;max-width:260px;padding:0.55rem 0.7rem;background:rgba(255,255,255,0.97);border:1px solid var(--border);border-radius:var(--radius-sm);box-shadow:0 10px 30px -12px rgba(26,26,46,0.35);pointer-events:none;font-size:0.76rem}
.nfl-tip-head{font-size:0.66rem;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-muted);margin-bottom:0.3rem}
.nfl-tip-row{display:flex;align-items:center;gap:0.45rem;padding:0.08rem 0;color:var(--text-secondary)}
.nfl-tip-row strong{font-size:0.86rem;font-weight:800;color:var(--text-primary);font-variant-numeric:tabular-nums;min-width:2.4rem}
.nfl-tip-row.strong .nfl-tip-name{color:var(--text-primary);font-weight:700}
.nfl-tip-key{flex:none;width:12px;height:3px;border-radius:2px}
.nfl-tip-name{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nfl-tip-note{color:var(--text-muted);font-variant-numeric:tabular-nums}
.nfl-tip-sub{margin-top:0.25rem;color:var(--text-muted);font-size:0.72rem}

.nfl-data{margin-top:0.75rem}
.nfl-data summary{cursor:pointer;font-size:0.78rem;font-weight:700;color:var(--accent-primary);padding:0.35rem 0}
.nfl-data .nfl-table-scroll{margin-top:0.5rem}
.nfl-weekly{font-size:0.78rem}
.nfl-weekly td.num,.nfl-weekly th.num{width:auto}
.nfl-weekly-rank{color:var(--text-muted);font-size:0.68rem}

/* division races */
.nfl-legend{display:flex;flex-wrap:wrap;gap:0.4rem 1.25rem;margin-bottom:0.9rem;font-size:0.74rem;color:var(--text-secondary)}
.nfl-legend span{display:inline-flex;align-items:center;gap:0.4rem}
.nfl-legend i{display:inline-block;width:18px;height:10px;border-radius:2px}
.nfl-legend-won{background:var(--text-secondary)}
.nfl-legend-proj{background:var(--text-secondary);opacity:0.3}
.nfl-legend-500{width:1px !important;height:14px !important;background:var(--text-muted);border-radius:0 !important}
.nfl-crown{color:#e0a800;flex:none}
.nfl-divs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:repeat(4,auto);grid-auto-flow:column;gap:0.75rem 1rem}
.nfl-div{background:var(--surface-raised);border:1px solid var(--border-subtle);border-radius:var(--radius-md);padding:0.7rem 0.75rem 0.55rem;transition:opacity var(--transition-smooth)}
.nfl-div.faded{opacity:0.35}
.nfl-div header{display:grid;grid-template-columns:minmax(0,1fr) 3rem 3.8rem;align-items:baseline;gap:0.4rem;margin-bottom:0.35rem}
.nfl-div h4{font-size:0.8rem;font-weight:800;letter-spacing:0.02em;margin:0;color:var(--text-primary)}
.nfl-div header span{white-space:nowrap;font-size:0.6rem;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:var(--text-muted);text-align:right}
.nfl-div-row{display:grid;grid-template-columns:5.6rem minmax(0,1fr) 3rem 3.8rem;align-items:center;gap:0.4rem;padding:0.32rem 0.35rem;margin:0 -0.35rem;border-radius:var(--radius-sm);transition:background var(--transition-fast),opacity var(--transition-fast)}
.nfl-div-row.leader{background:linear-gradient(90deg,rgba(253,203,110,0.28),rgba(253,203,110,0.06))}
.nfl-div-row.hovered{background:var(--surface-hover)}
.nfl-div-row.leader.hovered{background:linear-gradient(90deg,rgba(253,203,110,0.45),rgba(253,203,110,0.12))}
.nfl-div-row.quiet{opacity:0.45}
.nfl-div-team{display:flex;flex-direction:column;line-height:1.1;min-width:0}
.nfl-div-abbr{font-size:0.78rem;font-weight:800}
.nfl-div-nick{font-size:0.6rem;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nfl-div-row.leader .nfl-div-abbr{color:var(--text-primary)}
.nfl-div-track{position:relative;height:14px}
.nfl-div-bars{position:absolute;inset:0;display:flex;gap:2px;transform-origin:left center}
.nfl-div-won,.nfl-div-proj{display:block;height:100%}
.nfl-div-won{border-radius:0}
.nfl-div-won.end,.nfl-div-proj{border-radius:0 4px 4px 0}
.nfl-div-proj{opacity:0.3}
.nfl-div-500{position:absolute;top:-3px;bottom:-3px;width:1px;background:var(--text-muted);opacity:0.45;z-index:1}
.nfl-div-xw{font-size:0.82rem;font-weight:800;text-align:right;font-variant-numeric:tabular-nums}
.nfl-div-odds{display:flex;align-items:center;justify-content:flex-end;gap:0.25rem;font-size:0.74rem;font-weight:600;color:var(--text-secondary);font-variant-numeric:tabular-nums}
.nfl-div-row.leader .nfl-div-odds{font-weight:800;color:var(--text-primary)}
.nfl-grow{animation:nfl-grow 0.9s cubic-bezier(0.16,1,0.3,1) both}
@keyframes nfl-grow{from{transform:scaleX(0)}to{transform:scaleX(1)}}

/* playoff picture */
.nfl-po{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem}
.nfl-po-conf{background:var(--surface-raised);border:1px solid var(--border-subtle);border-radius:var(--radius-md);padding:0.85rem 1rem 0.7rem}
.nfl-po-conf h4{font-size:1rem;font-weight:800;margin:0 0 0.4rem;color:var(--text-primary)}
.nfl-po-conf ol{list-style:none;margin:0;padding:0}
.nfl-po-group{margin:0.55rem 0 0.2rem;font-size:0.6rem;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-muted)}
.nfl-po-row{display:grid;grid-template-columns:1.6rem 3px minmax(0,1fr) 2.6rem 4.5rem 2.6rem;align-items:center;gap:0.55rem;padding:0.32rem 0.4rem;margin:0 -0.4rem;border-radius:var(--radius-sm);transition:background var(--transition-fast),opacity var(--transition-fast)}
.nfl-po-row.hovered{background:var(--surface-hover)}
.nfl-po-row.faded{opacity:0.4}
.nfl-po-seed{display:inline-flex;align-items:center;justify-content:center;width:1.45rem;height:1.45rem;border-radius:50%;font-size:0.72rem;font-weight:800;background:var(--surface);color:var(--text-secondary)}
.nfl-po-seed.div{background:var(--accent-primary);color:#fff}
.nfl-po-seed.wc{background:rgba(108,92,231,0.14);color:var(--accent-primary)}
.nfl-po-seed.out{background:transparent;color:var(--text-muted)}
.nfl-po-swatch{width:3px;height:1.05rem;border-radius:2px}
.nfl-po-name{display:flex;align-items:center;gap:0.45rem;min-width:0;font-size:0.84rem;font-weight:700}
.nfl-po-full{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nfl-po-abbr{display:none}
.nfl-po-tag{flex:none;padding:0.08rem 0.4rem;border-radius:999px;background:rgba(253,203,110,0.35);color:#7a5a00;font-size:0.6rem;font-weight:800;letter-spacing:0.04em}
.nfl-po-record{font-size:0.76rem;color:var(--text-muted);text-align:right;font-variant-numeric:tabular-nums}
.nfl-meter{position:relative;display:block;height:6px;border-radius:999px;background:rgba(0,184,148,0.14);overflow:hidden}
.nfl-meter span{position:absolute;inset:0 auto 0 0;border-radius:999px;background:var(--accent-secondary)}
.nfl-po-odds{font-size:0.8rem;font-weight:800;text-align:right;font-variant-numeric:tabular-nums}
.nfl-po-cell{display:grid;grid-template-columns:4.5rem 2.6rem;align-items:center;gap:0.5rem;justify-content:end}

@media (max-width:860px){
  .nfl-po{grid-template-columns:1fr}
  .nfl-card{padding:0.8rem 0.7rem 0.5rem}
}
@media (max-width:560px){
  .nfl-divs{grid-template-columns:1fr;grid-template-rows:none;grid-auto-flow:row}
  .nfl-div-row{grid-template-columns:4.2rem minmax(0,1fr) 2.6rem 3.4rem}
  .nfl-div header{grid-template-columns:minmax(0,1fr) 2.6rem 3.4rem}
  .nfl-po-full{display:none}
  .nfl-po-abbr{display:inline}
  .nfl-po-row{grid-template-columns:1.6rem 3px minmax(0,1fr) 2.4rem 3.2rem 2.6rem;gap:0.45rem}
  .nfl-tile-value{font-size:1.35rem}
  .nfl-spot{position:static}
}
@media (prefers-reduced-motion:reduce){
  .nfl-reveal,.nfl-grow{animation:none}
}
`;

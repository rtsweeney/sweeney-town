'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Breadcrumb from '@/components/Breadcrumb';
import Footer from '@/components/Footer';
import {
  SCOREBOARD_URL,
  ROUND_LABELS,
  ROUND_RADII,
  type Match,
  type RoundKey,
  type BracketNode,
  parseScoreboard,
  buildBracket,
  edgeConfirmed,
  flattenBracket,
  topScorers,
  aliveTeamIds,
  matchWinnerId,
  etDateString,
  formatKickoffET,
  formatMoneyLine,
  matchScoreLabel,
} from './worldcup';
import { lookupCountryFacts } from './countryfacts';

const REFRESH_MS = 60_000;

const ROUND_COLORS: Record<string, string> = {
  r32: '#6c5ce7',
  r16: '#00b894',
  qf: '#e84393',
  sf: '#e17055',
  final: '#fdcb6e',
};

function Flag({ src, abbrev, size = 22 }: { src: string; abbrev: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: size,
          height: Math.round(size * 0.72),
          borderRadius: 3,
          background: 'var(--surface-hover)',
          color: 'var(--text-muted)',
          fontSize: size * 0.34,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {abbrev === 'TBD' ? '?' : abbrev.slice(0, 3)}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={abbrev}
      width={size}
      height={Math.round(size * 0.72)}
      style={{ objectFit: 'contain', borderRadius: 3, flexShrink: 0 }}
      onError={() => setFailed(true)}
    />
  );
}

// A single match node on the bracket wheel: two team rows (flag · abbrev · score).
function BracketMatchNode({
  node,
  selected,
  onSelect,
}: {
  node: BracketNode;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const m = node.match;
  const isFinal = node.round === 'final';
  const w = isFinal ? 104 : 88;
  const h = isFinal ? 76 : 62;
  const flagW = isFinal ? 38 : 32;
  const flagH = isFinal ? 25 : 21;
  const flagY = -h / 2 + (isFinal ? 11 : 10);
  const scoreY = flagY + flagH + (isFinal ? 22 : 20);
  const live = m?.state === 'in';
  const winner = m ? matchWinnerId(m) : null;
  const undecided = !m || (!m.home.decided && !m.away.decided);
  const accent = ROUND_COLORS[node.round] ?? 'var(--border)';
  const score =
    m && m.homeScore !== null && m.awayScore !== null ? `${m.homeScore} – ${m.awayScore}` : '';

  // Flag-first: no labels on the wheel, just two flags and the score.
  const flag = (team: Match['home'] | undefined, x: number) => {
    const decided = team?.decided;
    const isWinner = decided && winner !== null && winner === team!.id;
    const dimmed = winner !== null && decided && winner !== team!.id;
    return (
      <g opacity={dimmed ? 0.45 : 1}>
        {team?.logo && decided ? (
          <g transform={`translate(${x} ${flagY})`} clipPath={isFinal ? 'url(#wcflagL)' : 'url(#wcflag)'}>
            <image href={team.logo} width={flagW} height={flagH} preserveAspectRatio="xMidYMid slice" />
          </g>
        ) : (
          <rect x={x} y={flagY} width={flagW} height={flagH} rx={3} fill="var(--surface-hover)" />
        )}
        <rect
          x={x}
          y={flagY}
          width={flagW}
          height={flagH}
          rx={3}
          fill="none"
          stroke={isWinner ? 'var(--accent-secondary)' : 'var(--border-subtle)'}
          strokeWidth={isWinner ? 2.2 : 1}
        />
      </g>
    );
  };

  return (
    <g
      transform={`translate(${node.x} ${node.y})`}
      onClick={() => m && onSelect(m.id)}
      style={{ cursor: m ? 'pointer' : 'default' }}
      className="wc-node"
    >
      <title>{m ? `${m.home.name} vs ${m.away.name}` : 'To be determined'}</title>
      {/* Oversized invisible hit area so nodes stay tappable on phones */}
      <rect x={-w / 2 - 9} y={-h / 2 - 9} width={w + 18} height={h + 18} fill="transparent" stroke="none" />
      <rect
        x={-w / 2}
        y={-h / 2}
        width={w}
        height={h}
        rx={13}
        fill="var(--surface-raised)"
        stroke={selected ? 'var(--accent-primary)' : live ? 'var(--accent-warm)' : 'var(--glass-border)'}
        strokeWidth={selected || live ? 2.5 : 1.2}
        strokeDasharray={undecided && !selected ? '4 3' : undefined}
        opacity={undecided ? 0.85 : 1}
        filter="url(#wcshadow)"
      />
      <rect x={-w / 2} y={-h / 2 + 9} width={4} height={h - 18} rx={2} fill={accent} opacity={undecided ? 0.35 : 0.9} />
      {flag(m?.home, -flagW - 4)}
      {flag(m?.away, 4)}
      <text
        x={0}
        y={scoreY}
        textAnchor="middle"
        fontSize={isFinal ? 19 : 18}
        fontWeight={800}
        fill="var(--text-primary)"
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {score}
      </text>
      {live && <circle cx={w / 2 - 6} cy={-h / 2 + 6} r={4.5} fill="var(--accent-warm)" className="wc-pulse" />}
    </g>
  );
}

const RAD = Math.PI / 180;
const polar = (angleDeg: number, r: number): [number, number] => [
  500 + r * Math.cos(angleDeg * RAD),
  500 + r * Math.sin(angleDeg * RAD),
];

function arcTopPath(r: number): string {
  const [x1, y1] = polar(-150, r);
  const [x2, y2] = polar(-30, r);
  return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`;
}

const RING_LABELS: { round: RoundKey; r: number; text: string }[] = [
  { round: 'r32', r: 470, text: 'ROUND OF 32' },
  { round: 'r16', r: 344, text: 'ROUND OF 16' },
  { round: 'qf', r: 244, text: 'QUARTERFINALS' },
  { round: 'sf', r: 146, text: 'SEMIFINALS' },
];

function CircularBracket({
  matches,
  selectedId,
  onSelect,
}: {
  matches: Match[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const root = useMemo(() => buildBracket(matches), [matches]);
  const nodes = useMemo(() => flattenBracket(root), [root]);

  // A connector lights up teal once the outer match is decided and its winner
  // has taken their place in the inner match. Routing that isn't confirmed by
  // team identity yet (TBD slots placed by schedule order) stays faint and
  // dashed so the wheel never asserts a matchup it doesn't know.
  const connectors: { key: string; x1: number; y1: number; x2: number; y2: number; advanced: boolean; confirmed: boolean }[] = [];
  for (const n of nodes) {
    for (const c of n.children) {
      if (!c) continue;
      const winnerId = c.match ? matchWinnerId(c.match) : null;
      const advanced =
        winnerId !== null && n.match !== null && (n.match.home.id === winnerId || n.match.away.id === winnerId);
      connectors.push({
        key: `${n.round}-${c.match?.id ?? c.angle}`,
        x1: c.x,
        y1: c.y,
        x2: n.x,
        y2: n.y,
        advanced,
        confirmed: edgeConfirmed(n, c),
      });
    }
  }

  // Gentle outward bow so the connectors feel like a spiral, not spokes.
  const connectorPath = (x1: number, y1: number, x2: number, y2: number) => {
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const vx = mx - 500;
    const vy = my - 500;
    const len = Math.hypot(vx, vy) || 1;
    const k = (len + 16) / len;
    return `M ${x1} ${y1} Q ${500 + vx * k} ${500 + vy * k} ${x2} ${y2}`;
  };

  return (
    <div className="wc-bracket-wrap">
      <svg viewBox="0 0 1000 1000" className="wc-bracket-svg" role="img" aria-label="World Cup knockout bracket">
        <defs>
          <filter id="wcshadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="3" floodColor="#1a1a2e" floodOpacity="0.14" />
          </filter>
          <clipPath id="wcflag">
            <rect width={32} height={21} rx={3} />
          </clipPath>
          <clipPath id="wcflagL">
            <rect width={38} height={25} rx={4} />
          </clipPath>
          <radialGradient id="wcgold">
            <stop offset="0%" stopColor="#fdcb6e" stopOpacity="0.35" />
            <stop offset="70%" stopColor="#fdcb6e" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#fdcb6e" stopOpacity="0" />
          </radialGradient>
          {RING_LABELS.map((l) => (
            <path key={l.round} id={`wc-ring-${l.round}`} d={arcTopPath(l.r)} fill="none" />
          ))}
        </defs>

        {/* Tinted band + guide per round, colored to match the node accents */}
        {(['r32', 'r16', 'qf', 'sf'] as const).map((r) => (
          <g key={r}>
            <circle cx={500} cy={500} r={ROUND_RADII[r]} fill="none" stroke={ROUND_COLORS[r]} strokeOpacity={0.05} strokeWidth={64} />
            <circle cx={500} cy={500} r={ROUND_RADII[r]} fill="none" stroke={ROUND_COLORS[r]} strokeOpacity={0.22} strokeDasharray="2 8" />
          </g>
        ))}

        <circle cx={500} cy={500} r={95} fill="url(#wcgold)" />

        {connectors.map((c) => (
          <path
            key={c.key}
            d={connectorPath(c.x1, c.y1, c.x2, c.y2)}
            fill="none"
            stroke={c.advanced ? 'var(--accent-secondary)' : 'var(--border)'}
            strokeWidth={c.advanced ? 2.2 : 1.2}
            strokeOpacity={c.advanced ? 0.85 : c.confirmed ? 1 : 0.45}
            strokeDasharray={c.confirmed ? undefined : '3 5'}
          />
        ))}

        {RING_LABELS.map((l) => (
          <text key={l.round} fontSize={13} fontWeight={800} letterSpacing={4} fill={ROUND_COLORS[l.round]} fillOpacity={0.5}>
            <textPath href={`#wc-ring-${l.round}`} startOffset="50%" textAnchor="middle">
              {l.text}
            </textPath>
          </text>
        ))}

        {nodes.map((n, i) => (
          <BracketMatchNode
            key={n.match?.id ?? `empty-${i}`}
            node={n}
            selected={n.match?.id === selectedId}
            onSelect={onSelect}
          />
        ))}

        <text x={500} y={430} textAnchor="middle" fontSize={26}>
          🏆
        </text>
        <text x={500} y={568} textAnchor="middle" fontSize={13} fontWeight={800} fill="#b8860b" fillOpacity={0.75} letterSpacing={4}>
          FINAL
        </text>
      </svg>
    </div>
  );
}

function TeamLine({ team, score, winner, live }: { team: Match['home']; score: number | null; winner: boolean; live: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', minWidth: 0 }}>
      <Flag src={team.decided ? team.logo : ''} abbrev={team.abbrev} size={26} />
      <span
        style={{
          fontWeight: winner ? 800 : 600,
          fontSize: '1rem',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {team.decided ? team.name : 'TBD'}
      </span>
      <span style={{ marginLeft: 'auto', fontWeight: 800, fontSize: '1.15rem', color: live ? 'var(--accent-warm)' : 'var(--text-primary)' }}>
        {score ?? ''}
      </span>
    </div>
  );
}

function CountryCard({ team }: { team: Match['home'] }) {
  const facts = lookupCountryFacts(team.name);
  if (!facts) return null;
  return (
    <div className="wc-country-card">
      <div className="wc-country-header">
        <Flag src={team.logo} abbrev={team.abbrev} size={24} />
        <span style={{ fontWeight: 800 }}>{team.name}</span>
      </div>
      <div className="wc-country-row">
        <span>Population</span>
        <span>{facts.population}</span>
      </div>
      <div className="wc-country-row">
        <span>A nation since</span>
        <span>{facts.nationSince}</span>
      </div>
      <div className="wc-country-row">
        <span>GDP</span>
        <span>{facts.gdp}</span>
      </div>
      <p className="wc-country-fact">{facts.fact}</p>
    </div>
  );
}

function MatchDetail({ match }: { match: Match }) {
  const winner = matchWinnerId(match);
  const statusLabel =
    match.state === 'in'
      ? `LIVE · ${match.clock || match.statusDetail}`
      : match.state === 'post'
        ? `Full time${match.homeShootout !== null ? ` · ${match.homeShootout}–${match.awayShootout} on penalties` : ''}`
        : formatKickoffET(match.date, { withDate: true });

  const goalsFor = (teamId: string) =>
    match.goals.filter((g) => (g.ownGoal ? g.teamId !== teamId : g.teamId === teamId));

  const factTeams = [match.home, match.away].filter((t) => t.decided);

  return (
    <div className="card wc-detail">
      <div className="wc-detail-status">
        <span className={match.state === 'in' ? 'wc-live-badge' : 'wc-round-badge'}>
          {match.state === 'in' ? '● LIVE' : ROUND_LABELS[match.round]}
        </span>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{statusLabel}</span>
      </div>

      <div className="wc-detail-teams">
        <TeamLine team={match.home} score={match.homeScore} winner={winner === match.home.id} live={match.state === 'in'} />
        <TeamLine team={match.away} score={match.awayScore} winner={winner === match.away.id} live={match.state === 'in'} />
      </div>

      {match.goals.length > 0 && (
        <div className="wc-detail-goals">
          {[match.home, match.away].map((team) => (
            <div key={team.id || team.abbrev}>
              {goalsFor(team.id).map((g, i) => (
                <div key={i} style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  ⚽ {g.scorer} {g.minute}
                  {g.penalty ? ' (pen)' : ''}
                  {g.ownGoal ? ' (og)' : ''}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <div className="wc-detail-meta">
        {(match.venue || match.city) && (
          <span>📍 {[match.venue, match.city].filter(Boolean).join(' · ')}</span>
        )}
        {match.broadcasts.length > 0 && <span>📺 {match.broadcasts.join(', ')}</span>}
      </div>

      {match.odds && match.state === 'pre' && (
        <div className="wc-odds-row">
          <span className="wc-odds-pill">
            {match.home.abbrev} {formatMoneyLine(match.odds.homeMoneyLine)}
          </span>
          <span className="wc-odds-pill">Draw {formatMoneyLine(match.odds.drawMoneyLine)}</span>
          <span className="wc-odds-pill">
            {match.away.abbrev} {formatMoneyLine(match.odds.awayMoneyLine)}
          </span>
          {match.odds.overUnder !== null && <span className="wc-odds-pill">O/U {match.odds.overUnder}</span>}
          {match.odds.provider && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
              via {match.odds.provider}
            </span>
          )}
        </div>
      )}

      {factTeams.length > 0 && (
        <div className="wc-country-grid">
          {factTeams.map((t) => (
            <CountryCard key={t.id} team={t} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function WorldCupPage() {
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [aliveOnly, setAliveOnly] = useState(true);
  const [dayTab, setDayTab] = useState<string | null>(null);
  const didAutoSelect = useRef(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(SCOREBOARD_URL, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const parsed = parseScoreboard(await res.json());
      setMatches(parsed);
      setUpdatedAt(new Date());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') load();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load]);

  const now = new Date();
  const todayET = etDateString(now);
  const tomorrowET = etDateString(new Date(now.getTime() + 86_400_000));

  const liveMatches = useMemo(() => (matches ?? []).filter((m) => m.state === 'in'), [matches]);
  const nextMatch = useMemo(
    () => (matches ?? []).find((m) => m.state === 'pre' && m.date.getTime() > now.getTime()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [matches, updatedAt]
  );

  // Day tabs: today (if it has matches) plus the next match day — or the next
  // two match days when nothing is on today.
  const dayOptions = useMemo(() => {
    const days: string[] = [];
    for (const m of matches ?? []) {
      const d = etDateString(m.date);
      if (d >= todayET && !days.includes(d)) days.push(d);
      if (days.length === 2) break;
    }
    return days;
  }, [matches, todayET]);

  const activeDay = dayTab && dayOptions.includes(dayTab) ? dayTab : dayOptions[0] ?? null;
  const stripMatches = useMemo(
    () => (activeDay ? (matches ?? []).filter((m) => etDateString(m.date) === activeDay) : []),
    [matches, activeDay]
  );

  const dayLabel = (day: string): string => {
    if (day === todayET) return 'Today';
    if (day === tomorrowET) return 'Tomorrow';
    const m = (matches ?? []).find((x) => etDateString(x.date) === day);
    return m
      ? new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', month: 'short', day: 'numeric' }).format(m.date)
      : day;
  };

  const scorers = useMemo(() => (matches ? topScorers(matches, 12) : []), [matches]);
  const visibleScorers = aliveOnly ? scorers.filter((s) => s.alive) : scorers;
  const alive = useMemo(() => (matches ? aliveTeamIds(matches) : null), [matches]);

  const played = (matches ?? []).filter((m) => m.state === 'post').length;
  const totalGoals = (matches ?? []).reduce(
    (sum, m) => sum + (m.homeScore ?? 0) + (m.awayScore ?? 0),
    0
  );
  const bronzeMatch = (matches ?? []).find((m) => m.round === 'bronze');
  const finalMatch = (matches ?? []).find((m) => m.round === 'final');
  const championId = finalMatch ? matchWinnerId(finalMatch) : null;
  const champion =
    championId && finalMatch
      ? championId === finalMatch.home.id
        ? finalMatch.home
        : finalMatch.away
      : null;

  // Auto-select the most interesting match once: live > next up > final.
  useEffect(() => {
    if (didAutoSelect.current || !matches) return;
    const pick = liveMatches[0] ?? nextMatch ?? finalMatch;
    if (pick) {
      setSelectedId(pick.id);
      didAutoSelect.current = true;
    }
  }, [matches, liveMatches, nextMatch, finalMatch]);

  const selectedMatch = (matches ?? []).find((m) => m.id === selectedId) ?? null;

  return (
    <main>
      <div className="page-bg" />

      <div className="container">
        <div className="page-header">
          <Breadcrumb current="World Cup Tracker" />
          <h1 className="section-title">
            <span className="gradient-text">World Cup 2026 Tracker</span>
          </h1>
          <p className="section-subtitle" style={{ marginBottom: 0 }}>
            Live bracket, scores, kickoff times (ET), venues, and odds — refreshed every minute from ESPN.
          </p>
        </div>

        <div className="wc-status-bar">
          {liveMatches.length > 0 && (
            <span className="wc-live-badge">
              ● {liveMatches.length} LIVE
            </span>
          )}
          {updatedAt && (
            <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              Updated {formatKickoffET(updatedAt)}
            </span>
          )}
          <button className="wc-refresh-btn" onClick={load}>Refresh</button>
          {error && (
            <span style={{ color: 'var(--accent-orange)', fontSize: '0.82rem' }}>
              Couldn&apos;t reach the scores feed ({error}) — retrying every minute
            </span>
          )}
        </div>

        {champion && (
          <div className="card card-accent-gold" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '1.6rem' }}>🏆</span>
            <Flag src={champion.logo} abbrev={champion.abbrev} size={32} />
            <span style={{ fontWeight: 800, fontSize: '1.15rem' }}>{champion.name} are World Champions</span>
          </div>
        )}

        {matches && (
          <div className="wc-chips">
            <div className="wc-chip">
              <span className="wc-chip-value">{played}<span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>/{matches.length}</span></span>
              <span className="wc-chip-label">Matches played</span>
            </div>
            <div className="wc-chip">
              <span className="wc-chip-value">{totalGoals}</span>
              <span className="wc-chip-label">Goals</span>
            </div>
            <div className="wc-chip">
              <span className="wc-chip-value">{alive ? alive.size : '—'}</span>
              <span className="wc-chip-label">Teams alive</span>
            </div>
            {nextMatch && (
              <div className="wc-chip">
                <span className="wc-chip-value" style={{ fontSize: '1.02rem' }}>
                  {nextMatch.home.abbrev} v {nextMatch.away.abbrev}
                </span>
                <span className="wc-chip-label">Next · {formatKickoffET(nextMatch.date, { withDate: true })}</span>
              </div>
            )}
          </div>
        )}

        {!matches && !error && (
          <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
            Loading the tournament…
          </div>
        )}

        {!matches && error && (
          <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <p style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Couldn&apos;t load live data</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Scores come straight from ESPN&apos;s public feed in your browser. Check your connection and hit refresh.
            </p>
          </div>
        )}

        {matches && (
          <>
            <section style={{ marginBottom: '1.8rem' }}>
              <h2 className="wc-section-heading">Knockout Bracket</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 0.8rem' }}>
                Round of 32 on the outer ring, spiraling in to the final at the center. Tap any match for
                kickoff time, venue, odds, scorers, and a bit about each country.
              </p>
              <CircularBracket matches={matches} selectedId={selectedId} onSelect={setSelectedId} />

              {selectedMatch && <MatchDetail match={selectedMatch} />}

              {bronzeMatch && (
                <button
                  className={`wc-today-card${bronzeMatch.id === selectedId ? ' wc-today-selected' : ''}`}
                  style={{ marginTop: '1rem' }}
                  onClick={() => setSelectedId(bronzeMatch.id)}
                >
                  <div className="wc-today-teams">
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 1 }}>3RD PLACE</span>
                    <Flag src={bronzeMatch.home.decided ? bronzeMatch.home.logo : ''} abbrev={bronzeMatch.home.abbrev} size={22} />
                    <span>{bronzeMatch.home.abbrev}</span>
                    <span className="wc-today-score">
                      {bronzeMatch.state === 'pre' ? formatKickoffET(bronzeMatch.date) : matchScoreLabel(bronzeMatch)}
                    </span>
                    <span>{bronzeMatch.away.abbrev}</span>
                    <Flag src={bronzeMatch.away.decided ? bronzeMatch.away.logo : ''} abbrev={bronzeMatch.away.abbrev} size={22} />
                  </div>
                </button>
              )}
            </section>

            {dayOptions.length > 0 && (
              <section style={{ marginBottom: '1.8rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.7rem' }}>
                  <h2 className="wc-section-heading" style={{ marginBottom: 0 }}>Matches</h2>
                  <div className="wc-day-tabs">
                    {dayOptions.map((day) => (
                      <button
                        key={day}
                        className={`wc-day-tab${day === activeDay ? ' wc-day-tab-active' : ''}`}
                        onClick={() => setDayTab(day)}
                      >
                        {dayLabel(day)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="wc-today-row">
                  {stripMatches.map((m) => (
                    <button
                      key={m.id}
                      className={`wc-today-card${m.id === selectedId ? ' wc-today-selected' : ''}`}
                      onClick={() => setSelectedId(m.id)}
                    >
                      <div className="wc-today-teams">
                        <Flag src={m.home.decided ? m.home.logo : ''} abbrev={m.home.abbrev} size={22} />
                        <span>{m.home.abbrev}</span>
                        <span className="wc-today-score">
                          {m.state === 'pre' ? formatKickoffET(m.date) : matchScoreLabel(m)}
                        </span>
                        <span>{m.away.abbrev}</span>
                        <Flag src={m.away.decided ? m.away.logo : ''} abbrev={m.away.abbrev} size={22} />
                      </div>
                      <div className="wc-today-sub">
                        {m.state === 'in' ? (
                          <span style={{ color: 'var(--accent-warm)', fontWeight: 700 }}>● {m.clock || 'LIVE'}</span>
                        ) : m.state === 'post' ? (
                          'FT'
                        ) : m.odds?.details ? (
                          `${m.odds.details}${m.odds.overUnder !== null ? ` · O/U ${m.odds.overUnder}` : ''}`
                        ) : (
                          ROUND_LABELS[m.round]
                        )}
                        {m.city ? ` · ${m.city}` : ''}
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {scorers.length > 0 && (
              <section style={{ marginBottom: '1.8rem' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', flexWrap: 'wrap' }}>
                  <h2 className="wc-section-heading">Golden Boot Race</h2>
                  <label className="wc-toggle">
                    <input
                      type="checkbox"
                      checked={aliveOnly}
                      onChange={(e) => setAliveOnly(e.target.checked)}
                    />
                    Only players still in contention
                  </label>
                </div>
                <div className="card" style={{ padding: '0.6rem 1.1rem' }}>
                  {visibleScorers.length === 0 && (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', padding: '0.6rem 0' }}>
                      No goals logged yet.
                    </p>
                  )}
                  {visibleScorers.map((s, i) => (
                    <div key={`${s.teamId}-${s.name}`} className="wc-scorer-row" style={{ opacity: s.alive ? 1 : 0.55 }}>
                      <span style={{ width: '1.4rem', color: 'var(--text-muted)', fontWeight: 700 }}>{i + 1}</span>
                      <Flag src={s.teamLogo} abbrev={s.teamAbbrev} size={22} />
                      <span style={{ fontWeight: 600 }}>{s.name}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                        {s.teamAbbrev}
                        {!s.alive ? ' · eliminated' : ''}
                      </span>
                      <span style={{ marginLeft: 'auto', fontWeight: 800 }}>
                        {s.goals}
                        {s.penalties > 0 && (
                          <span style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.8rem' }}>
                            {' '}({s.penalties}p)
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      <Footer />
    </main>
  );
}

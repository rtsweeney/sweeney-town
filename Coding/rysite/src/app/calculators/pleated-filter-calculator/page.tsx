'use client';

import Link from 'next/link';
import Script from 'next/script';
import { useEffect, useState } from 'react';

declare global {
  interface Window {
    Chart: new (ctx: CanvasRenderingContext2D, cfg: unknown) => { destroy: () => void };
  }
}

const CALC_CSS = `
#pfc-root {
  --ink: var(--text-primary, #1a1a2e);
  --paper: var(--surface-raised, #ffffff);
  --paper-deep: var(--surface, #f4f6fb);
  --grid: var(--border, rgba(108, 92, 231, 0.18));
  --accent: var(--accent-primary, #6c5ce7);
  --accent-deep: #5a4fce;
  --moss: var(--text-secondary, #4a4a68);
  --rule: var(--border, rgba(108, 92, 231, 0.18));
  --warn: var(--accent-orange, #e17055);

  color: var(--ink);
  font-family: var(--font-sans, system-ui, -apple-system, sans-serif);
  font-size: 14px;
  line-height: 1.55;
  background: transparent;
  max-width: var(--max-width, 1200px);
  margin: 0 auto;
  padding: 0 2rem 3rem;
}
#pfc-root *, #pfc-root *::before, #pfc-root *::after { box-sizing: border-box; }

#pfc-root .pfc-breadcrumb {
  padding: 0.75rem 0 1rem;
  font-size: 0.85rem;
  color: var(--text-muted, #8888a4);
}
#pfc-root .pfc-breadcrumb a {
  color: var(--accent-secondary, #00b894);
  text-decoration: none;
  font-weight: 600;
}
#pfc-root .pfc-breadcrumb a:hover { color: var(--accent); }

#pfc-root header {
  padding: 1rem 0 2rem;
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: end;
  gap: 1.5rem;
  background: transparent;
  border-bottom: 1px solid var(--border-subtle, rgba(0,0,0,0.06));
  margin-bottom: 1.75rem;
}
#pfc-root .title-block h1 {
  font-family: inherit;
  font-weight: 800;
  font-style: normal;
  font-size: clamp(1.8rem, 4vw, 2.5rem);
  line-height: 1.1;
  margin: 0;
  letter-spacing: -0.02em;
  color: var(--ink);
}
#pfc-root .title-block h1 .accent {
  background: linear-gradient(135deg, var(--accent-primary, #6c5ce7), var(--accent-warm, #e84393));
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  font-weight: 800;
}
#pfc-root .title-block h1 em {
  font-style: italic;
  font-weight: 600;
  color: var(--moss);
}
#pfc-root .title-block p {
  margin: 0.5rem 0 0;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--moss);
  font-weight: 600;
}
#pfc-root .meta-block {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  text-align: right;
  line-height: 1.7;
  color: var(--moss);
  font-weight: 500;
}
#pfc-root .meta-block strong {
  display: block;
  color: var(--ink);
  font-weight: 700;
  margin-bottom: 0.25rem;
}

#pfc-root main {
  display: grid;
  grid-template-columns: minmax(320px, 400px) 1fr;
  gap: 1.5rem;
}
#pfc-root aside.inputs {
  background: var(--paper);
  border: 1px solid var(--grid);
  border-radius: var(--radius-lg, 20px);
  padding: 1.5rem 1.5rem 2rem;
  box-shadow: 0 4px 24px rgba(108, 92, 231, 0.06);
  align-self: start;
  position: sticky;
  top: calc(var(--nav-height, 70px) + 1rem);
}
#pfc-root section.outputs {
  padding: 0;
  background: transparent;
  min-width: 0;
}

#pfc-root .sec { margin-bottom: 1.5rem; }
#pfc-root .sec:last-child { margin-bottom: 0; }
#pfc-root .sec-hd {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.85rem;
  padding-bottom: 0.4rem;
  border-bottom: 1px solid var(--grid);
}
#pfc-root .sec-hd .num {
  background: linear-gradient(135deg, var(--accent), var(--accent-warm, #e84393));
  color: #fff;
  font-size: 0.65rem;
  padding: 0.2rem 0.45rem;
  border-radius: 4px;
  font-weight: 700;
  letter-spacing: 0.08em;
}
#pfc-root .sec-hd h2 {
  font-family: inherit;
  font-style: normal;
  font-weight: 700;
  font-size: 1rem;
  margin: 0;
  letter-spacing: -0.01em;
  color: var(--ink);
}

#pfc-root .row {
  display: grid;
  grid-template-columns: 1fr 110px 44px;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--border-subtle, rgba(0,0,0,0.06));
}
#pfc-root .row:last-child { border-bottom: none; }
#pfc-root .row label {
  font-size: 0.8rem;
  color: var(--ink);
  font-weight: 500;
  line-height: 1.3;
}
#pfc-root .row label .sub {
  display: block;
  font-size: 0.65rem;
  color: var(--text-muted, #8888a4);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-top: 2px;
  font-weight: 500;
}
#pfc-root .row input[type="number"] {
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 500;
  padding: 0.4rem 0.6rem;
  border: 1px solid var(--grid);
  border-radius: var(--radius-sm, 6px);
  background: var(--paper-deep);
  color: var(--ink);
  text-align: right;
  outline: none;
  transition: all 0.15s ease;
}
#pfc-root .row input[type="number"]:focus {
  border-color: var(--accent);
  background: var(--paper);
  box-shadow: 0 0 0 3px rgba(108, 92, 231, 0.15);
}
#pfc-root .row .unit {
  font-size: 0.7rem;
  color: var(--moss);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
}
#pfc-root .input-note {
  font-size: 0.7rem;
  color: var(--moss);
  font-style: italic;
  line-height: 1.45;
  border-left: 2px solid var(--accent-secondary, #00b894);
  padding: 0.35rem 0.6rem;
  background: rgba(0, 184, 148, 0.05);
  border-radius: 0 var(--radius-sm, 6px) var(--radius-sm, 6px) 0;
  margin-top: 0.5rem;
}

#pfc-root .toggle-row {
  display: flex;
  gap: 0;
  margin-bottom: 0.6rem;
  border: 1px solid var(--grid);
  border-radius: var(--radius-sm, 6px);
  overflow: hidden;
  background: var(--paper-deep);
}
#pfc-root .toggle-row button {
  flex: 1;
  font-family: inherit;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 0.45rem 0.5rem;
  background: transparent;
  border: none;
  border-right: 1px solid var(--grid);
  cursor: pointer;
  color: var(--moss);
  font-weight: 600;
  transition: all 0.15s ease;
}
#pfc-root .toggle-row button:last-child { border-right: none; }
#pfc-root .toggle-row button.active {
  background: linear-gradient(135deg, var(--accent), var(--accent-deep));
  color: #fff;
}
#pfc-root .toggle-row button:not(.active):hover {
  background: rgba(108, 92, 231, 0.08);
  color: var(--ink);
}

#pfc-root .out-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.6rem;
  margin-bottom: 1.5rem;
  background: transparent;
}
#pfc-root .out-cell {
  padding: 0.7rem 0.85rem;
  border: 1px solid var(--grid);
  border-radius: var(--radius-md, 12px);
  background: var(--paper);
  position: relative;
  min-height: 0;
}
#pfc-root .out-cell .lbl {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--moss);
  margin-bottom: 0.3rem;
  font-weight: 600;
}
#pfc-root .out-cell .val {
  font-family: inherit;
  font-weight: 700;
  font-style: normal;
  font-size: 1.25rem;
  line-height: 1.1;
  color: var(--ink);
  letter-spacing: -0.01em;
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 0.3rem;
}
#pfc-root .out-cell .unit-s {
  font-family: inherit;
  font-style: normal;
  font-weight: 500;
  font-size: 0.7rem;
  color: var(--moss);
  letter-spacing: 0.04em;
  align-self: center;
}
#pfc-root .out-cell.hero {
  background: linear-gradient(135deg, var(--accent), var(--accent-warm, #e84393));
  color: #fff;
  border-color: transparent;
  grid-column: span 2;
  box-shadow: 0 6px 24px rgba(108, 92, 231, 0.25);
}
#pfc-root .out-cell.hero .lbl { color: rgba(255,255,255,0.85); }
#pfc-root .out-cell.hero .val { color: #fff; font-size: 1.75rem; }
#pfc-root .out-cell.hero .unit-s { color: rgba(255,255,255,0.85); }
#pfc-root .out-cell.accent-cell {
  background: linear-gradient(135deg, var(--accent-secondary, #00b894), #00a380);
  color: #fff;
  border-color: transparent;
  box-shadow: 0 4px 16px rgba(0, 184, 148, 0.18);
}
#pfc-root .out-cell.accent-cell .lbl { color: rgba(255,255,255,0.85); }
#pfc-root .out-cell.accent-cell .val { color: #fff; font-size: 0.88rem; gap: 0.3rem; flex-wrap: nowrap; }
#pfc-root .out-cell.accent-cell .unit-s { color: rgba(255,255,255,0.9); }
#pfc-root .out-cell.hero .val { gap: 0.45rem; }
#pfc-root .out-cell.hero .val .alt-unit,
#pfc-root .out-cell.accent-cell .val .alt-unit {
  color: inherit;
  opacity: 0.85;
  font-weight: 600;
}

#pfc-root .breakdown {
  margin-bottom: 1.5rem;
  border: 1px solid var(--grid);
  border-radius: var(--radius-md, 12px);
  background: var(--paper);
  padding: 1.1rem 1.25rem;
  box-shadow: 0 2px 12px rgba(108, 92, 231, 0.04);
}
#pfc-root .breakdown-hd {
  font-family: inherit;
  font-style: normal;
  font-size: 0.95rem;
  font-weight: 700;
  margin-bottom: 0.85rem;
  letter-spacing: -0.01em;
  color: var(--ink);
}
#pfc-root .bar-container {
  display: flex;
  height: 24px;
  width: 100%;
  border-radius: 6px;
  margin-bottom: 0.85rem;
  overflow: hidden;
  background: var(--paper-deep);
}
#pfc-root .bar-seg {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 0.65rem;
  font-weight: 600;
  transition: width 0.3s ease;
  overflow: hidden;
  white-space: nowrap;
  letter-spacing: 0.02em;
}
#pfc-root .legend {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.5rem;
  font-size: 0.78rem;
}
#pfc-root .legend-item {
  display: grid;
  grid-template-columns: 14px 1fr auto;
  align-items: center;
  gap: 0.7rem;
  padding: 0.55rem 0.75rem;
  border: 1px solid var(--grid);
  border-radius: 8px;
  background: var(--paper-deep, rgba(0,0,0,0.02));
}
#pfc-root .legend-swatch {
  width: 14px;
  height: 14px;
  border-radius: 3px;
  flex-shrink: 0;
  align-self: start;
  margin-top: 2px;
}
#pfc-root .legend-item .ltext { display: flex; flex-direction: column; gap: 0.15rem; min-width: 0; }
#pfc-root .legend-item .lname { color: var(--ink); font-weight: 600; line-height: 1.2; }
#pfc-root .legend-item .ldesc {
  color: var(--moss);
  font-size: 0.7rem;
  line-height: 1.35;
  font-weight: 400;
}
#pfc-root .legend-item .lnums { text-align: right; display: flex; flex-direction: column; gap: 0.1rem; }
#pfc-root .legend-item .lval {
  font-weight: 700;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
  font-size: 0.85rem;
}
#pfc-root .legend-item .lval .lu {
  font-weight: 500;
  color: var(--moss);
  font-size: 0.7rem;
  margin-left: 0.15rem;
}
#pfc-root .legend-item .lpct {
  color: var(--moss);
  font-size: 0.7rem;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

#pfc-root .chart-box {
  border: 1px solid var(--grid);
  border-radius: var(--radius-md, 12px);
  background: var(--paper);
  padding: 1.1rem 1.25rem 1rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 12px rgba(108, 92, 231, 0.04);
}
#pfc-root .chart-hd {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 0.7rem;
  gap: 0.75rem;
  flex-wrap: wrap;
}
#pfc-root .chart-hd h3 {
  font-family: inherit;
  font-style: normal;
  font-size: 0.95rem;
  font-weight: 700;
  margin: 0;
  letter-spacing: -0.01em;
  color: var(--ink);
}
#pfc-root .chart-hd .chart-sub {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--moss);
  font-weight: 600;
}
#pfc-root .chart-wrap { position: relative; height: 340px; }

#pfc-root .note-strip {
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  font-size: 0.8rem;
  line-height: 1.55;
  border-left: 3px solid var(--accent);
  background: rgba(108, 92, 231, 0.06);
  border-radius: 0 var(--radius-md, 12px) var(--radius-md, 12px) 0;
  color: var(--ink);
}
#pfc-root .note-strip.warn {
  border-left-color: var(--warn);
  background: rgba(225, 112, 85, 0.08);
}
#pfc-root .note-strip .nlbl {
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.7rem;
  margin-right: 0.4rem;
  color: var(--accent);
}
#pfc-root .note-strip.warn .nlbl { color: var(--warn); }

#pfc-root footer {
  border-top: 1px solid var(--border-subtle, rgba(0,0,0,0.06));
  padding: 1.25rem 0 0;
  margin-top: 2rem;
  font-size: 0.75rem;
  letter-spacing: 0.05em;
  color: var(--moss);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: transparent;
  flex-wrap: wrap;
  gap: 0.5rem;
}
#pfc-root footer em {
  font-family: inherit;
  font-style: italic;
  font-weight: 600;
  color: var(--ink);
  letter-spacing: 0;
  font-size: 0.8rem;
}

#pfc-root .share-bar {
  margin-top: 1.5rem;
  padding: 1.15rem 1.4rem;
  border: 1px solid var(--grid);
  border-radius: var(--radius-md, 12px);
  background: var(--paper);
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  box-shadow: 0 2px 12px rgba(108, 92, 231, 0.04);
}
#pfc-root .share-bar .share-txt { flex: 1; min-width: 200px; }
#pfc-root .share-bar .share-title {
  font-weight: 700;
  color: var(--ink);
  font-size: 0.95rem;
  letter-spacing: -0.01em;
}
#pfc-root .share-bar .share-desc {
  font-size: 0.75rem;
  color: var(--moss);
  margin-top: 0.2rem;
  line-height: 1.45;
}
#pfc-root .share-btn {
  font-family: inherit;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 0.6rem 1.25rem;
  background: linear-gradient(135deg, var(--accent), var(--accent-deep));
  color: #fff;
  border: none;
  border-radius: var(--radius-sm, 6px);
  cursor: pointer;
  font-weight: 700;
  transition: all 0.2s ease;
  white-space: nowrap;
}
#pfc-root .share-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(108, 92, 231, 0.3);
}
#pfc-root .share-status {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 600;
  color: var(--moss);
  flex-basis: 100%;
  min-height: 0.9rem;
}
#pfc-root .share-status.ok { color: var(--accent-secondary, #00b894); }
#pfc-root .share-status.err { color: var(--warn); }

#pfc-root .fe-section {
  margin-top: 1.5rem;
  border: 1px solid var(--grid);
  border-radius: var(--radius-md, 12px);
  background: var(--paper);
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(108, 92, 231, 0.04);
}
#pfc-root .fe-toggle {
  padding: 1rem 1.25rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  background: linear-gradient(135deg, var(--accent), var(--accent-deep));
  color: #fff;
  user-select: none;
}
#pfc-root .fe-toggle h3 {
  font-family: inherit;
  font-style: normal;
  font-weight: 700;
  font-size: 1rem;
  margin: 0;
  letter-spacing: -0.01em;
}
#pfc-root .fe-toggle h3 .fe-sub {
  display: block;
  font-family: inherit;
  font-style: normal;
  font-weight: 500;
  font-size: 0.7rem;
  color: rgba(255,255,255,0.85);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-top: 0.3rem;
}
#pfc-root .fe-toggle .fe-caret {
  font-family: inherit;
  font-style: normal;
  font-size: 1.5rem;
  transition: transform 0.2s;
  font-weight: 300;
}
#pfc-root .fe-section.open .fe-caret { transform: rotate(90deg); }
#pfc-root .fe-body { display: none; padding: 1.25rem 1.25rem 1.5rem; }
#pfc-root .fe-section.open .fe-body { display: block; }

#pfc-root .fe-paste-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1.1rem;
}
#pfc-root .fe-paste-box { display: flex; flex-direction: column; }
#pfc-root .fe-paste-box label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--moss);
  margin-bottom: 0.4rem;
  font-weight: 700;
}
#pfc-root .fe-paste-box textarea {
  font-family: ui-monospace, 'SF Mono', Menlo, monospace;
  font-size: 0.7rem;
  line-height: 1.45;
  padding: 0.6rem 0.7rem;
  border: 1px solid var(--grid);
  border-radius: var(--radius-sm, 6px);
  background: var(--paper-deep);
  color: var(--ink);
  resize: vertical;
  min-height: 140px;
  outline: none;
  transition: all 0.15s ease;
}
#pfc-root .fe-paste-box textarea:focus {
  border-color: var(--accent);
  background: var(--paper);
  box-shadow: 0 0 0 3px rgba(108, 92, 231, 0.15);
}
#pfc-root .fe-vel-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.4rem;
  padding: 0.4rem 0.6rem;
  background: var(--paper-deep);
  border: 1px solid var(--grid);
  border-radius: var(--radius-sm, 6px);
}
#pfc-root .fe-vel-row .fe-vel-lbl {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--moss);
  flex: 1;
  font-weight: 600;
}
#pfc-root .fe-vel-row input {
  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 500;
  padding: 0.3rem 0.5rem;
  border: 1px solid var(--grid);
  border-radius: var(--radius-sm, 6px);
  background: var(--paper);
  color: var(--ink);
  text-align: right;
  outline: none;
  width: 90px;
  transition: all 0.15s ease;
}
#pfc-root .fe-vel-row input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px rgba(108, 92, 231, 0.15);
}
#pfc-root .fe-vel-row .fe-vel-unit {
  font-size: 0.7rem;
  color: var(--moss);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  min-width: 28px;
  font-weight: 600;
}
#pfc-root .fe-actions {
  display: flex;
  gap: 0.6rem;
  align-items: center;
  margin-bottom: 1.1rem;
  flex-wrap: wrap;
}
#pfc-root .fe-btn {
  font-family: inherit;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 0.55rem 1.1rem;
  background: linear-gradient(135deg, var(--accent), var(--accent-deep));
  color: #fff;
  border: none;
  border-radius: var(--radius-sm, 6px);
  cursor: pointer;
  font-weight: 700;
  transition: all 0.2s ease;
}
#pfc-root .fe-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(108, 92, 231, 0.3);
}
#pfc-root .fe-btn.secondary {
  background: var(--paper);
  color: var(--ink);
  border: 1px solid var(--grid);
}
#pfc-root .fe-btn.secondary:hover {
  background: var(--paper-deep);
  border-color: var(--accent);
  box-shadow: none;
  transform: none;
}
#pfc-root .fe-parse-status {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--moss);
  font-weight: 600;
}
#pfc-root .fe-parse-status.ok { color: var(--accent-secondary, #00b894); }
#pfc-root .fe-parse-status.err { color: var(--warn); }

#pfc-root .fe-summary {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.6rem;
  margin-bottom: 1.1rem;
}
#pfc-root .fe-cell {
  padding: 0.7rem 0.85rem;
  border: 1px solid var(--grid);
  border-radius: var(--radius-md, 12px);
  background: var(--paper);
}
#pfc-root .fe-cell.highlight {
  background: linear-gradient(135deg, var(--accent), var(--accent-warm, #e84393));
  color: #fff;
  border-color: transparent;
  box-shadow: 0 4px 16px rgba(108, 92, 231, 0.22);
}
#pfc-root .fe-cell .fe-cell-lbl {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--moss);
  margin-bottom: 0.3rem;
  font-weight: 600;
}
#pfc-root .fe-cell.highlight .fe-cell-lbl { color: rgba(255,255,255,0.85); }
#pfc-root .fe-cell .fe-cell-val {
  font-family: inherit;
  font-style: normal;
  font-weight: 700;
  font-size: 1.05rem;
  line-height: 1.2;
  color: var(--ink);
}
#pfc-root .fe-cell.highlight .fe-cell-val { color: #fff; }
#pfc-root .fe-cell .fe-cell-det {
  font-size: 0.7rem;
  color: var(--moss);
  font-family: inherit;
  margin-top: 0.3rem;
}
#pfc-root .fe-cell.highlight .fe-cell-det { color: rgba(255,255,255,0.85); }

#pfc-root .fe-chart-box {
  border: 1px solid var(--grid);
  border-radius: var(--radius-md, 12px);
  background: var(--paper);
  padding: 1rem 1.1rem;
  margin-bottom: 1rem;
}
#pfc-root .fe-chart-wrap { position: relative; height: 360px; }

/* ASHRAE 52.2 composite-efficiency entry — shown only in prefilter mode. */
#pfc-root .fe-ashrae-block { display: none; margin-top: 0.4rem; }
#pfc-root #fe-section.fe-ashrae .fe-ashrae-block { display: block; }
#pfc-root #fe-section.fe-ashrae .fe-paste-textarea { display: none; }
#pfc-root .fe-erow {
  display: grid;
  grid-template-columns: 1fr 88px 22px;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.4rem;
  padding: 0.4rem 0.6rem;
  background: var(--paper-deep);
  border: 1px solid var(--grid);
  border-radius: var(--radius-sm, 6px);
}
#pfc-root .fe-erow .fe-elbl {
  font-size: 0.75rem;
  color: var(--ink);
  font-weight: 700;
  line-height: 1.2;
}
#pfc-root .fe-erow .fe-elbl .fe-erange {
  display: block;
  font-size: 0.6rem;
  text-transform: none;
  letter-spacing: 0.02em;
  color: var(--moss);
  font-weight: 500;
  margin-top: 2px;
}
#pfc-root .fe-erow input {
  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 500;
  padding: 0.3rem 0.5rem;
  border: 1px solid var(--grid);
  border-radius: var(--radius-sm, 6px);
  background: var(--paper);
  color: var(--ink);
  text-align: right;
  outline: none;
  transition: all 0.15s ease;
}
#pfc-root .fe-erow input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px rgba(108, 92, 231, 0.15);
}
#pfc-root .fe-erow .fe-eunit {
  font-size: 0.72rem;
  color: var(--moss);
  font-weight: 600;
}
#pfc-root .fe-ashrae-note {
  font-size: 0.65rem;
  color: var(--moss);
  font-style: italic;
  line-height: 1.4;
  margin-top: 0.5rem;
}

/* Projected MERV rating banner (prefilter mode). */
#pfc-root .fe-merv-box {
  display: flex;
  align-items: center;
  gap: 1.1rem;
  padding: 0.9rem 1.1rem;
  margin-bottom: 1.1rem;
  border: 1px solid transparent;
  border-radius: var(--radius-md, 12px);
  background: linear-gradient(135deg, var(--accent-secondary, #00b894), #00a380);
  color: #fff;
  box-shadow: 0 4px 16px rgba(0, 184, 148, 0.18);
}
#pfc-root .fe-merv-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 84px;
  padding: 0.4rem 0.6rem;
  background: rgba(255, 255, 255, 0.16);
  border-radius: var(--radius-sm, 6px);
  line-height: 1;
}
#pfc-root .fe-merv-badge .fe-merv-lbl {
  font-size: 0.6rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-weight: 700;
  opacity: 0.9;
}
#pfc-root .fe-merv-badge .fe-merv-val {
  font-size: 1.9rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  margin-top: 0.15rem;
}
#pfc-root .fe-merv-detail { min-width: 0; }
#pfc-root .fe-merv-detail .fe-merv-desc {
  font-size: 0.78rem;
  font-weight: 600;
  line-height: 1.35;
}
#pfc-root .fe-merv-detail .fe-merv-e {
  font-size: 0.72rem;
  margin-top: 0.35rem;
  font-variant-numeric: tabular-nums;
  opacity: 0.92;
}
#pfc-root .fe-merv-detail .fe-merv-ref {
  font-size: 0.62rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-top: 0.35rem;
  opacity: 0.8;
  font-weight: 600;
}

#pfc-root .fe-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.75rem;
  font-family: ui-monospace, 'SF Mono', Menlo, monospace;
}
#pfc-root .fe-table th, #pfc-root .fe-table td {
  padding: 0.4rem 0.6rem;
  text-align: right;
  border-bottom: 1px solid var(--border-subtle, rgba(0,0,0,0.06));
}
#pfc-root .fe-table th {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--moss);
  font-weight: 700;
  border-bottom: 2px solid var(--grid);
  text-align: right;
  font-family: inherit;
}
#pfc-root .fe-table th:first-child, #pfc-root .fe-table td:first-child { text-align: left; }
#pfc-root .fe-table tr.hero-row td {
  background: rgba(108, 92, 231, 0.08);
  font-weight: 700;
  color: var(--accent);
}

@media (max-width: 720px) {
  #pfc-root .fe-paste-grid { grid-template-columns: 1fr; }
  #pfc-root .fe-summary { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 900px) {
  #pfc-root main { grid-template-columns: 1fr; }
  #pfc-root aside.inputs { position: static; }
  #pfc-root header { grid-template-columns: 1fr; }
  #pfc-root .meta-block { text-align: left; }
  #pfc-root .out-cell.hero { grid-column: 1 / -1; }
  #pfc-root .out-cell.wide { grid-column: 1 / -1; }
}
@media (max-width: 520px) {
  #pfc-root { padding-left: 1rem; padding-right: 1rem; }
  #pfc-root .row { grid-template-columns: 1fr 90px 40px; }
  #pfc-root .fe-summary { grid-template-columns: 1fr; }
}
`;

// ASHRAE 52.2-2017 composite particle-size ranges (µm). In prefilter mode the
// user enters one efficiency per range; each range is charted at the diameter
// of a sphere whose volume equals the mean of the two range-endpoint sphere
// volumes (the "volume-mean diameter").
const ASHRAE_BINS = [
  { key: 'e1', label: 'E1', lo: 0.3, hi: 1.0 },
  { key: 'e2', label: 'E2', lo: 1.0, hi: 3.0 },
  { key: 'e3', label: 'E3', lo: 3.0, hi: 10.0 },
] as const;

// Volume-mean diameter: since a sphere's volume ∝ D³, the diameter whose volume
// is the average of the endpoint volumes is the cube root of the mean of the
// endpoint cubes.
function volumeMeanDiameter(lo: number, hi: number) {
  return Math.cbrt((lo * lo * lo + hi * hi * hi) / 2);
}

// Default composite efficiencies (%) — the MERV 13 threshold row of ASHRAE
// 52.2-2017 Table 12-1. Both velocity columns start equal so the projection to
// V₄ reproduces these values (local N = 0) and reports MERV 13 out of the box;
// vary one column to introduce a velocity dependence.
const ASHRAE_DEFAULTS: Record<'a' | 'b', Record<string, number>> = {
  a: { e1: 50, e2: 85, e3: 90 },
  b: { e1: 50, e2: 85, e3: 90 },
};

export default function PleatedFilterCalculatorPage() {
  const [chartLoaded, setChartLoaded] = useState(false);

  useEffect(() => {
    if (!chartLoaded) return;
    if (typeof window === 'undefined') return;
    if (!window.Chart) return;

    // ===== CALCULATOR LOGIC =====
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const Chart: any = (window as any).Chart;

    const S = {
      units: 'imperial' as 'imperial' | 'metric',
      mediaMode: 'dp' as 'dp' | 'ab' | 'perm',
      flowMode: 'cfm' as 'face' | 'cfm',
      pleatMode: 'ppi' as 'count' | 'ppi',
    };

    function getHead(rho_lbft3: number, V_fpm: number) {
      const V_fps = V_fpm / 60;
      const psf = (rho_lbft3 * V_fps * V_fps) / (2 * 32.174);
      return psf / 5.2023;
    }

    function K_contraction(A_small: number, A_large: number) {
      const r = A_small / A_large;
      return 0.5 * Math.pow(1 - r, 0.75);
    }
    function K_expansion(A_small: number, A_large: number) {
      const r = A_small / A_large;
      return Math.pow(1 - r, 2);
    }
    function K_grating(blockagePct: number) {
      const Afree = 1 - blockagePct / 100;
      if (Afree <= 0.0001) return 10000;
      return (1.707 - Afree) / (Afree * Afree);
    }

    function geometry(o: { F_H: number; F_W: number; P_D: number; PPI: number; M_T: number }) {
      const P_L = o.P_D;
      const P_H = o.F_H;
      const P_O = o.F_W / o.PPI;
      const sinArg = (0.5 * P_O) / P_L;
      const beta = Math.min(0.999, Math.max(0.001, sinArg));
      const beta_angle_rad = Math.asin(beta);
      const gamma = Math.PI / 2 - beta_angle_rad;
      const P_T = 2 * Math.sin(gamma) * o.M_T;
      const A_T = 2 * o.M_T * gamma;
      const mediaArea = o.PPI * P_H * (2 * P_L - A_T);
      return { P_L, P_H, P_O, beta, beta_angle_rad, gamma, P_T, A_T, mediaArea };
    }

    function K_P(o: { F_H: number; P_D: number; beta: number }) {
      const F_D = o.P_D;
      const eta = 0.05 * (o.F_H / F_D);
      const chi = Math.pow(1 / o.beta, 4 / 3);
      return eta * chi;
    }

    function computeDeltaP(inp: any) {
      const { F_H, F_W, P_D, PPI, M_T, A, B, gratingPct, V_face, rho, kpCal = 1.0 } = inp;
      const g = geometry({ F_H, F_W, P_D, PPI, M_T });
      const A1 = F_H * F_W;
      const A2 = A1 * (1 - gratingPct / 100);
      const A3 = F_H * F_W - PPI * g.P_T * g.P_H;
      const A4 = g.mediaArea;
      const Q = V_face * A1;
      const V2 = Q / A2;
      const V3 = Q / A3;
      const V4 = Q / A4;
      const K_G = K_grating(gratingPct);
      let K_C: number, K_E: number;
      if (A3 < A2) {
        K_C = K_contraction(A3, A2);
        K_E = K_expansion(A3, A2);
      } else {
        K_C = K_expansion(A2, A3);
        K_E = K_contraction(A2, A3);
      }
      const K_Pcoef_raw = K_P({ F_H, P_D, beta: g.beta });
      const K_Pcoef = kpCal * K_Pcoef_raw;
      const head2 = getHead(rho, V2);
      const head3 = getHead(rho, V3);
      const dp_grating = 2 * K_G * head2;
      const dp_pleatTip = (K_C + K_E) * head3;
      const dp_pleat = K_Pcoef * head3;
      const dp_media_visc = A * V4;
      const dp_media_inert = B * V4 * V4;
      const dp_total = dp_grating + dp_pleatTip + dp_pleat + dp_media_visc + dp_media_inert;
      return {
        dp_total, dp_grating, dp_pleatTip, dp_pleat, dp_media_visc, dp_media_inert,
        dp_media: dp_media_visc + dp_media_inert,
        A1, A2, A3, A4, V2, V3, V4, Q,
        K_G, K_C, K_E, K_Pcoef, K_Pcoef_raw, kpCal,
        ...g,
      };
    }

    function deriveAB(dp_ref: number, V_ref: number, linFrac: number) {
      const A = (linFrac * dp_ref) / V_ref;
      const B = ((1 - linFrac) * dp_ref) / (V_ref * V_ref);
      return { A, B };
    }

    function toImperial(val: number, type: string) {
      if (S.units === 'imperial') return val;
      switch (type) {
        case 'len': return val / 25.4;
        case 'mt': return val / 25.4;
        case 'dp': return val / 248.84;
        case 'vel': return val / 0.00508;
        case 'vol': return val / 1.699;
        case 'rho': return val / 16.018;
        case 'area': return val * 10.7639;
        case 'smlen': return val / 25.4;
        default: return val;
      }
    }
    function fromImperial(val: number, type: string) {
      if (S.units === 'imperial') return val;
      switch (type) {
        case 'len': return val * 25.4;
        case 'mt': return val * 25.4;
        case 'dp': return val * 248.84;
        case 'vel': return val * 0.00508;
        case 'vol': return val * 1.699;
        case 'rho': return val * 16.018;
        case 'area': return val / 10.7639;
        case 'smlen': return val * 25.4;
        default: return val;
      }
    }

    const UNIT_LABELS: Record<string, Record<string, string>> = {
      imperial: { len: 'in', mt: 'in', dp: 'inWC', vel: 'fpm', vol: 'CFM', rho: 'lb/ft³', area: 'ft²', smlen: 'in' },
      metric: { len: 'mm', mt: 'mm', dp: 'Pa', vel: 'm/s', vol: 'm³/h', rho: 'kg/m³', area: 'm²', smlen: 'mm' },
    };

    const DEFAULTS: Record<string, Record<string, number>> = {
      imperial: {
        F_H: 24.016, F_W: 24.016, P_D: 0.984, PLEAT_COUNT: 25, PPI: 5.0, M_T: 0.015,
        M_DP: 2.5, LIN_FRAC: 0.99, M_PERM: 85, LIN_FRAC_PERM: 1.0,
        A_CONST: -0.001325, B_CONST: 9.814e-6,
        GRATING: 22.5, V_FACE: 527, Q_VOL: 2000, RHO: 0.0725, KP_CAL: 1.0,
      },
      metric: {
        F_H: 610, F_W: 610, P_D: 25, PLEAT_COUNT: 25, PPI: 5.0, M_T: 0.015,
        M_DP: 2.5, LIN_FRAC: 0.99, M_PERM: 85, LIN_FRAC_PERM: 1.0,
        A_CONST: -0.001325, B_CONST: 9.814e-6,
        GRATING: 22.5, V_FACE: 2.68, Q_VOL: 3400, RHO: 1.161, KP_CAL: 1.0,
      },
    };

    function readInputs() {
      const $ = (id: string) => parseFloat((document.getElementById(id) as HTMLInputElement).value);
      let F_H = $('F_H'), F_W = $('F_W'), P_D = $('P_D');
      const M_T = $('M_T');
      const gratingPct = $('GRATING');
      let rho = $('RHO');
      F_H = toImperial(F_H, 'len');
      F_W = toImperial(F_W, 'len');
      P_D = toImperial(P_D, 'len');
      // M_T is always entered in inches regardless of unit system
      rho = toImperial(rho, 'rho');

      let PLEAT_COUNT: number;
      if (S.pleatMode === 'count') {
        PLEAT_COUNT = Math.max(1, Math.round($('PLEAT_COUNT')));
      } else {
        const ppi = Math.max(0.01, $('PPI'));
        PLEAT_COUNT = Math.max(1, Math.round(ppi * F_W));
      }

      let V_face: number;
      if (S.flowMode === 'face') {
        V_face = toImperial($('V_FACE'), 'vel');
      } else {
        const Q = toImperial($('Q_VOL'), 'vol');
        const face_ft2 = (F_H * F_W) / 144;
        V_face = Q / face_ft2;
      }

      let A: number, B: number;
      if (S.mediaMode === 'dp') {
        const dp_ref_mmWC = $('M_DP');
        const dp_ref_in = dp_ref_mmWC * 0.0393701;
        const V_ref_fpm = 10.5;
        const linFrac = Math.min(1, Math.max(0, $('LIN_FRAC')));
        ({ A, B } = deriveAB(dp_ref_in, V_ref_fpm, linFrac));
      } else if (S.mediaMode === 'perm') {
        const perm_Lm2s = Math.max(0.001, $('M_PERM'));
        const V_ref_ms = perm_Lm2s / 1000;
        const V_ref_fpm = V_ref_ms * 196.85;
        const dp_ref_in = 125 / 248.84;
        const linFrac = Math.min(1, Math.max(0, $('LIN_FRAC_PERM')));
        ({ A, B } = deriveAB(dp_ref_in, V_ref_fpm, linFrac));
      } else {
        A = $('A_CONST');
        B = $('B_CONST');
      }

      const kpCalRaw = parseFloat((document.getElementById('KP_CAL') as HTMLInputElement).value);
      const kpCal = isFinite(kpCalRaw) && kpCalRaw > 0 ? kpCalRaw : 1.0;

      return { F_H, F_W, P_D, PPI: PLEAT_COUNT, M_T, A, B, gratingPct, V_face, rho, kpCal };
    }

    function fmt(v: number, digits = 3) {
      if (!isFinite(v)) return '—';
      const abs = Math.abs(v);
      if (abs === 0) return '0';
      if (abs < 0.001) return v.toExponential(2);
      if (abs < 10) return v.toFixed(digits);
      if (abs < 100) return v.toFixed(2);
      if (abs < 10000) return v.toFixed(1);
      return v.toFixed(0);
    }

    let chart: any = null;
    const COLORS = {
      grating: '#00b894',
      pleatTip: '#fdcb6e',
      pleat: '#6c5ce7',
      media_v: '#0984e3',
      media_i: '#e84393',
    };

    function render() {
      const inp = readInputs();
      const r = computeDeltaP(inp);
      const dp_imp = r.dp_total;
      const dp_pa = dp_imp * 248.84;
      const dp_inwc = dp_imp;
      (document.getElementById('o_dpT') as HTMLElement).innerHTML =
        `${fmt(dp_pa, 1)} <span class="alt-unit">Pa</span> / ${fmt(dp_inwc, 3)} <span class="alt-unit">inWC</span>`;
      const area_ft2 = r.A4 / 144;
      const area_m2 = area_ft2 / 10.7639;
      (document.getElementById('o_area') as HTMLElement).innerHTML =
        `${fmt(area_m2, 2)} <span class="alt-unit">m²</span> / ${fmt(area_ft2, 2)} <span class="alt-unit">ft²</span>`;
      (document.getElementById('o_beta') as HTMLElement).textContent = fmt((r.beta * 180) / Math.PI, 2);
      (document.getElementById('o_po') as HTMLElement).textContent = fmt(fromImperial(r.P_O, 'smlen'), 3);
      (document.getElementById('o_q') as HTMLElement).textContent = fmt(fromImperial(r.Q / 144, 'vol'), 0);
      (document.getElementById('o_v4') as HTMLElement).textContent = fmt(fromImperial(r.V4, 'vel'), S.units === 'imperial' ? 1 : 3);
      const ppiLblEl = document.getElementById('o_ppi_lbl') as HTMLElement;
      const ppiUnitEl = document.getElementById('o_ppi_unit') as HTMLElement;
      const ppiValEl = document.getElementById('o_ppi') as HTMLElement;
      if (S.pleatMode === 'count') {
        const ppiDensity = inp.PPI / inp.F_W;
        ppiLblEl.textContent = 'PPI (derived)';
        ppiUnitEl.textContent = '1/in';
        ppiValEl.textContent = fmt(ppiDensity, 2);
      } else {
        ppiLblEl.textContent = 'Pleat count (derived)';
        ppiUnitEl.textContent = 'pleats';
        ppiValEl.textContent = String(inp.PPI);
      }
      (document.getElementById('o_kp') as HTMLElement).textContent = fmt(r.K_Pcoef, 2);
      const kpUnitEl = document.querySelector('#o_kp + .unit-s') as HTMLElement | null;
      if (kpUnitEl) {
        kpUnitEl.textContent = Math.abs(r.kpCal - 1.0) > 0.005 ? `× ${fmt(r.kpCal, 2)}` : '–';
      }

      const sweep = sweepPPI(inp);
      (document.getElementById('o_optppi') as HTMLElement).textContent = String(sweep.optPPI);
      const optPPI_density = sweep.optPPI / inp.F_W;
      (document.getElementById('o_optppi_density') as HTMLElement).textContent = fmt(optPPI_density, 2);
      (document.getElementById('o_dpopt') as HTMLElement).textContent = fmt(sweep.optDP, 3);

      document.querySelectorAll('#pfc-root [data-unit]').forEach((el) => {
        const t = el.getAttribute('data-unit') as string;
        if (UNIT_LABELS[S.units][t]) (el as HTMLElement).textContent = UNIT_LABELS[S.units][t];
      });

      renderBreakdown(r);
      renderChart(sweep, inp.PPI, inp.F_W);
      renderWarnings(inp, r);
      if (FE.ready) {
        try { projectFEtoV4(); } catch (e) { console.error('FE projection error:', e); }
      }
    }

    function renderBreakdown(r: any) {
      const total = r.dp_total;
      const legendSegs = [
        {
          key: 'grating',
          name: 'Inlet grating',
          desc: 'Loss across the face grating · 2·K<sub>G</sub>·½ρV₂²',
          val: r.dp_grating,
          color: COLORS.grating,
        },
        {
          key: 'pleatTip',
          name: 'Pleat-tip contraction & expansion',
          desc: 'Sudden area change at pleat tips · (K<sub>C</sub> + K<sub>E</sub>)·½ρV₃²',
          val: r.dp_pleatTip,
          color: COLORS.pleatTip,
        },
        {
          key: 'pleat',
          name: 'Pleat-channel flow',
          desc: 'Friction along pleat sidewalls · K<sub>P</sub>·½ρV₃²',
          val: r.dp_pleat,
          color: COLORS.pleat,
        },
        {
          key: 'media_v',
          name: 'Media — viscous (Darcy)',
          desc: 'Linear resistance through media · A·V₄',
          val: r.dp_media_visc,
          color: COLORS.media_v,
        },
        {
          key: 'media_i',
          name: 'Media — inertial (Forchheimer)',
          desc: 'Quadratic resistance through media · B·V₄²',
          val: r.dp_media_inert,
          color: COLORS.media_i,
        },
      ];
      const barSegs = [
        { name: 'Grating', val: r.dp_grating, color: COLORS.grating },
        { name: 'Pleat tip', val: r.dp_pleatTip, color: COLORS.pleatTip },
        { name: 'Pleat flow', val: r.dp_pleat, color: COLORS.pleat },
        { name: 'Media', val: r.dp_media, color: COLORS.media_v },
      ];
      const bar = document.getElementById('bar-bd') as HTMLElement;
      const leg = document.getElementById('legend-bd') as HTMLElement;
      bar.innerHTML = '';
      leg.innerHTML = '';

      barSegs.forEach((s) => {
        const pct = total > 0 ? (s.val / total) * 100 : 0;
        if (pct > 0) {
          const seg = document.createElement('div');
          seg.className = 'bar-seg';
          seg.style.width = pct + '%';
          seg.style.background = s.color;
          if (pct > 6) seg.textContent = pct.toFixed(0) + '%';
          bar.appendChild(seg);
        }
      });

      const dpUnit = UNIT_LABELS[S.units].dp;
      legendSegs.forEach((s) => {
        const pct = total > 0 ? (s.val / total) * 100 : 0;
        const dpLabel = fromImperial(s.val, 'dp');
        const item = document.createElement('div');
        item.className = 'legend-item';
        item.innerHTML = `
          <div class="legend-swatch" style="background:${s.color}"></div>
          <div class="ltext">
            <div class="lname">${s.name}</div>
            <div class="ldesc">${s.desc}</div>
          </div>
          <div class="lnums">
            <div class="lval">${fmt(dpLabel, 3)} <span class="lu">${dpUnit}</span></div>
            <div class="lpct">${pct.toFixed(1)}%</div>
          </div>
        `;
        leg.appendChild(item);
      });
    }

    function sweepPPI(inp: any) {
      const points: any[] = [];
      let optPPI = inp.PPI, optDP = Infinity;
      const minPPI = 5, maxPPI = 200;
      for (let p = minPPI; p <= maxPPI; p++) {
        const test = { ...inp, PPI: p };
        const P_O = test.F_W / p;
        if ((0.5 * P_O) / test.P_D > 0.999) {
          points.push({ ppi: p, dp: null });
          continue;
        }
        const r = computeDeltaP(test);
        points.push({ ppi: p, dp: r.dp_total, grating: r.dp_grating, pleatTip: r.dp_pleatTip, pleat: r.dp_pleat, media: r.dp_media });
        if (r.dp_total < optDP) { optDP = r.dp_total; optPPI = p; }
      }
      return { points, optPPI, optDP };
    }

    function renderChart(sweep: any, currentPPI: number, F_W: number) {
      const inPPIMode = S.pleatMode === 'ppi';
      const yUnit = 'inWC';
      const maxPPI_display = Math.max(Math.ceil(2 * sweep.optPPI), Math.ceil(1.5 * currentPPI), 60);
      const pointsShown = sweep.points.filter((p: any) => p.ppi <= maxPPI_display);
      const pleatCounts: number[] = pointsShown.map((p: any) => p.ppi);
      const xs = inPPIMode
        ? pleatCounts.map((pc) => +(pc / F_W).toFixed(3))
        : pleatCounts;
      const ys_total = pointsShown.map((p: any) => p.dp === null ? null : p.dp);
      const ys_media = pointsShown.map((p: any) => p.dp === null ? null : p.media);
      const ys_pleat = pointsShown.map((p: any) => p.dp === null ? null : p.pleat + p.pleatTip);
      const ys_grat = pointsShown.map((p: any) => p.dp === null ? null : p.grating);

      const currentDP = (() => {
        const pt = sweep.points.find((p: any) => p.ppi === currentPPI);
        return pt ? pt.dp : null;
      })();
      const optDP_unit = sweep.optDP;
      const markerData = pleatCounts.map((pc) => pc === sweep.optPPI ? optDP_unit : (pc === currentPPI ? currentDP : null));
      const markerColors = pleatCounts.map((pc) => pc === sweep.optPPI ? '#e84393' : (pc === currentPPI ? '#1a1a2e' : 'rgba(0,0,0,0)'));

      const xTitle = inPPIMode ? 'PPI (pleats / inch of filter width)' : 'Pleat count (pleats / filter)';
      const tooltipXLabel = inPPIMode ? 'PPI' : 'Pleat count';

      const ctx = (document.getElementById('chart-ppi') as HTMLCanvasElement).getContext('2d');
      if (chart) chart.destroy();
      chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: xs,
          datasets: [
            { label: 'Total ΔP', data: ys_total, borderColor: '#1a1a2e', backgroundColor: 'rgba(108,92,231,0.06)', borderWidth: 2.5, tension: 0.15, pointRadius: 0, fill: false, order: 1 },
            { label: 'Media', data: ys_media, borderColor: COLORS.media_v, borderWidth: 1.4, borderDash: [4, 3], tension: 0.15, pointRadius: 0, fill: false, order: 2 },
            { label: 'Pleat + tips', data: ys_pleat, borderColor: COLORS.pleat, borderWidth: 1.4, borderDash: [4, 3], tension: 0.15, pointRadius: 0, fill: false, order: 3 },
            { label: 'Grating', data: ys_grat, borderColor: COLORS.grating, borderWidth: 1.4, borderDash: [4, 3], tension: 0.15, pointRadius: 0, fill: false, order: 4 },
            { label: 'Markers', data: markerData, type: 'scatter',
              pointRadius: pleatCounts.map((pc) => pc === sweep.optPPI || pc === currentPPI ? 7 : 0),
              pointHoverRadius: 8, pointBackgroundColor: markerColors, pointBorderColor: '#ffffff', pointBorderWidth: 2, showLine: false, order: 0 },
          ],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          interaction: { intersect: false, mode: 'index' },
          plugins: {
            legend: { position: 'top', align: 'end',
              labels: { font: { family: 'inherit', size: 11 }, usePointStyle: true, boxWidth: 8, color: '#4a4a68', filter: (item: any) => item.text !== 'Markers' } },
            tooltip: {
              titleFont: { family: 'inherit', weight: '700', size: 12 },
              bodyFont: { family: 'inherit', size: 12 },
              backgroundColor: 'rgba(26,26,46,0.95)', padding: 10, cornerRadius: 6,
              callbacks: {
                title: (items: any) => `${tooltipXLabel}: ${items[0].label}`,
                label: (ctx: any) => {
                  if (ctx.dataset.label === 'Markers') return null;
                  const v = ctx.parsed.y;
                  if (v === null) return null;
                  return `  ${ctx.dataset.label}: ${fmt(v, 3)} ${yUnit}`;
                },
              },
            },
          },
          scales: {
            x: { title: { display: true, text: xTitle, font: { family: 'inherit', size: 11, weight: '600' }, color: '#4a4a68' },
              ticks: { font: { family: 'inherit', size: 10 }, color: '#4a4a68' }, grid: { color: 'rgba(108,92,231,0.08)' } },
            y: { title: { display: true, text: `ΔP (${yUnit})`, font: { family: 'inherit', size: 11, weight: '600' }, color: '#4a4a68' },
              ticks: { font: { family: 'inherit', size: 10 }, color: '#4a4a68' }, grid: { color: 'rgba(108,92,231,0.08)' },
              beginAtZero: true,
              max: Math.max(3 * optDP_unit, currentDP !== null && isFinite(currentDP) ? 1.2 * currentDP : 0) },
          },
        },
      });
    }

    function renderWarnings(inp: any, r: any) {
      const warnings: string[] = [];
      if (inp.P_D > 4) warnings.push(`Pleat depth ${fmt(inp.P_D, 2)}" is above validated range (≤ 4").`);
      if (inp.PPI > 60) warnings.push(`Pleat count ${inp.PPI} is above validated range (≤ 60 pleats).`);
      if (inp.M_T > 2 / 25.4) warnings.push(`Media thickness above validated range (> 2 mm).`);
      if (inp.V_face > 1000) warnings.push(`Face velocity ${fmt(inp.V_face, 0)} fpm is above tested range (> 1000 fpm).`);
      const P_O = inp.F_W / inp.PPI;
      if ((0.5 * P_O) / inp.P_D > 0.99) warnings.push(`Pleat opening too large for pleat depth — β approaches 90°. Decrease pleat count or increase depth.`);
      if (r.P_T * inp.PPI > 0.9 * inp.F_W) warnings.push(`Pleat tips occupy >90% of filter width — geometry infeasible.`);
      const box = document.getElementById('warn-box') as HTMLElement;
      box.innerHTML = '';
      if (warnings.length === 0) return;
      warnings.forEach((w) => {
        const el = document.createElement('div');
        el.className = 'note-strip warn';
        el.innerHTML = `<span class="nlbl">Caution</span>${w}`;
        box.appendChild(el);
      });
    }

    function attachInputListeners() {
      document.querySelectorAll('#pfc-root input[type="number"]').forEach((inp) => {
        inp.addEventListener('input', render);
      });
    }

    function setUnits(u: 'imperial' | 'metric') {
      if (S.units === u) return;
      S.units = u;
      document.querySelectorAll('#pfc-root .toggle-row button[data-units]').forEach((b) => {
        const btn = b as HTMLElement;
        btn.classList.toggle('active', btn.dataset.units === u);
      });
      document.querySelectorAll('#pfc-root [data-unit]').forEach((el) => {
        const t = el.getAttribute('data-unit') as string;
        if (UNIT_LABELS[u][t]) (el as HTMLElement).textContent = UNIT_LABELS[u][t];
      });
      const d = DEFAULTS[u];
      Object.entries(d).forEach(([k, v]) => {
        const el = document.getElementById(k) as HTMLInputElement | null;
        if (el) el.value = String(v);
      });
      render();
    }

    function setMediaMode(m: 'dp' | 'ab' | 'perm') {
      S.mediaMode = m;
      document.querySelectorAll('#pfc-root .toggle-row button[data-mediamode]').forEach((b) => {
        const btn = b as HTMLElement;
        btn.classList.toggle('active', btn.dataset.mediamode === m);
      });
      (document.getElementById('mode-dp') as HTMLElement).style.display = m === 'dp' ? '' : 'none';
      (document.getElementById('mode-ab') as HTMLElement).style.display = m === 'ab' ? '' : 'none';
      (document.getElementById('mode-perm') as HTMLElement).style.display = m === 'perm' ? '' : 'none';
      render();
    }

    function setFlowMode(f: 'face' | 'cfm') {
      S.flowMode = f;
      document.querySelectorAll('#pfc-root .toggle-row button[data-flowmode]').forEach((b) => {
        const btn = b as HTMLElement;
        btn.classList.toggle('active', btn.dataset.flowmode === f);
      });
      (document.getElementById('flowmode-face') as HTMLElement).style.display = f === 'face' ? '' : 'none';
      (document.getElementById('flowmode-cfm') as HTMLElement).style.display = f === 'cfm' ? '' : 'none';
      render();
    }

    function setPleatMode(p: 'count' | 'ppi') {
      S.pleatMode = p;
      document.querySelectorAll('#pfc-root .toggle-row button[data-pleatmode]').forEach((b) => {
        const btn = b as HTMLElement;
        btn.classList.toggle('active', btn.dataset.pleatmode === p);
      });
      (document.getElementById('pleatmode-count') as HTMLElement).style.display = p === 'count' ? '' : 'none';
      (document.getElementById('pleatmode-ppi') as HTMLElement).style.display = p === 'ppi' ? '' : 'none';
      render();
    }

    const unitListeners: Array<[Element, EventListener]> = [];
    document.querySelectorAll('#pfc-root .toggle-row button[data-units]').forEach((b) => {
      const fn = () => setUnits((b as HTMLElement).dataset.units as 'imperial' | 'metric');
      b.addEventListener('click', fn);
      unitListeners.push([b, fn]);
    });
    document.querySelectorAll('#pfc-root .toggle-row button[data-mediamode]').forEach((b) => {
      const fn = () => setMediaMode((b as HTMLElement).dataset.mediamode as 'dp' | 'ab' | 'perm');
      b.addEventListener('click', fn);
      unitListeners.push([b, fn]);
    });
    document.querySelectorAll('#pfc-root .toggle-row button[data-flowmode]').forEach((b) => {
      const fn = () => setFlowMode((b as HTMLElement).dataset.flowmode as 'face' | 'cfm');
      b.addEventListener('click', fn);
      unitListeners.push([b, fn]);
    });
    document.querySelectorAll('#pfc-root .toggle-row button[data-pleatmode]').forEach((b) => {
      const fn = () => setPleatMode((b as HTMLElement).dataset.pleatmode as 'count' | 'ppi');
      b.addEventListener('click', fn);
      unitListeners.push([b, fn]);
    });

    // ===== FRACTIONAL EFFICIENCY PROJECTOR =====
    const FE: any = {
      mode: 'hepa',
      datasetA: null,
      datasetB: null,
      N_global: null,
      N_local: null,
      sizes: null,
      ready: false,
      projection: null,
      chart: null,
    };

    function parseTSIDataset(text: string) {
      const lines = text.split(/\r?\n/);
      const rows: any[] = [];
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (!/^\d+(\.\d+)?[\s\t]/.test(trimmed)) continue;
        const parts = trimmed.split(/\s+/);
        if (parts.length < 3) continue;
        const nums = parts.map((p) => parseFloat(p));
        if (!isFinite(nums[0]) || !isFinite(nums[2])) continue;
        rows.push({ D: nums[0], Eff: nums[1], Pen: nums[2], P95: nums[3], Res: nums[4], Cup: nums[5], Cdn: nums[6], Cnt: nums[7] });
      }
      if (rows.length < 3) return { error: `Only ${rows.length} data rows parsed — need at least 3 for a quadratic fit.` };
      return { rows };
    }

    // Build a 3-point dataset from the ASHRAE E1–E3 efficiency inputs for one
    // side ('a' or 'b'). Each range is placed at its volume-mean diameter.
    function buildAshraeDataset(side: 'a' | 'b') {
      const rows: any[] = [];
      for (const b of ASHRAE_BINS) {
        const el = document.getElementById(`fe-${side}-${b.key}`) as HTMLInputElement;
        const eff = parseFloat(el.value);
        if (!isFinite(eff)) return { error: `${b.label} efficiency is missing or not a number.` };
        if (eff < 0 || eff > 100) return { error: `${b.label} efficiency must be between 0 and 100%.` };
        rows.push({ D: volumeMeanDiameter(b.lo, b.hi), Eff: eff, Pen: 100 - eff, bin: b.label });
      }
      return { rows };
    }

    function fitQuadraticLogLog(rows: any[]): any {
      const N = rows.length;
      let Sx0 = 0, Sx1 = 0, Sx2 = 0, Sx3 = 0, Sx4 = 0, Sy = 0, Sxy = 0, Sx2y = 0;
      const points: { x: number; y: number }[] = [];
      for (const r of rows) {
        if (r.D <= 0 || r.Pen <= 0) continue;
        const x = Math.log(r.D);
        const y = Math.log(r.Pen / 100);
        points.push({ x, y });
        Sx0 += 1; Sx1 += x; Sx2 += x * x; Sx3 += x * x * x; Sx4 += x * x * x * x;
        Sy += y; Sxy += x * y; Sx2y += x * x * y;
      }
      const M = [
        [Sx4, Sx3, Sx2, Sx2y],
        [Sx3, Sx2, Sx1, Sxy],
        [Sx2, Sx1, Sx0, Sy],
      ];
      for (let i = 0; i < 3; i++) {
        let piv = i;
        for (let k = i + 1; k < 3; k++) if (Math.abs(M[k][i]) > Math.abs(M[piv][i])) piv = k;
        if (piv !== i) [M[i], M[piv]] = [M[piv], M[i]];
        if (Math.abs(M[i][i]) < 1e-14) return { error: 'Fit failed — singular matrix (data too degenerate).' };
        for (let k = i + 1; k < 3; k++) {
          const f = M[k][i] / M[i][i];
          for (let j = i; j < 4; j++) M[k][j] -= f * M[i][j];
        }
      }
      const coef = [0, 0, 0];
      for (let i = 2; i >= 0; i--) {
        let s = M[i][3];
        for (let j = i + 1; j < 3; j++) s -= M[i][j] * coef[j];
        coef[i] = s / M[i][i];
      }
      const [A, B, C] = coef;
      const lnMPPS = -B / (2 * A);
      const mpps = Math.exp(lnMPPS);
      const lnPenMPPS = C - (B * B) / (4 * A);
      const penMPPS = Math.exp(lnPenMPPS) * 100;
      const yMean = Sy / N;
      let SStot = 0, SSres = 0;
      for (const p of points) {
        const yHat = A * p.x * p.x + B * p.x + C;
        SSres += (p.y - yHat) ** 2;
        SStot += (p.y - yMean) ** 2;
      }
      const r2 = SStot > 0 ? 1 - SSres / SStot : 1;
      return { A, B, C, mpps, penMPPS, r2 };
    }

    function penFromFit(fit: any, D: number) {
      const lnD = Math.log(D);
      const lnPen = fit.A * lnD * lnD + fit.B * lnD + fit.C;
      return Math.exp(lnPen) * 100;
    }

    function solveGlobalN(fitA: any, V_A: number, fitB: any, V_B: number, sizes: number[]) {
      const lnVRatio = Math.log(V_B / V_A);
      if (lnVRatio === 0) return NaN;
      const Ns: number[] = [];
      for (const D of sizes) {
        const penA = penFromFit(fitA, D);
        const penB = penFromFit(fitB, D);
        const lpA = Math.log(penA / 100);
        const lpB = Math.log(penB / 100);
        if (lpA >= 0 || lpB >= 0) continue;
        const ratio = lpB / lpA;
        if (ratio <= 0 || !isFinite(ratio)) continue;
        Ns.push(Math.log(ratio) / lnVRatio);
      }
      if (Ns.length === 0) return NaN;
      return Ns.reduce((a, b) => a + b, 0) / Ns.length;
    }

    function solveLocalN(rowsA: any[], V_A: number, rowsB: any[], V_B: number) {
      const lnVRatio = Math.log(V_B / V_A);
      if (lnVRatio === 0) return [];
      const bMap = new Map<number, any>();
      for (const r of rowsB) bMap.set(Number(r.D.toFixed(4)), r);
      const out: any[] = [];
      for (const rA of rowsA) {
        const key = Number(rA.D.toFixed(4));
        const rB = bMap.get(key);
        if (!rB) continue;
        const penA = rA.Pen, penB = rB.Pen;
        if (!(penA > 0 && penA < 100 && penB > 0 && penB < 100)) continue;
        const lpA = Math.log(penA / 100);
        const lpB = Math.log(penB / 100);
        const ratio = lpB / lpA;
        if (ratio <= 0 || !isFinite(ratio)) continue;
        const N = Math.log(ratio) / lnVRatio;
        if (!isFinite(N)) continue;
        out.push({ D: rA.D, N, penA, penB });
      }
      return out.sort((a, b) => a.D - b.D);
    }

    function nAtDiameter(localN: any[], D: number) {
      if (!localN || localN.length === 0) return NaN;
      if (localN.length === 1) return localN[0].N;
      if (D <= localN[0].D) return localN[0].N;
      if (D >= localN[localN.length - 1].D) return localN[localN.length - 1].N;
      const lnD = Math.log(D);
      for (let i = 0; i < localN.length - 1; i++) {
        const d0 = localN[i].D, d1 = localN[i + 1].D;
        if (D >= d0 && D <= d1) {
          const x0 = Math.log(d0), x1 = Math.log(d1);
          const t = (lnD - x0) / (x1 - x0);
          return localN[i].N + t * (localN[i + 1].N - localN[i].N);
        }
      }
      return localN[localN.length - 1].N;
    }

    // Assign a MERV per ASHRAE 52.2-2017 Table 12-1 from the composite
    // efficiencies (%) in the three size ranges. Returns the highest rating
    // whose E₁/E₂/E₃ minimums are all satisfied. E₃ < 20% falls into MERV 1–4,
    // which are distinguished by average arrestance (not computed here).
    function determineMERV(e1: number, e2: number, e3: number) {
      const reqs: Array<{ merv: number; e1?: number; e2?: number; e3?: number }> = [
        { merv: 16, e1: 95, e2: 95, e3: 95 },
        { merv: 15, e1: 85, e2: 90, e3: 95 },
        { merv: 14, e1: 75, e2: 90, e3: 95 },
        { merv: 13, e1: 50, e2: 85, e3: 90 },
        { merv: 12, e1: 35, e2: 80, e3: 90 },
        { merv: 11, e1: 20, e2: 65, e3: 85 },
        { merv: 10, e2: 50, e3: 80 },
        { merv: 9, e2: 35, e3: 75 },
        { merv: 8, e2: 20, e3: 70 },
        { merv: 7, e3: 50 },
        { merv: 6, e3: 35 },
        { merv: 5, e3: 20 },
      ];
      for (const r of reqs) {
        const ok =
          (r.e1 === undefined || e1 >= r.e1) &&
          (r.e2 === undefined || e2 >= r.e2) &&
          (r.e3 === undefined || e3 >= r.e3);
        if (ok) return { merv: r.merv, low: false };
      }
      return { merv: null, low: true };
    }

    function projectPen(pen_ref_pct: number, V_ref: number, V_target: number, N: number) {
      const lp_ref = Math.log(pen_ref_pct / 100);
      const lp_new = lp_ref * Math.pow(V_target / V_ref, N);
      return Math.exp(lp_new) * 100;
    }

    function fpmToCMS(V_fpm: number) { return V_fpm * 0.508; }

    function runFEFits() {
      const status = document.getElementById('fe-status') as HTMLElement;
      status.classList.remove('ok', 'err');
      const V_A = parseFloat((document.getElementById('fe-vel-a') as HTMLInputElement).value);
      const V_B = parseFloat((document.getElementById('fe-vel-b') as HTMLInputElement).value);
      if (!isFinite(V_A) || V_A <= 0) { status.textContent = 'Dataset A: enter a valid face velocity (cm/s).'; status.classList.add('err'); return false; }
      if (!isFinite(V_B) || V_B <= 0) { status.textContent = 'Dataset B: enter a valid face velocity (cm/s).'; status.classList.add('err'); return false; }
      if (Math.abs(V_A - V_B) < 1e-6) { status.textContent = 'Velocities A and B must differ.'; status.classList.add('err'); return false; }

      const isPre = FE.mode === 'pre';
      let pA: any, pB: any;
      if (isPre) {
        // Prefilter: read the three ASHRAE efficiency inputs per side.
        pA = buildAshraeDataset('a');
        pB = buildAshraeDataset('b');
      } else {
        const textA = (document.getElementById('fe-paste-a') as HTMLTextAreaElement).value;
        const textB = (document.getElementById('fe-paste-b') as HTMLTextAreaElement).value;
        pA = parseTSIDataset(textA);
        pB = parseTSIDataset(textB);
      }
      if (pA.error) { status.textContent = 'Dataset A: ' + pA.error; status.classList.add('err'); return false; }
      if (pB.error) { status.textContent = 'Dataset B: ' + pB.error; status.classList.add('err'); return false; }

      const fitA = fitQuadraticLogLog(pA.rows!);
      const fitB = fitQuadraticLogLog(pB.rows!);
      // The quadratic fit is only required for the HEPA (global-N) projection.
      // Prefilter mode drives everything off the raw entered points and its
      // per-range local N, so a degenerate fit there is not fatal.
      if (!isPre) {
        if (fitA.error) { status.textContent = 'Dataset A fit: ' + fitA.error; status.classList.add('err'); return false; }
        if (fitB.error) { status.textContent = 'Dataset B fit: ' + fitB.error; status.classList.add('err'); return false; }
      }

      const sizes = pA.rows!.map((r: any) => r.D).sort((a: number, b: number) => a - b);
      let N_global: number | null = null;
      let N_local: any[] | null = null;

      if (isPre) {
        N_local = solveLocalN(pA.rows!, V_A, pB.rows!, V_B);
        if (N_local.length === 0) {
          status.textContent = 'Could not solve local N — check that efficiencies are between 0 and 100% (penetration must be > 0).';
          status.classList.add('err'); return false;
        }
        N_global = (fitA.error || fitB.error) ? null : solveGlobalN(fitA, V_A, fitB, V_B, sizes);
      } else {
        N_global = solveGlobalN(fitA, V_A, fitB, V_B, sizes);
        if (!isFinite(N_global)) {
          status.textContent = 'Could not solve global N — check that penetrations are < 100%.';
          status.classList.add('err'); return false;
        }
      }

      FE.datasetA = { V_cms: V_A, rows: pA.rows, fit: fitA };
      FE.datasetB = { V_cms: V_B, rows: pB.rows, fit: fitB };
      FE.N_global = N_global;
      FE.N_local = N_local;
      FE.sizes = sizes;
      FE.ready = true;
      return true;
    }

    function projectFEtoV4() {
      if (!FE.ready) return;
      const inp = readInputs();
      const r = computeDeltaP(inp);
      const V4_cms = fpmToCMS(r.V4);
      const pA = FE.datasetA, pB = FE.datasetB, fitA = pA.fit, fitB = pB.fit;
      const isPre = FE.mode === 'pre';
      const closer = Math.abs(V4_cms - pA.V_cms) <= Math.abs(V4_cms - pB.V_cms) ? 'A' : 'B';
      const V_ref = closer === 'A' ? pA.V_cms : pB.V_cms;
      const fit_ref = closer === 'A' ? fitA : fitB;
      const rows_ref = closer === 'A' ? pA.rows : pB.rows;

      const rawRefMap = new Map<number, number>();
      for (const rr of rows_ref) rawRefMap.set(Number(rr.D.toFixed(4)), rr.Pen);
      // Prefilter mode plots the raw entered penetrations rather than fitted
      // values so each ASHRAE point charts exactly where the user put it.
      const rawAMap = new Map<number, number>();
      const rawBMap = new Map<number, number>();
      for (const rr of pA.rows) rawAMap.set(Number(rr.D.toFixed(4)), rr.Pen);
      for (const rr of pB.rows) rawBMap.set(Number(rr.D.toFixed(4)), rr.Pen);

      const rowsOut: any[] = [];
      for (const D of FE.sizes) {
        const key = Number(D.toFixed(4));
        const penA = isPre && rawAMap.has(key) ? rawAMap.get(key)! : penFromFit(fitA, D);
        const penB = isPre && rawBMap.has(key) ? rawBMap.get(key)! : penFromFit(fitB, D);
        const N_here = isPre ? nAtDiameter(FE.N_local, D) : FE.N_global;
        let pen_ref: number;
        if (isPre) {
          const raw = rawRefMap.get(Number(D.toFixed(4)));
          pen_ref = raw !== undefined ? raw : penFromFit(fit_ref, D);
        } else {
          pen_ref = penFromFit(fit_ref, D);
        }
        const penT = projectPen(pen_ref, V_ref, V4_cms, N_here);
        rowsOut.push({ D, penA, penB, N_here, penT, effT: 100 - penT });
      }

      let fitT: any = null;
      if (!isPre) {
        const projRows = rowsOut
          .filter((row) => isFinite(row.penT) && row.penT > 0 && row.penT < 100)
          .map((row) => ({ D: row.D, Pen: row.penT }));
        if (projRows.length >= 3) {
          fitT = fitQuadraticLogLog(projRows);
          if (fitT.error) fitT = null;
        }
      }

      FE.projection = { V_cms: V4_cms, rows: rowsOut, fit: fitT };
      (document.getElementById('fe-va') as HTMLElement).textContent = pA.V_cms.toFixed(3);
      (document.getElementById('fe-vb') as HTMLElement).textContent = pB.V_cms.toFixed(3);
      (document.getElementById('fe-vt') as HTMLElement).textContent = V4_cms.toFixed(3);

      // ----- MERV rating from the projected efficiencies (prefilter mode only) -----
      const mervBox = document.getElementById('fe-merv-box') as HTMLElement;
      if (isPre) {
        const effByKey: Record<string, number> = {};
        for (const b of ASHRAE_BINS) {
          const D = volumeMeanDiameter(b.lo, b.hi);
          const row = rowsOut.find((rr) => Math.abs(rr.D - D) < 1e-6);
          effByKey[b.key] = row && isFinite(row.effT) ? row.effT : NaN;
        }
        const e1 = effByKey.e1, e2 = effByKey.e2, e3 = effByKey.e3;
        const valEl = document.getElementById('fe-merv-val') as HTMLElement;
        const descEl = document.getElementById('fe-merv-desc') as HTMLElement;
        const eEl = document.getElementById('fe-merv-e') as HTMLElement;
        if ([e1, e2, e3].every((v) => isFinite(v))) {
          const { merv, low } = determineMERV(e1, e2, e3);
          if (low) {
            valEl.textContent = '1–4';
            descEl.textContent =
              'E₃ is below 20% — the final MERV (1–4) is set by the average-arrestance test, which this tool does not compute.';
          } else {
            valEl.textContent = String(merv);
            descEl.textContent = `Highest rating whose E₁/E₂/E₃ minimums are all met at the media velocity V₄ (${V4_cms.toFixed(2)} cm/s).`;
          }
          eEl.innerHTML =
            `E<sub>1</sub> ${e1.toFixed(1)}% · E<sub>2</sub> ${e2.toFixed(1)}% · E<sub>3</sub> ${e3.toFixed(1)}% at V₄`;
        } else {
          valEl.textContent = '—';
          descEl.textContent = 'Enter efficiencies that project to valid penetrations (0–100%) to compute a MERV.';
          eEl.textContent = '';
        }
        mervBox.style.display = '';
      } else {
        mervBox.style.display = 'none';
      }

      const nLbl = document.getElementById('fe-n-lbl') as HTMLElement;
      const nDet = document.getElementById('fe-n-det') as HTMLElement;
      const nVal = document.getElementById('fe-nglobal') as HTMLElement;
      if (isPre) {
        const Ns = FE.N_local.map((x: any) => x.N);
        const Nmean = Ns.reduce((a: number, b: number) => a + b, 0) / Ns.length;
        const Nmin = Math.min(...Ns), Nmax = Math.max(...Ns);
        nLbl.textContent = 'Local N · mean';
        nVal.textContent = Nmean.toFixed(3);
        nDet.textContent = `range ${Nmin.toFixed(2)} – ${Nmax.toFixed(2)} · per-D table below`;
      } else {
        nLbl.textContent = 'Global N';
        nVal.textContent = (FE.N_global as number).toFixed(3);
        nDet.textContent = 'velocity exponent · Pierce eq. 4';
      }

      if (isPre) {
        ['fe-mppsA', 'fe-pmppsA', 'fe-mppsB', 'fe-pmppsB', 'fe-mppsT', 'fe-pmppsT'].forEach((id) => {
          (document.getElementById(id) as HTMLElement).textContent = '—';
        });
      } else {
        (document.getElementById('fe-mppsA') as HTMLElement).textContent = fitA.mpps.toFixed(3);
        (document.getElementById('fe-pmppsA') as HTMLElement).textContent = fitA.penMPPS.toExponential(3);
        (document.getElementById('fe-mppsB') as HTMLElement).textContent = fitB.mpps.toFixed(3);
        (document.getElementById('fe-pmppsB') as HTMLElement).textContent = fitB.penMPPS.toExponential(3);
        if (fitT) {
          (document.getElementById('fe-mppsT') as HTMLElement).textContent = fitT.mpps.toFixed(3);
          (document.getElementById('fe-pmppsT') as HTMLElement).textContent = fitT.penMPPS.toExponential(3);
        } else {
          (document.getElementById('fe-mppsT') as HTMLElement).textContent = '—';
          (document.getElementById('fe-pmppsT') as HTMLElement).textContent = '—';
        }
      }

      const tbody = document.getElementById('fe-tbody') as HTMLElement;
      tbody.innerHTML = '';
      const mppsT = fitT ? fitT.mpps : NaN;
      for (const row of rowsOut) {
        const tr = document.createElement('tr');
        const isMPPS = !isPre && isFinite(mppsT) && Math.abs(row.D - mppsT) < 0.02;
        if (isMPPS) tr.classList.add('hero-row');
        const nCell = isFinite(row.N_here) ? row.N_here.toFixed(3) : '—';
        const fmtPen = isPre
          ? (v: number) => (isFinite(v) ? v.toFixed(3) : '—')
          : (v: number) => (isFinite(v) ? v.toExponential(3) : '—');
        tr.innerHTML = `
          <td>${row.D.toFixed(3)}</td>
          <td>${fmtPen(row.penA)}</td>
          <td>${fmtPen(row.penB)}</td>
          <td>${nCell}</td>
          <td>${fmtPen(row.penT)}</td>
          <td>${isFinite(row.penT) ? row.effT.toFixed(4) : '—'}</td>
        `;
        tbody.appendChild(tr);
      }

      renderFEChart(pA, pB, fitA, fitB, fitT, V4_cms, rowsOut);
      (document.getElementById('fe-results') as HTMLElement).style.display = '';
      const status = document.getElementById('fe-status') as HTMLElement;
      const Nlabel = isPre
        ? `local N (mean ${(FE.N_local.reduce((a: number, b: any) => a + b.N, 0) / FE.N_local.length).toFixed(2)})`
        : `global N = ${(FE.N_global as number).toFixed(3)}`;
      status.textContent = `Linked to V₄ = ${r.V4.toFixed(1)} fpm (${V4_cms.toFixed(3)} cm/s) · ${Nlabel}`;
      status.classList.remove('err');
      status.classList.add('ok');
    }

    function runFEProjection() {
      if (runFEFits()) projectFEtoV4();
    }

    function renderFEChart(pA: any, pB: any, fitA: any, fitB: any, fitT: any, V4_cms: number, rowsOut: any[]) {
      const isPre = FE.mode === 'pre';
      const Dmin = isPre ? 0.3 : 0.05;
      const Dmax = isPre ? 10.0 : 0.4;
      const nPts = 80;
      const Ds: number[] = [];
      for (let i = 0; i < nPts; i++) {
        const frac = i / (nPts - 1);
        const lnD = Math.log(Dmin) + frac * (Math.log(Dmax) - Math.log(Dmin));
        Ds.push(Math.exp(lnD));
      }
      const pointsA = pA.rows.slice().sort((a: any, b: any) => a.D - b.D).map((r: any) => ({ x: r.D, y: r.Pen }));
      const pointsB = pB.rows.slice().sort((a: any, b: any) => a.D - b.D).map((r: any) => ({ x: r.D, y: r.Pen }));
      if (FE.chart) FE.chart.destroy();
      const datasets: any[] = [];

      if (isPre) {
        datasets.push(
          { label: `A (${pA.V_cms.toFixed(2)} cm/s)`, data: pointsA, type: 'line',
            borderColor: '#0984e3', backgroundColor: '#0984e3', borderWidth: 1.5,
            pointRadius: 4, pointStyle: 'triangle', tension: 0, fill: false },
          { label: `B (${pB.V_cms.toFixed(2)} cm/s)`, data: pointsB, type: 'line',
            borderColor: '#00b894', backgroundColor: '#00b894', borderWidth: 1.5,
            pointRadius: 4, pointStyle: 'rect', tension: 0, fill: false }
        );
        if (rowsOut && rowsOut.length) {
          const projPts = rowsOut.slice().sort((a, b) => a.D - b.D)
            .filter((r) => isFinite(r.penT) && r.penT > 0 && r.penT < 100)
            .map((r) => ({ x: r.D, y: r.penT }));
          datasets.push({ label: `Projected · V₄ = ${V4_cms.toFixed(2)} cm/s`, data: projPts, type: 'line',
            borderColor: '#6c5ce7', backgroundColor: '#6c5ce7', borderWidth: 2.5,
            pointRadius: 5, pointStyle: 'circle', tension: 0, fill: false });
        }
      } else {
        const curveA = Ds.map((D) => ({ x: D, y: penFromFit(fitA, D) }));
        const curveB = Ds.map((D) => ({ x: D, y: penFromFit(fitB, D) }));
        const curveT = fitT ? Ds.map((D) => ({ x: D, y: penFromFit(fitT, D) })) : null;
        datasets.push(
          { label: `Data · A (${pA.V_cms.toFixed(2)} cm/s)`, data: pointsA, type: 'scatter',
            backgroundColor: '#0984e3', borderColor: '#0984e3', pointRadius: 4, pointStyle: 'triangle', showLine: false },
          { label: `Fit · A`, data: curveA, type: 'line', borderColor: '#0984e3', borderWidth: 1.5, pointRadius: 0, tension: 0, fill: false },
          { label: `Data · B (${pB.V_cms.toFixed(2)} cm/s)`, data: pointsB, type: 'scatter',
            backgroundColor: '#00b894', borderColor: '#00b894', pointRadius: 4, pointStyle: 'rect', showLine: false },
          { label: `Fit · B`, data: curveB, type: 'line', borderColor: '#00b894', borderWidth: 1.5, pointRadius: 0, tension: 0, fill: false }
        );
        if (curveT) {
          datasets.push({ label: `Projected · V₄ = ${V4_cms.toFixed(2)} cm/s`, data: curveT, type: 'line',
            borderColor: '#6c5ce7', borderWidth: 2.5, pointRadius: 0, tension: 0, fill: false });
        }
      }

      const ctx = (document.getElementById('fe-chart') as HTMLCanvasElement).getContext('2d');
      FE.chart = new Chart(ctx, {
        type: 'line',
        data: { datasets },
        options: {
          responsive: true, maintainAspectRatio: false,
          interaction: { intersect: false, mode: 'nearest' },
          plugins: {
            legend: { position: 'top', align: 'end',
              labels: { font: { family: 'inherit', size: 11 }, usePointStyle: true, boxWidth: 8, color: '#4a4a68' } },
            tooltip: {
              titleFont: { family: 'inherit', weight: '700', size: 12 },
              bodyFont: { family: 'inherit', size: 12 },
              backgroundColor: 'rgba(26,26,46,0.95)', padding: 10, cornerRadius: 6,
              callbacks: {
                title: (items: any) => `D = ${items[0].parsed.x.toFixed(3)} µm`,
                label: (ctx: any) => {
                  const v = ctx.parsed.y;
                  if (v === null || !isFinite(v)) return null;
                  const fmtV = FE.mode === 'pre' ? v.toFixed(2) + ' %' : v.toExponential(3) + ' %';
                  return `  ${ctx.dataset.label}: ${fmtV}`;
                },
              },
            },
          },
          scales: {
            x: { type: 'logarithmic', min: Dmin, max: Dmax,
              title: { display: true, text: 'Particle diameter D (µm)', font: { family: 'inherit', size: 11, weight: '600' }, color: '#4a4a68' },
              ticks: { font: { family: 'inherit', size: 10 }, color: '#4a4a68',
                callback: function (val: any) {
                  const v = Number(val);
                  if (FE.mode === 'pre') {
                    if ([0.3, 0.5, 1, 2, 3, 5, 10].includes(v)) return v.toString();
                  } else {
                    if ([0.05, 0.1, 0.2, 0.3, 0.5].includes(v)) return v.toString();
                  }
                  return '';
                } },
              grid: { color: 'rgba(108,92,231,0.08)' } },
            y: { type: 'logarithmic',
              title: { display: true, text: 'Penetration (%)', font: { family: 'inherit', size: 11, weight: '600' }, color: '#4a4a68' },
              ticks: { font: { family: 'inherit', size: 10 }, color: '#4a4a68',
                callback: function (val: any) {
                  const v = Number(val);
                  if (FE.mode === 'pre') {
                    if ([1, 2, 5, 10, 20, 50, 100].includes(v)) return v.toString();
                    return '';
                  }
                  const log = Math.log10(v);
                  if (Math.abs(log - Math.round(log)) < 0.01) {
                    if (v >= 0.001 && v <= 100) return v.toString();
                  }
                  return '';
                } },
              grid: { color: 'rgba(108,92,231,0.08)' } },
          },
        },
      });
    }

    // ---- FE event wiring ----
    const feToggleEl = document.getElementById('fe-toggle') as HTMLElement;
    const feToggleHandler = () => {
      (document.getElementById('fe-section') as HTMLElement).classList.toggle('open');
    };
    feToggleEl.addEventListener('click', feToggleHandler);

    const feRunEl = document.getElementById('fe-run') as HTMLElement;
    feRunEl.addEventListener('click', runFEProjection);

    const feClearEl = document.getElementById('fe-clear') as HTMLElement;
    const feClearHandler = () => {
      (document.getElementById('fe-paste-a') as HTMLTextAreaElement).value = '';
      (document.getElementById('fe-paste-b') as HTMLTextAreaElement).value = '';
      // Restore the ASHRAE efficiency inputs to their defaults so prefilter mode
      // stays usable after a clear.
      (['a', 'b'] as const).forEach((side) => {
        for (const b of ASHRAE_BINS) {
          (document.getElementById(`fe-${side}-${b.key}`) as HTMLInputElement).value =
            String(ASHRAE_DEFAULTS[side][b.key]);
        }
      });
      (document.getElementById('fe-results') as HTMLElement).style.display = 'none';
      const status = document.getElementById('fe-status') as HTMLElement;
      status.textContent = 'Ready · enter velocities, paste data, and fit';
      status.classList.remove('ok', 'err');
      if (FE.chart) { FE.chart.destroy(); FE.chart = null; }
      FE.ready = false;
      FE.datasetA = null;
      FE.datasetB = null;
      FE.N_global = null;
      FE.N_local = null;
    };
    feClearEl.addEventListener('click', feClearHandler);

    const FE_MODE_HINTS: Record<string, string> = {
      hepa: 'HEPA: single velocity exponent from U-curve fit (Pierce). Use for sub-micron 3160 data.',
      pre: 'Prefilter: enter ASHRAE 52.2 E1–E3 efficiencies at two velocities. Each range charts at its volume-mean diameter; a per-range local N links the datasets and projects to V₄.',
    };
    const FE_HOWTO: Record<string, string> = {
      hepa:
        '<span class="nlbl">How it works</span> Paste two fractional efficiency datasets at different face velocities. ' +
        "The tool fits each curve to Pierce's quadratic model (ln Pen = A(ln D)² + B ln D + C), back-calculates the velocity " +
        'exponent N, and projects the penetration curve to the media velocity V<sub>4</sub> computed by this calculator.',
      pre:
        '<span class="nlbl">How it works</span> Enter the ASHRAE 52.2-2017 composite efficiencies — E1 (0.3–1 µm), E2 (1–3 µm), ' +
        'E3 (3–10 µm) — at two face velocities. Each range is charted at its <em>volume-mean diameter</em>: the diameter of a sphere ' +
        'whose volume is the average of the range-endpoint sphere volumes. A per-range local exponent N links the two datasets and ' +
        'projects the efficiency to the media velocity V<sub>4</sub>.',
    };
    function setFEMode(mode: 'hepa' | 'pre') {
      if (mode !== 'hepa' && mode !== 'pre') return;
      if (FE.mode === mode) return;
      FE.mode = mode;
      (document.getElementById('fe-mode-hepa') as HTMLElement).classList.toggle('active', mode === 'hepa');
      (document.getElementById('fe-mode-pre') as HTMLElement).classList.toggle('active', mode === 'pre');
      (document.getElementById('fe-section') as HTMLElement).classList.toggle('fe-ashrae', mode === 'pre');
      (document.getElementById('fe-mode-hint') as HTMLElement).textContent = FE_MODE_HINTS[mode];
      (document.getElementById('fe-howto') as HTMLElement).innerHTML = FE_HOWTO[mode];
      FE.ready = false;
      FE.N_global = null;
      FE.N_local = null;
      if (FE.chart) { FE.chart.destroy(); FE.chart = null; }
      (document.getElementById('fe-results') as HTMLElement).style.display = 'none';
      const status = document.getElementById('fe-status') as HTMLElement;
      status.textContent = `Mode: ${mode === 'pre' ? 'Prefilter (local N)' : 'HEPA (global N)'} · click "Fit & project" to refresh`;
      status.classList.remove('ok');
      status.classList.add('err');
    }
    const feHepaEl = document.getElementById('fe-mode-hepa') as HTMLElement;
    const feHepaHandler = () => setFEMode('hepa');
    feHepaEl.addEventListener('click', feHepaHandler);
    const fePreEl = document.getElementById('fe-mode-pre') as HTMLElement;
    const fePreHandler = () => setFEMode('pre');
    fePreEl.addEventListener('click', fePreHandler);

    const feInputIds = ['fe-vel-a', 'fe-vel-b', 'fe-paste-a', 'fe-paste-b',
      'fe-a-e1', 'fe-a-e2', 'fe-a-e3', 'fe-b-e1', 'fe-b-e2', 'fe-b-e3'];
    const feInputHandlers: Array<[Element, EventListener]> = [];
    feInputIds.forEach((id) => {
      const el = document.getElementById(id) as HTMLElement;
      const fn = () => {
        if (!FE.ready) return;
        FE.ready = false;
        const status = document.getElementById('fe-status') as HTMLElement;
        status.textContent = 'Inputs changed · click "Fit & project" to refresh';
        status.classList.remove('ok');
        status.classList.add('err');
      };
      el.addEventListener('input', fn);
      feInputHandlers.push([el, fn]);
    });

    attachInputListeners();
    (document.getElementById('timestamp') as HTMLElement).textContent =
      new Date().toISOString().split('T')[0];

    // ===== SHARE / RESTORE =====
    // Maps every input id (and toggle state) to a compact query-string key.
    const SHARE_FIELDS: Array<[string, string]> = [
      ['F_H', 'fh'], ['F_W', 'fw'], ['P_D', 'pd'],
      ['PLEAT_COUNT', 'pcount'], ['PPI', 'ppi'], ['GRATING', 'grating'],
      ['M_T', 'mt'], ['M_DP', 'mdp'], ['LIN_FRAC', 'linf'],
      ['A_CONST', 'aconst'], ['B_CONST', 'bconst'],
      ['M_PERM', 'mperm'], ['LIN_FRAC_PERM', 'linfp'],
      ['V_FACE', 'vface'], ['Q_VOL', 'qvol'], ['RHO', 'rho'], ['KP_CAL', 'kpcal'],
      ['fe-vel-a', 'fva'], ['fe-vel-b', 'fvb'],
      ['fe-paste-a', 'fda'], ['fe-paste-b', 'fdb'],
      ['fe-a-e1', 'fae1'], ['fe-a-e2', 'fae2'], ['fe-a-e3', 'fae3'],
      ['fe-b-e1', 'fbe1'], ['fe-b-e2', 'fbe2'], ['fe-b-e3', 'fbe3'],
    ];

    function buildShareURL() {
      const params = new URLSearchParams();
      // Toggle modes so the shared link restores the exact view.
      params.set('units', S.units);
      params.set('media', S.mediaMode);
      params.set('flow', S.flowMode);
      params.set('pleat', S.pleatMode);
      params.set('femode', FE.mode);
      // Every raw input value (as displayed in the current unit system).
      for (const [id, key] of SHARE_FIELDS) {
        const el = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | null;
        if (el) params.set(key, el.value);
      }
      const base = window.location.origin + window.location.pathname;
      return base + '?' + params.toString();
    }

    function restoreFromURL(qp: URLSearchParams) {
      // A full share link is identified by the presence of the units marker.
      if (!qp.has('units')) return false;

      // Units first: switching resets inputs to that system's defaults, so it
      // must happen before we write the shared values on top.
      const u = qp.get('units');
      if (u === 'imperial' || u === 'metric') setUnits(u);

      for (const [id, key] of SHARE_FIELDS) {
        if (!qp.has(key)) continue;
        const el = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | null;
        if (el) el.value = qp.get(key) as string;
      }

      const media = qp.get('media');
      if (media === 'dp' || media === 'ab' || media === 'perm') setMediaMode(media);
      const flow = qp.get('flow');
      if (flow === 'face' || flow === 'cfm') setFlowMode(flow);
      const pleat = qp.get('pleat');
      if (pleat === 'count' || pleat === 'ppi') setPleatMode(pleat);
      const femode = qp.get('femode');
      if (femode === 'hepa' || femode === 'pre') setFEMode(femode);

      // Reproduce the fractional-efficiency projection if inputs were shared.
      let canProject: boolean;
      if (FE.mode === 'pre') {
        canProject = ASHRAE_BINS.every((b) =>
          isFinite(parseFloat((document.getElementById(`fe-a-${b.key}`) as HTMLInputElement).value)) &&
          isFinite(parseFloat((document.getElementById(`fe-b-${b.key}`) as HTMLInputElement).value))
        );
      } else {
        const feA = (document.getElementById('fe-paste-a') as HTMLTextAreaElement).value.trim();
        const feB = (document.getElementById('fe-paste-b') as HTMLTextAreaElement).value.trim();
        canProject = !!(feA && feB);
      }
      if (canProject) {
        try { runFEProjection(); } catch (e) { console.error('FE restore error:', e); }
      }
      return true;
    }

    const qp = new URLSearchParams(window.location.search);
    const restored = restoreFromURL(qp);

    if (!restored) {
      // Prefill from the pleat counter's "Simulate performance" handoff
      // (?fh=&fw=&pd=&count=&grating= — all imperial units)
      const prefill = (id: string, key: string, lo: number, hi: number) => {
        const v = parseFloat(qp.get(key) ?? '');
        if (isFinite(v) && v >= lo && v <= hi) {
          (document.getElementById(id) as HTMLInputElement).value = String(v);
        }
      };
      prefill('F_H', 'fh', 0.1, 1000);
      prefill('F_W', 'fw', 0.1, 1000);
      prefill('P_D', 'pd', 0.01, 100);
      prefill('GRATING', 'grating', 0, 90);
      if (qp.has('count')) {
        prefill('PLEAT_COUNT', 'count', 1, 10000);
        setPleatMode('count');
      }
    }

    // Share button — copies a link encoding all inputs to the clipboard.
    const shareBtnEl = document.getElementById('share-btn') as HTMLElement;
    const shareStatusEl = document.getElementById('share-status') as HTMLElement;
    let shareResetTimer: ReturnType<typeof setTimeout> | null = null;
    const setShareStatus = (msg: string, ok: boolean) => {
      shareStatusEl.textContent = msg;
      shareStatusEl.classList.toggle('ok', ok);
      shareStatusEl.classList.toggle('err', !ok);
      if (shareResetTimer) clearTimeout(shareResetTimer);
      shareResetTimer = setTimeout(() => {
        shareStatusEl.textContent = '';
        shareStatusEl.classList.remove('ok', 'err');
      }, 4000);
    };
    const shareHandler = async () => {
      const url = buildShareURL();
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(url);
          setShareStatus('Link copied to clipboard', true);
          return;
        }
        throw new Error('clipboard unavailable');
      } catch {
        try {
          const ta = document.createElement('textarea');
          ta.value = url;
          ta.style.position = 'fixed';
          ta.style.top = '-9999px';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.focus();
          ta.select();
          const ok = document.execCommand('copy');
          document.body.removeChild(ta);
          if (ok) { setShareStatus('Link copied to clipboard', true); return; }
          throw new Error('execCommand failed');
        } catch {
          try { window.history.replaceState(null, '', url); } catch { /* noop */ }
          setShareStatus('Copy blocked — link placed in the address bar', false);
        }
      }
    };
    shareBtnEl.addEventListener('click', shareHandler);

    render();

    return () => {
      if (chart) chart.destroy();
      if (FE.chart) FE.chart.destroy();
      feToggleEl.removeEventListener('click', feToggleHandler);
      feRunEl.removeEventListener('click', runFEProjection);
      feClearEl.removeEventListener('click', feClearHandler);
      feHepaEl.removeEventListener('click', feHepaHandler);
      fePreEl.removeEventListener('click', fePreHandler);
      feInputHandlers.forEach(([el, fn]) => el.removeEventListener('input', fn));
      unitListeners.forEach(([el, fn]) => el.removeEventListener('click', fn));
      shareBtnEl.removeEventListener('click', shareHandler);
      if (shareResetTimer) clearTimeout(shareResetTimer);
    };
  }, [chartLoaded]);

  return (
    <>
      <Script
        src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"
        strategy="afterInteractive"
        onLoad={() => setChartLoaded(true)}
      />
      <style dangerouslySetInnerHTML={{ __html: CALC_CSS }} />

      <div id="pfc-root">
        <div className="pfc-breadcrumb">
          <Link href="/calculators">&larr; Calculators</Link>
        </div>

        <header>
          <div className="title-block">
            <h1>
              Pleated <span className="accent">Filter</span> <em>Calculator</em>
            </h1>
            <p>Initial Pressure Drop Model · Sothen &amp; Tatarchuk 2009</p>
          </div>
          <div className="meta-block">
            <strong>
              ΔP<sub>T</sub> = ½ρ[(2K<sub>G</sub>)V₂² + (K<sub>C</sub>+K<sub>E</sub>+K<sub>P</sub>)V₃²] + AV₄ + BV₄²
            </strong>
            Seven-region flow model<br />
            Idelchik friction coefficients<br />
            K<sub>P</sub> = 0.11 · (F<sub>HD</sub>/F<sub>D</sub>) · (1/β)<sup>4/3</sup>
          </div>
        </header>

        <main>
          <aside className="inputs">
            <div className="sec">
              <div className="toggle-row" role="radiogroup" aria-label="Unit system">
                <button type="button" data-units="imperial" className="active">Imperial</button>
                <button type="button" data-units="metric">Metric</button>
              </div>
            </div>

            <div className="sec">
              <div className="sec-hd"><span className="num">01</span><h2>Filter geometry</h2></div>

              <div className="row">
                <label>Filter height<span className="sub">along pleat tip</span></label>
                <input type="number" id="F_H" step="0.01" defaultValue="24.016" />
                <span className="unit" data-unit="len">in</span>
              </div>
              <div className="row">
                <label>Filter width<span className="sub">pleating direction</span></label>
                <input type="number" id="F_W" step="0.01" defaultValue="24.016" />
                <span className="unit" data-unit="len">in</span>
              </div>
              <div className="row">
                <label>Pleat depth<span className="sub">depth of single pleat</span></label>
                <input type="number" id="P_D" step="0.01" defaultValue="0.984" />
                <span className="unit" data-unit="len">in</span>
              </div>

              <div className="toggle-row" style={{ marginTop: 8 }} role="radiogroup" aria-label="Pleat density input mode">
                <button type="button" data-pleatmode="count">Pleat count</button>
                <button type="button" data-pleatmode="ppi" className="active">PPI (per inch)</button>
              </div>

              <div id="pleatmode-count" style={{ display: 'none' }}>
                <div className="row">
                  <label>Pleat count<span className="sub">total pleats across filter width</span></label>
                  <input type="number" id="PLEAT_COUNT" step="1" defaultValue="25" min="1" />
                  <span className="unit">–</span>
                </div>
              </div>
              <div id="pleatmode-ppi">
                <div className="row">
                  <label>PPI<span className="sub">pleats per inch of filter width</span></label>
                  <input type="number" id="PPI" step="0.1" defaultValue="5" min="0.1" />
                  <span className="unit">1/in</span>
                </div>
              </div>

              <div className="row">
                <label>Grating blockage<span className="sub">front + back face obstruction</span></label>
                <input type="number" id="GRATING" step="0.1" min="0" max="90" defaultValue="22.5" />
                <span className="unit">%</span>
              </div>
              <div className="input-note">Note: 0.1&quot; glue beads spaced 1&quot; apart ≈ 10% blockage.</div>
            </div>

            <div className="sec">
              <div className="sec-hd"><span className="num">02</span><h2>Media properties</h2></div>

              <div className="row">
                <label>Media thickness<span className="sub">single layer</span></label>
                <input type="number" id="M_T" step="0.001" defaultValue="0.015" />
                <span className="unit">in</span>
              </div>

              <div className="toggle-row" style={{ marginTop: 6 }} role="radiogroup" aria-label="Media dP input mode">
                <button type="button" data-mediamode="dp" className="active">ΔP @ 10.5 fpm</button>
                <button type="button" data-mediamode="ab">A &amp; B direct</button>
                <button type="button" data-mediamode="perm">Perm @ 125 Pa</button>
              </div>

              <div id="mode-dp">
                <div className="row">
                  <label>Media ΔP at 10.5 fpm<span className="sub">flat-sheet, clean, at V<sub>ref</sub> = 10.5 fpm</span></label>
                  <input type="number" id="M_DP" step="0.01" defaultValue="2.5" />
                  <span className="unit">mmWC</span>
                </div>
                <div className="row">
                  <label>Linear fraction<span className="sub">0 = all V², 1 = all V</span></label>
                  <input type="number" id="LIN_FRAC" step="0.01" min="0" max="1" defaultValue="0.99" />
                  <span className="unit">–</span>
                </div>
              </div>

              <div id="mode-ab" style={{ display: 'none' }}>
                <div className="row">
                  <label>Media constant A<span className="sub">viscous</span></label>
                  <input type="number" id="A_CONST" step="0.00001" defaultValue="-0.001325" />
                  <span className="unit">inWC·min/ft</span>
                </div>
                <div className="row">
                  <label>Media constant B<span className="sub">inertial</span></label>
                  <input type="number" id="B_CONST" step="0.0000001" defaultValue="0.000009814" />
                  <span className="unit">inWC·min²/ft²</span>
                </div>
              </div>

              <div id="mode-perm" style={{ display: 'none' }}>
                <div className="row">
                  <label>Permeability @ 125 Pa<span className="sub">flat-sheet, clean (EN ISO 9237 / ASTM D737)</span></label>
                  <input type="number" id="M_PERM" step="0.1" defaultValue="85" min="0.1" />
                  <span className="unit">L/m²/s</span>
                </div>
                <div className="row">
                  <label>Linear fraction<span className="sub">0 = all V², 1 = all V (≈1 for Darcy regime)</span></label>
                  <input type="number" id="LIN_FRAC_PERM" step="0.01" min="0" max="1" defaultValue="1.00" />
                  <span className="unit">–</span>
                </div>
                <div className="input-note">
                  Permeability of <strong>85 L/m²/s</strong> = velocity of 0.085 m/s (8.5 cm/s) at 125 Pa.
                  Use linear fraction = 1.0 for pure viscous (Darcy) behavior — typical for clean filter media at low Re.
                </div>
              </div>
            </div>

            <div className="sec">
              <div className="sec-hd"><span className="num">03</span><h2>Flow conditions</h2></div>
              <div className="toggle-row" role="radiogroup" aria-label="Flow input mode">
                <button type="button" data-flowmode="face">Face velocity</button>
                <button type="button" data-flowmode="cfm" className="active">Volumetric flow</button>
              </div>

              <div id="flowmode-face" style={{ display: 'none' }}>
                <div className="row">
                  <label>Face velocity<span className="sub">at filter face</span></label>
                  <input type="number" id="V_FACE" step="1" defaultValue="527" />
                  <span className="unit" data-unit="vel">fpm</span>
                </div>
              </div>
              <div id="flowmode-cfm">
                <div className="row">
                  <label>Volumetric flow<span className="sub">through filter</span></label>
                  <input type="number" id="Q_VOL" step="10" defaultValue="2000" />
                  <span className="unit" data-unit="vol">CFM</span>
                </div>
              </div>

              <div className="row">
                <label>Air density<span className="sub">at operating temp</span></label>
                <input type="number" id="RHO" step="0.001" defaultValue="0.0725" />
                <span className="unit" data-unit="rho">lb/ft³</span>
              </div>
            </div>

            <div className="sec">
              <div className="sec-hd"><span className="num">04</span><h2>Advanced</h2></div>
              <div className="row">
                <label>K<sub>P</sub> calibration<span className="sub">scales pleat friction term</span></label>
                <input type="number" id="KP_CAL" step="0.01" min="0.01" max="5" defaultValue="1.00" />
                <span className="unit">×</span>
              </div>
              <div className="input-note">
                1.0 = dissertation formula. Lower (~0.3–0.5) for filters where the unmodified formula
                over-predicts pleat friction and forces non-physical media constants.
              </div>
            </div>
          </aside>

          <section className="outputs">
            <div className="note-strip">
              <span className="nlbl">Model domain</span>
              Validated for 20&quot;×20&quot; faces with depths 1–4&quot;, pleat counts 12–60, media thickness &lt; 2 mm,
              face velocity &lt; 1000 fpm. Extrapolations beyond these bounds are flagged below.
            </div>

            <div id="warn-box"></div>

            <div className="out-grid">
              <div className="out-cell hero">
                <div className="lbl">Total filter ΔP</div>
                <div className="val">
                  <span id="o_dpT">—</span>
                </div>
              </div>
              <div className="out-cell accent-cell">
                <div className="lbl">Media area</div>
                <div className="val">
                  <span id="o_area">—</span>
                </div>
              </div>

              <div className="out-cell">
                <div className="lbl">Pleat pitch β</div>
                <div className="val">
                  <span id="o_beta">—</span>
                  <span className="unit-s">°</span>
                </div>
              </div>
              <div className="out-cell">
                <div className="lbl">Pleat opening P<sub>O</sub></div>
                <div className="val">
                  <span id="o_po">—</span>
                  <span className="unit-s" data-unit="smlen">in</span>
                </div>
              </div>
              <div className="out-cell">
                <div className="lbl">Volumetric flow</div>
                <div className="val">
                  <span id="o_q">—</span>
                  <span className="unit-s" data-unit="vol">CFM</span>
                </div>
              </div>
              <div className="out-cell">
                <div className="lbl">Media velocity V₄</div>
                <div className="val">
                  <span id="o_v4">—</span>
                  <span className="unit-s" data-unit="vel">fpm</span>
                </div>
              </div>

              <div className="out-cell">
                <div className="lbl" id="o_ppi_lbl">Pleat count (input)</div>
                <div className="val">
                  <span id="o_ppi">—</span>
                  <span className="unit-s" id="o_ppi_unit">pleats</span>
                </div>
              </div>
              <div className="out-cell">
                <div className="lbl">Optimal pleat count</div>
                <div className="val">
                  <span id="o_optppi">—</span>
                  <span className="unit-s">pleats</span>
                </div>
              </div>
              <div className="out-cell">
                <div className="lbl">Optimal PPI</div>
                <div className="val">
                  <span id="o_optppi_density">—</span>
                  <span className="unit-s">1/in</span>
                </div>
              </div>
              <div className="out-cell">
                <div className="lbl">ΔP at optimum</div>
                <div className="val">
                  <span id="o_dpopt">—</span>
                  <span className="unit-s">inWC</span>
                </div>
              </div>
              <div className="out-cell">
                <div className="lbl">K<sub>P</sub> (pleat coef.)</div>
                <div className="val">
                  <span id="o_kp">—</span>
                  <span className="unit-s">–</span>
                </div>
              </div>
            </div>

            <div className="chart-box">
              <div className="chart-hd">
                <h3>Pleating curve · ΔP vs. pleat count</h3>
                <div className="chart-sub">U-curve · media + viscous + grating</div>
              </div>
              <div className="chart-wrap">
                <canvas id="chart-ppi"></canvas>
              </div>
            </div>

            <div className="breakdown">
              <div className="breakdown-hd">ΔP breakdown by term</div>
              <div className="bar-container" id="bar-bd"></div>
              <div className="legend" id="legend-bd"></div>
            </div>

            <div className="fe-section" id="fe-section">
              <div className="fe-toggle" id="fe-toggle">
                <h3>
                  Fractional efficiency projector
                  <span className="fe-sub">Pierce velocity-scaling · TSI 3160 data</span>
                </h3>
                <span className="fe-caret">›</span>
              </div>
              <div className="fe-body">
                <div className="note-strip" id="fe-howto">
                  <span className="nlbl">How it works</span>
                  Paste two fractional efficiency datasets at different face velocities.
                  The tool fits each curve to Pierce&apos;s quadratic model (ln Pen = A(ln D)² + B ln D + C),
                  back-calculates the velocity exponent N, and projects the penetration
                  curve to the media velocity V<sub>4</sub> computed by this calculator.
                </div>

                <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--moss)' }}>
                    Mode
                  </span>
                  <div className="toggle-row" style={{ marginBottom: 0, maxWidth: 380, flex: 1, minWidth: 260 }}>
                    <button id="fe-mode-hepa" className="active" data-mode="hepa">HEPA · 0.05–0.4 µm · global N</button>
                    <button id="fe-mode-pre" data-mode="pre">Prefilter · ASHRAE E1–E3 · local N</button>
                  </div>
                  <span id="fe-mode-hint" style={{ fontSize: 10, color: 'var(--moss)', fontStyle: 'italic', flexBasis: '100%' }}>
                    HEPA: single velocity exponent from U-curve fit (Pierce). Use for sub-micron 3160 data.
                  </span>
                </div>

                <div className="fe-paste-grid">
                  <div className="fe-paste-box">
                    <label>Dataset A · Low velocity</label>
                    <div className="fe-vel-row">
                      <span className="fe-vel-lbl">Face velocity</span>
                      <input type="number" id="fe-vel-a" step="0.001" defaultValue="2.003" />
                      <span className="fe-vel-unit">cm/s</span>
                    </div>
                    <textarea
                      className="fe-paste-textarea"
                      id="fe-paste-a"
                      placeholder="Paste data starting with the column header row..."
                      defaultValue={`D (µm) \tEff. (%)\tPen. (%)\tP-95% (%)\tResistance (mmH2O) \tC-up (1/cm³)\tC-dn (1/cm³)\tCounts-dn
0.07\t99.995139\t0.004862\t0.005105\t10.696250\t2.07E+05\t1.01E+01\t1.51E+03
0.09\t99.992376\t0.007624\t0.007933\t10.722750\t1.80E+05\t1.37E+01\t2.32E+03
0.11\t99.987745\t0.012255\t0.012736\t10.717250\t1.34E+05\t1.64E+01\t2.47E+03
0.14\t99.976530\t0.023471\t0.023770\t10.717250\t2.79E+05\t6.19E+01\t9.23E+03
0.2\t99.981590\t0.018410\t0.018880\t10.739750\t2.19E+05\t4.04E+01\t6.11E+03
0.25\t99.984553\t0.015447\t0.016084\t10.675500\t9.90E+04\t1.50E+01\t2.28E+03
0.3\t99.990293\t0.009708\t0.010407\t10.724250\t4.82E+04\t4.78E+00\t7.41E+02`}
                    />
                    <div className="fe-ashrae-block">
                      {ASHRAE_BINS.map((b) => (
                        <div className="fe-erow" key={b.key}>
                          <span className="fe-elbl">
                            {b.label} efficiency
                            <span className="fe-erange">
                              {b.lo}–{b.hi} µm → charts at {volumeMeanDiameter(b.lo, b.hi).toFixed(3)} µm
                            </span>
                          </span>
                          <input
                            type="number"
                            id={`fe-a-${b.key}`}
                            step="0.1"
                            min="0"
                            max="100"
                            defaultValue={ASHRAE_DEFAULTS.a[b.key]}
                          />
                          <span className="fe-eunit">%</span>
                        </div>
                      ))}
                      <div className="fe-ashrae-note">
                        Charted at the volume-mean diameter of each range (equal-volume sphere).
                      </div>
                    </div>
                  </div>
                  <div className="fe-paste-box">
                    <label>Dataset B · High velocity</label>
                    <div className="fe-vel-row">
                      <span className="fe-vel-lbl">Face velocity</span>
                      <input type="number" id="fe-vel-b" step="0.001" defaultValue="5.339" />
                      <span className="fe-vel-unit">cm/s</span>
                    </div>
                    <textarea
                      className="fe-paste-textarea"
                      id="fe-paste-b"
                      placeholder="Paste data starting with the column header row..."
                      defaultValue={`D (µm) \tEff. (%)\tPen. (%)\tP-95% (%)\tResistance (mmH2O) \tC-up (1/cm³)\tC-dn (1/cm³)\tCounts-dn
0.07\t99.918725\t0.081275\t0.081763\t28.659667\t8.24E+04\t6.71E+01\t1.04E+04
0.09\t99.892137\t0.107863\t0.107863\t28.732667\t7.08E+04\t7.64E+01\t1.23E+04
0.11\t99.866019\t0.133981\t0.135628\t28.752667\t5.18E+04\t6.94E+01\t1.04E+04
0.14\t99.852168\t0.147832\t0.147832\t28.668000\t1.28E+05\t1.90E+02\t2.84E+04
0.2\t99.910370\t0.089630\t0.089630\t28.689000\t8.91E+04\t8.02E+01\t1.20E+04
0.25\t99.944497\t0.055503\t0.057604\t28.804000\t3.29E+04\t1.79E+01\t2.71E+03
0.3\t99.967221\t0.032779\t0.034843\t28.779000\t1.94E+04\t6.44E+00\t9.80E+02`}
                    />
                    <div className="fe-ashrae-block">
                      {ASHRAE_BINS.map((b) => (
                        <div className="fe-erow" key={b.key}>
                          <span className="fe-elbl">
                            {b.label} efficiency
                            <span className="fe-erange">
                              {b.lo}–{b.hi} µm → charts at {volumeMeanDiameter(b.lo, b.hi).toFixed(3)} µm
                            </span>
                          </span>
                          <input
                            type="number"
                            id={`fe-b-${b.key}`}
                            step="0.1"
                            min="0"
                            max="100"
                            defaultValue={ASHRAE_DEFAULTS.b[b.key]}
                          />
                          <span className="fe-eunit">%</span>
                        </div>
                      ))}
                      <div className="fe-ashrae-note">
                        Charted at the volume-mean diameter of each range (equal-volume sphere).
                      </div>
                    </div>
                  </div>
                </div>

                <div className="fe-actions">
                  <button className="fe-btn" id="fe-run">Fit &amp; project to V₄</button>
                  <button className="fe-btn secondary" id="fe-clear">Clear</button>
                  <span className="fe-parse-status" id="fe-status">
                    Ready · enter velocities, paste data, and fit
                  </span>
                </div>

                <div id="fe-results" style={{ display: 'none' }}>
                  <div className="fe-summary">
                    <div className="fe-cell">
                      <div className="fe-cell-lbl">Dataset A · V<sub>A</sub></div>
                      <div className="fe-cell-val">
                        <span id="fe-va">—</span>{' '}
                        <span style={{ fontSize: 11, color: 'var(--moss)' }}>cm/s</span>
                      </div>
                      <div className="fe-cell-det">
                        MPPS: <span id="fe-mppsA">—</span> µm · Pen: <span id="fe-pmppsA">—</span> %
                      </div>
                    </div>
                    <div className="fe-cell">
                      <div className="fe-cell-lbl">Dataset B · V<sub>B</sub></div>
                      <div className="fe-cell-val">
                        <span id="fe-vb">—</span>{' '}
                        <span style={{ fontSize: 11, color: 'var(--moss)' }}>cm/s</span>
                      </div>
                      <div className="fe-cell-det">
                        MPPS: <span id="fe-mppsB">—</span> µm · Pen: <span id="fe-pmppsB">—</span> %
                      </div>
                    </div>
                    <div className="fe-cell">
                      <div className="fe-cell-lbl" id="fe-n-lbl">Global N</div>
                      <div className="fe-cell-val"><span id="fe-nglobal">—</span></div>
                      <div className="fe-cell-det" id="fe-n-det">velocity exponent · Pierce eq. 4</div>
                    </div>
                    <div className="fe-cell highlight">
                      <div className="fe-cell-lbl">Projected · V<sub>4</sub></div>
                      <div className="fe-cell-val">
                        <span id="fe-vt">—</span>{' '}
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)' }}>cm/s</span>
                      </div>
                      <div className="fe-cell-det">
                        MPPS: <span id="fe-mppsT">—</span> µm · Pen: <span id="fe-pmppsT">—</span> %
                      </div>
                    </div>
                  </div>

                  <div className="fe-merv-box" id="fe-merv-box" style={{ display: 'none' }}>
                    <div className="fe-merv-badge">
                      <span className="fe-merv-lbl">MERV</span>
                      <span className="fe-merv-val" id="fe-merv-val">—</span>
                    </div>
                    <div className="fe-merv-detail">
                      <div className="fe-merv-desc" id="fe-merv-desc">
                        Projected rating from the efficiency at V<sub>4</sub>.
                      </div>
                      <div className="fe-merv-e" id="fe-merv-e"></div>
                      <div className="fe-merv-ref">ASHRAE 52.2-2017 · Table 12-1</div>
                    </div>
                  </div>

                  <div className="fe-chart-box">
                    <div className="chart-hd" style={{ marginBottom: 8 }}>
                      <h3 style={{ fontSize: 16 }}>Fractional penetration curves</h3>
                      <div className="chart-sub">Log-log · quadratic fits</div>
                    </div>
                    <div className="fe-chart-wrap">
                      <canvas id="fe-chart"></canvas>
                    </div>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table className="fe-table" id="fe-table">
                      <thead>
                        <tr>
                          <th>D (µm)</th>
                          <th>Pen A (%)</th>
                          <th>Pen B (%)</th>
                          <th>N</th>
                          <th>Pen @ V₄ (%)</th>
                          <th>Eff @ V₄ (%)</th>
                        </tr>
                      </thead>
                      <tbody id="fe-tbody"></tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <div className="share-bar">
              <div className="share-txt">
                <div className="share-title">Share this configuration</div>
                <div className="share-desc">
                  Copies a link that restores every input — geometry, media, flow,
                  advanced settings, and the fractional efficiency datasets.
                </div>
              </div>
              <button type="button" className="share-btn" id="share-btn">
                Copy shareable link
              </button>
              <span className="share-status" id="share-status"></span>
            </div>
          </section>
        </main>

        <footer>
          <div>Based on <em>Ryan A. Sothen, 2009 Auburn Dissertation</em></div>
          <div>v1.0 · open source · <span id="timestamp"></span></div>
        </footer>
      </div>
    </>
  );
}

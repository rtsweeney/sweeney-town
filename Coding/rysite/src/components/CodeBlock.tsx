// A code listing with line numbers, highlighted on the server (src/lib/highlight.ts)
// so no highlighter ships to the browser. Line numbers are CSS counters, so
// copying the code copies only the code.

import { tokenize } from '@/lib/highlight';

export default function CodeBlock({ source, label }: { source: string; label: string }) {
  const lines = tokenize(source);
  return (
    <pre className="code-pre" tabIndex={0} aria-label={label}>
      <code>
        {lines.map((segs, n) => (
          <span key={n} className="code-line">
            {segs.map((s, k) => (s.kind === 'code' ? s.text : <span key={k} className={`tok-${s.kind}`}>{s.text}</span>))}
            {'\n'}
          </span>
        ))}
      </code>
    </pre>
  );
}

import Link from 'next/link';

interface CalculatorLayoutProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

export default function CalculatorLayout({ title, description, children }: CalculatorLayoutProps) {
  return (
    <main>
      <div className="container">
        <div className="page-header">
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            <Link href="/tools" style={{ color: 'var(--accent-secondary)' }}>Tools</Link>
            {' / '}
            {title}
          </p>
          <h1 className="section-title">
            <span className="gradient-text">{title}</span>
          </h1>
          <p className="section-subtitle" style={{ marginBottom: 0 }}>{description}</p>
        </div>

        <div className="calculator-wrapper">
          <div className="calculator-card">
            {children}
          </div>
        </div>
      </div>
    </main>
  );
}

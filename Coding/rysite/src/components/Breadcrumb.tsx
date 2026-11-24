import Link from 'next/link';

interface Crumb {
  label: string;
  href: string;
}

/**
 * "All apps / <this app>" — the one breadcrumb every app page shares.
 * `trail` adds levels in between, e.g. a visual inside Reactive Fun Backgrounds.
 */
export default function Breadcrumb({ current, trail = [] }: { current: string; trail?: Crumb[] }) {
  const crumbs: Crumb[] = [{ label: 'All apps', href: '/apps' }, ...trail];
  return (
    <nav aria-label="Breadcrumb" className="crumbs">
      {crumbs.map((c) => (
        <span key={c.href} className="crumbs-item">
          <Link href={c.href}>{c.label}</Link>
          <span className="crumbs-sep" aria-hidden="true">/</span>
        </span>
      ))}
      <span aria-current="page">{current}</span>
    </nav>
  );
}

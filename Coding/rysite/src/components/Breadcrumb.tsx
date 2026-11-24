import Link from 'next/link';

interface Crumb {
  label: string;
  href: string;
}

const ALL_APPS: Crumb = { label: 'All apps', href: '/apps' };

/**
 * "All apps / <this app>" — the breadcrumb every app page shares. `root`
 * swaps the first level (CAD pages use CAD & hardware); `trail` adds levels
 * in between, e.g. a visual inside Reactive Fun Backgrounds.
 */
export default function Breadcrumb({ current, trail = [], root = ALL_APPS }: { current: string; trail?: Crumb[]; root?: Crumb }) {
  const crumbs: Crumb[] = [root, ...trail];
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

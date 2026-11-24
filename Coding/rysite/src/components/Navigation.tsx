'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { FEATURED_APPS } from '@/lib/apps';

export default function Navigation() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the mobile menu on navigation, and on Escape.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav className="nav" aria-label="Main">
      <div className="nav-inner">
        <Link href="/" className="nav-brand">
          <span className="gradient-text">sweeney.town</span>
        </Link>

        <button
          type="button"
          className="nav-mobile-toggle"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="site-menu"
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>

        <div id="site-menu" className={`nav-links ${open ? 'open' : ''}`}>
          <span className="nav-group-label">Most used</span>
          {FEATURED_APPS.map((app) => (
            <Link
              key={app.href}
              href={app.href}
              className={`nav-link nav-app accent-${app.accent} ${isActive(app.href) ? 'active' : ''}`}
              aria-current={isActive(app.href) ? 'page' : undefined}
            >
              <span className="nav-app-dot" aria-hidden="true" />
              <span className="nav-app-text">
                <span>{app.shortName}</span>
                <span className="nav-app-tagline">{app.tagline}</span>
              </span>
            </Link>
          ))}

          <span className="nav-divider" aria-hidden="true" />

          <Link
            href="/apps"
            className={`nav-link ${pathname === '/apps' ? 'active' : ''}`}
            aria-current={pathname === '/apps' ? 'page' : undefined}
          >
            All apps
          </Link>
          <Link href="/#about" className="nav-link">
            About
          </Link>
        </div>
      </div>
    </nav>
  );
}

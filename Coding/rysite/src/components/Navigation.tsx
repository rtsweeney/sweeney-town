'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Github, Linkedin, Menu, X } from 'lucide-react';

export default function Navigation() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, []);

  const inTools =
    pathname === '/tools' ||
    pathname.startsWith('/projects') ||
    pathname.startsWith('/calculators') ||
    pathname.startsWith('/planetarium');
  const closeMenu = () => setMobileOpen(false);

  return (
    <nav className="nav" aria-label="Main navigation">
      <div className="nav-inner">
        <Link href="/" className="nav-brand" onClick={closeMenu}>
          sweeney<span>.</span>town
        </Link>

        <button
          className="nav-mobile-toggle"
          onClick={() => setMobileOpen((open) => !open)}
          aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={mobileOpen}
          aria-controls="site-navigation"
        >
          {mobileOpen ? <X size={23} /> : <Menu size={23} />}
        </button>

        <div id="site-navigation" className={`nav-links ${mobileOpen ? 'open' : ''}`}>
          <div className="nav-primary-links">
            <Link href="/tools" className={`nav-link ${inTools ? 'active' : ''}`} onClick={closeMenu}>
              Tools
            </Link>
            <Link href="/#about" className="nav-link" onClick={closeMenu}>
              About
            </Link>
            <Link href="/#field-notes" className="nav-link" onClick={closeMenu}>
              Field notes
            </Link>
          </div>

          <div className="nav-socials">
            <a
              href="https://www.linkedin.com/in/rtsweeney01/"
              target="_blank"
              rel="noopener noreferrer"
              className="nav-social-link"
              aria-label="Ryan Sweeney on LinkedIn"
            >
              <Linkedin size={19} strokeWidth={1.7} />
            </a>
            <a
              href="https://github.com/rtsweeney"
              target="_blank"
              rel="noopener noreferrer"
              className="nav-social-link"
              aria-label="Ryan Sweeney on GitHub"
            >
              <Github size={19} strokeWidth={1.7} />
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
}

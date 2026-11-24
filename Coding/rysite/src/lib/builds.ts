// ── CAD & hardware: things designed to be made ─────────────────────────────────
// The physical counterpart to src/lib/apps.ts. The /cad page, the homepage
// section, the footer and the /apps de-duplication all read from here, so
// adding a model or a device means adding one entry (and, if it has one, a
// visual in src/components/BuildCard.tsx).

import type { AppAccent } from './apps';

export interface BuildLink {
  label: string;
  href: string;
  /** Off-site: opens in a new tab. */
  external?: boolean;
}

export interface BuildEntry {
  slug: string;
  name: string;
  kind: 'CAD' | 'Electronics';
  /** A few words: what it is. */
  tagline: string;
  /** One or two sentences, for cards. */
  summary: string;
  tags: string[];
  accent: AppAccent;
  /** Where the card's title goes: this site's page for it, or the CAD itself. */
  href: string;
  links: BuildLink[];
}

/** Commit of rtsweeney/UV-Index-Meter that public/code/uv-index-meter/ was copied from. */
export const UV_METER_COMMIT = '3ec62533b1f4255fbffa3cecedfd85533ac2ea61';
export const UV_METER_REPO = 'https://github.com/rtsweeney/UV-Index-Meter';

/** The native parts and assemblies, under their original names so the assemblies resolve. */
export const ICE_AX_ZIP = '/cad/indoor-ice-ax/indoor-ice-ax-solidworks.zip';

export const BUILDS: BuildEntry[] = [
  {
    slug: 'uv-index-meter',
    name: 'Beach UV Index Meter',
    kind: 'Electronics',
    tagline: 'An ESP32 and e-ink UV meter for the beach',
    summary:
      'Estimates the UV index every 30 seconds, shows it in a pair of aviators on a tri-color e-ink screen, and keeps a running sun dose for the session, deep-sleeping between samples to spare its battery.',
    tags: ['ESP32', 'E-ink', 'Deep sleep', 'Arduino C++'],
    accent: 'gold',
    href: '/cad/uv-index-meter',
    links: [
      { label: 'Read the code', href: '/cad/uv-index-meter#code' },
      { label: 'GitHub', href: UV_METER_REPO, external: true },
    ],
  },
  {
    slug: 'indoor-ice-ax',
    name: 'Indoor Ice Ax',
    kind: 'CAD',
    tagline: 'An ice ax for the climbing gym',
    summary:
      'An indoor ice ax to use while rock climbing at the gym. Designed so every part fits in exactly one 12" × 24" sheet, held together with McMaster fasteners.',
    tags: ['SOLIDWORKS', 'One 12 × 24 in sheet', 'McMaster fasteners', 'Climbing'],
    accent: 'cyan',
    href: '/cad/indoor-ice-ax',
    links: [
      { label: 'Download the SOLIDWORKS files', href: ICE_AX_ZIP },
      { label: 'GrabCAD', href: 'https://grabcad.com/library/indoor-ice-axe-1', external: true },
    ],
  },
];

/** A link that stays on this site: the build's own page, or its card on /cad. */
export function siteHref(build: BuildEntry): string {
  return build.href.startsWith('/') ? build.href : `/cad#${build.slug}`;
}

/** Every off-site link a build already shows — so the Sanity "Elsewhere" list can skip repeats. */
export const BUILD_EXTERNAL_LINKS = new Set(
  BUILDS.flatMap((b) => [b.href, ...b.links.map((l) => l.href)]).filter((h) => h.startsWith('http')),
);

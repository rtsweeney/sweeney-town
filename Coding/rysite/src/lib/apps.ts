// ── Every app on the site, in one list ─────────────────────────────────────────
// The nav, the homepage, the /apps index and each app's breadcrumb all read
// from here, so adding an app means adding one entry. There is deliberately
// no "calculator" vs "project" field: an app is an app. `featured` marks the
// most-used ones, which get the top of the homepage and their own nav links.
//
// Routes live in src/app/(apps)/<slug>/ — the parentheses make it a route
// group, so the folder adds nothing to the URL and every app sits at /<slug>.
// Old /calculators/* and /projects/* URLs redirect here (next.config.mjs).
//
// Plain data only (icons are names, not components) so client components like
// the nav can import this without pulling icon code into their bundles.

export type AppIconName =
  | 'chart-line'
  | 'beer'
  | 'package'
  | 'scan-line'
  | 'telescope'
  | 'earth'
  | 'trophy'
  | 'sparkles';

export type AppAccent = 'purple' | 'gold' | 'orange' | 'teal' | 'pink' | 'cyan';

export interface AppEntry {
  slug: string;
  href: string;
  /** Full name, as the app's own page titles it. */
  name: string;
  /** Short label for the nav and tight spaces. */
  shortName: string;
  /** A few words: what it does. */
  tagline: string;
  /** One or two sentences: why you'd open it. Homepage cards. */
  summary: string;
  /** The fuller story, including how it's built. The /apps index. */
  description: string;
  tags: string[];
  icon: AppIconName;
  accent: AppAccent;
  featured?: boolean;
}

export const APPS: AppEntry[] = [
  // ── Most used ──
  {
    slug: 'nfl-elo',
    href: '/nfl-elo',
    name: 'NFL Elo Ratings & Predictions',
    shortName: 'NFL Elo',
    tagline: 'Win odds, spreads and playoff chances',
    summary:
      'Who wins this week, and how likely? Win probabilities and spreads for every game, playoff odds, quarterback ratings and live scores.',
    description:
      'FiveThirtyEight retired their NFL Elo model, so I rebuilt it from their published source and re-fit the constants on modern seasons — home field is worth 32 points now, not 65. Every game gets a pre-game win probability and point spread, every team its playoff odds from 20,000 simulated seasons, plus rolling quarterback ratings and scores that update live.',
    tags: ['Elo model', 'Monte Carlo', 'nflverse', 'Live scores'],
    icon: 'chart-line',
    accent: 'purple',
    featured: true,
  },
  {
    slug: 'beers-per-beer',
    href: '/beers-per-beer',
    name: 'Beers Per Beer',
    shortName: 'Beers Per Beer',
    tagline: 'Standard beers in any drink',
    summary:
      'How many beers is that pour, really? Slide any drink to standard beers, then log the night and watch your estimated BAC curve.',
    description:
      'Slide any pour in ounces or millilitres and watch it convert to standard beers live. Log what you actually drink and it sketches your estimated blood alcohol curve against the 0.08 and 0.05 driving limits with a Widmark model. Everything stays in your browser — an estimate, never a breathalyzer.',
    tags: ['Widmark BAC model', 'Custom sliders', 'Local-only'],
    icon: 'beer',
    accent: 'gold',
    featured: true,
  },
  {
    slug: 'carton-packing',
    href: '/carton-packing',
    name: 'Carton Packing Optimizer',
    shortName: 'Carton Packing',
    tagline: 'Box sizes and pallet loads',
    summary:
      'Enter product sizes and annual volumes. It designs the best small set of cartons, tiles them onto pallets and writes supplier-ready specs.',
    description:
      'Enter product dimensions and annual volumes and it designs the best small set of carton sizes, tiles them onto pallets, charts the trade-off of adding or dropping a carton SKU, and writes supplier-ready specs — with printable drawings whose QR codes reopen the exact scenario.',
    tags: ['Optimization', 'Pallet patterns', 'PDF drawings', 'QR scenario links'],
    icon: 'package',
    accent: 'orange',
    featured: true,
  },

  // ── Everything else ──
  {
    slug: 'pleat-counter',
    href: '/pleat-counter',
    name: 'Machine Vision Pleat Counting',
    shortName: 'Pleat Counter',
    tagline: 'Count pleats from a photo',
    summary:
      'Photograph a pleated filter and the browser finds the panel, corrects the perspective and reports pitch, pleats per foot and open area.',
    description:
      'Photograph a filter panel and the browser does the rest — finds the panel, corrects the perspective, counts ridges through frames and grating, and reports pitch, pleats per foot and open area. No upload: the vision runs on your device.',
    tags: ['Computer vision', 'Canvas', 'No server'],
    icon: 'scan-line',
    accent: 'teal',
  },
  {
    slug: 'planetarium',
    href: '/planetarium',
    name: 'Planetarium',
    shortName: 'Planetarium',
    tagline: 'What’s in the sky tonight',
    summary:
      'An interactive star map: see what’s overhead tonight from where you are, pick a constellation and find out exactly where to look.',
    description:
      'An interactive star map. See what’s in the sky tonight from wherever you are, pick a constellation, and find out exactly where to look.',
    tags: ['Astronomy', 'Geolocation', 'Canvas'],
    icon: 'telescope',
    accent: 'purple',
  },
  {
    slug: 'antipode',
    href: '/antipode',
    name: 'Dig Through the Earth',
    shortName: 'Dig Through the Earth',
    tagline: 'Find your antipode',
    summary:
      'Spin a globe half a turn and find the town, country and local time 12,742 km straight down from you.',
    description:
      'Press the big button and a vector globe spins half a turn to your antipode — the town, country and time zone 12,742 km straight down. The whole atlas runs in the browser, so your location never leaves the tab.',
    tags: ['Canvas globe', 'Natural Earth', 'GeoNames', 'Offline lookups'],
    icon: 'earth',
    accent: 'teal',
  },
  {
    slug: 'world-cup',
    href: '/world-cup',
    name: 'World Cup 2026 Tracker',
    shortName: 'World Cup Tracker',
    tagline: 'Bracket, scores and the Golden Boot',
    summary:
      'A one-glance dashboard built for the 2026 World Cup: circular knockout bracket, scores, kickoff times, odds and the Golden Boot race.',
    description:
      'A one-glance dashboard built for the 2026 World Cup. Circular knockout bracket with flags, live scores, kickoff times in ET, venues, betting odds, and the Golden Boot race among players still in contention.',
    tags: ['Live data', 'SVG', 'ESPN API'],
    icon: 'trophy',
    accent: 'gold',
  },
  {
    slug: 'reactive-fun-backgrounds',
    href: '/reactive-fun-backgrounds',
    name: 'Reactive Fun Backgrounds',
    shortName: 'Reactive Backgrounds',
    tagline: 'Music-reactive party visuals',
    summary:
      'Pick a visual, go fullscreen, vibe. Party animations that react to your microphone with beat detection.',
    description:
      'Pick a visual. Go fullscreen. Vibe. Reactive party animations and screensavers that respond to microphone input and beat detection, starting with a pixelated jellyfish aquarium.',
    tags: ['Canvas', 'Web Audio', 'Beat detection'],
    icon: 'sparkles',
    accent: 'cyan',
  },
];

export const FEATURED_APPS = APPS.filter((a) => a.featured);
export const MORE_APPS = APPS.filter((a) => !a.featured);

export function appBySlug(slug: string): AppEntry {
  const app = APPS.find((a) => a.slug === slug);
  if (!app) throw new Error(`No app registered with slug "${slug}"`);
  return app;
}

export type ToolVisual =
  | 'nfl'
  | 'beers'
  | 'carton'
  | 'pleat'
  | 'worldcup'
  | 'antipode'
  | 'planetarium'
  | 'reactive';

export interface ToolDefinition {
  name: string;
  href: string;
  discipline: string;
  summary: string;
  tags: string[];
  visual: ToolVisual;
  featured: boolean;
}

export const tools: ToolDefinition[] = [
  {
    name: 'NFL Elo Ratings & Predictions',
    href: '/projects/nfl-elo',
    discipline: 'Sports model',
    summary:
      'Win probabilities, playoff odds, quarterback ratings, and live scores from a rebuilt and re-fit Elo model.',
    tags: ['Elo model', '20k simulations', 'Live scores'],
    visual: 'nfl',
    featured: true,
  },
  {
    name: 'Beers Per Beer',
    href: '/calculators/beers-per-beer',
    discipline: 'Everyday calculator',
    summary:
      'Turn any pour into standard beers, log the night, and see an estimated BAC curve as you go.',
    tags: ['Standard drinks', 'BAC estimate', 'On-device'],
    visual: 'beers',
    featured: true,
  },
  {
    name: 'Carton Packing Optimizer',
    href: '/calculators/carton-packing',
    discipline: 'Industrial optimizer',
    summary:
      'Choose a smarter set of carton sizes, tile pallets, compare SKU counts, and export supplier-ready specs.',
    tags: ['Box sizing', 'Pallet loading', 'Optimization'],
    visual: 'carton',
    featured: true,
  },
  {
    name: 'Machine Vision Pleat Counting',
    href: '/calculators/pleat-counter',
    discipline: 'Computer vision',
    summary:
      'Count pleats from a photo with perspective correction, pitch, pleats per foot, and open-area reporting.',
    tags: ['Computer vision', 'Canvas', 'No upload'],
    visual: 'pleat',
    featured: false,
  },
  {
    name: 'World Cup 2026 Tracker',
    href: '/projects/world-cup',
    discipline: 'Tournament dashboard',
    summary:
      'The bracket, scores, kickoff times, venues, odds, and Golden Boot race in one glanceable dashboard.',
    tags: ['Live data', 'SVG bracket', 'ESPN API'],
    visual: 'worldcup',
    featured: false,
  },
  {
    name: 'Dig Through the Earth',
    href: '/projects/antipode',
    discipline: 'Geography toy',
    summary:
      'Spin a globe to the exact other side of Earth and find the nearest town, country, and time zone.',
    tags: ['Canvas globe', 'Natural Earth', 'Offline lookup'],
    visual: 'antipode',
    featured: false,
  },
  {
    name: 'Planetarium',
    href: '/planetarium',
    discipline: 'Night-sky explorer',
    summary:
      'See what is above you tonight, choose a constellation, and get a direction worth looking in.',
    tags: ['Astronomy', 'Geolocation', 'Canvas'],
    visual: 'planetarium',
    featured: false,
  },
  {
    name: 'Reactive Fun Backgrounds',
    href: '/projects/reactive-fun-backgrounds',
    discipline: 'Audio visual',
    summary:
      'Mic-reactive party visuals and screensavers, starting with a pixelated jellyfish aquarium.',
    tags: ['Web Audio', 'Beat detection', 'Fullscreen'],
    visual: 'reactive',
    featured: false,
  },
];

export const featuredTools = tools.filter((tool) => tool.featured);
export const moreTools = tools.filter((tool) => !tool.featured);

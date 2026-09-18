import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dig Through the Earth — Antipode Finder | Sweeney Town',
  description:
    'Spin a 3D globe straight through the planet and find your antipode: the town and country on the exact opposite side, what time it is there right now, and the nearest major city. Works offline — no location ever leaves your browser.',
  keywords: [
    'antipode map',
    'dig through the earth',
    'antipodes finder',
    'opposite side of the world',
    'what is on the other side of the earth',
    'tunnel through the earth',
    'interactive globe',
  ],
  openGraph: {
    title: 'Dig Through the Earth — Antipode Finder',
    description:
      'Press the button, watch the globe spin half a turn, and see the town, country, local time and nearest big city waiting on the other side.',
    type: 'website',
  },
};

export default function AntipodeLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}

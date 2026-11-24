import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Beers Per Beer — Standard Drink & BAC Calculator | Sweeney Town',
  description:
    'Slide any pour in ounces or millilitres and see how many standard beers it is, live. Log what you drink and it charts your estimated blood alcohol curve against the 0.08 and 0.05 driving limits. Runs entirely in your browser — an estimate, never a breathalyzer.',
  keywords: [
    'beers per beer',
    'standard drink calculator',
    'BAC calculator',
    'blood alcohol calculator',
    'Widmark formula',
    'ABV calculator',
    'alcohol units calculator',
    'oz to mL beer',
    'drink tracker',
  ],
  openGraph: {
    title: 'Beers Per Beer — Standard Drink & BAC Calculator',
    description:
      'How many standard beers is that pour? Slide it out, log the night, and watch your estimated BAC curve against the driving limits.',
    type: 'website',
  },
};

export default function BeersPerBeerLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}

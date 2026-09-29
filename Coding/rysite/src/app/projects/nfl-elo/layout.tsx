import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'NFL Elo Ratings & Predictions — Win Probabilities & Playoff Odds | Sweeney Town',
  description:
    "NFL game predictions from a continuation of FiveThirtyEight's retired Elo model: pre-game win probabilities and point spreads for every game, playoff and division odds from 20,000 simulated seasons, team and quarterback ratings, and live scores.",
  keywords: [
    'NFL Elo ratings',
    'NFL predictions',
    'NFL win probability',
    'NFL playoff odds',
    'FiveThirtyEight Elo model',
    'NFL power rankings',
    'quarterback Elo adjustment',
    'NFL game predictions',
    'NFL model spread',
    'QB VALUE rating',
  ],
  openGraph: {
    title: 'NFL Elo Ratings & Predictions',
    description:
      "Who wins this week, and how likely? Pre-game win probabilities, point spreads and playoff odds from FiveThirtyEight's NFL Elo model, continued and re-fit.",
    type: 'website',
  },
};

export default function NflEloLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}

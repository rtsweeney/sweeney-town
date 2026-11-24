import type { Metadata } from 'next';
import Footer from '@/components/Footer';
import { FeaturedToolCard, ToolIndexList } from '@/components/ToolDirectory';
import { featuredTools, moreTools, tools } from '@/data/tools';

export const metadata: Metadata = {
  title: 'Tools | Sweeney Town',
  description: 'The complete collection of useful web apps, calculators, dashboards, and experiments built by Ryan Sweeney.',
};

export default function ToolsPage() {
  return (
    <main className="tools-page">
      <header className="tools-page-header container">
        <p className="home-kicker"><span aria-hidden="true" /> {tools.length} working tools / one index</p>
        <div>
          <h1>The whole toolbox.</h1>
          <p>
            Engineering utilities, live models, and small experiments. They live together because
            the useful distinction is what you want to do—not what I happened to call the build.
          </p>
        </div>
      </header>

      <section className="featured-section container" aria-labelledby="tools-featured-title">
        <div className="section-heading-row">
          <h2 id="tools-featured-title">Start here.</h2>
          <p>The three I use and recommend most.</p>
        </div>
        <div className="featured-tools-grid">
          {featuredTools.map((tool) => <FeaturedToolCard tool={tool} key={tool.href} />)}
        </div>
      </section>

      <section className="home-tool-index container" aria-labelledby="tools-more-title">
        <div className="section-heading-row">
          <h2 id="tools-more-title">Keep exploring.</h2>
          <p>More working ideas, ready to open.</p>
        </div>
        <ToolIndexList items={moreTools} />
      </section>

      <Footer />
    </main>
  );
}

import Link from 'next/link';
import { ArrowDown, ArrowRight, ArrowUpRight, FileText, Map, Music2 } from 'lucide-react';
import Footer from '@/components/Footer';
import { FeaturedToolCard, ToolIndexList } from '@/components/ToolDirectory';
import { featuredTools, moreTools, tools } from '@/data/tools';

export default function Home() {
  return (
    <main className="home-v2">
      <section className="home-intro container" aria-labelledby="home-title">
        <div className="home-intro-title">
          <p className="home-kicker"><span aria-hidden="true" /> Ryan Sweeney’s working toolbox</p>
          <h1 id="home-title">Useful things.<br /><span>Built properly.</span></h1>
        </div>
        <div className="home-intro-copy">
          <p>
            Practical web apps for engineering math, sports questions, and problems I couldn’t
            leave alone. Open one and put it to work—no account, no install, no detour through a pitch deck.
          </p>
          <Link href="#about" className="text-link">
            The person behind the tools <ArrowDown size={17} />
          </Link>
        </div>
      </section>

      <section className="featured-section container" aria-labelledby="featured-title">
        <div className="section-heading-row">
          <h2 id="featured-title">The tools I reach for most.</h2>
          <p>Real calculations, visible assumptions, useful output.</p>
        </div>
        <div className="featured-tools-grid">
          {featuredTools.map((tool) => <FeaturedToolCard tool={tool} key={tool.href} />)}
        </div>
      </section>

      <section className="home-tool-index container" aria-labelledby="more-tools-title">
        <div className="section-heading-row">
          <h2 id="more-tools-title">More from the workbench.</h2>
          <Link href="/tools" className="text-link">
            All {tools.length} tools <ArrowRight size={17} />
          </Link>
        </div>
        <ToolIndexList items={moreTools} />
      </section>

      <section className="about-band" id="about" aria-labelledby="about-title">
        <div className="container about-grid">
          <div className="about-heading">
            <p className="about-label">ABOUT THE MAKER</p>
            <h2 id="about-title">I build the tool I wish already existed.</h2>
          </div>
          <div className="about-copy">
            <p className="about-lede">
              I’m Ryan, an industrial manufacturing builder who learns by making the tool, rig,
              or system myself—usually going deeper than the job strictly needs.
            </p>
            <p>
              That instinct turns into packing optimizers, computer-vision utilities, sports models,
              and the occasional browser toy. I care about the math, but also about whether the result
              is understandable and the thing holds up at the edges. I test before I trust.
            </p>
            <p>
              Away from the screen, family comes first. Then festivals, lifting, and time-trial cycling—
              preferably with something hard to chase.
            </p>
            <div className="about-principles" aria-label="How I build">
              <span><strong>Problem first.</strong> Useful before clever.</span>
              <span><strong>Proof over vibes.</strong> Test the edge cases.</span>
              <span><strong>Open by default.</strong> No gatekeeping the good stuff.</span>
            </div>
            <div className="about-actions">
              <a href="/resume.pdf" target="_blank" rel="noopener noreferrer" className="about-resume">
                <FileText size={18} /> Résumé <ArrowUpRight size={17} />
              </a>
              <a href="https://github.com/rtsweeney" target="_blank" rel="noopener noreferrer" className="text-link">
                GitHub <ArrowUpRight size={17} />
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="field-notes container" id="field-notes" aria-labelledby="field-notes-title">
        <div className="section-heading-row">
          <h2 id="field-notes-title">Outside the toolbox.</h2>
          <p>A couple of less calculated records.</p>
        </div>
        <div className="field-notes-grid">
          <Link href="/concerts" className="field-note">
            <Music2 size={29} strokeWidth={1.5} aria-hidden="true" />
            <span>
              <strong>Concerts</strong>
              <small>Shows, ratings, and reviews—from dive bars to arenas.</small>
            </span>
            <ArrowUpRight size={23} aria-hidden="true" />
          </Link>
          <Link href="/travel" className="field-note">
            <Map size={29} strokeWidth={1.5} aria-hidden="true" />
            <span>
              <strong>Travel</strong>
              <small>Places visited, mapped out with photos and notes.</small>
            </span>
            <ArrowUpRight size={23} aria-hidden="true" />
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}

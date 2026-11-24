import Image from 'next/image';
import Link from 'next/link';
import { FileText, MapIcon, Music } from 'lucide-react';
import Footer from '@/components/Footer';
import AppIcon from '@/components/AppIcon';
import NflPreview from '@/components/home/NflPreview';
import BeerPreview from '@/components/home/BeerPreview';
import CartonPreview from '@/components/home/CartonPreview';
import { FEATURED_APPS, MORE_APPS } from '@/lib/apps';
import { getNflPreview } from '@/lib/nflPreview';
import { HOME_FIELD } from '@/app/(apps)/nfl-elo/engine';

export default function Home() {
  // Static page: this is the build's clock. The matchup re-checks in the browser.
  const renderedAt = Date.now();
  const nfl = getNflPreview(renderedAt);
  const previews: Record<string, React.ReactNode> = {
    'nfl-elo': <NflPreview data={nfl} renderedAt={renderedAt} />,
    'beers-per-beer': <BeerPreview />,
    'carton-packing': <CartonPreview />,
  };
  const n = (v: number) => v.toLocaleString('en-US');

  return (
    <main>
      <div className="page-bg" />

      <section className="container home-hero">
        <p className="home-eyebrow animate-in animate-delay-1">Built by Ryan Sweeney</p>
        <h1 className="home-title animate-in animate-delay-2">
          Tools I built because I <span className="gradient-text">needed&nbsp;them.</span>
        </h1>
        <p className="home-lede animate-in animate-delay-3">
          Live NFL predictions, a standard-drink calculator and a carton optimizer &mdash; plus a few
          experiments. Free, no sign-up, and everything runs in your browser.
        </p>
      </section>

      <section className="container" aria-labelledby="most-used">
        <h2 id="most-used" className="home-label">Most used</h2>
        <div className="feature-grid">
          {FEATURED_APPS.map((app) => (
            <article key={app.slug} className={`feature-card accent-${app.accent}`}>
              <div className="feature-preview">{previews[app.slug]}</div>
              <div className="feature-body">
                <h3 className="feature-title">
                  <Link href={app.href} className="stretched-link">{app.name}</Link>
                </h3>
                <p className="feature-summary">{app.summary}</p>
                <span className="feature-cta" aria-hidden="true">
                  Open {app.shortName} <span className="arrow">&rarr;</span>
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="container home-section" aria-labelledby="more">
        <div className="home-section-head">
          <h2 id="more" className="home-h2">More things I&apos;ve built</h2>
          <Link href="/apps" className="home-more-link">See all apps &rarr;</Link>
        </div>
        <ul className="more-grid">
          {MORE_APPS.map((app) => (
            <li key={app.slug} className={`more-item accent-${app.accent}`}>
              <span className="more-icon"><AppIcon name={app.icon} size={20} /></span>
              <span className="more-text">
                <Link href={app.href} className="stretched-link more-name">{app.name}</Link>
                <span className="more-tagline">{app.tagline}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="container home-section" aria-labelledby="how">
        <h2 id="how" className="home-h2">How I build</h2>
        <div className="how-grid">
          <div className="how-item">
            <p className="how-stat">{n(nfl.simulations)}</p>
            <p className="how-stat-label">simulated seasons behind every playoff number</p>
            <h3>Go a layer deeper</h3>
            <p>
              FiveThirtyEight retired its NFL model, so I rebuilt it from their published source and
              re-fit it on modern seasons. Home field is worth {HOME_FIELD} rating points now, not 65.
            </p>
          </div>
          <div className="how-item">
            <p className="how-stat">{n(nfl.calibration.evaluatedGames)}</p>
            <p className="how-stat-label">real games the NFL model is scored against</p>
            <h3>Test before you trust</h3>
            <p>
              The re-fit settings score better than FiveThirtyEight&apos;s originals on those games
              (log loss {nfl.calibration.logLoss.toFixed(3)} vs {nfl.calibration.baselineLogLoss.toFixed(3)}).
              Carton scenario links carry a fingerprint, so a link warns you if a later version of the
              optimizer would answer differently.
            </p>
          </div>
          <div className="how-item">
            <p className="how-stat">0</p>
            <p className="how-stat-label">uploads &mdash; the apps run on your device</p>
            <h3>Your data stays put</h3>
            <p>
              No accounts, and no server doing the math. Carton scenarios travel in the part of a link
              that is never sent to a server, and your drink log stays in your own browser.
            </p>
          </div>
        </div>
      </section>

      <section id="about" className="container home-section" aria-labelledby="about-title">
        <div className="about-card">
          <div className="about-main">
            <p className="home-label">About</p>
            <h2 id="about-title" className="home-h2">Hi, I&apos;m Ryan.</h2>
            <p>
              I&apos;m a mechanical engineer working in product development. I learn by building &mdash;
              the tool, the rig or the system itself &mdash; and I usually go further than the job
              needs. Some of these apps come straight out of engineering work: pallets, cartons,
              machine vision. Others are for football Sundays and nights out.
            </p>
            <p>
              Off the clock it&apos;s festivals and live music, lifting and time-trial cycling &mdash;
              and, most of all, family.
            </p>
          </div>
          <div className="about-links">
            <Link href="/concerts" className="about-link"><Music size={18} aria-hidden="true" /> Concerts I&apos;ve rated</Link>
            <Link href="/travel" className="about-link"><MapIcon size={18} aria-hidden="true" /> Places I&apos;ve been</Link>
            <a href="/resume.pdf" target="_blank" rel="noopener noreferrer" className="about-link">
              <FileText size={18} aria-hidden="true" /> R&eacute;sum&eacute; (PDF)
            </a>
            <a href="https://github.com/rtsweeney" target="_blank" rel="noopener noreferrer" className="about-link">
              <Image src="/GitHub.png" alt="" width={18} height={18} /> GitHub
            </a>
            <a href="https://www.linkedin.com/in/rtsweeney01/" target="_blank" rel="noopener noreferrer" className="about-link">
              <Image src="/linkedin.png" alt="" width={18} height={18} /> LinkedIn
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

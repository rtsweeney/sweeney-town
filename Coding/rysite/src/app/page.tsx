import Link from 'next/link';
import Footer from '@/components/Footer';

const featured = [
  {
    name: 'Pleated Filter Calculator',
    href: '/calculators/pleated-filter-calculator',
    icon: '&#128168;',
    accent: 'card-accent-purple',
    description:
      'Model pressure drop, find the optimal pleat count, and project fractional efficiency and MERV rating for a pleated air filter — built on the Sothen & Tatarchuk method.',
    tags: ['Pressure Drop', 'MERV', 'Filtration'],
  },
  {
    name: 'Carton Packing Optimizer',
    href: '/calculators/carton-packing',
    icon: '&#128230;',
    accent: 'card-accent-orange',
    description:
      'Enter product dimensions and annual volumes and it designs the best small set of carton sizes, tiles them onto pallets, charts the trade-off of adding or dropping a carton SKU, and writes supplier-ready specs.',
    tags: ['Box Sizing', 'Pallet Loading', 'Optimization'],
  },
  {
    name: 'Machine Vision Pleat Counting',
    href: '/calculators/pleat-counter',
    icon: '&#128247;',
    accent: 'card-accent-teal',
    description:
      'Photograph a filter panel and the browser does the rest — finds the panel, corrects the perspective, counts ridges through frames and grating, and reports pitch, pleats per foot, and open area.',
    tags: ['Computer Vision', 'Canvas', 'No Server'],
  },
  {
    name: 'NFL Elo Ratings & Predictions',
    href: '/projects/nfl-elo',
    icon: '&#127944;',
    accent: 'card-accent-purple',
    description:
      "Who wins this week, and how likely? FiveThirtyEight's NFL Elo model, continued and re-fit: win probabilities and spreads for every game, playoff odds from simulated seasons, quarterback ratings, and live scores.",
    tags: ['Elo Model', 'nflverse', 'Live Scores'],
  },
  {
    name: 'Planetarium',
    href: '/planetarium',
    icon: '&#127776;',
    accent: 'card-accent-gold',
    description:
      'An interactive star map. See what is in the sky tonight from wherever you are, pick a constellation, and find out exactly where to look.',
    tags: ['Astronomy', 'Geolocation', 'Canvas'],
  },
];

export default function Home() {
  return (
    <main>
      <div className="page-bg" />

      {/* Hero */}
      <section className="hero">
        <p className="hero-tagline animate-in animate-delay-1">Welcome to</p>
        <h1 className="hero-title animate-in animate-delay-2">
          <span className="gradient-text">sweeney.town</span>
        </h1>
        <p className="hero-subtitle animate-in animate-delay-3">
          A workshop for calculators, and fun little inventions and tools. Engineering
          math that usually lives in a spreadsheet, rebuilt so it runs in your browser
          &mdash; plus whatever else I felt like building.
        </p>
        <div className="hero-cta-group animate-in animate-delay-4">
          <Link href="/calculators" className="btn btn-primary">Browse Calculators</Link>
          <Link href="/projects" className="btn btn-secondary">See All Projects</Link>
        </div>
      </section>

      {/* Featured builds */}
      <section className="container" style={{ paddingBottom: '4rem' }}>
        <h2 className="section-title" style={{ textAlign: 'center' }}>Start Here</h2>
        <p className="section-subtitle" style={{ textAlign: 'center' }}>
          The tools I get asked about most. Everything runs in your browser &mdash; nothing to install,
          nothing to sign up for.
        </p>

        <div className="home-grid home-grid-featured">
          {featured.map((item) => (
            <Link key={item.href} href={item.href} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className={`card ${item.accent}`} style={{ height: '100%' }}>
                <div
                  className="home-card-icon"
                  dangerouslySetInnerHTML={{ __html: item.icon }}
                />
                <h3 className="home-card-title">{item.name}</h3>
                <p className="home-card-desc">{item.description}</p>
                <div className="project-tech-tags">
                  {item.tags.map((tag) => (
                    <span key={tag} className="project-tech-tag">{tag}</span>
                  ))}
                </div>
                <div className="project-links">
                  <span className="project-link">Open &rarr;</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Section Cards */}
      <section className="container" style={{ paddingBottom: '4rem' }}>
        <h2 className="section-title" style={{ textAlign: 'center' }}>The Rest of the Site</h2>
        <p className="section-subtitle" style={{ textAlign: 'center' }}>
          More tools, and a few things that are just for fun.
        </p>

        <div className="home-grid home-grid-sections">
          <Link href="/calculators" style={{ textDecoration: 'none' }}>
            <div className="card card-accent-purple">
              <div className="home-card-icon">&#128425;</div>
              <h3 className="home-card-title">Calculators</h3>
              <p className="home-card-desc">
                Handy engineering and everyday calculators &mdash; filter models, carton packing, pleat counting, and more added over time.
              </p>
            </div>
          </Link>

          <Link href="/projects" style={{ textDecoration: 'none' }}>
            <div className="card card-accent-teal">
              <div className="home-card-icon">&#128736;</div>
              <h3 className="home-card-title">Projects</h3>
              <p className="home-card-desc">
                Bigger builds and experiments &mdash; live sports models, dashboards, star maps, and reactive visuals.
              </p>
            </div>
          </Link>

          <Link href="/concerts" style={{ textDecoration: 'none' }}>
            <div className="card card-accent-pink">
              <div className="home-card-icon">&#127925;</div>
              <h3 className="home-card-title">Concerts</h3>
              <p className="home-card-desc">
                Shows I&apos;ve been to, rated and reviewed. From dive bars to arenas.
              </p>
            </div>
          </Link>

          <Link href="/travel" style={{ textDecoration: 'none' }}>
            <div className="card card-accent-orange">
              <div className="home-card-icon">&#127758;</div>
              <h3 className="home-card-title">Travel</h3>
              <p className="home-card-desc">
                Cities and countries I&apos;ve visited, mapped out with photos and notes.
              </p>
            </div>
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}

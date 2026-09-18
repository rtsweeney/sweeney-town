import { safeFetch } from '@/sanity/lib/client';
import { PortableText } from 'next-sanity';
import type { PortableTextBlock } from 'next-sanity';
import Link from 'next/link';
import Footer from '@/components/Footer';

const PROJECTS_QUERY = `*[_type == "project"] | order(date desc) {
  _id,
  title,
  description,
  techStack,
  liveUrl,
  repoUrl,
  date
}`;

export const revalidate = 60;

interface Project {
  _id: string;
  title: string;
  description: PortableTextBlock[];
  techStack: string[];
  liveUrl: string;
  repoUrl: string;
  date: string;
}

export default async function ProjectsPage() {
  const projects = await safeFetch<Project[]>(PROJECTS_QUERY, []);

  return (
    <main>
      <div className="page-bg" />

      <div className="container">
        <div className="page-header">
          <h1 className="section-title">
            <span className="gradient-text">Projects</span>
          </h1>
          <p className="section-subtitle" style={{ marginBottom: 0 }}>Things I&apos;ve built, am building, or am tinkering with</p>
        </div>

        <div className="projects-grid">
          {/* NFL Elo — built-in ratings dashboard */}
          <Link href="/projects/nfl-elo" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="card card-accent-purple" style={{ height: '100%', cursor: 'pointer' }}>
              <div className="project-card-header">
                <div className="project-card-icon">&#127944;</div>
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                NFL Elo Ratings
              </h3>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.7 }}>
                <p>FiveThirtyEight retired their NFL Elo model, so I rebuilt it from their published source and re-fit the constants on modern seasons — home field is worth 32 points now, not 65. Every week&apos;s games with pre-game win probabilities, a rolling quarterback rating for each starter, and scores that update live.</p>
              </div>
              <div className="project-tech-tags">
                <span className="project-tech-tag">Elo Model</span>
                <span className="project-tech-tag">nflverse</span>
                <span className="project-tech-tag">Live Data</span>
                <span className="project-tech-tag">Next.js</span>
              </div>
              <div className="project-links">
                <span className="project-link">Open &rarr;</span>
              </div>
            </div>
          </Link>

          {/* World Cup 2026 Tracker — built-in live dashboard */}
          <Link href="/projects/world-cup" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="card card-accent-gold" style={{ height: '100%', cursor: 'pointer' }}>
              <div className="project-card-header">
                <div className="project-card-icon">&#9917;</div>
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                World Cup 2026 Tracker
              </h3>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.7 }}>
                <p>A live, one-glance dashboard for the Cup. Circular knockout bracket with flags, live scores, kickoff times in ET, venues, betting odds, and the Golden Boot race among players still in contention. Auto-refreshes every minute.</p>
              </div>
              <div className="project-tech-tags">
                <span className="project-tech-tag">Live Data</span>
                <span className="project-tech-tag">SVG</span>
                <span className="project-tech-tag">ESPN API</span>
                <span className="project-tech-tag">Next.js</span>
              </div>
              <div className="project-links">
                <span className="project-link">Open &rarr;</span>
              </div>
            </div>
          </Link>

          {/* Dig Through the Earth — antipode finder with a 3D globe */}
          <Link href="/projects/antipode" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="card card-accent-teal" style={{ height: '100%', cursor: 'pointer' }}>
              <div className="project-card-header">
                <div className="project-card-icon">&#127759;</div>
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                Dig Through the Earth
              </h3>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.7 }}>
                <p>Press the big button and a vector globe spins half a turn to your antipode — the town, country and time zone 12,742 km straight down. The whole atlas runs in the browser, so your location never leaves the tab.</p>
              </div>
              <div className="project-tech-tags">
                <span className="project-tech-tag">Canvas Globe</span>
                <span className="project-tech-tag">Natural Earth</span>
                <span className="project-tech-tag">GeoNames</span>
                <span className="project-tech-tag">Offline Lookups</span>
              </div>
              <div className="project-links">
                <span className="project-link">Open &rarr;</span>
              </div>
            </div>
          </Link>

          {/* Planetarium — built-in interactive project */}
          <Link href="/planetarium" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="card card-accent-purple" style={{ height: '100%', cursor: 'pointer' }}>
              <div className="project-card-header">
                <div className="project-card-icon">&#127776;</div>
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                Planetarium
              </h3>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.7 }}>
                <p>An interactive star map dashboard. See what&apos;s in the sky tonight based on your location, pick a constellation, and find out exactly where to look.</p>
              </div>
              <div className="project-tech-tags">
                <span className="project-tech-tag">Astronomy</span>
                <span className="project-tech-tag">Canvas</span>
                <span className="project-tech-tag">Geolocation</span>
                <span className="project-tech-tag">Next.js</span>
              </div>
              <div className="project-links">
                <span className="project-link">
                  Open &rarr;
                </span>
              </div>
            </div>
          </Link>

          {/* Reactive Fun Backgrounds — party visuals & screensavers */}
          <Link href="/projects/reactive-fun-backgrounds" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="card card-accent-cyan" style={{ height: '100%', cursor: 'pointer' }}>
              <div className="project-card-header">
                <div className="project-card-icon">&#127961;</div>
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                Reactive Fun Backgrounds
              </h3>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.7 }}>
                <p>Pick a visual. Go fullscreen. Vibe. Reactive party animations and screensavers that respond to microphone input and beat detection. Start with the pixelated jellyfish aquarium.</p>
              </div>
              <div className="project-tech-tags">
                <span className="project-tech-tag">Canvas API</span>
                <span className="project-tech-tag">Web Audio API</span>
                <span className="project-tech-tag">Beat Detection</span>
                <span className="project-tech-tag">Fullscreen</span>
              </div>
              <div className="project-links">
                <span className="project-link">Open &rarr;</span>
              </div>
            </div>
          </Link>

          {/* Sanity-managed projects */}
          {projects.map((project) => (
            <div key={project._id} className="card">
              <div className="project-card-header">
                <div className="project-card-icon">&#128187;</div>
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                {project.title}
              </h3>
              {project.description && (
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.7 }}>
                  <PortableText value={project.description} />
                </div>
              )}
              {project.techStack && project.techStack.length > 0 && (
                <div className="project-tech-tags">
                  {project.techStack.map((tech: string) => (
                    <span key={tech} className="project-tech-tag">{tech}</span>
                  ))}
                </div>
              )}
              {(project.liveUrl || project.repoUrl) && (
                <div className="project-links">
                  {project.liveUrl && (
                    <a href={project.liveUrl} target="_blank" rel="noopener noreferrer" className="project-link">
                      Live &rarr;
                    </a>
                  )}
                  {project.repoUrl && (
                    <a href={project.repoUrl} target="_blank" rel="noopener noreferrer" className="project-link">
                      Source &rarr;
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <Footer />
    </main>
  );
}

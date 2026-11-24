'use client';

import Link from 'next/link';
import Footer from '@/components/Footer';

const visuals = [
  {
    slug: 'jellyfish-aquarium',
    name: 'Jellyfish Aquarium',
    icon: '🪼',
    description: 'Pixelated jellyfish drift and pulse through a vibrant underwater scene. Fish swim, crabs crawl, and sharks cruise through. Mic-reactive beat detection syncs the whole ocean to your music.',
    tags: ['Canvas API', 'Web Audio API', 'Beat Detection'],
    accentClass: 'card-accent-cyan',
  },
];

export default function ReactiveFunBackgroundsPage() {
  return (
    <main>
      <div className="page-bg" />

      <div className="container">
        <div style={{ marginBottom: '1.5rem' }}>
          <Link href="/tools" style={{ textDecoration: 'none', color: 'var(--accent-color)' }}>
            &larr; Back to Tools
          </Link>
        </div>

        <div className="page-header">
          <h1 className="section-title">
            <span className="gradient-text">Reactive Fun Backgrounds</span>
          </h1>
          <p className="section-subtitle" style={{ marginBottom: 0 }}>Pick a visual. Go fullscreen. Vibe.</p>
        </div>

        <div style={{ marginBottom: '2rem', padding: '1rem', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <p style={{ color: 'var(--text-secondary)' }}>
            A browser-based collection of reactive party visuals and animated screensavers. Select a visual below to launch it. Go fullscreen and enable your microphone to sync animations to music.
          </p>
        </div>

        <div className="projects-grid">
          {visuals.map((vis) => (
            <Link key={vis.slug} href={`/projects/reactive-fun-backgrounds/${vis.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className={`card ${vis.accentClass}`} style={{ height: '100%', cursor: 'pointer' }}>
                <div className="project-card-header">
                  <div className="project-card-icon">{vis.icon}</div>
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                  {vis.name}
                </h3>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.7 }}>
                  <p>{vis.description}</p>
                </div>
                <div className="project-tech-tags">
                  {vis.tags.map((tag) => (
                    <span key={tag} className="project-tech-tag">{tag}</span>
                  ))}
                </div>
                <div className="project-links">
                  <span className="project-link">Launch &rarr;</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <Footer />
    </main>
  );
}

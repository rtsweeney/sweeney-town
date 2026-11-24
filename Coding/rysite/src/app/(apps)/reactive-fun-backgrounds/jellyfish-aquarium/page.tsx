'use client';

import Breadcrumb from '@/components/Breadcrumb';
import Footer from '@/components/Footer';

export default function JellyfishAquariumPage() {
  return (
    <main>
      <div className="page-bg" />

      <div className="container">
        <div className="page-header">
          <Breadcrumb trail={[{ label: 'Reactive Fun Backgrounds', href: '/reactive-fun-backgrounds' }]} current="Jellyfish Aquarium" />
          <h1 className="section-title">
            <span className="gradient-text">Jellyfish Aquarium</span>
          </h1>
          <p className="section-subtitle" style={{ marginBottom: 0 }}>A pixelated underwater world that reacts to music</p>
        </div>

        <div style={{ marginBottom: '2rem', padding: '1rem', background: 'var(--glass-bg)', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
            Vibrant pixel jellyfish drift and pulse through a living ocean scene. Fish swim and flee from visiting sharks, a crab crawls along the seafloor, and kelp sways in the current. Enable your microphone to sync everything to music.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ padding: '0.3rem 0.7rem', background: 'rgba(120, 115, 245, 0.1)', border: '1px solid var(--accent-primary)', borderRadius: '6px', fontSize: '0.85rem', color: 'var(--accent-primary)' }}>Canvas API</span>
            <span style={{ padding: '0.3rem 0.7rem', background: 'rgba(120, 115, 245, 0.1)', border: '1px solid var(--accent-primary)', borderRadius: '6px', fontSize: '0.85rem', color: 'var(--accent-primary)' }}>Web Audio API</span>
            <span style={{ padding: '0.3rem 0.7rem', background: 'rgba(120, 115, 245, 0.1)', border: '1px solid var(--accent-primary)', borderRadius: '6px', fontSize: '0.85rem', color: 'var(--accent-primary)' }}>Fullscreen API</span>
            <span style={{ padding: '0.3rem 0.7rem', background: 'rgba(120, 115, 245, 0.1)', border: '1px solid var(--accent-primary)', borderRadius: '6px', fontSize: '0.85rem', color: 'var(--accent-primary)' }}>Beat Detection</span>
          </div>
        </div>

        <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', marginBottom: '2rem', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)' }}>
          <iframe
            src="/visuals/reactive-fun-backgrounds/jellyfish.html"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              border: 'none',
            }}
            title="Jellyfish Aquarium"
            allow="microphone; fullscreen; autoplay"
            allowFullScreen
            sandbox="allow-scripts allow-same-origin allow-popups"
          />
        </div>

        <div style={{ padding: '1.5rem', background: 'var(--glass-bg)', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>Features</h3>
          <ul style={{ color: 'var(--text-secondary)', lineHeight: 1.8, marginLeft: '1.5rem' }}>
            <li><strong>Microphone Reactive</strong> — Jellyfish pulse speed and drift sync to detected BPM</li>
            <li><strong>Beat Detection</strong> — Real-time bass frequency analysis for kick detection</li>
            <li><strong>Click to Beat</strong> — When mic is off, click the canvas for a one-shot beat reaction</li>
            <li><strong>Living Ocean</strong> — Fish flee from sharks, a crab crawls the seafloor, kelp sways</li>
            <li><strong>Fullscreen Mode</strong> — Immersive viewing with auto-hiding HUD</li>
            <li><strong>Responsive</strong> — Scales to any screen size; keyboard shortcuts (F, M)</li>
          </ul>
        </div>
      </div>

      <Footer />
    </main>
  );
}

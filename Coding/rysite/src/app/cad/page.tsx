import type { Metadata } from 'next';
import Footer from '@/components/Footer';
import BuildCard from '@/components/BuildCard';
import { BUILDS } from '@/lib/builds';

export const metadata: Metadata = {
  title: 'CAD & Hardware | Sweeney Town',
  description:
    'Things Ryan Sweeney has designed to be made: an indoor ice ax cut from a single 12 × 24 in sheet, and an ESP32 e-ink beach UV index meter with its full Arduino code.',
};

export default function CadPage() {
  return (
    <main>
      <div className="page-bg" />

      <div className="container">
        <div className="page-header">
          <h1 className="section-title">
            <span className="gradient-text">CAD &amp; hardware</span>
          </h1>
          <p className="section-subtitle" style={{ marginBottom: 0 }}>
            Things I&apos;ve designed to be made: parts cut from stock, and electronics with the firmware that runs them.
          </p>
        </div>

        <div className="builds-grid">
          {BUILDS.map((build) => <BuildCard key={build.slug} build={build} />)}
        </div>
      </div>

      <Footer />
    </main>
  );
}

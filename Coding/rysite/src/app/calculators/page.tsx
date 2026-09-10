import Link from 'next/link';
import Footer from '@/components/Footer';

const calculators = [
  {
    name: 'Beers Per Beer',
    description: 'Slide any pour to standard beers live, then log the night and watch your estimated BAC curve against the driving limits.',
    href: '/calculators/beers-per-beer',
    icon: '&#127866;',
    accent: 'card-accent-gold',
  },
  {
    name: 'Pleated Filter',
    description: 'Predict pressure drop, optimal pleat count, and fractional efficiency for a pleated air filter (Sothen & Tatarchuk 2009).',
    href: '/calculators/pleated-filter-calculator',
    icon: '&#128168;',
    accent: 'card-accent-purple',
  },
  {
    name: 'Carton Packing Optimizer',
    description: 'Design the best small set of carton sizes for your products, tile them onto pallets, and write supplier-ready box specs.',
    href: '/calculators/carton-packing',
    icon: '&#128230;',
    accent: 'card-accent-orange',
  },
  {
    name: 'Machine Vision Pleat Counting',
    description: 'Photograph a filter panel and the browser finds the face, corrects perspective, and reports pitch, pleats per foot, and open area.',
    href: '/calculators/pleat-counter',
    icon: '&#128247;',
    accent: 'card-accent-teal',
  },
];

export default function CalculatorsPage() {
  return (
    <main>
      <div className="page-bg" />

      <div className="container">
        <div className="page-header">
          <h1 className="section-title">
            <span className="gradient-text">Calculators</span>
          </h1>
          <p className="section-subtitle" style={{ marginBottom: 0 }}>
            Handy tools and converters &mdash; more added over time
          </p>
        </div>

        <div className="calculator-list-grid">
          {calculators.map((calc) => (
            <Link key={calc.href} href={calc.href} style={{ textDecoration: 'none' }}>
              <div className={`card ${calc.accent}`}>
                <div
                  className="home-card-icon"
                  dangerouslySetInnerHTML={{ __html: calc.icon }}
                />
                <h3 className="home-card-title">{calc.name}</h3>
                <p className="home-card-desc">{calc.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <Footer />
    </main>
  );
}

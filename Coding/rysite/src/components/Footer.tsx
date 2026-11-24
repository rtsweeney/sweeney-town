import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

const elsewhere = [
  { name: 'GitHub', href: 'https://github.com/rtsweeney' },
  { name: 'LinkedIn', href: 'https://www.linkedin.com/in/rtsweeney01/' },
  { name: 'Letterboxd', href: 'https://letterboxd.com/Sweeneyr3/' },
  { name: 'Chess.com', href: 'https://www.chess.com/member/sweenayy' },
];

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div className="footer-brand-block">
          <Link href="/" className="footer-brand">sweeney<span>.</span>town</Link>
          <p>A working collection of things built by Ryan Sweeney. Useful beats clever.</p>
        </div>
        <div className="footer-column">
          <h2>Explore</h2>
          <Link href="/tools">All tools</Link>
          <Link href="/#about">About Ryan</Link>
          <Link href="/concerts">Concerts</Link>
          <Link href="/travel">Travel</Link>
        </div>
        <div className="footer-column">
          <h2>Elsewhere</h2>
          {elsewhere.map((item) => (
            <a href={item.href} target="_blank" rel="noopener noreferrer" key={item.name}>
              {item.name} <ArrowUpRight size={13} />
            </a>
          ))}
        </div>
        <div className="footer-column">
          <h2>Portfolio</h2>
          <a href="/resume.pdf" target="_blank" rel="noopener noreferrer">
            Résumé (PDF) <ArrowUpRight size={13} />
          </a>
          <a href="https://github.com/rtsweeney/sweeney-town" target="_blank" rel="noopener noreferrer">
            Site source <ArrowUpRight size={13} />
          </a>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>Designed, built, and tested in the open.</span>
        <span>Mayor of sweeney.town</span>
      </div>
    </footer>
  );
}

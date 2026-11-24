import Image from 'next/image';
import Link from 'next/link';
import { APPS } from '@/lib/apps';

const SOCIALS = [
  { href: 'https://www.linkedin.com/in/rtsweeney01/', label: 'LinkedIn', icon: '/linkedin.png' },
  { href: 'https://github.com/rtsweeney', label: 'GitHub', icon: '/GitHub.png' },
  { href: 'https://letterboxd.com/Sweeneyr3/', label: 'Letterboxd', icon: '/Letterboxd.png' },
  { href: 'https://www.chess.com/member/sweenayy', label: 'Chess.com', icon: '/chess.png' },
];

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-cols">
          <div className="footer-col">
            <h2 className="footer-heading">Apps</h2>
            <ul>
              {APPS.map((app) => (
                <li key={app.href}>
                  <Link href={app.href}>{app.shortName}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="footer-col">
            <h2 className="footer-heading">Off the clock</h2>
            <ul>
              <li><Link href="/concerts">Concerts</Link></li>
              <li><Link href="/travel">Travel</Link></li>
            </ul>
            <h2 className="footer-heading">Me</h2>
            <ul>
              <li><Link href="/#about">About</Link></li>
              <li><a href="/resume.pdf" target="_blank" rel="noopener noreferrer">Résumé (PDF)</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="footer-socials">
            {SOCIALS.map((s) => (
              <a key={s.href} href={s.href} target="_blank" rel="noopener noreferrer" className="footer-social-link" aria-label={s.label}>
                <Image src={s.icon} alt="" width={20} height={20} />
              </a>
            ))}
          </div>
          <p className="footer-text">
            Built by <a href="https://github.com/rtsweeney">Ryan Sweeney</a> &mdash; Mayor of sweeney.town
          </p>
        </div>
      </div>
    </footer>
  );
}

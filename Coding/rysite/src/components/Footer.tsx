import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-socials">
        <a href="https://www.linkedin.com/in/rtsweeney01/" target="_blank" rel="noopener noreferrer" className="footer-social-link">
          <Image src="/linkedin.png" alt="LinkedIn" width={20} height={20} />
        </a>
        <a href="https://github.com/rtsweeney" target="_blank" rel="noopener noreferrer" className="footer-social-link">
          <Image src="/GitHub.png" alt="GitHub" width={20} height={20} />
        </a>
        <a href="https://letterboxd.com/Sweeneyr3/" target="_blank" rel="noopener noreferrer" className="footer-social-link">
          <Image src="/Letterboxd.png" alt="Letterboxd" width={20} height={20} />
        </a>
        <a href="https://www.chess.com/member/sweenayy" target="_blank" rel="noopener noreferrer" className="footer-social-link">
          <Image src="/chess.png" alt="Chess.com" width={20} height={20} />
        </a>
      </div>
      <p className="footer-text">
        Built by <a href="https://github.com/rtsweeney">Ryan Sweeney</a> &mdash; Mayor of sweeney.town
      </p>
      <p className="footer-text" style={{ marginTop: '0.5rem' }}>
        <a href="/resume.pdf" target="_blank" rel="noopener noreferrer">Resume (PDF)</a>
      </p>
    </footer>
  );
}

import { Link } from 'react-router-dom';
import { Brand } from './Brand';

export function Footer() {
  return (
    <footer>
      <div className="wrap foot">
        <div>
          <Brand size={28} />
          <p>
            A free QR code generator that runs entirely in your browser. Your colour, your logo, your
            data — never uploaded.
          </p>
          <a className="foot__email" href="mailto:contact@theqr.studio">
            contact@theqr.studio
          </a>
        </div>
        <nav className="foot__links" aria-label="Footer">
          <a href="/#studio">Generator</a>
          <a href="/#types">Survives print</a>
          <a href="/#features">Privacy</a>
          <a href="/#faq">FAQ</a>
        </nav>
      </div>
      <div className="wrap foot__bottom">
        <p className="foot__spec">
          Stock: your browser · Inks: unlimited · Uploads: 0 · Expiry: never · © 2026 theqr.studio
        </p>
        <nav className="foot__legal" aria-label="Legal">
          <Link to="/terms">Terms</Link>
          <Link to="/privacy">Privacy Policy</Link>
        </nav>
      </div>
    </footer>
  );
}

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
          <a href="/#print">Survives print</a>
          <a href="/#features">Privacy</a>
          <a href="/#faq">FAQ</a>
          <Link to="/contact">Contact us</Link>
        </nav>
      </div>
      <div className="wrap">
        <p className="foot__spec">
          Stock: your browser · Inks: unlimited · Uploads: 0 · Expiry: never · © 2026 theqr.studio
        </p>
      </div>
    </footer>
  );
}

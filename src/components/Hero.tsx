import type { MouseEvent } from 'react';
import { OPEN_STUDIO_EVENT } from './Workstation';

const openStudio = (e: MouseEvent) => {
  e.preventDefault();
  window.dispatchEvent(new CustomEvent(OPEN_STUDIO_EVENT));
};

export function Hero() {
  return (
    <section className="hero">
      {/* .wrap aligns with every other band; .hero__solo only caps line length */}
      <div className="wrap">
        <div className="hero__solo">
        <span className="eyebrow">Free QR code generator</span>
        <h1>
          This is the
          <br />
          QR&nbsp;Studio.
        </h1>
        <p className="drop">
          Drop your <b>colour</b>. Drop your <b>image</b>. Drop your <b>logo</b>.
          <br />
          Get a custom QR code that works everywhere — screen, print, poster, card.
        </p>
        <ul className="highlights">
          <li>Free, in your browser</li>
          <li>Nothing leaves your device</li>
        </ul>
        <div className="cta-row">
          <a href="#studio" className="btn" onClick={openStudio}>
            Start generating QR ▸
          </a>
          <span className="trust">no signup · no watermark · no expiry</span>
        </div>
        </div>

        {/* Decorative: real exports from the studio, on an isometric plane.
            Desktop-only (hidden ≤1239px); never overlaps the copy — the art
            column starts right of the painted text. */}
        <div className="hero-art" aria-hidden="true">
          <div className="iso">
            <div className="iso__t iso__t--qr">
              <span className="iso__tag">✓ Scanner-verified</span>
              <img src="/hero/qr-dots.png" width={640} height={640} alt="" />
            </div>
            <div className="iso__t iso__t--doodle">
              <img src="/hero/qr-lines.png" width={520} height={520} alt="" />
            </div>
            <div className="iso__t iso__t--front">
              <img src="/hero/card-front.png" width={760} height={434} alt="" />
            </div>
            <div className="iso__t iso__t--back">
              <img src="/hero/card-back.png" width={760} height={434} alt="" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

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
        <ul className="hero-ticks" aria-label="Why it works">
          <li><i>⌁</i> High scan rate</li>
          <li><i>⎙</i> Print ready</li>
          <li><i>◈</i> Any surface</li>
          <li><i>✓</i> Always verifiable</li>
        </ul>
        </div>

        {/* Decorative: the studio's real exports as physical objects — a
            hanging verified sign, a kraft table-tent, a round sticker and the
            navy visiting card. Desktop-only (hidden ≤1239px); positioned so it
            never intersects the painted hero copy. */}
        <div className="hero-scene" aria-hidden="true">
          <div className="hs-sign">
            <span className="hs-hook hs-hook--l" />
            <span className="hs-hook hs-hook--r" />
            <div className="hs-label">Verified<br />QR code</div>
            <img src="/hero/qr-dots.png" width={640} height={640} alt="" />
            <div className="hs-scan">SCAN ME <i>✓</i></div>
          </div>
          <div className="hs-tent">
            <div className="hs-plate">
              <div className="hs-label">Verified QR</div>
              <img src="/hero/qr-lines.png" width={520} height={520} alt="" />
              <div className="hs-scan">SCAN ME <i>✓</i></div>
            </div>
          </div>
          <div className="hs-stand">
            <img src="/hero/card-back.png" width={760} height={434} alt="" />
          </div>
          <div className="hs-dot">
            <div className="hs-label">Verified QR</div>
            <img src="/hero/qr-dots.png" width={640} height={640} alt="" />
            <div className="hs-scan">SCAN ME <i>✓</i></div>
          </div>
        </div>
      </div>
    </section>
  );
}

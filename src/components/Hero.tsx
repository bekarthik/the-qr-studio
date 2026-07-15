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

        {/* Decorative: the studio's real export inside a self-contained scanner
            readout — corner brackets, a sweeping verify beam, a live status bar
            and spec chips. Its own dark chrome reads the same in both themes.
            Desktop-only (hidden ≤1239px); positioned so it never intersects the
            painted hero copy. */}
        <div className="hero-scene" aria-hidden="true">
          <div className="sp">
            <div className="sp-bar">
              <b>Scanner</b>
              <span className="sp-live">LIVE</span>
            </div>
            <div className="sp-screen">
              <img src="/hero/qr-dots.png" width={640} height={640} alt="" />
              <span className="br tl" />
              <span className="br tr" />
              <span className="br bl" />
              <span className="br brr" />
              <span className="sp-beam" />
            </div>
            <div className="sp-status">
              <i>✓</i>
              <b>Verified · scans first try</b>
              <span>theqr.studio</span>
            </div>
            <div className="sp-metrics">
              <div><small>Contrast</small><strong>High</strong></div>
              <div><small>Print</small><strong>Ready</strong></div>
              <div><small>Surface</small><strong>Any</strong></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

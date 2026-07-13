import type { MouseEvent } from 'react';
import { OPEN_STUDIO_EVENT } from './Workstation';

const openStudio = (e: MouseEvent) => {
  e.preventDefault();
  window.dispatchEvent(new CustomEvent(OPEN_STUDIO_EVENT));
};

/** The closing call-to-action banner. */
export function CtaBanner() {
  return (
    <section className="band" style={{ borderTop: 0 }}>
      <div className="wrap">
        <div className="cta">
          <h2>Your links deserve better than an ugly code.</h2>
          <a href="#studio" className="btn" onClick={openStudio}>
            open the studio →
          </a>
          <p className="trust">free forever · runs in your browser · nothing uploaded</p>
        </div>
      </div>
    </section>
  );
}

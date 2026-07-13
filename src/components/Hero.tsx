import { OPEN_STUDIO_EVENT } from './Workstation';

const PILLS = ['🔒 Nothing uploaded', '✓ Verified scannable', '🖼️ Image halftone', '⬇️ PNG & SVG'];

const openStudio = () => window.dispatchEvent(new CustomEvent(OPEN_STUDIO_EVENT));

export function Hero() {
  return (
    <>
      <span id="top" />
      <section className="hero">
        <p className="hero__eyebrow">
          <span className="dot" /> Free · No sign-up · 100% in your browser
        </p>
        <h1 className="hero__title">
          QR codes that look like your brand —<br />
          <span className="grad">and actually scan.</span>
        </h1>
        <p className="hero__sub">
          Links, UPI, Wi-Fi, visiting cards and more — styled with your colour or your own image, and
          verified scannable right in your browser. Nothing is ever uploaded.
        </p>
        <div className="hero__cta">
          <a className="hero__btn" href="#app">Start generating →</a>
          <button className="hero__btn hero__btn--ghost" type="button" onClick={openStudio}>
            ⤢ Open studio
          </button>
        </div>
        <ul className="hero__pills">
          {PILLS.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </section>
    </>
  );
}

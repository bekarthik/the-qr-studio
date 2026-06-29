const PILLS = ['🔒 Nothing uploaded', '✓ Verified scannable', '🖼️ Image halftone', '⬇️ PNG & SVG'];

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
          <span className="grad">and actually scan</span>
        </h1>
        <p className="hero__sub">
          Links, UPI, Wi-Fi, visiting cards and more — styled with your colour or your own image, and
          verified scannable right in your browser. Nothing is ever uploaded.
        </p>
        <div className="hero__cta">
          <a className="hero__btn" href="#app">Create your code →</a>
          <a className="hero__btn hero__btn--ghost" href="#features">See what it does</a>
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

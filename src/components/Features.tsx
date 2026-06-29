const FEATURES = [
  {
    icon: '🖼️',
    title: 'Looks like your brand',
    body: 'Halftone your image into the code, embed a crisp logo, or tint it your brand colour — with styled modules and eyes.',
  },
  {
    icon: '✓',
    title: 'Verified scannable',
    body: 'Every code is decoded in-browser with jsQR and shown as a badge, so “does it scan?” is a guarantee, not a gamble.',
  },
  {
    icon: '🔗',
    title: '16 source types',
    body: 'Links, text, email, phone, SMS, WhatsApp, UPI, bank, PayPal, Venmo, Cash App, Bitcoin, SEPA, Wi-Fi, vCard, location.',
  },
  {
    icon: '🪪',
    title: 'Print-ready cards',
    body: 'Turn any code into a themeable 3.5×2″ visiting card — one- or two-sided — that encodes the same data.',
  },
  {
    icon: '🎨',
    title: 'Themeable studio',
    body: 'Three refined themes (Linen, Graphite, Midnight) and a fully styleable card with presets you can save and share.',
  },
  {
    icon: '🔒',
    title: 'Private by design',
    body: 'Runs entirely in your browser — no accounts, no tracking, no uploads. Your images never leave the page.',
  },
];

/** A concise capabilities grid — the real target for the nav “Features” link. */
export function Features() {
  return (
    <section className="features" id="features">
      <div className="features__head">
        <h2>Everything you need to ship a code</h2>
        <p>Styled, scannable, and yours — all client-side.</p>
      </div>
      <div className="features__grid">
        {FEATURES.map((f) => (
          <article className="feature" key={f.title}>
            <span className="feature__ico" aria-hidden="true">{f.icon}</span>
            <h3 className="feature__title">{f.title}</h3>
            <p className="feature__body">{f.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

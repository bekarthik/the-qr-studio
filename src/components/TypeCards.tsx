const CARDS = [
  { tag: 'Links', title: 'Links', body: "Portfolio, insta, linktree, menu — whatever you're plugging." },
  { tag: 'Payment', title: 'Payments', body: 'UPI, PayPal, Venmo, Cash App, Bitcoin, SEPA — get paid with a scan.' },
  { tag: 'Network', title: 'Wi-Fi', body: "Stop spelling your password to guests. One scan, they're on." },
  { tag: 'Contact', title: 'vCard', body: 'Your contact info — and a printable visiting card — in one scan.' },
  { tag: 'Apps', title: 'App links', body: 'App Store & Play Store links that open the right listing.' },
  { tag: 'More', title: 'Email · SMS · Geo', body: 'Phone, email, text, location — the everyday rest.' },
];

/** "One QR builder for everything" — the source-type overview. */
export function TypeCards() {
  return (
    <section id="types" className="band">
      <div className="wrap">
        <span className="kicker">Seventeen codes, one studio</span>
        <h2>One QR builder for everything.</h2>
        <div className="type-cards">
          {CARDS.map((c) => (
            <article className="type-card" key={c.title}>
              <span className="tc-tag">{c.tag}</span>
              <h3>{c.title}</h3>
              <p>{c.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

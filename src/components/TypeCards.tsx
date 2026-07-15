const CARDS = [
  { tag: 'Links', title: 'Links', body: "Portfolio, insta, linktree, menu — whatever you're plugging." },
  { tag: 'Payment', title: 'Payments', body: 'UPI, PayPal, Venmo, Cash App, Bitcoin, SEPA — get paid with a scan.' },
  { tag: 'Network', title: 'Wi-Fi', body: "Stop spelling your password to guests. One scan, they're on." },
  { tag: 'Contact', title: 'vCard', body: 'Your contact info — and a printable visiting card — in one scan.' },
  { tag: 'Apps', title: 'App links', body: 'App Store & Play Store links that open the right listing.' },
  { tag: 'More', title: 'Email · SMS · Geo', body: 'Phone, email, text, location — the everyday rest.' },
];

/** "One QR builder for everything" — the studio's real exports staged on the
 *  surfaces people print them on (the #print anchor lives here), followed by the
 *  full source-type overview. */
export function TypeCards() {
  return (
    <section id="types" className="band">
      <div className="wrap">
        <span className="kicker">Seventeen codes, one studio</span>
        <h2>One QR builder for everything.</h2>

        <div className="surfaces" id="print">
          <article className="surf">
            <div className="surf__scene sc-banner" aria-hidden="true">
              <span className="sc-pole sc-pole--l" />
              <span className="sc-pole sc-pole--r" />
              <div className="sc-cloth">
                <img src="/hero/qr-lines.png" width={520} height={520} alt="" />
                <span className="sc-scan">SCAN ME ✓</span>
              </div>
            </div>
            <div className="surf__body">
              <h3>Flex banners</h3>
              <p>High contrast. Long distance.</p>
            </div>
          </article>

          <article className="surf">
            <div className="surf__scene sc-paper" aria-hidden="true">
              <div className="sc-sheet">
                <img src="/hero/qr-dots.png" width={640} height={640} alt="" />
                <span className="sc-scan">SCAN ME ✓</span>
              </div>
            </div>
            <div className="surf__body">
              <h3>Paper prints</h3>
              <p>Crisp. Clear. Dependable.</p>
            </div>
          </article>

          <article className="surf">
            <div className="surf__scene sc-card" aria-hidden="true">
              <img src="/hero/card-back.png" width={760} height={434} alt="" />
            </div>
            <div className="surf__body">
              <h3>Business cards</h3>
              <p>Small size. Big reliability.</p>
            </div>
          </article>
        </div>

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

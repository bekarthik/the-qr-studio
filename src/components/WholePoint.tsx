/** "Survives the print" — the studio's real exports staged on the surfaces
 *  people actually print them on: a flex banner, a paper sheet, and the navy
 *  visiting card. Pure CSS scenes; decorative images are aria-hidden. */
export function WholePoint() {
  return (
    <section id="print" className="band band--tint">
      <div className="wrap">
        <span className="kicker">The whole point</span>
        <h2>QR codes that survive the print.</h2>
        <p className="lead">
          Codes that actually scan — not the cursed pixel blobs that die the moment someone points a
          camera at them. From flex banners to business cards, every export is verified before it
          leaves the studio, and the data is baked into the pattern so it works forever.
        </p>
        <div className="surfaces">
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
      </div>
    </section>
  );
}

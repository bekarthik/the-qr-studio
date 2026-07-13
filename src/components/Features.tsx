/** Capabilities grid — the target of the nav "Privacy" link. Icons use theme
 *  tokens so they read in both light and dark. */
export function Features() {
  return (
    <section id="features" className="band band--tint">
      <div className="wrap">
        <div className="feat">
          <article className="mk-card">
            <svg className="mk" viewBox="0 0 34 34" aria-hidden="true">
              <rect x="1" y="1" width="32" height="32" rx="8" fill="none" style={{ stroke: 'var(--ink)' }} strokeWidth="2" />
              <path
                d="M10 17.5l4.5 4.5L24 12"
                fill="none"
                style={{ stroke: 'var(--ok)' }}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <h3>Verified before you download</h3>
            <p>
              Style it however you want — your colour, your logo, your image halftoned into the code.
              The studio runs a real scanner check in your browser and warns you before download if it
              won't read.
            </p>
            <em>— that's the "survive the print" thing.</em>
          </article>

          <article className="mk-card">
            <svg className="mk" viewBox="0 0 34 34" aria-hidden="true">
              <rect x="1" y="1" width="32" height="32" rx="8" fill="none" style={{ stroke: 'var(--ink)' }} strokeWidth="2" />
              <rect x="10" y="15" width="14" height="11" rx="2.5" style={{ fill: 'var(--accent)' }} />
              <path d="M13 15v-3a4 4 0 018 0v3" fill="none" style={{ stroke: 'var(--ink)' }} strokeWidth="2.4" />
            </svg>
            <h3>Privacy ensured by design</h3>
            <p>
              Everything runs in your browser tab. No uploads, no servers holding your stuff, no
              database with your UPI ID in it. Close the tab and it's like you were never here.
            </p>
            <em>Actual privacy. Not "we value your privacy" energy.</em>
          </article>

          <article className="mk-card">
            <svg className="mk" viewBox="0 0 34 34" aria-hidden="true">
              <rect x="1" y="1" width="32" height="32" rx="8" fill="none" style={{ stroke: 'var(--ink)' }} strokeWidth="2" />
              <text
                x="17"
                y="23"
                textAnchor="middle"
                fontFamily="var(--font-mono)"
                fontWeight="700"
                fontSize="15"
                style={{ fill: 'var(--blue)' }}
              >
                ₹0
              </text>
            </svg>
            <h3>Free means free</h3>
            <p>
              No signup. No watermark. No free trial. No credit card. Export clean PNG and SVG — print
              it huge, it stays sharp.
            </p>
            <em>Free forever.</em>
          </article>
        </div>
      </div>
    </section>
  );
}

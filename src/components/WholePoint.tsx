import { SAMPLE_QR } from './qrSample';

/** "Survives the print" — a bad (blurred) vs good (crisp) QR comparison.
 *  Presentational; both use the same scannable sample, the "bad" one degraded
 *  purely with a CSS filter. */
export function WholePoint() {
  return (
    <section id="print" className="band band--tint">
      <div className="wrap">
        <span className="kicker">The whole point</span>
        <h2>QR codes that survive the print.</h2>
        <p className="lead">
          Codes that actually scan — not the cursed pixel blobs that die the moment someone points a
          camera at them. And no expiry: the data is baked into the pattern, so your code works forever.
        </p>
        <div className="compare">
          <div className="mk-card bad">
            <div className="qbox">
              <img src={SAMPLE_QR} alt="A blurry QR code that will not scan" />
            </div>
            <span className="tag no">✕ won't scan</span>
            <small>Watermarked, low-res, expires after a trial.</small>
          </div>
          <div className="mk-card">
            <div className="qbox">
              <img src={SAMPLE_QR} alt="A crisp QR code that scans" />
            </div>
            <span className="tag yes">✓ scans, forever</span>
            <small>Crisp vector, verified, no expiry.</small>
          </div>
        </div>
      </div>
    </section>
  );
}

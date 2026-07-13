/** The QR Studio wordmark + mark. The mark's fills are theme tokens, so it
 *  stays legible in both Linen (light) and Midnight (dark). */
export function BrandMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" role="img" aria-hidden="true">
      <rect x="2" y="2" width="26" height="26" rx="7" style={{ fill: 'var(--ink)' }} />
      <rect x="8" y="8" width="14" height="14" rx="3.5" style={{ fill: 'var(--bg)' }} />
      <rect x="11.5" y="11.5" width="7" height="7" rx="1.6" style={{ fill: 'var(--accent)' }} />
    </svg>
  );
}

export function Brand({ size = 30 }: { size?: number }) {
  return (
    <a className="brand" href="#top" aria-label="QR Studio — home">
      <BrandMark size={size} />
      <span className="wm">
        QR<b>studio</b>
      </span>
    </a>
  );
}

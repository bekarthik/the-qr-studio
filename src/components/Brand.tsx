/** The QR Studio brand mark — the faceted-red logo (public/logo.png, trimmed,
 *  transparent background so it sits on both Linen and Midnight). */
export function BrandMark({ size = 30 }: { size?: number }) {
  // The artwork is taller than wide (196×235); size sets the height.
  return <img className="brand__mark" src="/logo.png" alt="" aria-hidden="true" style={{ height: size }} />;
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

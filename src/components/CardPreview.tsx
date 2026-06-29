import { useMemo } from 'react';
import { useGen } from '../state/GeneratorContext';
import { cardDims } from '../card/card';
import { buildCardArtifacts, save } from '../card/artifacts';

/** The visiting-card live preview + downloads (controls live in CardControls). */
export function CardPreview() {
  const { cfg } = useGen();
  const { hasData, twoSided, baseName, out } = useMemo(() => buildCardArtifacts(cfg), [cfg]);
  const svg = out?.preview ?? '';

  const savePng = (source: string, filename: string) => {
    const { w, h } = cardDims(cfg.cardOrientation, false);
    const img = new Image();
    img.onload = () => {
      const scale = 2;
      const canvas = document.createElement('canvas');
      canvas.width = w * scale;
      canvas.height = h * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((b) => b && save(b, filename), 'image/png');
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(new Blob([source], { type: 'image/svg+xml' }));
  };

  const downloadSvg = () => {
    if (!out) return;
    if (twoSided) {
      save(new Blob([out.front], { type: 'image/svg+xml' }), `${baseName}-front.svg`);
      save(new Blob([out.back], { type: 'image/svg+xml' }), `${baseName}-back.svg`);
    } else {
      save(new Blob([out.single], { type: 'image/svg+xml' }), `${baseName}.svg`);
    }
  };
  const downloadPng = () => {
    if (!out) return;
    if (twoSided) {
      savePng(out.front, `${baseName}-front.png`);
      savePng(out.back, `${baseName}-back.png`);
    } else {
      savePng(out.single, `${baseName}.png`);
    }
  };

  if (!hasData || !svg) {
    return <p className="empty">Fill in the source details to generate a card.</p>;
  }

  return (
    <>
      <img className="cardx__preview" src={`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`} alt="Visiting card preview" />
      <div className="downloads">
        <button className="download" onClick={downloadPng}>Download PNG{twoSided && ' ×2'}</button>
        <button className="download download--alt" onClick={downloadSvg}>Download SVG{twoSided && ' ×2'}</button>
      </div>
      <p className="finehint">
        The QR encodes your current source, styled to always scan. Tick <b>Match QR’s exact design</b>
        {' '}in the card controls to mirror the live code (halftone / logo / watermark).
        {twoSided && <> Two-sided downloads as <b>two files</b> — <code>-front</code> and <code>-back</code>.</>}
      </p>
    </>
  );
}

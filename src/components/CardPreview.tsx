import { useEffect, useMemo } from 'react';
import { useGen } from '../state/GeneratorContext';
import { cardDims } from '../card/card';
import { buildCardArtifacts, save } from '../card/artifacts';
import type { ExportApi } from './Preview';
import { Toggle } from './StudioControls';

/** The visiting-card live preview + the two-sided toggle. Downloads are exposed
 *  to the Workstation chrome via `registerExport` (top-bar Export menu +
 *  status-bar quick buttons), same as the QR preview.
 *  Scannability is NOT re-verified here — the card embeds the same code shown in
 *  the QR preview (whose badge is the source of truth); rasterising the small
 *  card QR through jsQR produced false "may not scan" warnings. */
export function CardPreview({ registerExport }: { registerExport?: (api: ExportApi) => void } = {}) {
  const { cfg, update } = useGen();
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

  const ready = Boolean(hasData && out);
  useEffect(() => {
    registerExport?.({ png: downloadPng, svg: downloadSvg, ready });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, out, registerExport]);

  if (!hasData || !svg) {
    return <p className="empty">Fill in the source details to generate a card.</p>;
  }

  return (
    <>
      <div className="ws-sheet ws-sheet--card">
        <img
          className={'cardx__preview' + (cfg.cardOrientation === 'portrait' ? ' cardx__preview--portrait' : '')}
          src={`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`}
          alt="Visiting card preview"
        />
      </div>

      <div className="ws-stage__opts">
        <Toggle
          on={cfg.cardTwoSided}
          label="Two-sided — QR on the back, logo & watermark on the front"
          onToggle={() => update({ cardTwoSided: !cfg.cardTwoSided })}
        />
      </div>
      <p className="hint">
        {cfg.cardExactQr
          ? 'Mirrors your live code — scannability is verified on the QR view.'
          : 'The card’s QR uses a clean colour/shape style so it always scans.'}
        {twoSided && ' Exports as two files: -front and -back.'}
      </p>
    </>
  );
}

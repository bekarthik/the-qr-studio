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

  const portrait = cfg.cardOrientation === 'portrait';
  const sheetCls = 'ws-sheet ws-sheet--card' + (portrait ? ' is-portrait' : '');
  const imgCls = 'cardx__preview' + (portrait ? ' cardx__preview--portrait' : '');
  const sides: { svg: string; label: string }[] =
    twoSided && out
      ? [
          { svg: out.front, label: 'Front' },
          { svg: out.back, label: 'Back' },
        ]
      : [{ svg, label: '' }];

  return (
    <>
      {/* two-sided: wide landscape cards stack vertically; narrow portrait
          cards sit side-by-side — whichever keeps both fully in view */}
      <div className={'ws-duo' + (twoSided && !portrait ? ' ws-duo--stack' : '')}>
        {sides.map((s) => (
          <figure className={sheetCls} key={s.label || 'single'}>
            <img
              className={imgCls}
              src={`data:image/svg+xml;utf8,${encodeURIComponent(s.svg)}`}
              alt={s.label ? `Visiting card — ${s.label.toLowerCase()}` : 'Visiting card preview'}
            />
            {s.label && <figcaption className="ws-sheet__cap">{s.label}</figcaption>}
          </figure>
        ))}
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

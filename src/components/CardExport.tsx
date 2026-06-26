import { useMemo } from 'react';
import { useGen } from '../state/GeneratorContext';
import { buildPayload } from '../content/payloads';
import { buildMatrix } from '../qr/matrix';
import { renderSVG } from '../qr/svg';
import { brandDarkHex } from '../qr/grid';
import { buildCardSVG, type CardData } from '../card/card';

const str = (v: unknown) => (v == null ? '' : String(v));

/**
 * Visiting-card export. Builds a print-ready 3.5"×2" business card from the
 * vCard contact fields, embedding a styled QR that encodes the same vCard (so
 * scanning the card saves the contact). Independent of the active source.
 */
export function CardExport() {
  const { cfg } = useGen();
  const v = cfg.values.vcard ?? {};
  const name = `${str(v.first)} ${str(v.last)}`.trim();
  const org = str(v.org);
  const hasData = Boolean(name || org);

  const svg = useMemo(() => {
    if (!hasData) return '';
    const payload = buildPayload('vcard', v);
    if (!payload) return '';
    let matrix;
    try {
      matrix = buildMatrix(payload, 'H');
    } catch {
      return '';
    }
    const accent = cfg.colorStyle === 'brand' ? brandDarkHex(cfg.brandColor) : '#e0522e';
    // A clean, reliably-scannable code: current colour/shape styling, no image
    // modes (a business-card QR must always scan).
    const qrSvg = renderSVG({
      matrix,
      quietModules: 2,
      fg: cfg.fg,
      bg: cfg.bg,
      sampler: null,
      protectPatterns: true,
      colorStyle: cfg.colorStyle,
      brandColor: cfg.brandColor,
      sub: 3,
      core: 0,
      shape: cfg.shape,
      eyeShape: cfg.eyeShape,
      eyeColor: cfg.autoEyeColor ? null : cfg.eyeColor,
      pixelSize: 420,
    });
    const data: CardData = {
      name,
      title: str(v.title),
      org,
      phone: str(v.phone),
      email: str(v.email),
      url: str(v.url),
      address: str(v.address),
      accent,
      qrBg: cfg.bg,
      caption: 'SCAN TO SAVE CONTACT',
    };
    return buildCardSVG(data, qrSvg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg, hasData]);

  const baseName = (name || org || 'card').replace(/\s+/g, '-').toLowerCase();

  const downloadSvg = () => {
    save(new Blob([svg], { type: 'image/svg+xml' }), `${baseName}.svg`);
  };

  const downloadPng = () => {
    const img = new Image();
    img.onload = () => {
      const scale = 2;
      const canvas = document.createElement('canvas');
      canvas.width = 1050 * scale;
      canvas.height = 600 * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((b) => b && save(b, `${baseName}.png`), 'image/png');
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  };

  return (
    <div className="cardx">
      <div className="card__head">
        <h2>Visiting card</h2>
        <p>A print-ready business card (3.5×2″) with your contact QR.</p>
      </div>
      {hasData && svg ? (
        <>
          <img className="cardx__preview" src={`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`} alt="Visiting card preview" />
          <div className="downloads">
            <button className="download" onClick={downloadPng}>
              Download card PNG
            </button>
            <button className="download download--alt" onClick={downloadSvg}>
              Download card SVG
            </button>
          </div>
          <p className="finehint">
            Pulls from the <b>Visiting card</b> source fields. The QR encodes your vCard, so scanning
            the card adds you as a contact. Uses your colour/shape style; image modes are skipped so
            the card always scans.
          </p>
        </>
      ) : (
        <p className="empty">
          Fill in the <b>Visiting card</b> source (name, company, phone…) to generate a card.
        </p>
      )}
    </div>
  );
}

function save(blob: Blob, filename: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

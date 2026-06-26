import { useMemo } from 'react';
import { useGen } from '../state/GeneratorContext';
import { buildPayload, type SourceType } from '../content/payloads';
import { buildMatrix } from '../qr/matrix';
import { renderSVG } from '../qr/svg';
import { brandDarkHex } from '../qr/grid';
import { buildCardSVG, buildCardSheetSVG, CARD_W, CARD_H, sheetWidth, type CardData } from '../card/card';

const str = (v: unknown) => (v == null ? '' : String(v));

/** A scan-prompt that fits the source type. */
function captionFor(type: SourceType): string {
  switch (type) {
    case 'vcard':
      return 'SCAN TO SAVE CONTACT';
    case 'url':
    case 'appstore':
    case 'playstore':
      return 'SCAN TO VISIT';
    case 'upi':
    case 'indbank':
    case 'paypal':
    case 'venmo':
    case 'cashapp':
    case 'bitcoin':
    case 'sepa':
      return 'SCAN TO PAY';
    case 'wifi':
      return 'SCAN TO CONNECT';
    case 'phone':
      return 'SCAN TO CALL';
    case 'email':
      return 'SCAN TO EMAIL';
    default:
      return 'SCAN ME';
  }
}

/**
 * Visiting-card export. Works for any source: it embeds a styled QR of the
 * active code and lets the user add an optional display name. When the source
 * is a vCard, the richer contact fields (title/org/phone/…) are laid out too.
 */
export function CardExport() {
  const { cfg, update } = useGen();
  const v = cfg.values.vcard ?? {};
  const isVcard = cfg.type === 'vcard';
  const vcardName = `${str(v.first)} ${str(v.last)}`.trim();
  const displayName = str(cfg.cardName).trim() || vcardName || (isVcard ? str(v.org) : '');

  const payload = buildPayload(cfg.type, cfg.values[cfg.type] ?? {});
  const hasData = Boolean(payload);
  const twoSided = cfg.cardTwoSided;

  const svg = useMemo(() => {
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
      name: displayName,
      title: isVcard ? str(v.title) : '',
      org: isVcard ? str(v.org) : '',
      phone: isVcard ? str(v.phone) : '',
      email: isVcard ? str(v.email) : '',
      url: isVcard ? str(v.url) : '',
      address: isVcard ? str(v.address) : '',
      accent,
      qrBg: cfg.bg,
      caption: captionFor(cfg.type),
    };
    if (twoSided) {
      return buildCardSheetSVG(data, qrSvg, {
        logoHref: cfg.image?.src ?? null,
        watermarkHref: cfg.watermark ? cfg.image?.src ?? null : null,
        watermarkOpacity: cfg.watermarkOpacity,
      });
    }
    return buildCardSVG(data, qrSvg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg, payload, twoSided, displayName, isVcard]);

  const baseName = (displayName || 'card').replace(/\s+/g, '-').toLowerCase() || 'card';

  const downloadSvg = () => {
    save(new Blob([svg], { type: 'image/svg+xml' }), `${baseName}.svg`);
  };

  const downloadPng = () => {
    const img = new Image();
    img.onload = () => {
      const scale = 2;
      const canvas = document.createElement('canvas');
      canvas.width = (twoSided ? sheetWidth() : CARD_W) * scale;
      canvas.height = CARD_H * scale;
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
        <p>A print-ready business card (3.5×2″) with your QR — for any source.</p>
      </div>

      <div className="grid2">
        <label className="field">
          <span className="field__label">Name on card {isVcard && <span className="h__opt">optional</span>}</span>
          <input
            type="text"
            placeholder={vcardName || 'e.g. Asha Rao'}
            value={cfg.cardName}
            onChange={(e) => update({ cardName: e.target.value })}
          />
        </label>
        <label className="field field--check">
          <input
            type="checkbox"
            checked={twoSided}
            onChange={(e) => update({ cardTwoSided: e.target.checked })}
          />
          <span className="field__label">
            Two-sided — <b>QR on the back</b>, logo/watermark on the front
          </span>
        </label>
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
            The QR encodes your current source. Add a <b>Name on card</b> to title it; a{' '}
            <b>Visiting card</b> source also lays out title/company/contacts. Uses your colour/shape
            style; image modes are skipped so the card always scans.
            {twoSided && (
              <>
                {' '}
                The sheet shows <b>front</b> (left) and <b>back</b> (right): the front uses your
                uploaded image as the logo, and the <b>Watermark</b> toggle adds a faint watermark.
              </>
            )}
          </p>
        </>
      ) : (
        <p className="empty">Fill in the source details (above) to generate a card.</p>
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

import { buildPayload, type SourceType } from '../content/payloads';
import { buildMatrix } from '../qr/matrix';
import { renderSVG } from '../qr/svg';
import { brandDarkHex } from '../qr/grid';
import { sampleImage, extractBrandColor } from '../qr/halftone';
import { buildCardSVG, buildCardSheetSVG, buildCardFrontSVG, buildCardBackSVG, type CardData, type CardTheme } from './card';
import { roleImage, primaryImage, type Config } from '../state/GeneratorContext';

export const str = (v: unknown) => (v == null ? '' : String(v));

export function captionFor(type: SourceType): string {
  switch (type) {
    case 'vcard': return 'SCAN TO SAVE CONTACT';
    case 'url': case 'appstore': case 'playstore': return 'SCAN TO VISIT';
    case 'upi': case 'indbank': case 'paypal': case 'venmo': case 'cashapp': case 'bitcoin': case 'sepa': return 'SCAN TO PAY';
    default: return 'SCAN ME';
  }
}

export function save(blob: Blob, filename: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export interface CardArtifacts {
  hasData: boolean;
  twoSided: boolean;
  baseName: string;
  out: { preview: string; single: string; front: string; back: string } | null;
}

/** Builds every card SVG (preview sheet + individual faces) from the current
 *  config — pure, so both the preview and any exporter can share it. */
export function buildCardArtifacts(cfg: Config): CardArtifacts {
  const v = cfg.values.vcard ?? {};
  const isVcard = cfg.type === 'vcard';
  const vcardName = `${str(v.first)} ${str(v.last)}`.trim();
  const displayName = str(cfg.cardName).trim() || (isVcard ? vcardName : '');
  const payload = buildPayload(cfg.type, cfg.values[cfg.type] ?? {});
  const twoSided = cfg.cardTwoSided;
  const baseName = (displayName || 'card').replace(/\s+/g, '-').toLowerCase() || 'card';

  if (!payload) return { hasData: false, twoSided, baseName, out: null };

  const exact = cfg.cardExactQr;
  const imageOn = exact && (cfg.resemble || cfg.embed);
  const errorLevel = exact ? (imageOn ? 'H' : cfg.errorLevel) : 'H';
  let matrix;
  try {
    matrix = buildMatrix(payload, errorLevel);
  } catch {
    return { hasData: true, twoSided, baseName, out: null };
  }

  const eyeColor = cfg.autoEyeColor ? null : cfg.eyeColor;
  let qrSvg: string;
  if (exact) {
    const detail = cfg.detail;
    const smooth = detail >= 5 ? 1 : 0;
    const brandImg = primaryImage(cfg);
    const halftoneImg = roleImage(cfg, 'halftone');
    const logoImg = roleImage(cfg, 'logo');
    const watermarkImg = roleImage(cfg, 'watermark');
    const brandColor =
      cfg.autoBrand && brandImg && cfg.colorStyle === 'brand'
        ? extractBrandColor(brandImg, brandImg.naturalWidth, brandImg.naturalHeight)
        : cfg.brandColor;
    const sampler =
      cfg.resemble && halftoneImg
        ? sampleImage(halftoneImg, halftoneImg.naturalWidth, halftoneImg.naturalHeight, {
            gridSize: matrix.size * detail, threshold: cfg.threshold, invert: cfg.invert, auto: cfg.autoThreshold, smooth,
          })
        : null;
    qrSvg = renderSVG({
      matrix, quietModules: 2, fg: cfg.fg, bg: cfg.bg, sampler, protectPatterns: cfg.protectPatterns,
      colorStyle: cfg.colorStyle, brandColor, sub: detail, core: 0, dotScale: cfg.dotSize,
      shape: cfg.shape, eyeShape: cfg.eyeShape, eyeColor,
      watermark: cfg.watermark && watermarkImg ? { href: watermarkImg.src, opacity: cfg.watermarkOpacity, position: cfg.watermarkPos } : null,
      centerImage: cfg.embed && logoImg ? { href: logoImg.src, ratio: cfg.logoRatio, plate: cfg.plate, position: cfg.embedPos } : null,
      pixelSize: 420,
    });
  } else {
    qrSvg = renderSVG({
      matrix, quietModules: 2, fg: cfg.fg, bg: cfg.bg, sampler: null, protectPatterns: true,
      colorStyle: cfg.colorStyle, brandColor: cfg.brandColor, sub: 3, core: 0,
      shape: cfg.shape, eyeShape: cfg.eyeShape, eyeColor, pixelSize: 420,
    });
  }

  const theme: CardTheme = {
    bgStyle: cfg.cardBgStyle, bg1: cfg.cardBg1, bg2: cfg.cardBg2, gradAngle: cfg.cardGradAngle, pattern: cfg.cardPattern,
    accent: cfg.cardAccentAuto ? (cfg.colorStyle === 'brand' ? brandDarkHex(cfg.brandColor) : '#e0522e') : cfg.cardAccent,
    text: cfg.cardText, accentBar: cfg.cardAccentBar, border: cfg.cardBorder, qrPanel: cfg.cardPanel,
    orientation: cfg.cardOrientation, headingFont: cfg.cardHeadingFont, bodyFont: cfg.cardBodyFont,
    divider: cfg.cardDivider, graphic: cfg.cardGraphic,
    textV: isVcard ? 'top' : cfg.cardTextV, textH: cfg.cardTextH,
    qrScale: cfg.cardQrScale,
  };
  const data: CardData = {
    name: cfg.cardShowName ? displayName : '',
    title: isVcard && cfg.cardShowTitle ? str(v.title) : '',
    org: isVcard && cfg.cardShowOrg ? str(v.org) : '',
    phone: isVcard && cfg.cardShowPhone ? str(v.phone) : '',
    email: isVcard && cfg.cardShowEmail ? str(v.email) : '',
    url: isVcard && cfg.cardShowUrl ? str(v.url) : '',
    address: isVcard && cfg.cardShowAddress ? str(v.address) : '',
    qrBg: cfg.bg,
    caption: cfg.cardShowCaption ? str(cfg.cardCaption).trim() || captionFor(cfg.type) : '',
  };
  const frontOpts = {
    logoHref: roleImage(cfg, 'logo')?.src ?? null,
    watermarkHref: cfg.cardWatermarkShow ? roleImage(cfg, 'watermark')?.src ?? null : null,
    watermarkOpacity: cfg.cardWatermarkOpacity,
    showLogo: cfg.cardLogoShow,
    logoV: cfg.cardLogoV,
    logoH: cfg.cardLogoH,
    logoSize: cfg.cardLogoSize,
  };

  return {
    hasData: true,
    twoSided,
    baseName,
    out: {
      preview: twoSided ? buildCardSheetSVG(data, qrSvg, frontOpts, theme) : buildCardSVG(data, qrSvg, frontOpts, theme),
      single: buildCardSVG(data, qrSvg, frontOpts, theme),
      front: buildCardFrontSVG(data, frontOpts, theme),
      back: buildCardBackSVG(data, qrSvg, theme),
    },
  };
}

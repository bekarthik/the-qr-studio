/**
 * Composes a print-ready visiting (business) card around a QR code. Each face
 * is the standard 3.5"×2" at 300dpi (1050×600px), landscape. Fonts are web-safe
 * stacks (no external fonts) so the card renders identically in a viewer, in
 * print, or rasterised to PNG via an <img>.
 *
 * Single-sided: contact details + QR on one face.
 * Two-sided: a sheet with the FRONT (details + logo + optional watermark) and
 * the BACK (the QR) side by side, so the QR prints on the second page.
 */

export interface CardData {
  name: string;
  title: string;
  org: string;
  phone: string;
  email: string;
  url: string;
  address: string;
  /** Accent colour (brand colour, or the editorial vermilion). */
  accent: string;
  /** QR background, used for the panel behind the code. */
  qrBg: string;
  /** Caption under the QR. */
  caption: string;
}

export interface FrontOptions {
  /** Logo (data URL) shown on the front face. */
  logoHref?: string | null;
  /** Faint watermark (data URL) across the front face. */
  watermarkHref?: string | null;
  watermarkOpacity?: number;
}

export const CARD_W = 1050;
export const CARD_H = 600;
export const SHEET_GAP = 44;
export const sheetWidth = () => CARD_W * 2 + SHEET_GAP;

const W = CARD_W;
const H = CARD_H;
const PAD = 64;
const QR = 420;

const SANS = "'Helvetica Neue', Arial, sans-serif";
const SERIF = "Georgia, 'Times New Roman', serif";
const INK = '#1c1916';
const MUTED = '#6b665f';
const PAPER = '#fffdf8';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* ----------------------------------------------------------- shared faces */

function bodyFill(ox: number, accent: string): string {
  return (
    `<rect x="${ox}" y="0" width="${W}" height="${H}" rx="28" fill="${PAPER}"/>` +
    `<rect x="${ox + 14}" y="0" width="${W - 14}" height="${H}" fill="${PAPER}"/>` +
    `<rect x="${ox}" y="0" width="16" height="${H}" fill="${accent}"/>`
  );
}

function bodyBorder(ox: number): string {
  return `<rect x="${ox + 1.5}" y="1.5" width="${W - 3}" height="${H - 3}" rx="26.5" fill="none" stroke="${INK}" stroke-width="3"/>`;
}

/** Name / title / org / divider / contact lines down the left of a face. */
function textColumn(ox: number, d: CardData, withContacts: boolean): string {
  const parts: string[] = [];
  const tx = ox + PAD;
  const tw = W - 2 * PAD - QR - 44;
  let y = 168;
  const name = d.name.trim() || d.org.trim() || 'Your Name';
  parts.push(text(tx, y, name, { size: 54, weight: '700', font: SANS, fill: INK }));
  y += 44;
  if (d.title.trim()) {
    parts.push(text(tx, y, d.title, { size: 27, font: SERIF, italic: true, fill: d.accent }));
    y += 38;
  }
  if (d.org.trim() && d.name.trim()) {
    parts.push(text(tx, y, d.org, { size: 26, font: SANS, fill: MUTED }));
    y += 38;
  }
  y += 8;
  parts.push(`<rect x="${tx}" y="${y}" width="${Math.min(tw, 360)}" height="3" fill="${d.accent}"/>`);
  y += 40;
  if (withContacts) {
    const lines = [d.phone, d.email, d.url, d.address].map((s) => s.trim()).filter(Boolean);
    for (const line of lines) {
      parts.push(`<rect x="${tx}" y="${y - 14}" width="9" height="9" fill="${d.accent}"/>`);
      parts.push(text(tx + 24, y, fit(line, 34), { size: 24, font: SANS, fill: INK }));
      y += 42;
    }
  }
  return parts.join('');
}

/** The QR panel on the right of a single-sided face. */
function qrPanelRight(ox: number, qrSvg: string, d: CardData): string {
  const qx = ox + W - PAD - QR;
  const qy = (H - QR) / 2;
  return (
    `<rect x="${qx - 16}" y="${qy - 16}" width="${QR + 32}" height="${QR + 32}" rx="18" fill="${d.qrBg}" stroke="${INK}" stroke-width="2"/>` +
    placeQr(qrSvg, qx, qy) +
    text(qx + QR / 2, qy + QR + 40, d.caption, { size: 20, font: SANS, weight: '600', fill: MUTED, anchor: 'middle', spacing: 2 })
  );
}

/** A centred QR for the back face, with the name above and caption below. */
function qrFaceCentered(ox: number, qrSvg: string, d: CardData): string {
  const qx = ox + (W - QR) / 2;
  const qy = (H - QR) / 2 - 8;
  const cx = ox + W / 2;
  const out: string[] = [];
  const heading = d.name.trim() || d.org.trim();
  if (heading) out.push(text(cx, qy - 26, heading, { size: 28, weight: '700', font: SANS, fill: INK, anchor: 'middle' }));
  out.push(
    `<rect x="${qx - 16}" y="${qy - 16}" width="${QR + 32}" height="${QR + 32}" rx="18" fill="${d.qrBg}" stroke="${INK}" stroke-width="2"/>`,
  );
  out.push(placeQr(qrSvg, qx, qy));
  out.push(text(cx, qy + QR + 42, d.caption, { size: 20, font: SANS, weight: '600', fill: MUTED, anchor: 'middle', spacing: 2 }));
  return out.join('');
}

/** A logo contained on the right of the front face. */
function logoFace(ox: number, href?: string | null): string {
  if (!href) return '';
  const box = 360;
  const x = ox + W - PAD - box;
  const y = (H - box) / 2;
  return `<image x="${x}" y="${y}" width="${box}" height="${box}" preserveAspectRatio="xMidYMid meet" href="${esc(href)}"/>`;
}

/** A faint full-face watermark (cover-fit, clipped to the body). */
function watermarkLayer(ox: number, href?: string | null, opacity = 0.12): string {
  if (!href) return '';
  const op = Math.max(0, Math.min(1, opacity));
  return `<image x="${ox + 18}" y="18" width="${W - 36}" height="${H - 36}" preserveAspectRatio="xMidYMid slice" opacity="${op}" href="${esc(href)}"/>`;
}

/* --------------------------------------------------------------- builders */

/** Single-sided card: contact details + QR on one face. */
export function buildCardSVG(d: CardData, qrSvg: string): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    bodyFill(0, d.accent) +
    textColumn(0, d, true) +
    qrPanelRight(0, qrSvg, d) +
    bodyBorder(0) +
    '</svg>'
  );
}

/** Two-sided sheet: FRONT (details + logo + watermark) | BACK (QR). */
export function buildCardSheetSVG(d: CardData, qrSvg: string, front: FrontOptions): string {
  const w = sheetWidth();
  const backOx = W + SHEET_GAP;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${H}" viewBox="0 0 ${w} ${H}">` +
    // Front
    bodyFill(0, d.accent) +
    watermarkLayer(0, front.watermarkHref, front.watermarkOpacity) +
    textColumn(0, d, true) +
    logoFace(0, front.logoHref) +
    bodyBorder(0) +
    // Back
    bodyFill(backOx, d.accent) +
    qrFaceCentered(backOx, qrSvg, d) +
    bodyBorder(backOx) +
    '</svg>'
  );
}

/* ------------------------------------------------------------------ utils */

function placeQr(qrSvg: string, x: number, y: number): string {
  return qrSvg.replace('<svg ', `<svg x="${x}" y="${y}" `);
}

interface TextOpts {
  size: number;
  font: string;
  fill: string;
  weight?: string;
  italic?: boolean;
  anchor?: 'start' | 'middle';
  spacing?: number;
}

function text(x: number, y: number, content: string, o: TextOpts): string {
  const attrs = [
    `x="${x}"`,
    `y="${y}"`,
    `font-family="${o.font}"`,
    `font-size="${o.size}"`,
    `fill="${o.fill}"`,
    o.weight ? `font-weight="${o.weight}"` : '',
    o.italic ? 'font-style="italic"' : '',
    o.anchor ? `text-anchor="${o.anchor}"` : '',
    o.spacing ? `letter-spacing="${o.spacing}"` : '',
  ]
    .filter(Boolean)
    .join(' ');
  return `<text ${attrs}>${esc(content)}</text>`;
}

function fit(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

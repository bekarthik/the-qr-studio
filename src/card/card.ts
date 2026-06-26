/**
 * Composes a print-ready visiting (business) card around a QR code. Each face
 * is the standard 3.5"×2" at 300dpi (1050×600px), landscape. Fonts are web-safe
 * stacks (no external fonts) so the card renders identically in a viewer, in
 * print, or rasterised to PNG via an <img>.
 *
 * The look is fully themeable (solid / gradient / pattern background, accent,
 * text colour, accent bar, border). With no contact details the card becomes a
 * clean QR-only design. Two-sided puts details/logo on the front, QR on the back.
 */

export interface CardData {
  name: string;
  title: string;
  org: string;
  phone: string;
  email: string;
  url: string;
  address: string;
  /** QR background, used for the panel behind the code. */
  qrBg: string;
  /** Caption under the QR. */
  caption: string;
}

export type CardBgStyle = 'solid' | 'gradient' | 'pattern';
export type CardPattern = 'dots' | 'grid' | 'diagonal' | 'crosshatch';
export type CardText = 'auto' | 'dark' | 'light';

export interface CardTheme {
  bgStyle: CardBgStyle;
  bg1: string;
  bg2: string;
  gradAngle: number;
  pattern: CardPattern;
  accent: string;
  text: CardText;
  accentBar: boolean;
  border: boolean;
  qrPanel: boolean;
}

export interface FrontOptions {
  logoHref?: string | null;
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

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const r3 = (v: number) => Math.round(v * 1000) / 1000;
const hexToRgb = (h: string): [number, number, number] => {
  const x = h.replace('#', '');
  const n = x.length === 3 ? x.split('').map((c) => c + c).join('') : x;
  return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)];
};
const lum = (h: string) => {
  const [r, g, b] = hexToRgb(h);
  return 0.299 * r + 0.587 * g + 0.114 * b;
};

interface Palette {
  ink: string;
  muted: string;
  border: string;
}
function palette(theme: CardTheme): Palette {
  const mode = theme.text === 'auto' ? (lum(theme.bg1) < 140 ? 'light' : 'dark') : theme.text;
  return mode === 'light'
    ? { ink: '#fdfbf6', muted: '#cfc8bd', border: 'rgba(255,255,255,0.55)' }
    : { ink: '#1c1916', muted: '#6b665f', border: 'rgba(28,25,22,0.5)' };
}

/* ----------------------------------------------------------- background */

/** SVG <defs> + the fill value (colour or url(#…)) for the chosen background. */
function paint(theme: CardTheme): { defs: string; fill: string } {
  if (theme.bgStyle === 'gradient') {
    const a = ((theme.gradAngle % 360) * Math.PI) / 180;
    const x1 = r3(0.5 - Math.cos(a) / 2), y1 = r3(0.5 - Math.sin(a) / 2);
    const x2 = r3(0.5 + Math.cos(a) / 2), y2 = r3(0.5 + Math.sin(a) / 2);
    return {
      defs: `<linearGradient id="cardbg" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${theme.bg1}"/><stop offset="1" stop-color="${theme.bg2}"/></linearGradient>`,
      fill: 'url(#cardbg)',
    };
  }
  if (theme.bgStyle === 'pattern') {
    return {
      defs: `<pattern id="cardpat" width="30" height="30" patternUnits="userSpaceOnUse"><rect width="30" height="30" fill="${theme.bg1}"/>${patternMarks(theme.pattern, theme.bg2)}</pattern>`,
      fill: 'url(#cardpat)',
    };
  }
  return { defs: '', fill: theme.bg1 };
}

function patternMarks(p: CardPattern, c: string): string {
  switch (p) {
    case 'dots':
      return `<circle cx="15" cy="15" r="2.6" fill="${c}"/>`;
    case 'grid':
      return `<path d="M0 0H30M0 0V30" stroke="${c}" stroke-width="1"/>`;
    case 'diagonal':
      return `<path d="M0 30L30 0" stroke="${c}" stroke-width="1.5"/>`;
    case 'crosshatch':
      return `<path d="M0 30L30 0M0 0L30 30" stroke="${c}" stroke-width="1"/>`;
  }
}

/* --------------------------------------------------------------- faces */

/** Wrap a face's content in a rounded-clipped group with bg fill, accent bar
 *  and border, at horizontal offset `ox`. */
function face(ox: number, theme: CardTheme, fill: string, pal: Palette, content: string): string {
  const clip = `clip${ox}`;
  return (
    `<clipPath id="${clip}"><rect x="${ox + 1.5}" y="1.5" width="${W - 3}" height="${H - 3}" rx="26"/></clipPath>` +
    `<g clip-path="url(#${clip})">` +
    `<rect x="${ox}" y="0" width="${W}" height="${H}" fill="${fill}"/>` +
    (theme.accentBar ? `<rect x="${ox}" y="0" width="16" height="${H}" fill="${theme.accent}"/>` : '') +
    content +
    `</g>` +
    (theme.border
      ? `<rect x="${ox + 1.5}" y="1.5" width="${W - 3}" height="${H - 3}" rx="26.5" fill="none" stroke="${pal.border}" stroke-width="3"/>`
      : '')
  );
}

const hasDetails = (d: CardData) =>
  Boolean(d.name || d.title || d.org || d.phone || d.email || d.url || d.address);

/** Name / title / org / divider / contact lines down the left of a face. */
function textColumn(ox: number, d: CardData, theme: CardTheme, pal: Palette): string {
  const parts: string[] = [];
  const tx = ox + PAD;
  const tw = W - 2 * PAD - QR - 44;
  let y = 168;
  if (d.name.trim()) {
    parts.push(text(tx, y, d.name, { size: 54, weight: '700', font: SANS, fill: pal.ink }));
    y += 44;
  }
  if (d.title.trim()) {
    parts.push(text(tx, y, d.title, { size: 27, font: SERIF, italic: true, fill: theme.accent }));
    y += 38;
  }
  if (d.org.trim()) {
    parts.push(text(tx, y, d.org, { size: 26, font: SANS, fill: pal.muted }));
    y += 38;
  }
  y += 8;
  parts.push(`<rect x="${tx}" y="${y}" width="${Math.min(tw, 360)}" height="3" fill="${theme.accent}"/>`);
  y += 40;
  const lines = [d.phone, d.email, d.url, d.address].map((s) => s.trim()).filter(Boolean);
  for (const line of lines) {
    parts.push(`<rect x="${tx}" y="${y - 14}" width="9" height="9" fill="${theme.accent}"/>`);
    parts.push(text(tx + 24, y, fit(line, 34), { size: 24, font: SANS, fill: pal.ink }));
    y += 42;
  }
  return parts.join('');
}

function qrPanelRight(ox: number, qrSvg: string, d: CardData, theme: CardTheme, pal: Palette): string {
  const qx = ox + W - PAD - QR;
  const qy = (H - QR) / 2;
  return qrAt(qx, qy, qrSvg, d, theme, pal, ox + W - PAD - QR / 2);
}

/** A centred QR (used for QR-only single cards and the two-sided back). No
 *  heading text — the front already carries the name. */
function qrFaceCentered(ox: number, qrSvg: string, d: CardData, theme: CardTheme, pal: Palette): string {
  const qx = ox + (W - QR) / 2;
  const qy = (H - QR) / 2;
  return qrAt(qx, qy, qrSvg, d, theme, pal, ox + W / 2);
}

function qrAt(qx: number, qy: number, qrSvg: string, d: CardData, theme: CardTheme, pal: Palette, capCx: number): string {
  const panel = theme.qrPanel
    ? `<rect x="${qx - 16}" y="${qy - 16}" width="${QR + 32}" height="${QR + 32}" rx="18" fill="${d.qrBg}" stroke="${pal.border}" stroke-width="2"/>`
    : '';
  return (
    panel +
    placeQr(qrSvg, qx, qy) +
    text(capCx, qy + QR + 40, d.caption, { size: 20, font: SANS, weight: '600', fill: pal.muted, anchor: 'middle', spacing: 2 })
  );
}

function logoFace(ox: number, href?: string | null): string {
  if (!href) return '';
  const box = 360;
  const x = ox + W - PAD - box;
  const y = (H - box) / 2;
  return `<image x="${x}" y="${y}" width="${box}" height="${box}" preserveAspectRatio="xMidYMid meet" href="${esc(href)}"/>`;
}

function watermarkLayer(ox: number, href?: string | null, opacity = 0.12): string {
  if (!href) return '';
  const op = Math.max(0, Math.min(1, opacity));
  return `<image x="${ox + 18}" y="18" width="${W - 36}" height="${H - 36}" preserveAspectRatio="xMidYMid slice" opacity="${op}" href="${esc(href)}"/>`;
}

/* --------------------------------------------------------------- builders */

const open = (w: number) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${H}" viewBox="0 0 ${w} ${H}">`;

/** Single-sided card: details + QR, or a clean QR-only card when no details. */
export function buildCardSVG(d: CardData, qrSvg: string, theme: CardTheme): string {
  const pal = palette(theme);
  const { defs, fill } = paint(theme);
  const content = hasDetails(d)
    ? textColumn(0, d, theme, pal) + qrPanelRight(0, qrSvg, d, theme, pal)
    : qrFaceCentered(0, qrSvg, d, theme, pal);
  return open(W) + (defs ? `<defs>${defs}</defs>` : '') + face(0, theme, fill, pal, content) + '</svg>';
}

/** Two-sided sheet: FRONT (details + logo + watermark) | BACK (QR only). */
export function buildCardSheetSVG(d: CardData, qrSvg: string, front: FrontOptions, theme: CardTheme): string {
  const pal = palette(theme);
  const { defs, fill } = paint(theme);
  const backOx = W + SHEET_GAP;
  const frontContent =
    watermarkLayer(0, front.watermarkHref, front.watermarkOpacity) +
    (hasDetails(d) ? textColumn(0, d, theme, pal) : '') +
    logoFace(0, front.logoHref);
  return (
    open(sheetWidth()) +
    (defs ? `<defs>${defs}</defs>` : '') +
    face(0, theme, fill, pal, frontContent) +
    face(backOx, theme, fill, pal, qrFaceCentered(backOx, qrSvg, d, theme, pal)) +
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

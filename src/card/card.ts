/**
 * Composes a print-ready visiting (business) card around a QR code. Faces are
 * the standard 3.5"×2" at 300dpi — landscape (1050×600) or portrait (600×1050).
 * Fonts are web-safe stacks (no external fonts) so the card renders identically
 * in a viewer, in print, or rasterised to PNG via an <img>.
 *
 * Fully themeable: solid / gradient / pattern background, accent, text colour,
 * per-element fonts, accent bar, border, custom caption, orientation. With no
 * contact details it becomes a clean QR-only card. Two-sided puts details/logo
 * on the front, QR on the back.
 */

export interface CardData {
  name: string;
  title: string;
  org: string;
  phone: string;
  email: string;
  url: string;
  address: string;
  qrBg: string;
  caption: string;
}

export type CardBgStyle = 'solid' | 'gradient' | 'pattern';
export type CardPattern = 'dots' | 'grid' | 'diagonal' | 'crosshatch';
export type CardText = 'auto' | 'dark' | 'light';
export type CardOrientation = 'landscape' | 'portrait';

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
  orientation: CardOrientation;
  headingFont: string;
  bodyFont: string;
}

export interface FrontOptions {
  logoHref?: string | null;
  watermarkHref?: string | null;
  watermarkOpacity?: number;
}

/** Web-safe font stacks offered for the card (render without external fonts). */
export const CARD_FONTS: Array<{ label: string; stack: string }> = [
  { label: 'Sans (Helvetica)', stack: "'Helvetica Neue', Arial, sans-serif" },
  { label: 'Serif (Georgia)', stack: "Georgia, 'Times New Roman', serif" },
  { label: 'Trebuchet', stack: "'Trebuchet MS', Tahoma, sans-serif" },
  { label: 'Verdana', stack: 'Verdana, Geneva, sans-serif' },
  { label: 'Palatino', stack: "'Palatino Linotype', 'Book Antiqua', serif" },
  { label: 'Mono (Courier)', stack: "'Courier New', monospace" },
  { label: 'Impact', stack: 'Impact, Haettenschweiler, sans-serif' },
];

export const SHEET_GAP = 44;

const GEO = {
  landscape: { W: 1050, H: 600, PAD: 64, QR: 420 },
  portrait: { W: 600, H: 1050, PAD: 56, QR: 420 },
} as const;

export function cardDims(o: CardOrientation, twoSided: boolean): { w: number; h: number } {
  const g = GEO[o];
  return { w: twoSided ? g.W * 2 + SHEET_GAP : g.W, h: g.H };
}

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
    case 'dots': return `<circle cx="15" cy="15" r="2.6" fill="${c}"/>`;
    case 'grid': return `<path d="M0 0H30M0 0V30" stroke="${c}" stroke-width="1"/>`;
    case 'diagonal': return `<path d="M0 30L30 0" stroke="${c}" stroke-width="1.5"/>`;
    case 'crosshatch': return `<path d="M0 30L30 0M0 0L30 30" stroke="${c}" stroke-width="1"/>`;
  }
}

/* --------------------------------------------------------------- faces */

type Geo = (typeof GEO)[CardOrientation];

function faceWrap(ox: number, g: Geo, theme: CardTheme, fill: string, pal: Palette, content: string): string {
  const clip = `clip${ox}`;
  return (
    `<clipPath id="${clip}"><rect x="${ox + 1.5}" y="1.5" width="${g.W - 3}" height="${g.H - 3}" rx="26"/></clipPath>` +
    `<g clip-path="url(#${clip})">` +
    `<rect x="${ox}" y="0" width="${g.W}" height="${g.H}" fill="${fill}"/>` +
    (theme.accentBar ? `<rect x="${ox}" y="0" width="16" height="${g.H}" fill="${theme.accent}"/>` : '') +
    content +
    `</g>` +
    (theme.border
      ? `<rect x="${ox + 1.5}" y="1.5" width="${g.W - 3}" height="${g.H - 3}" rx="26.5" fill="none" stroke="${pal.border}" stroke-width="3"/>`
      : '')
  );
}

const hasDetails = (d: CardData) =>
  Boolean(d.name || d.title || d.org || d.phone || d.email || d.url || d.address);

/** Heading + title + org block; returns the next free y. */
function heading(parts: string[], tx: number, y: number, d: CardData, theme: CardTheme, pal: Palette, big: number): number {
  if (d.name.trim()) { parts.push(text(tx, y, d.name, { size: big, weight: '700', font: theme.headingFont, fill: pal.ink })); y += big * 0.8; }
  if (d.title.trim()) { parts.push(text(tx, y, d.title, { size: big * 0.5, font: theme.bodyFont, italic: true, fill: theme.accent })); y += big * 0.7; }
  if (d.org.trim()) { parts.push(text(tx, y, d.org, { size: big * 0.48, font: theme.bodyFont, fill: pal.muted })); y += big * 0.7; }
  return y;
}

function contacts(parts: string[], tx: number, y: number, d: CardData, theme: CardTheme, pal: Palette, step: number): void {
  for (const line of [d.phone, d.email, d.url, d.address].map((s) => s.trim()).filter(Boolean)) {
    parts.push(`<rect x="${tx}" y="${y - 14}" width="9" height="9" fill="${theme.accent}"/>`);
    parts.push(text(tx + 24, y, fit(line, 34), { size: 24, font: theme.bodyFont, fill: pal.ink }));
    y += step;
  }
}

function qrBlock(g: Geo, qrSvg: string, d: CardData, theme: CardTheme, pal: Palette, qx: number, qy: number, capCx: number): string {
  const panel = theme.qrPanel
    ? `<rect x="${qx - 16}" y="${qy - 16}" width="${g.QR + 32}" height="${g.QR + 32}" rx="18" fill="${d.qrBg}" stroke="${pal.border}" stroke-width="2"/>`
    : '';
  return panel + placeQr(qrSvg, qx, qy) + text(capCx, qy + g.QR + 40, d.caption, { size: 20, font: theme.bodyFont, weight: '600', fill: pal.muted, anchor: 'middle', spacing: 2 });
}

/** Inner content (text + QR) for one single-sided face at offset ox. */
function singleContent(ox: number, g: Geo, o: CardOrientation, qrSvg: string, d: CardData, theme: CardTheme, pal: Palette): string {
  if (!hasDetails(d)) {
    const qx = ox + (g.W - g.QR) / 2;
    return qrBlock(g, qrSvg, d, theme, pal, qx, (g.H - g.QR) / 2, ox + g.W / 2);
  }
  const parts: string[] = [];
  const tx = ox + g.PAD;
  if (o === 'portrait') {
    let y = heading(parts, tx, 116, d, theme, pal, 46);
    y += 6;
    parts.push(`<rect x="${tx}" y="${y}" width="300" height="3" fill="${theme.accent}"/>`);
    const qx = ox + (g.W - g.QR) / 2;
    const qy = 296;
    parts.push(qrBlock(g, qrSvg, d, theme, pal, qx, qy, ox + g.W / 2));
    contacts(parts, tx, qy + g.QR + 96, d, theme, pal, 40);
  } else {
    let y = heading(parts, tx, 168, d, theme, pal, 54);
    y += 8;
    parts.push(`<rect x="${tx}" y="${y}" width="${Math.min(g.W - 2 * g.PAD - g.QR - 44, 360)}" height="3" fill="${theme.accent}"/>`);
    y += 40;
    contacts(parts, tx, y, d, theme, pal, 42);
    const qx = ox + g.W - g.PAD - g.QR;
    parts.push(qrBlock(g, qrSvg, d, theme, pal, qx, (g.H - g.QR) / 2, qx + g.QR / 2));
  }
  return parts.join('');
}

/** Front face of a two-sided card: details + logo + watermark (no QR). */
function frontContent(ox: number, g: Geo, o: CardOrientation, d: CardData, theme: CardTheme, pal: Palette, front: FrontOptions): string {
  const parts: string[] = [];
  parts.push(watermarkLayer(ox, g, front.watermarkHref, front.watermarkOpacity));
  const tx = ox + g.PAD;
  if (hasDetails(d)) {
    if (o === 'portrait') {
      let y = heading(parts, tx, 116, d, theme, pal, 46);
      y += 6;
      parts.push(`<rect x="${tx}" y="${y}" width="300" height="3" fill="${theme.accent}"/>`);
      contacts(parts, tx, 760, d, theme, pal, 40);
    } else {
      let y = heading(parts, tx, 168, d, theme, pal, 54);
      y += 8;
      parts.push(`<rect x="${tx}" y="${y}" width="360" height="3" fill="${theme.accent}"/>`);
      y += 40;
      contacts(parts, tx, y, d, theme, pal, 42);
    }
  }
  parts.push(logoFace(ox, g, o, front.logoHref));
  return parts.join('');
}

function backContent(ox: number, g: Geo, qrSvg: string, d: CardData, theme: CardTheme, pal: Palette): string {
  const qx = ox + (g.W - g.QR) / 2;
  return qrBlock(g, qrSvg, d, theme, pal, qx, (g.H - g.QR) / 2, ox + g.W / 2);
}

function logoFace(ox: number, g: Geo, o: CardOrientation, href?: string | null): string {
  if (!href) return '';
  const box = o === 'portrait' ? 300 : 360;
  const x = o === 'portrait' ? ox + (g.W - box) / 2 : ox + g.W - g.PAD - box;
  const y = o === 'portrait' ? g.H - g.PAD - box - 40 : (g.H - box) / 2;
  return `<image x="${x}" y="${y}" width="${box}" height="${box}" preserveAspectRatio="xMidYMid meet" href="${esc(href)}"/>`;
}

function watermarkLayer(ox: number, g: Geo, href?: string | null, opacity = 0.12): string {
  if (!href) return '';
  const op = Math.max(0, Math.min(1, opacity));
  return `<image x="${ox + 18}" y="18" width="${g.W - 36}" height="${g.H - 36}" preserveAspectRatio="xMidYMid slice" opacity="${op}" href="${esc(href)}"/>`;
}

/* --------------------------------------------------------------- builders */

const open = (w: number, h: number) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`;

export function buildCardSVG(d: CardData, qrSvg: string, theme: CardTheme): string {
  const g = GEO[theme.orientation];
  const pal = palette(theme);
  const { defs, fill } = paint(theme);
  return (
    open(g.W, g.H) +
    (defs ? `<defs>${defs}</defs>` : '') +
    faceWrap(0, g, theme, fill, pal, singleContent(0, g, theme.orientation, qrSvg, d, theme, pal)) +
    '</svg>'
  );
}

export function buildCardSheetSVG(d: CardData, qrSvg: string, front: FrontOptions, theme: CardTheme): string {
  const g = GEO[theme.orientation];
  const pal = palette(theme);
  const { defs, fill } = paint(theme);
  const backOx = g.W + SHEET_GAP;
  return (
    open(g.W * 2 + SHEET_GAP, g.H) +
    (defs ? `<defs>${defs}</defs>` : '') +
    faceWrap(0, g, theme, fill, pal, frontContent(0, g, theme.orientation, d, theme, pal, front)) +
    faceWrap(backOx, g, theme, fill, pal, backContent(backOx, g, qrSvg, d, theme, pal)) +
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
    `x="${x}"`, `y="${y}"`, `font-family="${o.font}"`, `font-size="${o.size}"`, `fill="${o.fill}"`,
    o.weight ? `font-weight="${o.weight}"` : '',
    o.italic ? 'font-style="italic"' : '',
    o.anchor ? `text-anchor="${o.anchor}"` : '',
    o.spacing ? `letter-spacing="${o.spacing}"` : '',
  ].filter(Boolean).join(' ');
  return `<text ${attrs}>${esc(content)}</text>`;
}

function fit(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

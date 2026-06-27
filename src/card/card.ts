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
export type CardDivider = 'line' | 'none' | 'short' | 'dotted' | 'double' | 'thick';
export type CardGraphic = 'none' | 'arc' | 'ring' | 'dots' | 'wave' | 'corner';
export type CardTextV = 'top' | 'middle' | 'bottom';
export type CardTextH = 'left' | 'center' | 'right';

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
  divider: CardDivider;
  graphic: CardGraphic;
  textV: CardTextV;
  textH: CardTextH;
  /** QR size as a fraction of its default (≈0.6–1.2); 1 = default. */
  qrScale: number;
}

export interface FrontOptions {
  logoHref?: string | null;
  watermarkHref?: string | null;
  watermarkOpacity?: number;
  showLogo?: boolean;
  logoV?: CardTextV;
  logoH?: CardTextH;
  logoSize?: number;
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

/** The QR draw size for an orientation, scaled & clamped so it stays on-card. */
function qrPx(g: Geo, theme: CardTheme): number {
  const scale = Math.max(0.6, Math.min(1.2, theme.qrScale || 1));
  return Math.round(Math.min(g.QR * scale, g.W - g.PAD * 2, g.H - g.PAD * 2));
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
    graphicLayer(ox, g, theme) +
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

/** Decorative accent graphic drawn behind the content (faint where it could sit
 *  under text; the opaque QR panel covers anything beneath it). */
function graphicLayer(ox: number, g: Geo, theme: CardTheme): string {
  const a = theme.accent;
  switch (theme.graphic) {
    case 'none':
      return '';
    case 'arc':
      return `<circle cx="${ox + g.W}" cy="${g.H}" r="${r3(g.H * 0.55)}" fill="${a}" opacity="0.12"/><circle cx="${ox}" cy="0" r="${r3(g.H * 0.32)}" fill="${a}" opacity="0.1"/>`;
    case 'ring':
      return `<circle cx="${ox + g.W - 34}" cy="34" r="86" fill="none" stroke="${a}" stroke-width="14" opacity="0.18"/>`;
    case 'dots': {
      const out: string[] = [];
      const x0 = ox + g.W - 152;
      const y0 = g.H - 152;
      for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) out.push(`<circle cx="${x0 + c * 32}" cy="${y0 + r * 32}" r="4" fill="${a}" opacity="0.4"/>`);
      return out.join('');
    }
    case 'wave': {
      const y0 = g.H - 48;
      let d = `M ${ox} ${g.H} L ${ox} ${y0}`;
      const step = 70;
      for (let x = 0; x < g.W; x += step) {
        const cx = ox + x + step / 2;
        const ex = ox + Math.min(x + step, g.W);
        d += ` Q ${cx} ${y0 - 22} ${ex} ${y0}`;
      }
      d += ` L ${ox + g.W} ${g.H} Z`;
      return `<path d="${d}" fill="${a}" opacity="0.85"/>`;
    }
    case 'corner':
      return `<path d="M ${ox + g.W} 0 L ${ox + g.W} 150 L ${ox + g.W - 150} 0 Z" fill="${a}" opacity="0.9"/>`;
  }
}

/** A styleable rule below the name. */
function divider(parts: string[], tx: number, y: number, w: number, theme: CardTheme): void {
  const a = theme.accent;
  switch (theme.divider) {
    case 'none':
      return;
    case 'line':
      parts.push(`<rect x="${tx}" y="${y}" width="${w}" height="3" fill="${a}"/>`);
      return;
    case 'short':
      parts.push(`<rect x="${tx}" y="${y}" width="${Math.min(w, 120)}" height="4" fill="${a}"/>`);
      return;
    case 'thick':
      parts.push(`<rect x="${tx}" y="${y}" width="${w}" height="7" rx="3.5" fill="${a}"/>`);
      return;
    case 'double':
      parts.push(`<rect x="${tx}" y="${y}" width="${w}" height="2" fill="${a}"/>`);
      parts.push(`<rect x="${tx}" y="${y + 7}" width="${w}" height="2" fill="${a}"/>`);
      return;
    case 'dotted': {
      const n = Math.floor(w / 22);
      for (let i = 0; i < n; i++) parts.push(`<circle cx="${tx + 11 + i * 22}" cy="${y + 2}" r="3.5" fill="${a}"/>`);
      return;
    }
  }
}

type Align = 'start' | 'middle' | 'end';
const alignOf = (h: CardTextH): Align => (h === 'center' ? 'middle' : h === 'right' ? 'end' : 'start');

const contactLines = (d: CardData) =>
  [d.phone, d.email, d.url, d.address].map((s) => s.trim()).filter(Boolean);

/** Total height of the text block (name/title/org/divider/contacts). */
function blockHeight(d: CardData, theme: CardTheme, big: number, step: number, withContacts: boolean): number {
  let h = 0;
  if (d.name.trim()) h += big * 0.8;
  if (d.title.trim()) h += big * 0.7;
  if (d.org.trim()) h += big * 0.7;
  h += theme.divider === 'none' ? 16 : 40;
  if (withContacts) h += contactLines(d).length * step;
  return h;
}

/** Largest font ≤ base that keeps `s` within `maxW` (so a long name can't spill
 *  into the QR); never shrinks below ~46% of base. */
function fitSize(s: string, base: number, maxW: number, factor: number): number {
  const t = s.trim();
  if (!t || maxW <= 0) return base;
  const est = t.length * base * factor;
  return est <= maxW ? base : Math.max(base * 0.46, (maxW / est) * base);
}

/** Name / title / org / divider, aligned at anchorX. Header text auto-shrinks to
 *  fit `maxW` so it never overlaps the QR. Returns the next free y. */
function renderHeader(parts: string[], ax: number, y: number, align: Align, d: CardData, theme: CardTheme, pal: Palette, big: number, dW: number, maxW: number): number {
  if (d.name.trim()) { parts.push(text(ax, y, d.name, { size: fitSize(d.name, big, maxW, 0.58), weight: '700', font: theme.headingFont, fill: pal.ink, anchor: align })); y += big * 0.8; }
  if (d.title.trim()) { parts.push(text(ax, y, d.title, { size: fitSize(d.title, big * 0.5, maxW, 0.5), font: theme.bodyFont, italic: true, fill: theme.accent, anchor: align })); y += big * 0.7; }
  if (d.org.trim()) { parts.push(text(ax, y, d.org, { size: fitSize(d.org, big * 0.48, maxW, 0.5), font: theme.bodyFont, fill: pal.muted, anchor: align })); y += big * 0.7; }
  const dx = align === 'start' ? ax : align === 'end' ? ax - dW : ax - dW / 2;
  divider(parts, dx, y + 4, dW, theme);
  return y + (theme.divider === 'none' ? 16 : 40);
}

/** Contact lines, aligned at anchorX (bullets only for left alignment). */
function renderContacts(parts: string[], ax: number, y: number, align: Align, d: CardData, theme: CardTheme, pal: Palette, step: number): void {
  for (const line of contactLines(d)) {
    if (align === 'start') {
      parts.push(`<rect x="${ax}" y="${y - 14}" width="9" height="9" fill="${theme.accent}"/>`);
      parts.push(text(ax + 24, y, fit(line, 34), { size: 24, font: theme.bodyFont, fill: pal.ink }));
    } else {
      parts.push(text(ax, y, fit(line, 34), { size: 24, font: theme.bodyFont, fill: pal.ink, anchor: align }));
    }
    y += step;
  }
}

function pushQr(parts: string[], qr: number, qrSvg: string, d: CardData, theme: CardTheme, pal: Palette, x: number, y: number): void {
  parts.push(qrBlock(qr, qrSvg, d, theme, pal, x, y, x + qr / 2));
}

function qrBlock(qr: number, qrSvg: string, d: CardData, theme: CardTheme, pal: Palette, qx: number, qy: number, capCx: number): string {
  const panel = theme.qrPanel
    ? `<rect x="${qx - 16}" y="${qy - 16}" width="${qr + 32}" height="${qr + 32}" rx="18" fill="${d.qrBg}" stroke="${pal.border}" stroke-width="2"/>`
    : '';
  const caption = d.caption.trim()
    ? text(capCx, qy + qr + 40, d.caption, { size: 20, font: theme.bodyFont, weight: '600', fill: pal.muted, anchor: 'middle', spacing: 2 })
    : '';
  return panel + placeQr(qrSvg, qx, qy, qr) + caption;
}

/**
 * Lays out the text block — with the QR when `qrSvg` is given (single card), or
 * filling the whole card when it isn't (two-sided front; the logo is placed
 * separately). Tall blocks (a vCard with contacts) pin to the top so they never
 * collide with the QR; short blocks (just a name) honour all nine positions.
 */
function placeContent(ox: number, g: Geo, o: CardOrientation, d: CardData, theme: CardTheme, pal: Palette, qrSvg: string | null, qr: number): string {
  const parts: string[] = [];
  const big = o === 'portrait' ? 46 : 54;
  const step = o === 'portrait' ? 40 : 42;
  const withC = contactLines(d).length > 0;
  const media = Boolean(qrSvg);
  const tall = withC; // a vCard-style block: pin to top
  const tv: CardTextV = tall ? 'top' : theme.textV;
  const th = theme.textH;
  const align = alignOf(th);
  const MW = qr;

  if (o === 'portrait') {
    const cx = ox + (align === 'middle' ? g.W / 2 : align === 'end' ? g.W - g.PAD : g.PAD);
    const fullW = g.W - g.PAD * 2;
    if (tall) {
      const y = renderHeader(parts, cx, 132, align, d, theme, pal, big, 300, fullW);
      if (qrSvg) {
        const qy = 300;
        pushQr(parts, qr, qrSvg, d, theme, pal, ox + (g.W - MW) / 2, qy);
        renderContacts(parts, cx, qy + MW + 96, align, d, theme, pal, step);
      } else {
        renderContacts(parts, cx, y + 8, align, d, theme, pal, step);
      }
      return parts.join('');
    }
    const h = blockHeight(d, theme, big, step, false);
    const groupH = h + (qrSvg ? 26 + MW + 36 : 0);
    const gy = tv === 'middle' ? (g.H - groupH) / 2 : tv === 'bottom' ? g.H - g.PAD - groupH : g.PAD;
    renderHeader(parts, cx, gy + big * 0.7, align, d, theme, pal, big, 300, fullW);
    if (qrSvg) pushQr(parts, qr, qrSvg, d, theme, pal, ox + (g.W - MW) / 2, gy + h + 26);
    return parts.join('');
  }

  // LANDSCAPE.
  const sideBySide = media && (tall || th !== 'center');
  if (sideBySide && qrSvg) {
    const right = th === 'right';
    const colX0 = right ? ox + g.PAD + MW + 44 : ox + g.PAD;
    const colX1 = right ? ox + g.W - g.PAD : ox + g.W - g.PAD - MW - 44;
    const ax = align === 'middle' ? (colX0 + colX1) / 2 : align === 'end' ? colX1 : colX0;
    const colW = colX1 - colX0;
    const dW = Math.min(colW, 360);
    const h = blockHeight(d, theme, big, step, withC);
    const y0 = (tv === 'middle' ? (g.H - h) / 2 : tv === 'bottom' ? g.H - g.PAD - h : g.PAD) + big * 0.7;
    const y = renderHeader(parts, ax, y0, align, d, theme, pal, big, dW, colW);
    if (withC) renderContacts(parts, ax, y, align, d, theme, pal, step);
    pushQr(parts, qr, qrSvg, d, theme, pal, right ? ox + g.PAD : ox + g.W - g.PAD - MW, (g.H - MW) / 2);
  } else if (qrSvg) {
    // Stacked, horizontally centred (short text only).
    const h = blockHeight(d, theme, big, step, false);
    const groupH = h + 26 + MW + 36;
    const gy = tv === 'middle' ? (g.H - groupH) / 2 : tv === 'bottom' ? g.H - g.PAD - groupH : g.PAD;
    const cx = ox + g.W / 2;
    renderHeader(parts, cx, gy + big * 0.7, 'middle', d, theme, pal, big, 300, g.W - g.PAD * 2);
    pushQr(parts, qr, qrSvg, d, theme, pal, ox + (g.W - MW) / 2, gy + h + 26);
  } else {
    // No QR (two-sided front): the text block fills the whole card, positioned.
    const colX0 = ox + g.PAD, colX1 = ox + g.W - g.PAD;
    const ax = align === 'middle' ? (colX0 + colX1) / 2 : align === 'end' ? colX1 : colX0;
    const colW = colX1 - colX0;
    const dW = Math.min(colW, 420);
    const h = blockHeight(d, theme, big, step, withC);
    const y0 = (tv === 'middle' ? (g.H - h) / 2 : tv === 'bottom' ? g.H - g.PAD - h : g.PAD) + big * 0.7;
    const y = renderHeader(parts, ax, y0, align, d, theme, pal, big, dW, colW);
    if (withC) renderContacts(parts, ax, y, align, d, theme, pal, step);
  }
  return parts.join('');
}

/** A logo placed at one of nine spots with a chosen size (fraction of the card's
 *  shorter side). Used on the two-sided front, independent of the text. */
function logoAt(ox: number, g: Geo, href: string, v: CardTextV, h: CardTextH, frac: number): string {
  const box = Math.min(g.W, g.H) * Math.max(0.15, Math.min(0.65, frac));
  const x = h === 'left' ? ox + g.PAD : h === 'right' ? ox + g.W - g.PAD - box : ox + (g.W - box) / 2;
  const y = v === 'top' ? g.PAD : v === 'bottom' ? g.H - g.PAD - box : (g.H - box) / 2;
  return `<image x="${r3(x)}" y="${r3(y)}" width="${r3(box)}" height="${r3(box)}" preserveAspectRatio="xMidYMid meet" href="${esc(href)}"/>`;
}

/** Inner content for one single-sided face at offset ox: an optional faint
 *  watermark behind, the text + QR, then an optional placed logo on top. The
 *  watermark/logo apply in either orientation (independent of the QR). */
function singleContent(ox: number, g: Geo, o: CardOrientation, qrSvg: string, d: CardData, theme: CardTheme, pal: Palette, front: FrontOptions): string {
  const qr = qrPx(g, theme);
  const wm = watermarkLayer(ox, g, front.watermarkHref, front.watermarkOpacity);
  const body = !hasDetails(d)
    ? qrBlock(qr, qrSvg, d, theme, pal, ox + (g.W - qr) / 2, (g.H - qr) / 2, ox + g.W / 2)
    : placeContent(ox, g, o, d, theme, pal, qrSvg, qr);
  const logo =
    front.showLogo !== false && front.logoHref
      ? logoAt(ox, g, front.logoHref, front.logoV ?? 'bottom', front.logoH ?? 'right', front.logoSize ?? 0.42)
      : '';
  // Logo sits *behind* the QR body so the opaque QR panel masks any overlap —
  // the card always scans regardless of where the logo is placed.
  return wm + logo + body;
}

/** Front face of a two-sided card: details + an independently-placed logo +
 *  watermark (no QR). The logo can be hidden, positioned and sized. */
function frontContent(ox: number, g: Geo, o: CardOrientation, d: CardData, theme: CardTheme, pal: Palette, front: FrontOptions): string {
  const wm = watermarkLayer(ox, g, front.watermarkHref, front.watermarkOpacity);
  const txt = hasDetails(d) ? placeContent(ox, g, o, d, theme, pal, null, qrPx(g, theme)) : '';
  const logo =
    front.showLogo !== false && front.logoHref
      ? logoAt(ox, g, front.logoHref, front.logoV ?? 'bottom', front.logoH ?? 'right', front.logoSize ?? 0.42)
      : '';
  return wm + txt + logo;
}

function backContent(ox: number, g: Geo, qrSvg: string, d: CardData, theme: CardTheme, pal: Palette): string {
  const qr = qrPx(g, theme);
  const qx = ox + (g.W - qr) / 2;
  return qrBlock(qr, qrSvg, d, theme, pal, qx, (g.H - qr) / 2, ox + g.W / 2);
}

function watermarkLayer(ox: number, g: Geo, href?: string | null, opacity = 0.12): string {
  if (!href) return '';
  const op = Math.max(0, Math.min(1, opacity));
  return `<image x="${ox + 18}" y="18" width="${g.W - 36}" height="${g.H - 36}" preserveAspectRatio="xMidYMid slice" opacity="${op}" href="${esc(href)}"/>`;
}

/* --------------------------------------------------------------- builders */

const open = (w: number, h: number) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`;

export function buildCardSVG(d: CardData, qrSvg: string, front: FrontOptions, theme: CardTheme): string {
  const g = GEO[theme.orientation];
  const pal = palette(theme);
  const { defs, fill } = paint(theme);
  return (
    open(g.W, g.H) +
    (defs ? `<defs>${defs}</defs>` : '') +
    faceWrap(0, g, theme, fill, pal, singleContent(0, g, theme.orientation, qrSvg, d, theme, pal, front)) +
    '</svg>'
  );
}

/** The front face alone (details + logo + watermark, no QR) — for separate
 *  two-sided downloads. */
export function buildCardFrontSVG(d: CardData, front: FrontOptions, theme: CardTheme): string {
  const g = GEO[theme.orientation];
  const pal = palette(theme);
  const { defs, fill } = paint(theme);
  return (
    open(g.W, g.H) +
    (defs ? `<defs>${defs}</defs>` : '') +
    faceWrap(0, g, theme, fill, pal, frontContent(0, g, theme.orientation, d, theme, pal, front)) +
    '</svg>'
  );
}

/** The back face alone (QR only) — for separate two-sided downloads. */
export function buildCardBackSVG(d: CardData, qrSvg: string, theme: CardTheme): string {
  const g = GEO[theme.orientation];
  const pal = palette(theme);
  const { defs, fill } = paint(theme);
  return (
    open(g.W, g.H) +
    (defs ? `<defs>${defs}</defs>` : '') +
    faceWrap(0, g, theme, fill, pal, backContent(0, g, qrSvg, d, theme, pal)) +
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

function placeQr(qrSvg: string, x: number, y: number, size: number): string {
  return qrSvg
    .replace('<svg ', `<svg x="${r3(x)}" y="${r3(y)}" `)
    .replace(/width="[^"]*"/, `width="${r3(size)}"`)
    .replace(/height="[^"]*"/, `height="${r3(size)}"`);
}

interface TextOpts {
  size: number;
  font: string;
  fill: string;
  weight?: string;
  italic?: boolean;
  anchor?: 'start' | 'middle' | 'end';
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

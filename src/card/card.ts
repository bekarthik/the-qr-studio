/**
 * Composes a print-ready visiting (business) card SVG around a QR code. The
 * card is the standard 3.5"×2" at 300dpi (1050×600px), landscape. Fonts are
 * web-safe stacks (no external fonts) so the card renders identically whether
 * it's opened in a viewer, printed, or rasterised to PNG via an <img>.
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

const W = 1050;
const H = 600;
const PAD = 64;
const QR = 420;

const SANS = "'Helvetica Neue', Arial, sans-serif";
const SERIF = "Georgia, 'Times New Roman', serif";
const INK = '#1c1916';
const MUTED = '#6b665f';
const PAPER = '#fffdf8';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Inject x/y onto a standalone QR <svg> so it nests at the right spot. */
function placeQr(qrSvg: string, x: number, y: number): string {
  return qrSvg.replace('<svg ', `<svg x="${x}" y="${y}" `);
}

export function buildCardSVG(d: CardData, qrSvg: string): string {
  const qx = W - PAD - QR;
  const qy = (H - QR) / 2;
  const tx = PAD;
  const tw = qx - PAD - 44;

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`,
  );
  // Card body.
  parts.push(`<rect x="0" y="0" width="${W}" height="${H}" rx="28" fill="${PAPER}"/>`);
  parts.push(`<rect x="14" y="0" width="${W - 14}" height="${H}" fill="${PAPER}"/>`);
  parts.push(`<rect x="0" y="0" width="16" height="${H}" fill="${d.accent}"/>`);
  parts.push(
    `<rect x="1.5" y="1.5" width="${W - 3}" height="${H - 3}" rx="26.5" fill="none" stroke="${INK}" stroke-width="3"/>`,
  );

  // Text column.
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

  // Divider.
  y += 8;
  parts.push(`<rect x="${tx}" y="${y}" width="${Math.min(tw, 360)}" height="3" fill="${d.accent}"/>`);
  y += 40;

  // Contact lines.
  const lines = [d.phone, d.email, d.url, d.address].map((s) => s.trim()).filter(Boolean);
  for (const line of lines) {
    parts.push(`<rect x="${tx}" y="${y - 14}" width="9" height="9" fill="${d.accent}"/>`);
    parts.push(text(tx + 24, y, fit(line, 34), { size: 24, font: SANS, fill: INK }));
    y += 42;
  }

  // QR panel + code + caption.
  parts.push(
    `<rect x="${qx - 16}" y="${qy - 16}" width="${QR + 32}" height="${QR + 32}" rx="18" fill="${d.qrBg}" stroke="${INK}" stroke-width="2"/>`,
  );
  parts.push(placeQr(qrSvg, qx, qy));
  parts.push(
    text(qx + QR / 2, qy + QR + 40, d.caption, {
      size: 20,
      font: SANS,
      weight: '600',
      fill: MUTED,
      anchor: 'middle',
      spacing: 2,
    }),
  );

  parts.push('</svg>');
  return parts.join('');
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

/** Trim over-long contact strings so they don't overflow the text column. */
function fit(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

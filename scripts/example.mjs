/**
 * Generates real example PNGs with the app's own renderer so we can see what a
 * halftone QR looks like. Renders mono and coloured halftones plus a logo
 * embedded in carved space, prints an ASCII preview of each source shape, and
 * decodes every output with jsQR to confirm it still scans.
 *
 * Run: OUT=dir node scripts/example.mjs
 */
import { register } from 'node:module';
import { createWriteStream } from 'node:fs';
import { PNG } from 'pngjs';
import jsQR from 'jsqr';

register('./ts-loader.mjs', import.meta.url);
const { buildMatrix } = await import('../src/qr/matrix.ts');
const { subCellFill } = await import('../src/qr/grid.ts');

const CELL = 9; // px per sub-cell
const QUIET = 4;
const OUT = process.env.OUT || '.';

const hexToRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

/* ----------------------------------------------------------- source shapes */

function heartMask(r, c, g) {
  const x = ((c / (g - 1)) * 2 - 1) * 1.35;
  const y = (1 - (r / (g - 1)) * 2) * 1.35 + 0.25;
  return Math.pow(x * x + y * y - 1, 3) - x * x * y * y * y < 0;
}
// Warm red→pink vertical gradient for the heart.
function heartColor(r, c, g) {
  const t = r / g;
  return [Math.round(235 - 40 * t), Math.round(20 + 90 * t), Math.round(60 + 70 * t)];
}

function smileyMask(r, c, g) {
  const cx = g / 2, cy = g / 2, R = g * 0.42;
  if (Math.hypot(r - cy, c - cx) > R) return false;
  const eyeR = g * 0.06, eyeY = cy - g * 0.12;
  if (Math.hypot(r - eyeY, c - (cx - g * 0.16)) < eyeR) return false;
  if (Math.hypot(r - eyeY, c - (cx + g * 0.16)) < eyeR) return false;
  const md = Math.hypot(r - (cy - g * 0.02), c - cx);
  if (r > cy + g * 0.02 && md > g * 0.18 && md < g * 0.26) return false;
  return true;
}

function preview(mask, g) {
  const W = 44, H = 22;
  let out = '';
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) out += mask(Math.floor((y / H) * g), Math.floor((x / W) * g), g) ? '█' : ' ';
    out += '\n';
  }
  return out;
}

/* --------------------------------------------------------------- rendering */

function render(text, { mask = null, color = null, embed = false } = {}) {
  const m = buildMatrix(text, 'H');
  const n = m.size, sub = 3, qs = QUIET * sub;
  const g = n * sub;
  const dim = (g + 2 * qs) * CELL;
  const px = new Uint8ClampedArray(dim * dim * 4).fill(255);
  const sampler = mask ? { dark: (sr, sc) => mask(sr, sc, g), colorAt: (sr, sc) => color(sr, sc, g) } : null;
  const fillOpts = { colorMode: Boolean(color), fg: '#101418', bg: '#ffffff', protectPatterns: true };

  const set = (sr, sc, rgb) => {
    for (let y = 0; y < CELL; y++)
      for (let x = 0; x < CELL; x++) {
        const i = (((qs + sr) * CELL + y) * dim + ((qs + sc) * CELL + x)) * 4;
        px[i] = rgb[0]; px[i + 1] = rgb[1]; px[i + 2] = rgb[2];
      }
  };

  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++)
      for (let dr = 0; dr < sub; dr++)
        for (let dc = 0; dc < sub; dc++)
          set(r * sub + dr, c * sub + dc, hexToRgb(subCellFill(m, sampler, fillOpts, r, c, dr, dc)));

  if (embed) {
    const bm = Math.round(n * 0.22);
    const start = Math.floor((n - bm) / 2);
    const p0 = (qs + start * sub) * CELL;
    const pSide = bm * sub * CELL;
    const pad = Math.round(pSide * 0.16);
    fillRect(px, dim, p0 - pad, p0 - pad, pSide + 2 * pad, pSide + 2 * pad, [255, 255, 255]);
    fillRect(px, dim, p0, p0, pSide, pSide, [37, 99, 235]);
    const cx = p0 + pSide / 2;
    fillDisc(px, dim, cx, cx, pSide * 0.28, [255, 255, 255]);
  }

  return { px, dim, version: m.version, text };
}

function fillRect(px, dim, x, y, w, h, rgb) {
  for (let py = Math.max(0, y | 0); py < Math.min(dim, (y + h) | 0); py++)
    for (let p = Math.max(0, x | 0); p < Math.min(dim, (x + w) | 0); p++) {
      const i = (py * dim + p) * 4;
      px[i] = rgb[0]; px[i + 1] = rgb[1]; px[i + 2] = rgb[2];
    }
}
function fillDisc(px, dim, cx, cy, rad, rgb) {
  for (let py = Math.max(0, (cy - rad) | 0); py < Math.min(dim, (cy + rad) | 0); py++)
    for (let p = Math.max(0, (cx - rad) | 0); p < Math.min(dim, (cx + rad) | 0); p++)
      if (Math.hypot(p - cx, py - cy) < rad) {
        const i = (py * dim + p) * 4;
        px[i] = rgb[0]; px[i + 1] = rgb[1]; px[i + 2] = rgb[2];
      }
}

function save(name, { px, dim }) {
  return new Promise((res) => {
    const png = new PNG({ width: dim, height: dim });
    png.data = Buffer.from(px.buffer);
    png.pack().pipe(createWriteStream(`${OUT}/${name}`)).on('finish', res);
  });
}
function check(name, out) {
  const r = jsQR(out.px, out.dim, out.dim);
  console.log(`  ${r && r.data === out.text ? '✅ scans' : '❌ FAIL'}  ${name} (v${out.version}, ${out.dim}px)`);
}

/* ------------------------------------------------------------------- main */

const URL = 'https://chores.app';
console.log('Heart source:\n' + preview(heartMask, 90));
console.log('Smiley source:\n' + preview(smileyMask, 90));

const outputs = {
  '01-plain.png': render(URL, {}),
  '02-halftone-heart.png': render(URL, { mask: heartMask }),
  '03-halftone-smiley.png': render(URL, { mask: smileyMask }),
  '04-halftone-heart-embed.png': render(URL, { mask: heartMask, embed: true }),
  '05-colour-heart.png': render(URL, { mask: heartMask, color: heartColor }),
  '06-colour-heart-embed.png': render(URL, { mask: heartMask, color: heartColor, embed: true }),
};

console.log('Scannability:');
for (const [name, out] of Object.entries(outputs)) check(name, out);
for (const [name, out] of Object.entries(outputs)) await save(name, out);
console.log(`\nSaved ${Object.keys(outputs).length} PNGs to ${OUT}`);

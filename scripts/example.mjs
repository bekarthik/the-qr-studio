/**
 * Generates real example PNGs with the app's own renderer so we can see what a
 * halftone QR looks like. Renders: a plain reference, a heart halftone, a
 * smiley halftone, and a heart halftone with a logo embedded in carved space.
 * Also prints an ASCII preview of each source shape and decodes every output
 * with jsQR to confirm it still scans.
 */
import { register } from 'node:module';
import { createWriteStream } from 'node:fs';
import { PNG } from 'pngjs';
import jsQR from 'jsqr';

register('./ts-loader.mjs', import.meta.url);
const { buildMatrix } = await import('../src/qr/matrix.ts');

const CELL = 9; // px per sub-cell
const QUIET = 4;
const OUT = process.env.OUT || '.';

/* ----------------------------------------------------------- source shapes */
// Each returns true where the image is DARK, in a gridSize x gridSize space.

function heart(r, c, g) {
  const x = ((c / (g - 1)) * 2 - 1) * 1.35;
  const y = (1 - (r / (g - 1)) * 2) * 1.35 + 0.25;
  return Math.pow(x * x + y * y - 1, 3) - x * x * y * y * y < 0;
}

function smiley(r, c, g) {
  const cx = g / 2, cy = g / 2, R = g * 0.42;
  const d = Math.hypot(r - cy, c - cx);
  if (d > R) return false; // outside face → light
  const eyeR = g * 0.06;
  const eyeY = cy - g * 0.12;
  if (Math.hypot(r - eyeY, c - (cx - g * 0.16)) < eyeR) return false; // left eye
  if (Math.hypot(r - eyeY, c - (cx + g * 0.16)) < eyeR) return false; // right eye
  const md = Math.hypot(r - (cy - g * 0.02), c - cx); // mouth arc
  if (r > cy + g * 0.02 && md > g * 0.18 && md < g * 0.26) return false;
  return true; // dark face
}

/* ASCII preview so we can eyeball the shape before exporting. */
function preview(shape, g) {
  const W = 44, H = 22;
  let out = '';
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      out += shape(Math.floor((y / H) * g), Math.floor((x / W) * g), g) ? '█' : ' ';
    }
    out += '\n';
  }
  return out;
}

/* --------------------------------------------------------------- rendering */

function render(text, { shape = null, embed = false } = {}) {
  const m = buildMatrix(text, 'H');
  const n = m.size, sub = 3, qs = QUIET * sub;
  const grid = n * sub + 2 * qs;
  const dim = grid * CELL;
  const px = new Uint8ClampedArray(dim * dim * 4).fill(255);
  const ig = n * sub;

  const set = (sr, sc, rgb) => {
    for (let y = 0; y < CELL; y++)
      for (let x = 0; x < CELL; x++) {
        const i = ((sr * CELL + y) * dim + (sc * CELL + x)) * 4;
        px[i] = rgb[0]; px[i + 1] = rgb[1]; px[i + 2] = rgb[2];
      }
  };

  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) {
      const md = m.get(r, c), fn = m.isFunction(r, c);
      for (let dr = 0; dr < sub; dr++)
        for (let dc = 0; dc < sub; dc++) {
          const ctr = dr === 1 && dc === 1;
          let dark = md;
          if (shape && !ctr && !fn) dark = shape(r * sub + dr, c * sub + dc, ig);
          if (dark) set(qs + r * sub + dr, qs + c * sub + dc, [0, 0, 0]);
        }
    }

  if (embed) {
    // Carve a centred square (module-aligned) and draw a placeholder logo.
    const ratio = 0.22;
    const bm = Math.round(n * ratio);
    const start = Math.floor((n - bm) / 2);
    const p0 = (qs + start * sub) * CELL;
    const pSide = bm * sub * CELL;
    const pad = Math.round(pSide * 0.16);
    fillRect(px, dim, p0 - pad, p0 - pad, pSide + 2 * pad, pSide + 2 * pad, [255, 255, 255]);
    // blue rounded-ish logo block with a white dot
    fillRect(px, dim, p0, p0, pSide, pSide, [37, 99, 235]);
    const cx = p0 + pSide / 2;
    fillDisc(px, dim, cx, cx, pSide * 0.28, [255, 255, 255]);
  }

  return { px, dim, version: m.version, text };
}

function fillRect(px, dim, x, y, w, h, rgb) {
  for (let py = Math.max(0, y | 0); py < Math.min(dim, (y + h) | 0); py++)
    for (let px2 = Math.max(0, x | 0); px2 < Math.min(dim, (x + w) | 0); px2++) {
      const i = (py * dim + px2) * 4;
      px[i] = rgb[0]; px[i + 1] = rgb[1]; px[i + 2] = rgb[2];
    }
}
function fillDisc(px, dim, cx, cy, rad, rgb) {
  for (let py = Math.max(0, (cy - rad) | 0); py < Math.min(dim, (cy + rad) | 0); py++)
    for (let pxi = Math.max(0, (cx - rad) | 0); pxi < Math.min(dim, (cx + rad) | 0); pxi++)
      if (Math.hypot(pxi - cx, py - cy) < rad) {
        const i = (py * dim + pxi) * 4;
        px[i] = rgb[0]; px[i + 1] = rgb[1]; px[i + 2] = rgb[2];
      }
}

function save(name, { px, dim }) {
  return new Promise((res) => {
    const png = new PNG({ width: dim, height: dim });
    png.data = Buffer.from(px.buffer);
    const ws = createWriteStream(`${OUT}/${name}`);
    png.pack().pipe(ws).on('finish', res);
  });
}

function check(name, out) {
  const r = jsQR(out.px, out.dim, out.dim);
  console.log(`  ${r && r.data === out.text ? '✅ scans' : '❌ FAIL'}  ${name} (v${out.version}, ${out.dim}px)`);
}

/* ------------------------------------------------------------------- main */

const URL = 'https://chores.app';

console.log('Heart source:\n' + preview(heart, 90));
console.log('Smiley source:\n' + preview(smiley, 90));

const plain = render(URL, {});
const heartQR = render(URL, { shape: heart });
const smileyQR = render(URL, { shape: smiley });
const embedQR = render(URL, { shape: heart, embed: true });

console.log('Scannability:');
check('plain.png', plain);
check('heart.png', heartQR);
check('smiley.png', smileyQR);
check('embed.png', embedQR);

await save('01-plain.png', plain);
await save('02-halftone-heart.png', heartQR);
await save('03-halftone-smiley.png', smileyQR);
await save('04-halftone-heart-embed.png', embedQR);
console.log(`\nSaved 4 PNGs to ${OUT}`);

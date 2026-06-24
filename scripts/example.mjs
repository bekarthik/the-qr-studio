/**
 * Generates real example PNGs with the app's own renderer so we can see what a
 * halftone QR looks like. By default it uses built-in synthetic shapes (heart,
 * smiley); pass IMAGE=path to use a real image file (.png/.jpg) as the source,
 * with cover-fit sampling, an Otsu auto-threshold and the real logo embedded in
 * the carved centre. Every output is decoded with jsQR to confirm it scans.
 *
 * Run: OUT=dir node scripts/example.mjs
 *      OUT=dir IMAGE=logo.jpg node scripts/example.mjs
 */
import { register } from 'node:module';
import { readFileSync, createWriteStream } from 'node:fs';
import { PNG } from 'pngjs';
import jpeg from 'jpeg-js';
import jsQR from 'jsqr';

register('./ts-loader.mjs', import.meta.url);
const { buildMatrix } = await import('../src/qr/matrix.ts');
const { subCellFill, brandDarkHex } = await import('../src/qr/grid.ts');
const { boxBlurRGBA } = await import('../src/qr/halftone.ts');

const CELL = 9; // px per sub-cell
const QUIET = 4;
const OUT = process.env.OUT || '.';
const IMAGE = process.env.IMAGE || '';
const SUB = Number(process.env.DETAIL || 3); // sub-cells per module (3/5/7)

const hexToRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;

/* ----------------------------------------------------------- image loading */

function loadImage(path) {
  const buf = readFileSync(path);
  if (/\.jpe?g$/i.test(path)) {
    const { width, height, data } = jpeg.decode(buf, { useTArray: true, maxMemoryUsageInMB: 1024 });
    return { width, height, data };
  }
  const png = PNG.sync.read(buf);
  return { width: png.width, height: png.height, data: png.data };
}

// Cover-fit sampler over a g x g grid with an Otsu threshold for dark/light.
// `smooth` low-pass-filters the grid first to stop texture aliasing into speckle.
function imageSampler(img, g, smooth = 0) {
  const { width: iw, height: ih, data } = img;
  const scale = Math.max(g / iw, g / ih);
  const dw = iw * scale, dh = ih * scale;
  // Cover-fit into a g x g RGBA buffer, then optionally blur.
  let rgba = new Uint8ClampedArray(g * g * 4);
  for (let sr = 0; sr < g; sr++)
    for (let sc = 0; sc < g; sc++) {
      const sx = Math.min(iw - 1, Math.max(0, Math.floor((sc - (g - dw) / 2) / scale)));
      const sy = Math.min(ih - 1, Math.max(0, Math.floor((sr - (g - dh) / 2) / scale)));
      const i = (sy * iw + sx) * 4;
      const o = (sr * g + sc) * 4;
      const t = data[i + 3] < 16;
      rgba[o] = t ? 255 : data[i];
      rgba[o + 1] = t ? 255 : data[i + 1];
      rgba[o + 2] = t ? 255 : data[i + 2];
      rgba[o + 3] = 255;
    }
  rgba = boxBlurRGBA(rgba, g, g, smooth);

  const px = new Array(g * g);
  const L = new Uint8Array(g * g);
  for (let i = 0; i < g * g; i++) {
    const rgb = [rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]];
    px[i] = rgb;
    L[i] = lum(rgb[0], rgb[1], rgb[2]) | 0;
  }

  // Otsu threshold over the grid luminance histogram.
  const hist = new Array(256).fill(0);
  for (const v of L) hist[v]++;
  const total = L.length;
  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * hist[t];
  let sumB = 0, wB = 0, best = 0, thr = 127;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (!wB) continue;
    const wF = total - wB;
    if (!wF) break;
    sumB += t * hist[t];
    const mB = sumB / wB, mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > best) { best = between; thr = t; }
  }

  // Brand colour = average of the dark-class pixels (the logo mark).
  let br = 0, bg2 = 0, bb = 0, bn = 0;
  for (let i = 0; i < total; i++) if (L[i] < thr) { br += px[i][0]; bg2 += px[i][1]; bb += px[i][2]; bn++; }
  const brand = bn ? '#' + [br / bn, bg2 / bn, bb / bn].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('') : '#101418';

  return {
    dark: (sr, sc) => L[sr * g + sc] < thr,
    colorAt: (sr, sc) => px[sr * g + sc],
    brand,
  };
}

/* ----------------------------------------------------------- synthetic shapes */

function heartMask(r, c, g) {
  const x = ((c / (g - 1)) * 2 - 1) * 1.35;
  const y = (1 - (r / (g - 1)) * 2) * 1.35 + 0.25;
  return Math.pow(x * x + y * y - 1, 3) - x * x * y * y * y < 0;
}
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

/* --------------------------------------------------------------- rendering */

function render(text, { mask = null, color = null, brand = null, embed = false, sampler = null, embedImg = null, sub = SUB } = {}) {
  const m = buildMatrix(text, 'H');
  const n = m.size, qs = QUIET * sub;
  const g = n * sub;
  const dim = (g + 2 * qs) * CELL;
  const px = new Uint8ClampedArray(dim * dim * 4).fill(255);
  const smp = sampler || (mask ? { dark: (sr, sc) => mask(sr, sc, g), colorAt: (sr, sc) => color(sr, sc, g) } : null);
  const style = brand ? 'brand' : color ? 'image' : 'solid';
  const fillOpts = { style, fg: '#101418', bg: '#ffffff', brand: brandDarkHex(brand || '#101418'), protectPatterns: true };

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
          set(r * sub + dr, c * sub + dc, hexToRgb(subCellFill(m, smp, fillOpts, r, c, dr, dc, sub)));

  if (embed) {
    const bm = Math.round(n * 0.24);
    const start = Math.floor((n - bm) / 2);
    const p0 = (qs + start * sub) * CELL;
    const pSide = bm * sub * CELL;
    const pad = Math.round(pSide * 0.16);
    fillRect(px, dim, p0 - pad, p0 - pad, pSide + 2 * pad, pSide + 2 * pad, [255, 255, 255]);
    if (embedImg) drawImageContain(px, dim, p0, p0, pSide, embedImg);
    else {
      fillRect(px, dim, p0, p0, pSide, pSide, [37, 99, 235]);
      const cx = p0 + pSide / 2;
      fillDisc(px, dim, cx, cx, pSide * 0.28, [255, 255, 255]);
    }
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
function drawImageContain(px, dim, x0, y0, side, img) {
  const scale = Math.min(side / img.width, side / img.height);
  const dw = img.width * scale, dh = img.height * scale;
  const ox = x0 + (side - dw) / 2, oy = y0 + (side - dh) / 2;
  for (let y = 0; y < dh; y++)
    for (let x = 0; x < dw; x++) {
      const sx = Math.min(img.width - 1, Math.floor(x / scale));
      const sy = Math.min(img.height - 1, Math.floor(y / scale));
      const si = (sy * img.width + sx) * 4;
      if (img.data[si + 3] < 16) continue;
      const di = (((oy + y) | 0) * dim + ((ox + x) | 0)) * 4;
      px[di] = img.data[si]; px[di + 1] = img.data[si + 1]; px[di + 2] = img.data[si + 2];
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
let outputs;

if (IMAGE) {
  const img = loadImage(IMAGE);
  // Build one sampler sized to the QR we will generate (version is stable for this URL).
  // Mirror the app: low-pass at High detail to stop texture aliasing.
  const SMOOTH = process.env.SMOOTH !== undefined ? Number(process.env.SMOOTH) : SUB >= 5 ? 1 : 0;
  const sizeN = buildMatrix(URL, 'H').size;
  const hi = imageSampler(img, sizeN * SUB, SMOOTH);
  console.log(`Loaded ${IMAGE} (${img.width}x${img.height}); brand ${hi.brand}; detail ${SUB}; smooth ${SMOOTH}`);
  const mono = { dark: hi.dark, colorAt: () => [0, 0, 0] };
  const col = { dark: hi.dark, colorAt: hi.colorAt };
  outputs = {
    'img-1-halftone.png': render(URL, { sampler: mono, sub: SUB }),
    'img-2-halftone-embed.png': render(URL, { sampler: mono, sub: SUB, embed: true, embedImg: img }),
    'img-3-image-colours.png': render(URL, { sampler: col, color: true, sub: SUB }),
    'img-4-image-colours-embed.png': render(URL, { sampler: col, color: true, sub: SUB, embed: true, embedImg: img }),
    'img-5-brand.png': render(URL, { sampler: mono, sub: SUB, brand: hi.brand }),
  };
} else {
  outputs = {
    '01-plain.png': render(URL, {}),
    '02-halftone-heart.png': render(URL, { mask: heartMask }),
    '03-halftone-smiley.png': render(URL, { mask: smileyMask }),
    '04-halftone-heart-embed.png': render(URL, { mask: heartMask, embed: true }),
    '05-colour-heart.png': render(URL, { mask: heartMask, color: heartColor }),
    '06-colour-heart-embed.png': render(URL, { mask: heartMask, color: heartColor, embed: true }),
    '07-brand-heart.png': render(URL, { mask: heartMask, brand: '#7c3aed' }),
    '08-brand-heart-embed.png': render(URL, { mask: heartMask, brand: '#7c3aed', embed: true }),
  };
}

console.log('Scannability:');
for (const [name, out] of Object.entries(outputs)) check(name, out);
for (const [name, out] of Object.entries(outputs)) await save(name, out);
console.log(`\nSaved ${Object.keys(outputs).length} PNGs to ${OUT}`);

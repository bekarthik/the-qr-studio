/**
 * Headless scannability check. Builds the matrix with the SAME function-pattern
 * mask the app uses and paints every sub-cell with the SAME `subCellFill`
 * decision the canvas and SVG renderers use (centre keeps the data, surrounding
 * cells follow a synthetic image, function patterns stay solid, optional image
 * colours). It then decodes with jsQR — for BOTH the raster (PNG) path and the
 * real SVG output (rasterised by replaying its rects) — to prove the halftone,
 * colour and centre-embed features all stay machine-readable.
 *
 * Run: node scripts/verify.mjs
 */
import { register } from 'node:module';
import jsQR from 'jsqr';

register('./ts-loader.mjs', import.meta.url);
const { buildMatrix } = await import('../src/qr/matrix.ts');
const { subCellFill } = await import('../src/qr/grid.ts');
const { renderSVG } = await import('../src/qr/svg.ts');

const CELL = 8; // px per sub-cell
const QUIET = 4;

const hexToRgb = (h) => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];
const lum = ([r, g, b]) => 0.299 * r + 0.587 * g + 0.114 * b;

// A synthetic source: dark disc on light ground, with a red→blue colour sweep.
function makeSampler(g) {
  const cx = g / 2;
  return {
    dark: (sr, sc) => Math.hypot(sr - cx, sc - cx) < g * 0.34,
    colorAt: (sr, sc) => {
      const t = sc / g; // horizontal sweep
      return [Math.round(40 + 200 * t), 30, Math.round(40 + 200 * (1 - t))];
    },
  };
}

/* --------------------------------------------------- shared paint geometry */

function paintGrid(text, { halftone = false, embed = false, colorMode = false }, emit) {
  const m = buildMatrix(text, 'H');
  const n = m.size, sub = 3;
  const sampler = halftone ? makeSampler(n * sub) : null;
  const fillOpts = { colorMode, fg: '#000000', bg: '#ffffff', protectPatterns: true };

  const bm = Math.round(n * 0.22);
  const start = Math.floor((n - bm) / 2);
  const end = start + bm;

  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) {
      const inEmbed = embed && r >= start && r < end && c >= start && c < end;
      for (let dr = 0; dr < sub; dr++)
        for (let dc = 0; dc < sub; dc++) {
          const fill = inEmbed ? '#ffffff' : subCellFill(m, sampler, fillOpts, r, c, dr, dc);
          emit(r * sub + dr, c * sub + dc, fill);
        }
    }
  return { m, n, sub };
}

/* ------------------------------------------------------- canvas (PNG) path */

function renderRaster(text, opts) {
  let dim, data, total;
  const cells = [];
  const { n, sub } = paintGrid(text, opts, (sr, sc, fill) => cells.push([sr, sc, fill]));
  total = n * sub;
  const qs = QUIET * sub;
  dim = (total + 2 * qs) * CELL;
  data = new Uint8ClampedArray(dim * dim * 4).fill(255);
  for (const [sr, sc, fill] of cells) {
    const v = lum(hexToRgb(fill));
    for (let y = 0; y < CELL; y++)
      for (let x = 0; x < CELL; x++) {
        const i = (((qs + sr) * CELL + y) * dim + ((qs + sc) * CELL + x)) * 4;
        data[i] = data[i + 1] = data[i + 2] = v;
      }
  }
  return { data, dim, version: buildMatrix(text, 'H').version };
}

/* ------------------------------------------------- SVG path (vector→raster) */

function rasterizeSVG(svg) {
  const G = Number(svg.match(/viewBox="0 0 ([\d.]+)/)[1]);
  const S = 8;
  const dim = Math.round(G * S);
  const data = new Uint8ClampedArray(dim * dim * 4).fill(255);
  const re = /<rect x="([-\d.]+)" y="([-\d.]+)" width="([-\d.]+)" height="([-\d.]+)"(?: rx="[-\d.]+")? fill="(#[0-9a-fA-F]{6})"\/>/g;
  let m;
  while ((m = re.exec(svg))) {
    const v = lum(hexToRgb(m[5]));
    const x0 = Math.round(+m[1] * S), y0 = Math.round(+m[2] * S);
    const x1 = Math.round((+m[1] + +m[3]) * S), y1 = Math.round((+m[2] + +m[4]) * S);
    for (let py = Math.max(0, y0); py < Math.min(dim, y1); py++)
      for (let px = Math.max(0, x0); px < Math.min(dim, x1); px++) {
        const i = (py * dim + px) * 4;
        data[i] = data[i + 1] = data[i + 2] = v;
      }
  }
  return { data, dim };
}

function svgFor(text, opts) {
  const m = buildMatrix(text, 'H');
  const sampler = opts.halftone ? makeSampler(m.size * 3) : null;
  return renderSVG({
    matrix: m,
    quietModules: QUIET,
    fg: '#000000',
    bg: '#ffffff',
    sampler,
    protectPatterns: true,
    colorMode: Boolean(opts.colorMode),
    centerImage: opts.embed ? { href: 'x', ratio: 0.22, plate: true } : null,
    pixelSize: 1024,
  });
}

/* ------------------------------------------------------------------- cases */

const VCARD =
  'BEGIN:VCARD\nVERSION:3.0\nN:Rao;Asha;;;\nFN:Asha Rao\nORG:Acme Pvt Ltd\nTEL;TYPE=CELL:+919876543210\nEMAIL:asha@acme.com\nURL:https://acme.com\nEND:VCARD';

const cases = [
  { name: 'plain url', text: 'https://example.com/welcome', opts: {} },
  { name: 'halftone url', text: 'https://example.com/welcome', opts: { halftone: true } },
  { name: 'halftone+colour url', text: 'https://example.com/welcome', opts: { halftone: true, colorMode: true } },
  { name: 'halftone+embed url', text: 'https://chores.app/r/AB12CD', opts: { halftone: true, embed: true } },
  { name: 'colour+embed url', text: 'https://chores.app/r/AB12CD', opts: { halftone: true, colorMode: true, embed: true } },
  { name: 'halftone vcard', text: VCARD, opts: { halftone: true } },
  { name: 'colour vcard', text: VCARD, opts: { halftone: true, colorMode: true } },
  { name: 'colour+embed wifi', text: 'WIFI:T:WPA;S:MyNetwork;P:s3cr3t-pass;H:false;;', opts: { halftone: true, colorMode: true, embed: true } },
];

let pass = 0, total = 0;

console.log('Canvas (PNG) path:');
for (const c of cases) {
  total++;
  const { data, dim, version } = renderRaster(c.text, c.opts);
  const res = jsQR(data, dim, dim);
  const ok = res && res.data === c.text;
  console.log(`  ${ok ? '✅' : '❌'}  ${c.name.padEnd(20)} v${version} ${dim}px  ${ok ? 'OK' : 'FAILED'}`);
  if (ok) pass++;
}

console.log('\nSVG (vector) path:');
for (const c of cases) {
  total++;
  const svg = svgFor(c.text, c.opts);
  const { data, dim } = rasterizeSVG(svg);
  const res = jsQR(data, dim, dim);
  const ok = res && res.data === c.text;
  console.log(`  ${ok ? '✅' : '❌'}  ${c.name.padEnd(20)} ${(svg.length / 1024).toFixed(0).padStart(4)}KB  ${ok ? 'OK' : 'FAILED'}`);
  if (ok) pass++;
}

console.log(`\n${pass}/${total} scannable`);
process.exit(pass === total ? 0 : 1);

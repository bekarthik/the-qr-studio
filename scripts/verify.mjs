/**
 * Headless scannability check. Builds the matrix with the SAME function-pattern
 * mask the app uses (imported from the compiled core), renders it the way
 * render.ts does (3x3 sub-cell expansion; centre keeps the data, surrounding
 * cells follow a synthetic "image", function patterns stay solid), then decodes
 * with jsQR to prove the halftone + centre-embed output stays machine-readable.
 *
 * Run: node scripts/verify.mjs
 */
import { register } from 'node:module';
import jsQR from 'jsqr';

// Resolve extensionless relative imports inside the TS core, then let Node 22
// strip types natively so we can import the app's real modules directly.
register('./ts-loader.mjs', import.meta.url);
const { buildMatrix } = await import('../src/qr/matrix.ts');
const { renderSVG } = await import('../src/qr/svg.ts');

const CELL = 8; // px per sub-cell
const QUIET = 4; // modules

// A synthetic "logo": dark disc on light ground — a representative halftone source.
function imageDark(subRow, subCol, gridSize) {
  const cx = gridSize / 2;
  const d = Math.hypot(subRow - cx, subCol - cx);
  return d < gridSize * 0.34;
}

function render(text, { halftone = false, embed = false } = {}) {
  const m = buildMatrix(text, 'H');
  const n = m.size;
  const sub = 3;
  const quietSub = QUIET * sub;
  const grid = n * sub + 2 * quietSub;
  const dim = grid * CELL;
  const data = new Uint8ClampedArray(dim * dim * 4).fill(255); // white

  const imgGrid = n * sub;
  const setBlack = (sr, sc) => {
    for (let y = 0; y < CELL; y++) {
      for (let x = 0; x < CELL; x++) {
        const px = ((sr * CELL + y) * dim + (sc * CELL + x)) * 4;
        data[px] = data[px + 1] = data[px + 2] = 0;
      }
    }
  };

  // Centre-embed carve region (snapped to module bounds) at ratio 0.22.
  const ratio = 0.22;
  const boxModules = Math.round(n * ratio);
  const start = Math.floor((n - boxModules) / 2);
  const end = start + boxModules;

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const moduleDark = m.get(r, c);
      const fn = m.isFunction(r, c);
      const inEmbed = embed && r >= start && r < end && c >= start && c < end;
      for (let dr = 0; dr < sub; dr++) {
        for (let dc = 0; dc < sub; dc++) {
          if (inEmbed) continue; // carved empty
          const isCenter = dr === 1 && dc === 1;
          let dark = moduleDark;
          if (halftone && !isCenter && !fn) {
            dark = imageDark(r * sub + dr, c * sub + dc, imgGrid);
          }
          if (dark) setBlack(quietSub + r * sub + dr, quietSub + c * sub + dc);
        }
      }
    }
  }
  return { data, dim, version: m.version };
}

const cases = [
  { name: 'plain url', text: 'https://example.com/welcome', opts: {} },
  { name: 'halftone url', text: 'https://example.com/welcome', opts: { halftone: true } },
  { name: 'halftone + embed url', text: 'https://chores.app/r/AB12CD', opts: { halftone: true, embed: true } },
  {
    name: 'halftone vcard',
    text: 'BEGIN:VCARD\nVERSION:3.0\nN:Rao;Asha;;;\nFN:Asha Rao\nORG:Acme Pvt Ltd\nTEL;TYPE=CELL:+919876543210\nEMAIL:asha@acme.com\nURL:https://acme.com\nEND:VCARD',
    opts: { halftone: true },
  },
  { name: 'halftone + embed wifi', text: 'WIFI:T:WPA;S:MyNetwork;P:s3cr3t-pass;H:false;;', opts: { halftone: true, embed: true } },
];

/* --------------------------------------------- SVG path (vector → raster) */

// Rasterise the app's real SVG output by replaying its <rect> elements, so we
// decode exactly what a user would download. <image> logos are skipped (the
// data lives in the carved/plated rects), proving the vector geometry scans.
function rasterizeSVG(svg, bg) {
  const G = Number(svg.match(/viewBox="0 0 ([\d.]+)/)[1]);
  const S = 8;
  const dim = Math.round(G * S);
  const data = new Uint8ClampedArray(dim * dim * 4).fill(255);
  const fill = (x, y, w, h, black) => {
    const x0 = Math.round(x * S), y0 = Math.round(y * S);
    const x1 = Math.round((x + w) * S), y1 = Math.round((y + h) * S);
    for (let py = Math.max(0, y0); py < Math.min(dim, y1); py++) {
      for (let px = Math.max(0, x0); px < Math.min(dim, x1); px++) {
        const i = (py * dim + px) * 4;
        const v = black ? 0 : 255;
        data[i] = data[i + 1] = data[i + 2] = v;
      }
    }
  };
  const re = /<rect x="([-\d.]+)" y="([-\d.]+)" width="([-\d.]+)" height="([-\d.]+)"(?: rx="[-\d.]+")? fill="([^"]+)"\/>/g;
  let m;
  while ((m = re.exec(svg))) {
    fill(+m[1], +m[2], +m[3], +m[4], m[5].toLowerCase() !== bg.toLowerCase());
  }
  return { data, dim };
}

function svgFor(text, { halftone = false, embed = false } = {}) {
  const matrix = buildMatrix(text, 'H');
  const sampler = halftone ? { dark: (sr, sc) => imageDark(sr, sc, matrix.size * 3) } : null;
  return renderSVG({
    matrix,
    quietModules: QUIET,
    fg: '#000000',
    bg: '#ffffff',
    sampler,
    protectPatterns: true,
    centerImage: embed ? { href: 'x', ratio: 0.22, plate: true } : null,
    pixelSize: 1024,
  });
}

let pass = 0;
let total = 0;

console.log('Canvas (PNG) path:');
for (const c of cases) {
  total++;
  const { data, dim, version } = render(c.text, c.opts);
  const res = jsQR(data, dim, dim);
  const ok = res && res.data === c.text;
  console.log(
    `  ${ok ? '✅' : '❌'}  ${c.name.padEnd(22)} v${version} ${dim}px  ` +
      (ok ? 'decoded OK' : `FAILED (${res ? 'wrong text' : 'no decode'})`),
  );
  if (ok) pass++;
}

console.log('\nSVG (vector) path:');
for (const c of cases) {
  total++;
  const svg = svgFor(c.text, c.opts);
  const { data, dim } = rasterizeSVG(svg, '#ffffff');
  const res = jsQR(data, dim, dim);
  const ok = res && res.data === c.text;
  console.log(
    `  ${ok ? '✅' : '❌'}  ${c.name.padEnd(22)} ${(svg.length / 1024).toFixed(0).padStart(4)}KB  ` +
      (ok ? 'decoded OK' : `FAILED (${res ? 'wrong text' : 'no decode'})`),
  );
  if (ok) pass++;
}

console.log(`\n${pass}/${total} scannable`);
process.exit(pass === total ? 0 : 1);

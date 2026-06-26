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
function makeSampler(g, kind = 'sweep') {
  const cx = g / 2;
  if (kind === 'lightcorner') {
    // Worst case for identifier blocks: near-white in the corners, where the
    // finder patterns live — so dark finder cells must be clamped from white.
    return {
      dark: (sr, sc) => Math.hypot(sr - cx, sc - cx) < g * 0.34,
      colorAt: (sr, sc) => {
        const t = Math.min(1, Math.hypot(sr - cx, sc - cx) / (g * 0.71));
        return [220 + (255 - 220) * t, 40 + (255 - 40) * t, 120 + (255 - 120) * t];
      },
    };
  }
  return {
    dark: (sr, sc) => Math.hypot(sr - cx, sc - cx) < g * 0.34,
    colorAt: (sr, sc) => {
      const t = sc / g; // horizontal sweep
      return [Math.round(40 + 200 * t), 30, Math.round(40 + 200 * (1 - t))];
    },
  };
}

/* --------------------------------------------------- shared paint geometry */

function paintGrid(text, { halftone = false, embed = false, style = 'solid', samplerKind = 'sweep', sub = 3 }, emit) {
  const m = buildMatrix(text, 'H');
  const n = m.size;
  const sampler = halftone ? makeSampler(n * sub, samplerKind) : null;
  const fillOpts = { style, fg: '#000000', bg: '#ffffff', brand: '#1d4ed8', protectPatterns: true };

  const bm = Math.round(n * 0.22);
  const start = Math.floor((n - bm) / 2);
  const end = start + bm;

  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) {
      const inEmbed = embed && r >= start && r < end && c >= start && c < end;
      for (let dr = 0; dr < sub; dr++)
        for (let dc = 0; dc < sub; dc++) {
          const fill = inEmbed ? '#ffffff' : subCellFill(m, sampler, fillOpts, r, c, dr, dc, sub);
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
  const S = 12;
  const dim = Math.round(G * S);
  const data = new Uint8ClampedArray(dim * dim * 4).fill(255);
  // Replay rects and circles in document order so layered eyes paint correctly.
  const re =
    /<rect x="([-\d.]+)" y="([-\d.]+)" width="([-\d.]+)" height="([-\d.]+)"(?: rx="[-\d.]+")? fill="(#[0-9a-fA-F]{6})"\/>|<circle cx="([-\d.]+)" cy="([-\d.]+)" r="([-\d.]+)" fill="(#[0-9a-fA-F]{6})"\/>/g;
  let m;
  while ((m = re.exec(svg))) {
    if (m[1] !== undefined) {
      const v = lum(hexToRgb(m[5]));
      const x0 = Math.round(+m[1] * S), y0 = Math.round(+m[2] * S);
      const x1 = Math.round((+m[1] + +m[3]) * S), y1 = Math.round((+m[2] + +m[4]) * S);
      for (let py = Math.max(0, y0); py < Math.min(dim, y1); py++)
        for (let px = Math.max(0, x0); px < Math.min(dim, x1); px++) {
          const i = (py * dim + px) * 4;
          data[i] = data[i + 1] = data[i + 2] = v;
        }
    } else {
      const v = lum(hexToRgb(m[9]));
      const cx = +m[6] * S, cy = +m[7] * S, rr = +m[8] * S;
      const y0 = Math.max(0, Math.floor(cy - rr)), y1 = Math.min(dim, Math.ceil(cy + rr));
      const x0 = Math.max(0, Math.floor(cx - rr)), x1 = Math.min(dim, Math.ceil(cx + rr));
      for (let py = y0; py < y1; py++)
        for (let px = x0; px < x1; px++) {
          const dx = px + 0.5 - cx, dy = py + 0.5 - cy;
          if (dx * dx + dy * dy > rr * rr) continue;
          const i = (py * dim + px) * 4;
          data[i] = data[i + 1] = data[i + 2] = v;
        }
    }
  }
  return { data, dim };
}

function svgFor(text, opts) {
  const m = buildMatrix(text, 'H');
  const sub = opts.sub || 3;
  const sampler = opts.halftone ? makeSampler(m.size * sub, opts.samplerKind || 'sweep') : null;
  return renderSVG({
    matrix: m,
    quietModules: QUIET,
    fg: '#000000',
    bg: '#ffffff',
    sampler,
    protectPatterns: true,
    colorStyle: opts.style || 'solid',
    brandColor: '#1d4ed8',
    sub,
    core: 0,
    dotScale: opts.dotScale,
    shape: opts.shape,
    centerImage: opts.embed ? { href: 'x', ratio: 0.22, plate: true } : null,
    pixelSize: 1024,
  });
}

/* ------------------------------------------------------------------- cases */

const VCARD =
  'BEGIN:VCARD\nVERSION:3.0\nN:Rao;Asha;;;\nFN:Asha Rao\nORG:Acme Pvt Ltd\nTEL;TYPE=CELL:+919876543210\nEMAIL:asha@acme.com\nURL:https://acme.com\nEND:VCARD';

const cases = [
  { name: 'plain url', text: 'https://example.com/welcome', opts: {} },
  { name: 'brand url', text: 'https://example.com/welcome', opts: { style: 'brand' } },
  { name: 'halftone url', text: 'https://example.com/welcome', opts: { halftone: true } },
  { name: 'halftone brand url', text: 'https://example.com/welcome', opts: { halftone: true, style: 'brand' } },
  { name: 'halftone image url', text: 'https://example.com/welcome', opts: { halftone: true, style: 'image' } },
  { name: 'image lightcorner', text: 'https://example.com/welcome', opts: { halftone: true, style: 'image', samplerKind: 'lightcorner' } },
  { name: 'halftone+embed url', text: 'https://chores.app/r/AB12CD', opts: { halftone: true, embed: true } },
  { name: 'brand+embed url', text: 'https://chores.app/r/AB12CD', opts: { halftone: true, style: 'brand', embed: true } },
  { name: 'image+embed url', text: 'https://chores.app/r/AB12CD', opts: { halftone: true, style: 'image', embed: true } },
  { name: 'image vcard', text: VCARD, opts: { halftone: true, style: 'image' } },
  { name: 'brand+embed wifi', text: 'WIFI:T:WPA;S:MyNetwork;P:s3cr3t-pass;H:false;;', opts: { halftone: true, style: 'brand', embed: true } },
  // High-detail (more sub-cells per module) across mono / image / embed.
  { name: 'detail5 halftone', text: 'https://chores.app/r/AB12CD', opts: { halftone: true, sub: 5 } },
  { name: 'detail5 image', text: 'https://chores.app/r/AB12CD', opts: { halftone: true, style: 'image', sub: 5 } },
  { name: 'detail5 image+embed', text: 'https://chores.app/r/AB12CD', opts: { halftone: true, style: 'image', sub: 5, embed: true } },
  { name: 'detail7 halftone', text: 'https://chores.app/r/AB12CD', opts: { halftone: true, sub: 7 } },
  { name: 'detail7 image', text: 'https://chores.app/r/AB12CD', opts: { halftone: true, style: 'image', sub: 7 } },
  { name: 'detail5 vcard image', text: VCARD, opts: { halftone: true, style: 'image', sub: 5 } },
  // Module shapes (block codes): dots & rounded, plain / brand / embed / vcard.
  { name: 'dot url', text: 'https://example.com/welcome', opts: { shape: 'dot' } },
  { name: 'rounded url', text: 'https://example.com/welcome', opts: { shape: 'rounded' } },
  { name: 'dot brand url', text: 'https://example.com/welcome', opts: { shape: 'dot', style: 'brand' } },
  { name: 'dot+embed url', text: 'https://chores.app/r/AB12CD', opts: { shape: 'dot', embed: true } },
  { name: 'rounded+embed url', text: 'https://chores.app/r/AB12CD', opts: { shape: 'rounded', embed: true } },
  { name: 'dot vcard', text: VCARD, opts: { shape: 'dot' } },
  { name: 'rounded vcard', text: VCARD, opts: { shape: 'rounded' } },
  // Continuous data-dot overlay (halftone): mid + large dot scale.
  { name: 'halftone dot 0.4', text: 'https://example.com/welcome', opts: { halftone: true, dotScale: 0.4 } },
  { name: 'halftone dot 0.8', text: 'https://example.com/welcome', opts: { halftone: true, dotScale: 0.8 } },
  { name: 'image dot 0.6', text: 'https://example.com/welcome', opts: { halftone: true, style: 'image', dotScale: 0.6 } },
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

/**
 * Runtime smoke test for the service render pipeline, OUTSIDE a browser.
 * Proves: buildMatrix -> renderSVG -> resvg-wasm raster -> jsQR round-trip all
 * work in a plain JS runtime (the same primitives the Worker uses). It mirrors
 * the Worker's logic without needing workerd.
 *
 * Run: npm run smoke
 */
import { readFile } from 'node:fs/promises';
import { register } from 'node:module';
import { fileURLToPath } from 'node:url';
import { Resvg, initWasm } from '@resvg/resvg-wasm';
import jsQR from 'jsqr';

// Reuse the repo's loader so we can import the shared .ts core directly.
register('../../scripts/ts-loader.mjs', import.meta.url);
const { buildMatrix } = await import('../../src/qr/matrix.ts');
const { renderSVG } = await import('../../src/qr/svg.ts');

const wasmPath = fileURLToPath(new URL('../node_modules/@resvg/resvg-wasm/index_bg.wasm', import.meta.url));
await initWasm(await readFile(wasmPath));

function makeSvg({ data, ec = 'H', style = 'solid', fg = '#000000', bg = '#ffffff', brand = '#1d4ed8', sub = 3, size = 512, quiet = 4 }) {
  const matrix = buildMatrix(data, ec);
  return renderSVG({
    matrix, quietModules: quiet, fg, bg, sampler: null, protectPatterns: true,
    colorStyle: style, brandColor: brand, sub, pixelSize: size, centerImage: null,
  });
}

function rasterAndVerify(svg, size, bg, expected) {
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: size }, background: bg });
  const r = resvg.render();
  const png = r.asPng();
  const code = jsQR(new Uint8ClampedArray(r.pixels.buffer, r.pixels.byteOffset, r.pixels.byteLength), r.width, r.height);
  return { ok: !!code && code.data === expected, bytes: png.length, decoded: code?.data };
}

const cases = [
  { name: 'plain url', data: 'https://example.com', style: 'solid' },
  { name: 'brand colour', data: 'https://chores.example/in', style: 'brand', brand: '#1d4ed8' },
  { name: 'upi pay', data: 'upi://pay?pa=merchant@upi&pn=Chores&cu=INR', style: 'solid' },
  { name: 'long-ish text', data: 'WIFI:T:WPA;S:MyNetwork;P:s3cr3t-pass-phrase-1234;;', style: 'brand', brand: '#0f766e' },
  { name: 'fine sub=5', data: 'https://example.com/fine', style: 'solid', sub: 5 },
];

let failed = 0;
for (const c of cases) {
  const svg = makeSvg(c);
  const { ok, bytes, decoded } = rasterAndVerify(svg, c.size ?? 512, c.bg ?? '#ffffff', c.data);
  const tag = ok ? 'PASS' : 'FAIL';
  if (!ok) failed++;
  console.log(`[${tag}] ${c.name.padEnd(16)} svg=${String(svg.length).padStart(6)}B png=${String(bytes).padStart(6)}B verified=${ok}${ok ? '' : ` decoded=${JSON.stringify(decoded)}`}`);
}

console.log(failed ? `\n${failed} case(s) FAILED` : '\nAll cases verified scannable ✓');
process.exit(failed ? 1 : 0);

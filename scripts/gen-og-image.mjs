// Generates public/og-image.png — a real 1200x630 social card, replacing the
// favicon-as-og:image placeholder. Rasterises brand-coloured SVG with resvg
// (same renderer the verify suites use), so no browser is needed. Re-run this
// script by hand whenever the brand mark or tagline changes; the output PNG
// is committed since it's a static, site-wide default.
import { readFileSync, writeFileSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';

const W = 1200;
const H = 630;

// The real brand mark (public/logo.png, 196x235, transparent) embedded as a
// data URI so resvg can rasterise it without any file resolution.
const logo = readFileSync(new URL('../public/logo.png', import.meta.url)).toString('base64');
const LW = 300;
const LH = Math.round((235 / 196) * LW);

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#f5f2ec"/>
  <image x="120" y="${(H - LH) / 2}" width="${LW}" height="${LH}" href="data:image/png;base64,${logo}"/>
  <text x="526" y="290" font-family="Liberation Sans, Arial, sans-serif" font-weight="700" font-size="84" fill="#211d18">QR Studio</text>
  <text x="528" y="360" font-family="Liberation Sans, Arial, sans-serif" font-size="34" fill="#574f44">Free, in-browser QR codes —</text>
  <text x="528" y="402" font-family="Liberation Sans, Arial, sans-serif" font-size="34" fill="#574f44">styled with your brand, verified scannable.</text>
  <text x="528" y="466" font-family="Liberation Sans, Arial, sans-serif" font-weight="700" font-size="30" fill="#e0522e">theqr.studio</text>
</svg>
`.trim();

const png = new Resvg(svg, { fitTo: { mode: 'width', value: W } }).render().asPng();
writeFileSync(new URL('../public/og-image.png', import.meta.url), png);
console.log(`wrote public/og-image.png (${png.length} bytes)`);

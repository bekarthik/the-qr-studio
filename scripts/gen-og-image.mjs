// Generates public/og-image.png — a real 1200x630 social card, replacing the
// favicon-as-og:image placeholder. Rasterises brand-coloured SVG with resvg
// (same renderer the verify suites use), so no browser is needed. Re-run this
// script by hand whenever the brand mark or tagline changes; the output PNG
// is committed since it's a static, site-wide default.
import { writeFileSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';

const W = 1200;
const H = 630;

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#f5f2ec"/>
  <g transform="translate(96,135) scale(11.25)">
    <rect width="32" height="32" rx="7" fill="#e0522e"/>
    <g fill="#fdfbf6">
      <path d="M6 6h7v7H6z" fill="none" stroke="#fdfbf6" stroke-width="2"/>
      <rect x="9" y="9" width="1.5" height="1.5"/>
      <path d="M19 6h7v7h-7z" fill="none" stroke="#fdfbf6" stroke-width="2"/>
      <rect x="22" y="9" width="1.5" height="1.5"/>
      <path d="M6 19h7v7H6z" fill="none" stroke="#fdfbf6" stroke-width="2"/>
      <rect x="9" y="22" width="1.5" height="1.5"/>
      <rect x="19" y="19" width="2.5" height="2.5"/>
      <rect x="23.5" y="19" width="2.5" height="2.5"/>
      <rect x="19" y="23.5" width="2.5" height="2.5"/>
      <rect x="23.5" y="23.5" width="2.5" height="2.5"/>
    </g>
  </g>
  <text x="526" y="290" font-family="Liberation Sans, Arial, sans-serif" font-weight="700" font-size="84" fill="#211d18">QR Studio</text>
  <text x="528" y="360" font-family="Liberation Sans, Arial, sans-serif" font-size="34" fill="#574f44">Free, in-browser QR codes —</text>
  <text x="528" y="402" font-family="Liberation Sans, Arial, sans-serif" font-size="34" fill="#574f44">styled with your brand, verified scannable.</text>
  <text x="528" y="466" font-family="Liberation Sans, Arial, sans-serif" font-weight="700" font-size="30" fill="#e0522e">theqr.studio</text>
</svg>
`.trim();

const png = new Resvg(svg, { fitTo: { mode: 'width', value: W } }).render().asPng();
writeFileSync(new URL('../public/og-image.png', import.meta.url), png);
console.log(`wrote public/og-image.png (${png.length} bytes)`);

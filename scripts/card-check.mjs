// Verify the QR embedded in a composed visiting card still decodes.
import { register } from 'node:module';
import jsQR from 'jsqr';
import { Resvg } from '@resvg/resvg-js';
import { PNG } from 'pngjs';

register('./ts-loader.mjs', import.meta.url);
const { buildPayload } = await import('../src/content/payloads.ts');
const { buildMatrix } = await import('../src/qr/matrix.ts');
const { renderSVG } = await import('../src/qr/svg.ts');
const { buildCardSVG, buildCardSheetSVG, cardDims } = await import('../src/card/card.ts');

// A tiny logo data URL for the two-sided front.
function logoUrl() {
  const s = 40;
  const png = new PNG({ width: s, height: s });
  for (let y = 0; y < s; y++)
    for (let x = 0; x < s; x++) {
      const i = (y * s + x) * 4;
      const on = Math.hypot(x - 20, y - 20) < 16;
      png.data[i] = on ? 224 : 255; png.data[i + 1] = on ? 82 : 255; png.data[i + 2] = on ? 46 : 255; png.data[i + 3] = 255;
    }
  return 'data:image/png;base64,' + PNG.sync.write(png).toString('base64');
}
const LOGO = logoUrl();

const vcards = [
  { first: 'Asha', last: 'Rao', org: 'Acme Pvt Ltd', title: 'Founder', phone: '+919876543210', email: 'asha@acme.com', url: 'https://acme.com', address: 'MG Road, Bengaluru' },
  { first: 'A', last: '', org: '', title: '', phone: '+10000000000', email: 'a@b.co', url: '', address: '' },
];

let pass = 0, total = 0;
for (const [i, v] of vcards.entries()) {
  const payload = buildPayload('vcard', v);
  const matrix = buildMatrix(payload, 'H');
  const qrSvg = renderSVG({
    matrix, quietModules: 2, fg: '#101418', bg: '#ffffff', sampler: null, protectPatterns: true,
    colorStyle: 'solid', brandColor: '#2563eb', sub: 3, core: 0, shape: 'rounded', eyeShape: 'rounded', pixelSize: 420,
  });
  const data = { name: `${v.first} ${v.last}`.trim(), title: v.title, org: v.org, phone: v.phone, email: v.email, url: v.url, address: v.address, qrBg: '#ffffff', caption: 'SCAN TO SAVE CONTACT' };
  // Exercise solid, gradient and pattern themes (the QR keeps its own panel).
  const base = { gradAngle: 135, pattern: 'dots', text: 'auto', accentBar: true, border: true, qrPanel: true, orientation: 'landscape', headingFont: 'Arial, sans-serif', bodyFont: 'Georgia, serif', divider: 'double', graphic: 'wave' };
  const themes = {
    solid: { ...base, bgStyle: 'solid', bg1: '#fffdf8', bg2: '#efe7d6', accent: '#e0522e' },
    gradient: { ...base, bgStyle: 'gradient', bg1: '#16324f', bg2: '#2f7d8f', accent: '#7fe3d0', text: 'light', accentBar: false },
    pattern: { ...base, bgStyle: 'pattern', bg1: '#0f2436', bg2: '#24465f', pattern: 'grid', accent: '#7fb3ff', text: 'light', accentBar: false },
    portrait: { ...base, bgStyle: 'solid', bg1: '#fffdf8', bg2: '#efe7d6', accent: '#e0522e', orientation: 'portrait' },
  };

  for (const variant of ['single', 'two-sided', 'gradient', 'pattern', 'qr-only', 'portrait', 'portrait-2s']) {
    const theme =
      variant === 'gradient' ? themes.gradient :
      variant === 'pattern' ? themes.pattern :
      variant === 'portrait' || variant === 'portrait-2s' ? themes.portrait : themes.solid;
    const faceData = variant === 'qr-only' ? { ...data, name: '', title: '', org: '', phone: '', email: '', url: '', address: '' } : data;
    const sheet = variant === 'two-sided' || variant === 'portrait-2s';
    const card = sheet
      ? buildCardSheetSVG(faceData, qrSvg, { logoHref: LOGO, watermarkHref: LOGO, watermarkOpacity: 0.12 }, theme)
      : buildCardSVG(faceData, qrSvg, theme);
    const width = Math.round(cardDims(theme.orientation, sheet).w * 2);
    const png = new Resvg(card, { fitTo: { mode: 'width', value: width }, background: 'white' }).render().asPng();
    const dec = PNG.sync.read(Buffer.from(png));
    const res = jsQR(new Uint8ClampedArray(dec.data), dec.width, dec.height);
    const ok = res && res.data === payload;
    console.log(`  ${ok ? '✅' : '❌'}  card ${i + 1} ${variant.padEnd(9)} ${dec.width}x${dec.height}  ${ok ? 'QR decodes' : 'FAILED'}`);
    total++;
    if (ok) pass++;
  }
}
console.log(`\n${pass}/${total} cards scannable`);
process.exit(pass === total ? 0 : 1);

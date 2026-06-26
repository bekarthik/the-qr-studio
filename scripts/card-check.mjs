// Verify the QR embedded in a composed visiting card still decodes.
import { register } from 'node:module';
import jsQR from 'jsqr';
import { Resvg } from '@resvg/resvg-js';
import { PNG } from 'pngjs';

register('./ts-loader.mjs', import.meta.url);
const { buildPayload } = await import('../src/content/payloads.ts');
const { buildMatrix } = await import('../src/qr/matrix.ts');
const { renderSVG } = await import('../src/qr/svg.ts');
const { buildCardSVG } = await import('../src/card/card.ts');

const vcards = [
  { first: 'Asha', last: 'Rao', org: 'Acme Pvt Ltd', title: 'Founder', phone: '+919876543210', email: 'asha@acme.com', url: 'https://acme.com', address: 'MG Road, Bengaluru' },
  { first: 'A', last: '', org: '', title: '', phone: '+10000000000', email: 'a@b.co', url: '', address: '' },
];

let pass = 0;
for (const [i, v] of vcards.entries()) {
  const payload = buildPayload('vcard', v);
  const matrix = buildMatrix(payload, 'H');
  const qrSvg = renderSVG({
    matrix, quietModules: 2, fg: '#101418', bg: '#ffffff', sampler: null, protectPatterns: true,
    colorStyle: 'solid', brandColor: '#2563eb', sub: 3, core: 0, shape: 'rounded', eyeShape: 'rounded', pixelSize: 420,
  });
  const card = buildCardSVG(
    { name: `${v.first} ${v.last}`.trim(), title: v.title, org: v.org, phone: v.phone, email: v.email, url: v.url, address: v.address, accent: '#e0522e', qrBg: '#ffffff', caption: 'SCAN TO SAVE CONTACT' },
    qrSvg,
  );
  const png = new Resvg(card, { fitTo: { mode: 'width', value: 2100 }, background: 'white' }).render().asPng();
  const dec = PNG.sync.read(Buffer.from(png));
  const res = jsQR(new Uint8ClampedArray(dec.data), dec.width, dec.height);
  const ok = res && res.data === payload;
  console.log(`  ${ok ? '✅' : '❌'}  card ${i + 1}  ${dec.width}x${dec.height}  ${ok ? 'QR decodes' : 'FAILED'}`);
  if (ok) pass++;
}
console.log(`\n${pass}/${vcards.length} cards scannable`);
process.exit(pass === vcards.length ? 0 : 1);

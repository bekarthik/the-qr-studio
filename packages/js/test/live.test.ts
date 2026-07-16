import { test } from 'node:test';
import assert from 'node:assert/strict';
import { QrStudio } from '../src/index.ts';

/**
 * Opt-in integration test against a real, running QR Studio API. Skipped unless
 * QR_STUDIO_BASE_URL is set. Spin the worker up first:
 *
 *   cd worker && npm install && npm run dev   # → http://localhost:8787
 *   QR_STUDIO_BASE_URL=http://localhost:8787 npm run test:live
 */
const BASE = process.env.QR_STUDIO_BASE_URL;

test('generate() returns a verified PNG from a live API', { skip: !BASE }, async () => {
  const qr = new QrStudio({ baseUrl: BASE! });
  const res = await qr.generate({ data: 'https://example.com', verify: true });
  assert.equal(res.format, 'png');
  // PNG magic number.
  assert.deepEqual([...res.bytes.subarray(0, 4)], [0x89, 0x50, 0x4e, 0x47]);
  assert.equal(res.verified, true);
});

test('svg() returns SVG markup from a live API', { skip: !BASE }, async () => {
  const qr = new QrStudio({ baseUrl: BASE! });
  const svg = await qr.svg({ data: 'https://example.com' });
  assert.match(svg, /^<svg/);
});

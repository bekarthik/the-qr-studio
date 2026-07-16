# @theqr.studio/qr

A tiny, dependency-free, typed client for the **QR Studio API** — image-styled,
**server-verified** scannable QR codes as **PNG or SVG**. Works in the browser
and in Node (≥ 18).

It's a thin wrapper over the QR Studio HTTP API (the Cloudflare Worker in this
repo's [`worker/`](../../worker)). Every PNG is decoded server-side after
rendering, so you can trust the `verified` flag: `true` means the output scans
back to exactly the payload you sent.

## Install

```bash
npm install @theqr.studio/qr
```

## Requires a base URL

This package ships **no default host** — you point it at your own deployed QR
Studio API. Deploy the worker (`cd worker && npm run deploy`) and pass its URL:

```ts
import { QrStudio } from '@theqr.studio/qr';

const qr = new QrStudio({ baseUrl: 'https://qr.example.com' });
```

## Usage

```ts
// Generate a PNG and inspect the server-side scan verification.
const res = await qr.generate({ data: 'https://example.com', style: 'brand', brand: '#0f766e' });
res.format;    // 'png'
res.bytes;     // Uint8Array (raw PNG)
res.verified;  // true | false | null   (from the X-QR-Verified header)
res.blob();    // Blob (browser & Node ≥ 18)
res.dataUrl(); // 'data:image/png;base64,…'

// Convenience helpers
const png: Uint8Array = await qr.png({ data: 'hi' });
const svg: string      = await qr.svg({ data: 'hi' });
const url: string      = await qr.dataUrl({ data: 'hi' });

// Build a GET URL for an <img> (no logo, no header read needed)
imgEl.src = qr.url({ data: 'https://example.com', size: 320 });
```

### In the browser

```ts
const res = await qr.generate({ data: 'https://example.com' });
document.querySelector('img')!.src = URL.createObjectURL(res.blob());
```

### In Node — save to disk

```ts
import { writeFile } from 'node:fs/promises';
const res = await qr.generate({ data: 'https://example.com' });
await writeFile('qr.png', res.bytes);
```

## Options

Only `data` is required; everything else falls back to the server default.

| Option              | Type                          | Default     | Notes                                                    |
| ------------------- | ----------------------------- | ----------- | -------------------------------------------------------- |
| `data` *(required)* | `string`                      | —           | payload to encode (≤ 1200 chars)                         |
| `format`            | `'png' \| 'svg'`              | `'png'`     | output format                                            |
| `ec`                | `'L' \| 'M' \| 'Q' \| 'H'`    | `'H'`       | error-correction level                                   |
| `fg` / `bg`         | `#rrggbb`                     | `#000000` / `#ffffff` | module / background colour                      |
| `style`             | `'solid' \| 'brand'`          | `'solid'`   | `brand` auto-darkens to stay scannable                   |
| `brand`             | `#rrggbb`                     | `#1d4ed8`   | used when `style: 'brand'`                                |
| `size`              | `number`                      | `512`       | output px (clamped 64–2048 server-side)                  |
| `sub`               | `3 \| 5 \| 7`                 | `3`         | sub-cells per module                                     |
| `quiet`             | `number`                      | `4`         | quiet-zone modules (clamped 0–8)                         |
| `logo`              | `string` (data URL)           | —           | base64 `data:image/…` URL only (remote URLs rejected)    |
| `logoRatio`         | `number`                      | `0.22`      | logo box fraction (clamped 0.1–0.3)                      |
| `logoPlate`         | `boolean`                     | `true`      | backing plate behind the logo                            |
| `verify`            | `boolean`                     | `true`      | round-trip decode → `X-QR-Verified` → `result.verified`  |

### Client options

```ts
new QrStudio({
  baseUrl: 'https://qr.example.com', // required
  fetch,                              // optional: inject fetch (Node < 18)
  headers: { 'x-api-key': '…' },      // optional: sent on every request
  timeoutMs: 10_000,                  // optional: abort after N ms
});
```

## Errors

Non-2xx responses throw a `QrStudioError` carrying the HTTP `status` and the
API's error message (and raw `body`):

```ts
import { QrStudioError } from '@theqr.studio/qr';

try {
  await qr.generate({ data: 'x'.repeat(2000) });
} catch (err) {
  if (err instanceof QrStudioError) console.error(err.status, err.message);
}
```

## License

MIT

# qr_studio

A typed Dart client and Flutter widget for the **QR Studio API** — image-styled,
**server-verified** scannable QR codes as **PNG or SVG**.

It's a thin wrapper over the QR Studio HTTP API (the Cloudflare Worker in this
repo's [`worker/`](../../worker)). Every PNG is decoded server-side after
rendering, so you can trust the `verified` flag: `true` means the output scans
back to exactly the payload you sent.

## Install

```yaml
dependencies:
  qr_studio: ^0.1.0
```

## Requires a base URL

This package ships **no default host** — point it at your own deployed QR Studio
API. Deploy the worker (`cd worker && npm run deploy`) and pass its URL.

## Widget

```dart
import 'package:qr_studio/qr_studio.dart';

QrStudioImage(
  baseUrl: 'https://qr.example.com',
  options: const QrOptions(
    data: 'https://example.com',
    style: QrStyle.brand,
    brand: '#0f766e',
  ),
  width: 240,
  height: 240,
  loadingBuilder: (context) => const CircularProgressIndicator(),
  errorBuilder: (context, error) => Text('$error'),
)
```

The QR is re-fetched automatically whenever `options` change.

## Client

```dart
final client = QrStudioClient(baseUrl: 'https://qr.example.com');

final res = await client.generate(
  const QrOptions(data: 'https://example.com', style: QrStyle.brand),
);
res.format;    // QrFormat.png
res.bytes;     // Uint8List (raw PNG)
res.verified;  // true | false | null  (from X-QR-Verified)

final Uint8List png = await client.png(const QrOptions(data: 'hi'));
final String svg     = await client.svg(const QrOptions(data: 'hi'));
final Uri uri        = client.buildUri(const QrOptions(data: 'hi', size: 320));

client.close(); // closes the internally-created HTTP client
```

Pass your own `http.Client` to reuse a connection pool or inject a mock:

```dart
QrStudioClient(baseUrl: '…', httpClient: myHttpClient);
```

## Options

Only `data` is required; everything else falls back to the server default.

| Option              | Type              | Default     | Notes                                                 |
| ------------------- | ----------------- | ----------- | ----------------------------------------------------- |
| `data` *(required)* | `String`          | —           | payload to encode (≤ 1200 chars)                      |
| `format`            | `QrFormat`        | `png`       | `png` / `svg`                                         |
| `ec`                | `ErrorCorrection` | `h`         | `l` / `m` / `q` / `h`                                 |
| `fg` / `bg`         | `String` hex      | `#000000` / `#ffffff` | module / background colour                  |
| `style`             | `QrStyle`         | `solid`     | `brand` auto-darkens to stay scannable                |
| `brand`             | `String` hex      | `#1d4ed8`   | used when `style: QrStyle.brand`                      |
| `size`              | `int`             | `512`       | output px (clamped 64–2048 server-side)               |
| `sub`               | `int` (3/5/7)     | `3`         | sub-cells per module                                  |
| `quiet`             | `int`             | `4`         | quiet-zone modules (clamped 0–8)                      |
| `logo`              | `String` data URL | —           | base64 `data:image/…` URL only (remote URLs rejected) |
| `logoRatio`         | `double`          | `0.22`      | logo box fraction (clamped 0.1–0.3)                  |
| `logoPlate`         | `bool`            | `true`      | backing plate behind the logo                         |
| `verify`            | `bool`            | `true`      | round-trip decode → `verified`                        |

## Errors

Non-2xx responses throw a `QrStudioException` carrying `statusCode`, `message`
(the API's `error`), and the raw `body`.

## License

MIT

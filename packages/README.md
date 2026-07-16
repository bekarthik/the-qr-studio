# QR Studio client SDKs

Thin, typed client libraries that wrap the QR Studio HTTP API (the Cloudflare
Worker in [`../worker`](../worker), `GET`/`POST /qr`). They generate
image-styled, **server-verified** scannable QR codes as PNG or SVG.

Both SDKs are **standalone** (no imports from the app or the worker) and each
**requires a base URL** — this repo bundles no default host. Deploy the worker
(`cd worker && npm run deploy`) and point the SDK at its URL.

| Package | Language / target | Directory | Registry name |
| --- | --- | --- | --- |
| JS / TS (browser + Node ≥ 18) | `@theqr.studio/qr` | [`js/`](js) | npm |
| Dart + Flutter widget | `qr_studio` | [`flutter/`](flutter) | pub.dev |

## Develop

```bash
# JS
cd js && npm install && npm test && npm run build

# Flutter/Dart
cd flutter && flutter pub get && flutter analyze && flutter test
```

### Live test against a local worker

```bash
cd worker && npm install && npm run dev     # → http://localhost:8787
# JS
cd packages/js && QR_STUDIO_BASE_URL=http://localhost:8787 npm run test:live
# Flutter example
cd packages/flutter/example && flutter run --dart-define=QR_STUDIO_BASE_URL=http://localhost:8787
```

## Publishing

Release workflows live in [`../.github/workflows`](../.github/workflows):
`publish-js.yml` (tag `js-v*`) and `publish-flutter.yml` (tag `flutter-v*`).
Publishing is opt-in and requires credentials (an `NPM_TOKEN` secret for npm; a
pub.dev automated-publishing trust relationship for Dart).

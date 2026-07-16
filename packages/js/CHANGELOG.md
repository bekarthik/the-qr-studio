# Changelog

All notable changes to `@theqr.studio/qr` are documented here.

## 0.1.0

- Initial release.
- `QrStudio` client wrapping the QR Studio API (`POST`/`GET /qr`).
- `generate()`, `png()`, `svg()`, `dataUrl()`, and `url()` helpers.
- `QrResult` with `bytes` / `svg`, `verified` (from `X-QR-Verified`), and
  `blob()` / `dataUrl()` / `arrayBuffer()`.
- `QrStudioError` for non-2xx responses.
- Zero runtime dependencies; browser + Node (≥ 18); dual ESM/CJS build.

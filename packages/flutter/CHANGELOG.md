## 0.1.0

- Initial release.
- `QrStudioClient` wrapping the QR Studio API (`POST`/`GET /qr`) with
  `generate()`, `png()`, `svg()`, and `buildUri()`.
- `QrOptions` with typed enums (`QrFormat`, `ErrorCorrection`, `QrStyle`),
  `QrResult` (`bytes` / `svg`, `verified` from `X-QR-Verified`), and
  `QrStudioException` for non-2xx responses.
- `QrStudioImage` Flutter widget with loading/error builders that re-fetches on
  option changes.

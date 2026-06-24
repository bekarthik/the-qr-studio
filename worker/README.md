# QR Studio Service

An invocable HTTP microservice that wraps the QR Studio core as a Cloudflare
Worker. It generates **image-styled, server-verified scannable QR codes** as
**PNG or SVG**, reusing the exact same rendering core as the browser app
(`buildMatrix` → `renderSVG` → `subCellFill`), so a code from the API is
byte-for-byte the same decision as one from the studio UI.

PNGs are produced by rasterising the SVG with `@resvg/resvg-wasm`, then decoded
back with `jsQR` on the rendered pixels — the `X-QR-Verified` response header is
`true` only when the output scans to exactly the payload you sent. This is the
same "verified scannable" guarantee the UI shows, enforced on the server.

## API

`GET` or `POST` `/qr` (also `/v1/qr`)

```bash
# PNG (default)
curl "https://<your-worker>/qr?data=https://example.com&format=png" -o qr.png

# Brand colour + size
curl "https://<your-worker>/qr?data=upi://pay?pa=m@upi%26cu=INR&style=brand&brand=%230f766e&size=512" -o pay.png

# SVG
curl "https://<your-worker>/qr?data=hello&format=svg" -o qr.svg

# POST with a logo (base64 data URL only)
curl -X POST https://<your-worker>/qr -H 'Content-Type: application/json' \
  -d '{"data":"https://example.com","logo":"data:image/png;base64,iVBOR...","logoRatio":0.22}'
```

| Param                  | Default            | Notes                                            |
| ---------------------- | ------------------ | ------------------------------------------------ |
| `data` *(required)*    | —                  | payload to encode (≤ 1200 chars)                 |
| `format`               | `png`              | `png` \| `svg`                                   |
| `ec`                   | `H`                | error correction: `L` `M` `Q` `H`                |
| `fg` / `bg`            | `#000000`/`#ffffff`| `#rrggbb` hex                                    |
| `style`                | `solid`            | `solid` \| `brand`                               |
| `brand`                | `#1d4ed8`          | brand colour (auto-darkened to stay scannable)   |
| `size`                 | `512`              | output px, clamped 64–2048                        |
| `sub`                  | `3`                | sub-cells per module: `3` \| `5` \| `7`          |
| `quiet`                | `4`                | quiet-zone modules, clamped 0–8                   |
| `logo`                 | —                  | base64 `data:image/…` URL (remote URLs rejected) |
| `logoRatio`/`logoPlate`| `0.22`/`true`      | centre-logo box size & backing plate             |
| `verify`               | `true`             | round-trip decode check → `X-QR-Verified` header |

Endpoints: `GET /` (docs page), `GET /health`, `GET|POST /qr`.

## Abuse / DDoS protection

Layered, edge-inward:

1. **Cloudflare network** absorbs L3/L4 volumetric attacks (free, automatic).
2. **Edge caching** — `GET` responses are deterministic and cached
   (`Cache-Control: immutable`), so a flood of identical requests is served from
   cache and never re-invokes the Worker.
3. **Per-IP rate limit** — a Rate Limiting binding caps each client to 60 req /
   60 s (tune in `wrangler.toml`). Gracefully skipped if the binding is absent.
4. **Strict validation** — bounded text length, output size, sub-cells and quiet
   zone; hex-only colours; method all-owlist (GET/POST/OPTIONS); body-size cap.
5. **No SSRF** — logos are accepted **only** as inline base64 data URLs; the
   Worker never fetches a remote URL.

Security headers (`X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`)
and configurable CORS (`ALLOW_ORIGIN` var) are set on every response.

## Develop & deploy

```bash
npm install
npm run smoke      # render→raster→jsQR round-trip in plain Node (no browser)
npm run typecheck
npm run dev        # local workerd via wrangler
npm run deploy     # wrangler deploy (needs `wrangler login`)
```

The rate-limit binding uses Cloudflare's Rate Limiting API. It works on
deployment; locally the binding is a no-op, which the code tolerates.

## ⚠️ Free-tier size note

The bundle is ~**1.0 MiB gzipped**, almost entirely the resvg `.wasm`
rasteriser. Cloudflare's **free** Worker limit is **1 MiB compressed**, so this
deploys on free tier today but with little headroom — a dependency bump could
push it over. Options if you hit the limit:

- **Workers Paid** ($5/mo) raises the limit to 10 MiB — comfortable headroom.
- **SVG-only build**: drop `@resvg/resvg-wasm` + `jsqr` and serve `format=svg`
  only (a few tens of KB), rasterising to PNG on the client. Keeps it free with
  room to spare, at the cost of server-side PNG + verification.

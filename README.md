# QR Studio

A browser-based generator for **scannable QR codes that resemble your image** —
a logo, a photo, anything. Everything runs client-side; no uploads leave the
browser.

## Features

### Sources
Generate a correctly-formatted QR for any of:

| Source | Encodes |
| --- | --- |
| Web link | `https://…` |
| Text | raw text |
| Email | `mailto:` with subject & body |
| Phone | `tel:` |
| SMS | `SMSTO:` |
| WhatsApp | `https://wa.me/<number>?text=…` |
| Wi-Fi | `WIFI:` (WPA/WEP/open, hidden) |
| Visiting card | vCard 3.0 |
| Location | `geo:lat,lng` |

### Two independent image modes

1. **Resemble the image (halftone).** Every QR module is expanded into a 3×3
   grid of sub-cells. The **centre** sub-cell always keeps the true module
   value, so the data layer stays intact, while the **8 surrounding** sub-cells
   follow the brightness of your image. The finished code looks like your
   picture but still scans.

2. **Embed the image in the centre.** A square of modules in the middle is
   *carved out* (cleared to the background) and the logo is drawn into that
   empty space — embedded inside the code, not pasted on top of live modules.

Either mode can be used alone or together. Whenever an image mode is on, the
encoder is forced to **error-correction level H (30% redundancy)** so the image
"noise" and the carved centre don't break scanning. Finder, timing and
alignment patterns are kept solid so scanners can always lock onto the symbol.

### Export

Download as **PNG** (raster, 1600 px) or **SVG** (vector, infinitely scalable —
ideal for print). Both are produced from the same sub-cell geometry, so they are
equally scannable. The SVG merges dark sub-cells into horizontal runs to stay
compact and embeds a centre logo as an `<image>` element.

## Develop

```bash
npm install
npm run dev        # local dev server (Vite)
npm run build      # typecheck + production build to dist/
npm run verify     # headless scannability check (renders + decodes with jsQR)
```

## How scannability is verified

`npm run verify` renders representative payloads (plain, halftone, halftone +
centre-embed, long vCard, Wi-Fi) using the same function-pattern mask the app
uses, then decodes each one with [`jsQR`](https://github.com/cozmo/jsQR) and
asserts the decoded text matches the input. It checks **both** export paths —
the canvas/PNG raster and the SVG vector output (rasterised by replaying its
rects) — so a regression in either renderer fails the build. All cases must
decode for the check to pass.

> Always test-scan a printed code with a real phone before mass-printing. If a
> phone struggles with a heavily-styled code, lower the **Image detail** or
> **Logo size**, or keep **Protect alignment & timing patterns** enabled.

## Project layout

```
src/
├── qr/
│   ├── matrix.ts     # QR encoding + function-pattern map (uses `qrcode`)
│   ├── halftone.ts   # image → binary sub-cell sampler
│   ├── grid.ts       # shared sub-cell geometry + dark/light decision
│   ├── render.ts     # canvas (PNG) rendering
│   └── svg.ts        # vector (SVG) rendering
├── content/payloads.ts  # source-type → QR payload string
├── ui/forms.ts          # per-source form field definitions
└── main.ts              # UI wiring + render loop
```

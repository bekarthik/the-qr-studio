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
| UPI Pay | `upi://pay?pa=…&pn=…&am=…&cu=INR` (India) |
| Bank account (India) | labelled A/C + IFSC details (NEFT/IMPS/RTGS) |
| PayPal | `https://paypal.me/<user>/<amount><cur>` |
| Venmo | `https://venmo.com/?txn=pay&recipients=…` (US) |
| Cash App | `https://cash.app/$<cashtag>/<amount>` (US/UK) |
| Bitcoin | `bitcoin:<address>?amount=…` (BIP-21) |
| Bank transfer (SEPA) | EPC “Girocode” credit-transfer (euro area) |
| Wi-Fi | `WIFI:` (WPA/WEP/open, hidden) |
| Visiting card | vCard 3.0 |
| Location | `geo:lat,lng` |

### Module & eye styling

Style the code with three independent controls:

- **Module shape** — how each dark data module is drawn: **Square** (classic),
  **Dots** (circles), **Rounded**, **Extra rounded**, or **Liquid** — adjacent
  modules merge into smooth connected blobs (rounded outer corners, filleted
  inner junctions), rendered as SVG `<path>` / canvas `Path2D`.
- **Finder eyes** — the three corner patterns drawn as a cohesive eye:
  **Auto** (follows the module shape), **Square**, **Rounded**, or **Circle**.
- **Eye colour** — a separate colour for the eyes (or match the foreground),
  auto-darkened into the scannable band so a light accent still reads.

Styling works on **plain and halftone** codes. On a halftone, the protected
centre **data dot** is drawn in the chosen module shape (grow it with *Data dot
size*), and the eyes are restyled on top. With **Liquid**, adjacent dark data
dots are **bridged into connected blobs** over the image while light areas keep
the picture. To keep every code scannable, the
**timing/alignment** patterns stay solid squares and each **finder pattern is
drawn as one cohesive eye** — a scanner samples each module's centre, which
every shape fills. Both PNG and SVG export the styling (SVG uses real
`<circle>` / rounded-`<rect>` elements), and `npm run verify` decodes the styled
output (including halftone + shaped dots + coloured eyes) to prove it scans.

### Three independent image modes

1. **Resemble the image (halftone).** Every QR module is expanded into a 3×3
   grid of sub-cells. The **centre** sub-cell always keeps the true module
   value, so the data layer stays intact, while the **8 surrounding** sub-cells
   follow the brightness of your image. The finished code looks like your
   picture but still scans.

2. **Embed the image (crisp logo).** A square of modules is *carved out*
   (cleared to the background) and the logo is drawn into that empty space —
   embedded inside the code, not pasted on top of live modules. Choose the
   **position** (centre or **bottom-right corner**) and the **size** with a
   linear slider. A corner carve can overlap the bottom-right alignment pattern,
   so that function pattern is **re-stamped over the logo** to keep the
   structural locator — the live badge confirms scannability for the chosen size.

3. **Watermark the logo.** Draw the logo faintly over the code at a chosen
   **opacity** — either **across** the whole code (cover-fit, clipped to the
   modules, never the quiet zone) or in the **bottom-right corner** (which has
   no finder pattern, so it's the safe place for a small badge). Opacity is kept
   low by default so module contrast still reads; the live verify badge confirms
   each code scans, and `npm run verify` decodes a worst-case dark watermark.

These modes are independent and can be combined (e.g. a styled block code with a
bottom-right watermark).

**Detail & contrast (clarity).**

- **Halftone detail** — sub-cells per module: Standard (3×3) or High (5×5).
  High renders the image at a finer resolution so fine logo lines stay crisp,
  and works across all colour styles. A central data *core* scales with detail,
  and at High detail the source is **low-pass filtered** (box blur) before
  sampling so background texture doesn't alias into scannability-breaking
  speckle.
- **Auto contrast** — picks the dark/light cut-off automatically (Otsu) so a
  mid-tone logo separates correctly without fiddling the threshold slider.

**Colour style.** A selector picks how data cells are coloured:

- **Solid** — the foreground/background pickers (default).
- **Brand colour** — the whole code in one chosen colour, light cells white.
  The colour is **auto-darkened** into the safe luminance band, so even a light
  brand colour (yellow, cyan…) still scans. Small SVGs (one colour merges into
  runs). Best for logos. Tick **Auto-detect from image** to pull the brand
  colour straight from the uploaded logo.
- **Image colours** — every cell takes the image's actual hue, so the code
  resembles the picture's colours, not just its brightness. This includes the
  identifier (finder/alignment/timing) patterns; their dark cells are clamped
  harder so a dark identifier cell over a light image area stays detectable
  (falling back toward near-black where the image is white).

Scannability is preserved across all styles by clamping colours into a dark
(≤95) or light (≥175) **luminance band** — a scanner reads brightness, not hue —
and by keeping the centre sub-cell (the one a scanner samples) plus all function
patterns at full contrast.

Either image mode can be used alone or together with a colour style. Whenever an image mode is on, the
encoder is forced to **error-correction level H (30% redundancy)** so the image
"noise" and the carved centre don't break scanning. Finder, timing and
alignment patterns are kept solid so scanners can always lock onto the symbol.

### Export

Download as **PNG** (raster, 1600 px) or **SVG** (vector, infinitely scalable —
ideal for print). Both are produced from the same sub-cell geometry, so they are
equally scannable. The SVG merges dark sub-cells into horizontal runs to stay
compact and embeds a centre logo as an `<image>` element.

### Visiting card

Generate a print-ready **business card** (3.5×2″, 1050×600 at 300 dpi) as **PNG
or SVG**, composed from the **Visiting card** source fields. The card pairs your
typeset contact details (name, title, company, phone, email, website, address)
with a styled QR that **encodes the same vCard**, so scanning it saves you as a
contact. It uses your colour/shape styling for brand consistency; image modes are
skipped so a card QR always scans. `npm run verify:card` rasterises the composed
card and decodes the embedded QR to prove it.

### Verified scannable (live)

Every rendered code is **decoded in-browser with jsQR** and the result shown as a
badge — ✓ *Verified scannable*, or a ⚠ warning to dial back detail / logo size /
contrast. The same check runs headlessly in `npm run verify`. This turns "does my
styled QR actually scan?" from a gamble into a shown guarantee.

## Develop

```bash
npm install
npm run dev        # local dev server (Vite)
npm run build      # typecheck + production build to dist/
npm run verify     # headless scannability check (renders + decodes with jsQR)
npm run example    # write sample halftone PNGs (OUT=dir) and decode-check them
                   # IMAGE=logo.jpg uses a real image (.png/.jpg) as the source
```

## Deploy

QR Studio is a fully static, client-side app — `npm run build` emits a
self-contained `dist/` (HTML, hashed JS/CSS, favicon) that any static host can
serve. The Vite `base` is `./`, so it also works from a sub-path.

In a monorepo this project lives in `qr-studio/`, so point the host at this
folder as the **base / root directory**:

| Host | Settings |
| --- | --- |
| **Cloudflare Pages** | Root dir `qr-studio` · Build `npm run build` · Output `dist` |
| **Netlify** | Base dir `qr-studio` (a `netlify.toml` here sets build `npm run build` + publish `dist`) |
| **Vercel** | Root dir `qr-studio` · Framework “Vite” · Output `dist` |
| **GitHub Pages** | Build locally/CI, publish `qr-studio/dist` |

Any static server works too:

```bash
npm run build
npx serve dist        # or: python -m http.server -d dist
```

## Support / payments (configurable)

A **☕ Support** button in the nav/footer opens a small dialog with whatever
payment options you enable — Buy Me a Coffee, Stripe (card), Ko-fi, GitHub
Sponsors, PayPal, UPI. Everything is a plain public link, so it stays a static
app with **no backend and no secret keys**:

- **Stripe** uses a hosted **Payment Link** (Dashboard → Payment links) — paste
  the `https://buy.stripe.com/…` URL. Never put a Stripe secret/restricted key
  in the frontend.
- The rest are just handles (`buymeacoffee.com/<handle>`, etc.).

Configure by editing `src/config/support.ts`, or set `VITE_SUPPORT_*` env vars
at build time (copy `.env.example` → `.env`). Blank entries are hidden; if none
are set, the button doesn't render.

## How scannability is verified

`npm run verify` renders representative payloads (plain, halftone, halftone +
centre-embed, every module/eye style, liquid, long vCard, Wi-Fi) using the same
function-pattern mask the app uses, then decodes each one with
[`jsQR`](https://github.com/cozmo/jsQR) and asserts the decoded text matches the
input. It checks **both** export paths — the canvas/PNG raster, and the **real
SVG output rasterised with [`@resvg/resvg-js`](https://github.com/yisibl/resvg-js)**
(so `<path>`-based shapes like liquid are decoded faithfully, not approximated)
— so a regression in either renderer fails the build. All cases must decode for
the check to pass.

> Always test-scan a printed code with a real phone before mass-printing. If a
> phone struggles with a heavily-styled code, lower the **Image detail** or
> **Logo size**, or keep **Protect alignment & timing patterns** enabled.

## Project layout

```
src/
├── qr/
│   ├── matrix.ts     # QR encoding + function-pattern map (uses `qrcode`)
│   ├── halftone.ts   # image → sub-cell sampler (brightness + colour)
│   ├── grid.ts       # shared sub-cell geometry + dark/light + colour fill
│   ├── render.ts     # canvas (PNG) rendering
│   └── svg.ts        # vector (SVG) rendering
├── content/payloads.ts  # source-type → QR payload string
├── ui/forms.ts          # per-source form field definitions
└── main.ts              # UI wiring + render loop
```

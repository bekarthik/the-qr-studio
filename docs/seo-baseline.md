# SEO / GEO baseline — "before" audit

Date: 2026-07-03
Scope: `bekarthik/the-qr-studio` (Vite/React SPA), branch `claude/qr-studio-seo-geo-5olypk`.

## 1. Stack confirmation

- **Vite 8 + React 19 + TypeScript**, client-side-rendered SPA. Confirmed via
  `package.json` (`vite`, `@vitejs/plugin-react`, no server framework) and
  `index.html` (`<div id="root"></div>` + `<script type="module" src="/src/main.tsx">`).
- **No router.** Single route; the tool UI is switched entirely by React state
  (`ControlsTab` / `OutputMode` in `App.tsx`). The only URL variance today is the
  client-only share hash `#d=…` (`GeneratorContext.tsx`), which never round-trips
  through a server.
- **Deploy:** Netlify (`netlify.toml`, `command = "npm run build"`,
  `publish = "dist"`). No SSR/edge rendering configured — pure static file host
  for the Vite build output, plus (presumably, needs confirming from the live
  Netlify dashboard) a SPA fallback rewrite.
- **Unknown routes: soft 404, not a hard 404.** Because it's a static host with
  a SPA fallback (`/* → /index.html 200`), an unknown path returns **HTTP 200**
  serving the app shell, never a `404` status. Verified locally against the
  built `dist/`: `/does-not-exist` → HTTP 200. After the SEO work the app
  renders a real 404 *page* (client-side `NotFound`, `robots: noindex, follow`,
  no JSON-LD, `<h1>Page not found</h1>`) so Google shouldn't index it, but the
  HTTP **status** is still 200 — a genuine hard-404 status would need edge/host
  logic this static setup doesn't have. Recorded honestly for the case study;
  the `noindex` mitigates the soft-404 risk without eliminating the 200.

## 2. `index.html` — current head

- Static `<title>` and `<meta name="description">` — present, but singular:
  same for every conceivable route since there are no routes yet.
- OG tags present but weak: `og:title`, `og:description` are set, but
  **`og:image` points at `favicon.svg`** (a small vector icon, not a proper
  1200×630 social card) and there's no `og:url`. `twitter:card` is
  `summary` (not `summary_large_image`), no `twitter:image`.
- **Missing entirely:** canonical `<link>`, JSON-LD (Organization /
  SoftwareApplication / FAQPage / HowTo / BreadcrumbList), `theme-color` is
  present but that's cosmetic only.
- **`<div id="root">` is empty in the static HTML.** All content — headings,
  copy, FAQs, the tool itself — is rendered client-side by React after JS
  executes. Any crawler that does not execute JavaScript sees an essentially
  blank page (title + description only).

## 3. Missing site-level files

Checked `public/` — currently contains only `favicon.svg` and `sw.js`.

- ❌ `robots.txt` — absent. No explicit allow/deny for any crawler (default-open
  by omission, but also no sitemap pointer and no explicit AI-bot allow list).
- ❌ `sitemap.xml` — absent.
- ❌ `llms.txt` — absent.

## 4. Bot / hosting access — **BLOCKED IN THIS ENVIRONMENT**

This session's outbound network policy blocks egress to `theqr.studio`:

```
$ curl -sI https://theqr.studio/
HTTP/1.1 403 Forbidden        # <- from this environment's proxy gateway, NOT from theqr.studio
Content-Length: 36
```

Proxy status (`$HTTPS_PROXY/__agentproxy/status`) confirms this is a policy
denial at the CONNECT stage, not a response from the origin:

```
"recentRelayFailures": [
  { "kind": "connect_rejected",
    "detail": "gateway answered 403 to CONNECT (policy denial or upstream failure)",
    "host": "theqr.studio:443" }
]
```

DNS resolution *does* work from here (`theqr.studio` → `98.84.224.111`,
`18.208.88.157`), so I can't yet tell whether Cloudflare fronts the domain or
whether Netlify serves it directly, and I can't check live AI-bot access.

**Action needed from you (run locally, paste results back):**

```bash
# 1. Plain fetch — baseline status/headers
curl -sI https://theqr.studio/

# 2. Simulate AI/search bots — look for 403/429/redirect-to-block-page
curl -s -A "GPTBot/1.0"        -o /dev/null -w "GPTBot: %{http_code}\n" https://theqr.studio/
curl -s -A "ClaudeBot/1.0"     -o /dev/null -w "ClaudeBot: %{http_code}\n" https://theqr.studio/
curl -s -A "PerplexityBot/1.0" -o /dev/null -w "PerplexityBot: %{http_code}\n" https://theqr.studio/
curl -s -A "OAI-SearchBot/1.0" -o /dev/null -w "OAI-SearchBot: %{http_code}\n" https://theqr.studio/
curl -s -A "Googlebot/2.1"     -o /dev/null -w "Googlebot: %{http_code}\n" https://theqr.studio/
curl -s -A "Applebot/0.1"      -o /dev/null -w "Applebot: %{http_code}\n" https://theqr.studio/

# 3. Confirm what a non-JS crawler actually sees (should show empty #root today)
curl -s https://theqr.studio/ | head -60

# 4. Look for Cloudflare in front (server header, cf-ray, etc.)
curl -sI https://theqr.studio/ | grep -i -E "server|cf-ray|cf-cache"
```

Once you paste these back I'll fill in the "confirmed" section below and flag
anything that needs fixing (e.g. a Cloudflare bot-fight-mode or WAF rule
blocking `GPTBot`/`ClaudeBot`, which would violate the "don't block any AI
bot" guardrail and need a Cloudflare-side allow rule — that change happens
outside this repo).

**Status: pending owner input** — not yet confirmed either way. Treat as
"unknown, verify before shipping" rather than "safe."

## 5. Baseline verify-suite status (engine untouched, must stay green throughout)

Confirmed on this branch before any SEO/GEO changes:

- `npm ci` — clean install, 0 vulnerabilities.
- `npm run build` (`tsc --noEmit && vite build`) — green. Output:
  `dist/index.html` 2.53 kB, one CSS bundle (29.3 kB), one JS bundle (436 kB).
- `npm run verify` — **96/96 scannable**.
- `npm run verify:card` — **27/27 cards scannable**.

This is the baseline to preserve through every subsequent step.

## 6. Summary — what's broken today

| Surface | State |
|---|---|
| Routes | Single URL only, no per-use-case pages |
| `<div id="root">` static content | Empty — invisible to non-JS crawlers |
| Canonical tag | Missing |
| JSON-LD | Missing (no Organization/SoftwareApplication/FAQPage/HowTo) |
| `robots.txt` | Missing |
| `sitemap.xml` | Missing |
| `llms.txt` | Missing |
| `og:image` | Placeholder (favicon.svg, not a real 1200×630 card) |
| Twitter card | `summary`, no image |
| AI bot access (Cloudflare/Netlify level) | **Unconfirmed — needs live check, see §4** |

This confirms the brief's assumed baseline. Proceeding to step 2 (router +
route registry + preset wiring) while §4 is pending; nothing in step 2 depends
on the live bot-access answer.

---

## 7. "After" — what changed (steps 2–7 complete)

Date: 2026-07-03. All code-side work from the brief is done and pushed to
`claude/qr-studio-seo-geo-5olypk`. Summary of the new architecture:

| File | Role |
|---|---|
| `src/seo/routes.ts` | Single typed route registry — `ROUTES: RouteDef[]`. Everything below reads from it. |
| `src/seo/content.ts` | `ContentBlock` types (intro/section/howto/faq/stat). |
| `src/seo/head.ts` | The one place `<head>` is set — `applyRouteHead()` / `applyNotFoundHead()`. |
| `src/seo/jsonld.ts` | Builders: `organization`, `softwareApplication`, `faqPage`, `howTo`, `breadcrumb`. |
| `src/components/ContentBlocks.tsx` | Renders a route's `ContentBlock[]` — the only place GEO copy becomes markup. |
| `src/components/JsonLd.tsx` | Injects `<script type="application/ld+json">` tags. |
| `src/components/ToolPage.tsx` | The tool, extracted from the old `App.tsx`, now preset per route. |
| `public/robots.txt` | Explicitly allows Googlebot/Bingbot/Applebot + GPTBot/ChatGPT-User/OAI-SearchBot/PerplexityBot/ClaudeBot/Claude-User/anthropic-ai. Never blocks any bot. |
| `scripts/gen-sitemap.mjs` | Post-build: `dist/sitemap.xml` + `dist/llms.txt` from `ROUTES`. |
| `scripts/gen-og-image.mjs` | One-off generator for `public/og-image.png` (real 1200×630 social card, replacing the favicon placeholder). |
| `scripts/prerender.mjs` | Post-build: crawls every route with the pre-installed Chromium, snapshots static HTML into `dist/<path>/index.html`. Removable — no-ops (exit 0) if Chromium isn't present, e.g. on Netlify's build image. |

Routes shipped: `/`, `/upi`, `/wifi`, `/vcard`, `/url`, `/whatsapp` — no
`-qr-code` suffix per your call, since the domain already says QR.

### Verified in this environment (no live egress needed)

- `npm run build` green (fresh `npm ci` + `rm -rf dist`, clean-room). Prerender
  step ran and snapshotted all 6 routes.
- `npm run verify` **96/96**, `npm run verify:card` **27/27** — engine
  untouched, confirmed repeatedly across every step.
- Served the built `dist/` with a Netlify-accurate static server (correct
  pretty-URL → `<path>/index.html` resolution) and `curl`'d every route with
  `GPTBot/1.0`, `ClaudeBot/1.0`, `PerplexityBot/1.0`, `OAI-SearchBot/1.0`,
  `Googlebot/2.1` — **all 6 routes return HTTP 200 with the correct
  `<title>`, FAQ content, and JSON-LD present in the raw HTML, with zero JS
  executed** (this is the actual non-JS-crawler experience — `curl` doesn't
  run JavaScript). Example:
  ```
  GPTBot -> /upi: HTTP 200, title "UPI QR Code Generator — Free & Verified
  Scannable | QR Studio", 6 FAQ blocks, 5 JSON-LD script tags
  ```
- `robots.txt`, `sitemap.xml`, `llms.txt` all serve correctly and reference
  the real 6-route set.
- Headless-Chromium end-to-end check: the prerendered static HTML still boots
  into a fully interactive tool after JS loads (typed a UPI VPA into the
  prerendered `/upi` page, got a live "✓ Verified scannable · Version 4 ·
  33×33 modules · error correction H" result) — no hydration breakage.
- Found and fixed a real bug during this verification: the prerender
  crawler's own local static server was serving stale, already-mutated
  `dist/index.html` content as a fallback for not-yet-crawled routes,
  producing duplicate JSON-LD blocks. Fixed by serving a pristine in-memory
  shell captured once before the crawl starts, plus a guard that makes
  `npm run prerender` refuse to re-run against already-prerendered output.

### Still needs you (live egress + accounts this environment doesn't have)

These are the brief's §"Verification" items that need the real deployed
domain or a Google/social account — nothing here is blocked by outstanding
code work, only by access:

1. **Live bot-access check** (§4 above, still unresolved) — run the curl
   block in §4 against `https://theqr.studio/` once this branch is deployed,
   to confirm Cloudflare/Netlify isn't blocking any AI bot in production.
2. **Google Rich Results Test** — https://search.google.com/test/rich-results
   — paste each route's URL once deployed; check SoftwareApplication, FAQPage,
   HowTo and BreadcrumbList all validate with no errors.
3. **Link previews** — share each route's URL in WhatsApp, X/Twitter, and
   LinkedIn composer (don't send) and confirm the 1200×630 `og-image.png`
   card renders with the right title/description.
4. **Search Console URL inspection** — once deployed and the sitemap is
   submitted, inspect each route: should be indexable, no soft-404 (the
   `/does-not-exist` 404 route is explicitly `noindex` so it shouldn't show
   as a false soft-404 for a real route).
5. **Netlify dashboard**: confirm the `[[redirects]] from="/*" to="/index.html"
   status=200` rule in `netlify.toml` is picked up, and that Netlify's
   pretty-URL resolution serves the prerendered `dist/<path>/index.html`
   files ahead of that fallback (this is Netlify's documented default
   behavior — same as the local Python-server check above — but worth
   confirming once live).
6. **Chromium on Netlify's build image**: prerendering currently no-ops on
   Netlify (no Chromium there), so the *deployed* site serves the
   plain client-rendered SPA shell for every route, not the prerendered
   static HTML — bots will see the pre-JS-render experience described in §2,
   not the fixed version verified in this section. To get prerendering
   running on the actual Netlify build, you'd need either a Netlify build
   plugin that installs a Chromium binary, or to run `npm run build` in a CI
   environment that has one and publish that `dist/` instead. Flagging this
   rather than deciding it — it's a real infrastructure choice, not a code
   change.

## 8. Per-route live crawler checklist (run against the deployed branch)

This sandbox can't reach `theqr.studio` (egress blocked — see §4). Run the
block below **once this branch is deployed** and paste the results back to
complete the before/after case study. For each route capture what GPTBot
(AI, never runs JS) and Googlebot see, plus a JS-disabled content sanity
check. A "good" result = full HTML with the route's `<title>`, FAQ text, and
`application/ld+json` present **without** any JS executing.

```bash
BASE=https://theqr.studio
for r in / /upi /wifi /vcard /url /whatsapp; do
  echo "===== $r ====="
  # GPTBot (AI answer engines — JS never executes)
  curl -sA "Mozilla/5.0 (compatible; GPTBot/1.0; +https://openai.com/gptbot)" "$BASE$r" \
    | grep -Eio '<title>[^<]+|"@type":"[a-z]+"|geo-faq__item' | sort | uniq -c
  # Googlebot (first pass is also JS-free)
  curl -sA "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" "$BASE$r" \
    -o /dev/null -w "  Googlebot HTTP %{http_code}\n"
done

# JS-disabled content check — does meaningful content exist in raw HTML?
# (proxy for "no JS execution"): the intro paragraph + first FAQ should be present.
curl -s "$BASE/upi" | grep -c 'geo-faq__item'   # expect >= 5 if prerendered; 0 if plain SPA shell

# Unknown route — confirm soft-404 (expect HTTP 200, NOT 404) and noindex in the shell
curl -s "$BASE/definitely-not-a-real-route" -o /dev/null -w "unknown route HTTP %{http_code}\n"
```

**Interpreting the result:**
- If GPTBot sees the `<title>`, the `"@type"` schema entries, and `geo-faq__item`
  blocks → prerendering is live and the fix landed. ✅
- If GPTBot sees only the generic shell `<title>` and **zero** `"@type"` /
  `geo-faq__item` → the deploy is serving the plain SPA shell (prerender
  didn't run on the build host; see §7 item 6). The client-side head/JSON-LD
  still work for JS-executing consumers, but AI crawlers get nothing. ⚠️
- Any GPTBot/Googlebot response that is `403`/`429`/a challenge page → a
  host/CDN bot rule is blocking a crawler; reconcile with `public/robots.txt`
  (which allows all of them) — that fix is host-side, outside this repo.

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
- **Unknown routes (this branch): soft 404, not a hard 404.** This describes the
  branch build, NOT live production — see §4: the deployed old build has no
  fallback and returns a genuine **HTTP 404** today. On *this branch*, the
  netlify.toml SPA fallback (`/* → /index.html 200`) makes an unknown path
  return **HTTP 200** serving the app shell. Verified locally against the built
  `dist/`: `/does-not-exist` → HTTP 200. The app renders a real 404 *page*
  (client-side `NotFound`, `robots: noindex, follow`, no JSON-LD, `<h1>Page not
  found</h1>`) so Google shouldn't index it, but the HTTP **status** is still
  200. This is a **regression vs. production's current hard-404** and is the
  open decision noted in §4 — keep the fallback (accept soft-404s) or drop it so
  the prerendered per-route files win and unknown paths 404 like today.

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

## 4. Bot / hosting access — CONFIRMED (live production, 2026-07-04)

Run by the owner against the deployed production site (old single-route build,
pre-branch). Evidence:

- **Hosting:** `server: Netlify` + `x-nf-request-id` present; no `cf-ray`/
  `cf-cache` headers → **Netlify serves the domain directly, no Cloudflare in
  front.** No CDN-level bot rules exist to block or challenge crawlers.
- **Bot access — all open:** GPTBot, Googlebot, ClaudeBot, PerplexityBot,
  OAI-SearchBot, Applebot all → **HTTP 200**. GPTBot and Googlebot received
  byte-identical responses: the generic site-wide `<title>`/description,
  `og:image` pointing at `favicon.svg`, no canonical, no JSON-LD, and an
  empty `<div id="root"></div>`.
- **Unknown routes:** `/does-not-exist` → **HTTP 404** on live production.
  This CORRECTS §1's soft-404 note for the deployed site: the `/* → 
  /index.html 200` fallback exists only on this branch's netlify.toml; the
  currently-deployed old build has no fallback, so production returns hard
  404s today. (§1's soft-404 behavior becomes real only if this branch ships
  with the fallback rule — see the open decision on dropping it in favor of
  prerendered per-route files.)

**Interpretation (the "before" in one line):** no crawler is blocked — every
search and AI bot receives a 200 — but every one of them is served a single
generic title and an empty body. The site is fully open and fully invisible.

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
| AI bot access (Cloudflare/Netlify level) | **Confirmed open** — Netlify direct, no Cloudflare; all bots → HTTP 200 (see §4). Fully open, fully invisible. |
| Unknown routes | **Hard 404** on live production today (no SPA fallback in the old build; see §4) |

This confirms the brief's assumed baseline. Proceeding to step 2 (router +
route registry + preset wiring); nothing in step 2 depends on the live
bot-access answer (now confirmed in §4).

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

1. ~~**Live bot-access check**~~ — **DONE** (§4, 2026-07-04): Netlify direct,
   no Cloudflare, every bot → HTTP 200. No crawler is blocked. After this
   branch deploys, re-run the per-route checklist in §8 to confirm the bots
   now receive the *prerendered* content (not the old empty shell).
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

### Update (2026-07-04): the prerender→deploy gap is now SOLVED by CI

Item 6 below ("Chromium on Netlify's build image") is **resolved**. The site
now builds in **GitHub Actions** (which installs Chromium, so the prerender
runs), gates on the verify suites, and pushes the prebuilt `dist/` to Netlify
via the CLI; Netlify's own build is disabled. So a deployed `main` serves the
**prerendered** HTML to bots, not the plain shell. The workflow's own
`smoke:live` step asserts this on every deploy (HTTP 200 + expected `<title>` +
JSON-LD as GPTBot/Googlebot). Setup + operation: **`docs/runbooks/deploy.md`**.

What still genuinely needs you (access, not code): items 1–4 above (live
bot-access spot-check, Rich Results Test, link previews, Search Console), and
adding the two GitHub secrets (`NETLIFY_AUTH_TOKEN`, `NETLIFY_SITE_ID`) +
flipping Netlify to "Stop builds" per the runbook.

6. ~~**Chromium on Netlify's build image**~~ — **RESOLVED** by the CI pipeline
   above; kept here for the case-study record. Previously prerendering no-op'd
   on Netlify (no Chromium there), so the deployed site served the plain
   client-rendered SPA shell — bots saw the §2 pre-render experience. The
   GitHub Actions build + CLI deploy closes this until Sightline's edge layer
   supersedes the prerender entirely.

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

# Unknown route status — depends on the open fallback decision (§4/§1):
#   fallback KEPT  → HTTP 200 (soft-404, noindex shell)
#   fallback DROPPED → HTTP 404 (like production today)
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

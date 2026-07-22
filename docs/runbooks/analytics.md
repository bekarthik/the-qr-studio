# Analytics

Privacy-first, cookieless, no PII. Two stages: **Cloudflare Web Analytics now**
(traffic) and **Umami later** (custom "what did they build" events). The core
rule everywhere: capture **category-level** signals only — never a QR payload
(the URL / UPI VPA / Wi-Fi password / contact details a user types).

Code: `src/lib/analytics.ts` (`initAnalytics()` injects the Cloudflare beacon;
`track()` is the Umami seam). Wired in `src/main.tsx`.

---

## Stage 1 — Cloudflare Web Analytics (live)

Free, cookieless, no consent banner. Reports **pageviews, unique visitors,
locations, referrers, device/browser**, and auto-tracks client-side route
changes — so the per-type pages (`/upi`, `/wifi`, `/vcard`, `/url`,
`/whatsapp`) already show which type pages draw traffic.

**Setup**

1. Cloudflare Dashboard → **Web Analytics** → **Add a site** → enter
   `theqr.studio`. You do **not** need Cloudflare DNS/CDN — the JS beacon works
   on Netlify as-is.
2. Copy the beacon **token** from the snippet (`data-cf-beacon='{"token":"…"}'`).
3. In GitHub → repo **Settings → Secrets and variables → Actions → Variables**,
   add a variable **`VITE_CF_BEACON_TOKEN`** = that token. (It's public by
   design — a *variable*, not a secret. Blank/unset = analytics off.)
4. Trigger a deploy. `initAnalytics()` injects the beacon for real visitors
   only — never in dev, never during the prerender crawl (it skips
   `navigator.webdriver`), so dev/CI never pollute the stats.
5. Verify: load the live site, check the Network tab for
   `static.cloudflareinsights.com/beacon.min.js`, and watch the Cloudflare
   dashboard populate.

**Limitation:** Cloudflare has no custom events, so the *precise* "which type
did they build / which format did they export" is not captured here — that's
Stage 2.

---

## Stage 2 — Umami (planned: custom events for GTM)

GTM's key question is **what kind of QR people generate**. Cloudflare only shows
it by proxy (type-page traffic); Umami captures it exactly, cookieless, with a
ready dashboard.

### The events are already instrumented (no-op until Umami is on)

`track()` is a no-op today but is **already called at the GTM-critical sites**,
so enabling Umami is a one-file change, not a re-instrumentation:

| Event | Props | Where it fires |
|---|---|---|
| `qr_type` | `{ type }` | `StudioSource.tsx` — `chooseType()` (category buttons + Type dropdown) |
| `export` | `{ format, type }` | `Preview.tsx` — `save()` (PNG + SVG downloads) |

Good next additions when Umami lands: `card_designed`, `verify_result`
(`{ pass }`), `support_click`. Never add a prop that carries encoded content.

### Hosting (no EC2 needed)

Umami = a Next.js app + a Postgres/MySQL DB. Pick one:

- **Umami Cloud** free hobby tier — zero hosting/DB to manage. Fastest.
- **Vercel (free) + the existing Supabase Postgres** — full ownership, reuses
  the DB we already run; point Umami's `DATABASE_URL` at Supabase.

It cannot share this project's Netlify site (that's a prebuilt static deploy
with builds disabled) — it would be a separate app.

### Turning it on

1. Stand up Umami (above); create a website entry → get its **website id** +
   **script src**.
2. Add its loader script (env-gated, same pattern as the Cloudflare beacon) and
   forward `track()` to `window.umami.track(event, props)` in
   `src/lib/analytics.ts`.
3. Set the Umami env vars (website id / host) as repo variables and add them to
   `deploy.yml`. Deploy.

Cloudflare and Umami can run side by side — Cloudflare for traffic, Umami for
product/GTM events — or drop Cloudflare once Umami covers pageviews too.

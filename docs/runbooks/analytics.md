# Analytics

Privacy-first, cookieless, no PII, via **Umami** (Umami Cloud). The core rule
everywhere: capture **category-level** signals only — never a QR payload (the
URL / UPI VPA / Wi-Fi password / contact details a user types).

Code: `src/lib/analytics.ts` — `initAnalytics()` injects the tracker;
`track(event, props)` records custom events. Wired in `src/main.tsx`.

Umami reports **pageviews, unique visitors, locations, referrers, devices**, and
**custom events**, and auto-tracks client-side route changes (so `/upi`,
`/wifi`, … are counted on SPA navigation too).

---

## Custom events (GTM: "what kind of QR do people build?")

Already instrumented — no extra work needed:

| Event | Props | Where it fires |
|---|---|---|
| `qr_type` | `{ type }` | `StudioSource.tsx` — `chooseType()` (category buttons + Type dropdown) |
| `export` | `{ format, type }` | `Preview.tsx` — `save()` (PNG + SVG downloads) |

In Umami these appear under **Events**; break `export` down by the `type`
property to see which QR types actually get downloaded. Good future additions:
`card_designed`, `verify_result` (`{ pass }`), `support_click`. Never add a prop
that carries encoded content.

---

## Setup

1. **Create the website in Umami** (Umami Cloud → Add website → host
   `theqr.studio`). Region US/EU only is fine — the data is anonymous and
   cookieless (no PII), so residency rules don't apply and the deferred beacon
   adds no visible latency.
2. **Copy the Website ID** (Umami → the website → Settings). It's a UUID and is
   **public** (it ships in the page).
3. **Set it in CI:** GitHub → repo **Settings → Secrets and variables → Actions
   → Variables** → add **`VITE_UMAMI_WEBSITE_ID`** = that UUID. (A *variable*,
   not a secret. Blank/unset = analytics off.) For manual/local deploys, put the
   same line in your `.env`.
4. **Deploy.** `initAnalytics()` injects the tracker for real visitors only —
   never in dev, never during the prerender crawl (it skips
   `navigator.webdriver`), so the tag isn't baked into prerendered HTML and
   dev/CI never pollute the stats.
5. **Verify:** load the live site, check the Network tab for
   `cloud.umami.is/script.js`, then confirm a pageview appears in Umami. Trigger
   an export and confirm the `export` event shows up under Events. (Disable ad
   blockers when testing — they block the tracker.)

- **Self-hosting later** (full ownership): host Umami on Vercel's free tier
  pointed at the existing Supabase Postgres — no EC2 needed. Set
  `VITE_UMAMI_SRC` to your instance's `script.js` and use its website id. See
  Umami docs.

---

## Privacy notes

- No cookies, no cross-site tracking, no persistent visitor id — Umami counts
  uniques with a daily server-side hash, so nothing identifies a person.
- We never send QR content. `track()` props are restricted to category values
  (type, format) by convention — keep it that way.
- The Privacy Policy (`/privacy`) already discloses "privacy-friendly analytics"
  collecting "aggregated, non-identifiable" data, which matches this setup.

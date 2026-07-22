# One-off manual deploy to Netlify

Use this when you want to ship **without GitHub Actions** — e.g. Actions minutes
are exhausted, or you just want to push a build from your machine. You build
locally (with Chromium so the prerender runs) and push the prebuilt `dist/` to
Netlify with the CLI. This is the same thing the Actions workflow does, done by
hand. For the automated pipeline see [`deploy.md`](./deploy.md).

> The result is identical to an Actions deploy: a CLI `deploy --prod` bypasses
> Netlify's build pipeline and publishes the exact `dist/` you built. It
> respects `netlify.toml` (SPA-fallback redirect + cache headers).

---

## Two things that bite people first

1. **`VITE_*` env vars are inlined at BUILD time.** Whatever is set when you run
   `npm run build` is baked into the bundle. Build with them **missing** and the
   deployed site silently ships with the contact form, support links and
   analytics **disabled**. The build runs on *your machine* here (not on
   Netlify), so a value set in the Netlify dashboard is never seen. Put them in
   a local `.env` (below).
2. **Prerender needs Chromium.** No Chromium → with `PRERENDER_REQUIRED=1` the
   build *fails* (good — it won't ship a bot-invisible shell). Install it first.

---

## Prerequisites (one-time)

- **Node ≥ 22.6** — the build's `gen-sitemap.mjs` / `prerender.mjs` run under
  `node --experimental-strip-types`. Check: `node -v`.
- **Chromium for Playwright** (matched to the pinned `playwright-core`):
  ```bash
  npx playwright@1.61.1 install chromium
  ```
  Installs to the OS default (`%LOCALAPPDATA%\ms-playwright\` on Windows,
  `~/.cache/ms-playwright/` on macOS/Linux); `scripts/prerender.mjs` finds it
  there automatically.
- **A local `.env`** (git-ignored) with the values you want baked in. Copy
  `.env.example` and fill what you use:
  ```
  VITE_SUPABASE_URL=…
  VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_…
  VITE_CF_BEACON_TOKEN=…            # Cloudflare Web Analytics (optional)
  VITE_SUPPORT_KOFI=…               # etc. — any support links you use
  ```
  Vite loads `.env` automatically for `npm run build`. Never commit it.
- **Netlify auth** — pick one:
  - **Interactive (simplest for a human):** `npx netlify-cli@17 login` (opens a
    browser once), then link this folder to the site: `npx netlify-cli@17 link`.
  - **Token (scriptable):** set `NETLIFY_AUTH_TOKEN` (Netlify → User settings →
    Applications → Personal access tokens) and `NETLIFY_SITE_ID` (site →
    Site configuration → General → Site details → **Site ID**). No `link` needed.

---

## Deploy — macOS / Linux

```bash
git switch main && git pull            # or the branch/commit you intend to ship
npm ci

PRERENDER_REQUIRED=1 npm run build     # tsc → vite → sitemap → prerender (must snapshot every route)
npm run verify && npm run verify:card  # engine gate — must stay 96/96 + 27/27

# preview first (optional): a draft URL, not production
npx netlify-cli@17 deploy --dir=dist --message "manual preview $(git rev-parse --short HEAD)"

# ship to production
npx netlify-cli@17 deploy --prod --dir=dist --message "manual $(git rev-parse --short HEAD)"

# confirm the LIVE site is bot-visible (200 + <title> + JSON-LD per route)
npm run smoke:live
```

## Deploy — Windows (PowerShell)

Only the env-var syntax differs; the steps are identical.

```powershell
git switch main; git pull
npm ci

$env:PRERENDER_REQUIRED = "1"
npm run build
npm run verify; npm run verify:card

# production deploy
npx netlify-cli@17 deploy --prod --dir=dist --message "manual $(git rev-parse --short HEAD)"

npm run smoke:live
```

> **Sanity check before deploying:** the build log must end with
> `[prerender] done — N/N routes snapshotted` (N routes, none skipped). If you
> see `No Chromium found`, the install step didn't land — re-run
> `npx playwright@1.61.1 install chromium`, or point
> `PLAYWRIGHT_CHROMIUM_PATH` at a Chrome/Chromium binary.

---

## If something's off

| Symptom | Fix |
|---|---|
| `[prerender] No Chromium found …` | Install Chromium (above), or set `PLAYWRIGHT_CHROMIUM_PATH=/path/to/chrome`. Don't drop `PRERENDER_REQUIRED` just to get past it — that ships the un-prerendered shell. |
| Contact form / support / analytics missing on the live site | You built without the `VITE_*` values. Check `.env`, rebuild, redeploy. |
| `deploy` can't find the site | Run `npx netlify-cli@17 link`, or pass `--site <SITE_ID>` / set `NETLIFY_SITE_ID`. |
| `verify` fails | The QR engine regressed — **don't deploy**. Fix it; the gate is doing its job. |
| Bad deploy already live | Netlify dashboard → **Deploys** → pick a previous good deploy → **Publish deploy** (instant rollback). |

## Notes

- **Draft vs prod:** `deploy` (no `--prod`) publishes to a unique preview URL you
  can eyeball first; `deploy --prod` publishes to `theqr.studio`.
- **Netlify builds stay off.** As with the Actions flow, leave Netlify's own
  builds stopped (see [`deploy.md`](./deploy.md) → One-time setup) so a stray
  git-triggered build can't overwrite your CLI deploy with an un-prerendered
  shell. CLI deploys are unaffected.
- **Which commit ships:** the CLI uploads whatever is in `dist/` right now —
  i.e. your last local build. Make sure you built the commit you intend to ship.

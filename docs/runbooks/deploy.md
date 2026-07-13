# Deploy runbook — theqr.studio

**How the site ships:** GitHub Actions builds it (installing Chromium so the
prerender step runs), gates on the QR verify suites, and pushes the prebuilt
`dist/` to Netlify via the CLI. Netlify itself no longer builds this site.

Why not just let Netlify build? `scripts/prerender.mjs` needs Chromium to
snapshot each route's HTML for bots, and Netlify's build image doesn't have
it — so a Netlify-built deploy shipped the un-prerendered SPA shell, invisible
to AI crawlers (GPTBot/ClaudeBot/etc. never run JS).

```
push to main ─▶ GitHub Actions ─▶ npm ci
                                └▶ install Chromium (playwright@1.61.1)
                                └▶ PRERENDER_REQUIRED=1 npm run build   (fails if prerender no-ops)
                                └▶ npm run verify && verify:card         (gate)
                                └▶ netlify deploy --prod --dir=dist
                                └▶ npm run smoke:live                    (assert live site is bot-visible)
```

Workflow: [`.github/workflows/deploy.yml`](../../.github/workflows/deploy.yml).

---

## One-time setup

### 1. Create the two GitHub secrets

Both live under **GitHub → the repo → Settings → Secrets and variables →
Actions → "New repository secret"**.

| Secret | Where to get it |
|---|---|
| `NETLIFY_AUTH_TOKEN` | Netlify → **User settings → Applications → Personal access tokens → New access token**. Name it e.g. "GitHub Actions deploy", copy the token (shown once). |
| `NETLIFY_SITE_ID` | Netlify → the site → **Site configuration → General → Site details → Site ID** (the API ID, a UUID). |

That's all the workflow needs — the Netlify CLI reads both from the
environment automatically.

### 2. Stop Netlify from building this site

So a git push (if the repo is still linked to Netlify) can't kick off a
Netlify build that overwrites the CLI deploy with an un-prerendered shell.

**Primary (dashboard):** Netlify → the site → **Site configuration → Build &
deploy → Continuous deployment → Build settings → "Stop builds"** (or set the
build status to *Stopped*). This halts all git-triggered builds; CLI
`deploy --prod` still works.

**Backstop (in repo, already done):** `netlify.toml` has no `[build] command`
and sets `ignore = "exit 0"`, so even if a build is triggered it short-circuits
before doing anything. CLI deploys bypass the build pipeline entirely, so
they're unaffected.

> If you'd rather fully decouple: **Site configuration → Build & deploy →
> Continuous deployment → Manage repository → unlink** — then only CLI deploys
> reach the site. Optional; "Stop builds" is enough.

### 3. Keep the custom domain / redirects / headers

These stay on Netlify and are unaffected: the `theqr.studio` domain, the
SPA-fallback redirect and asset-cache headers in `netlify.toml`. The CLI
deploy respects `netlify.toml` redirects/headers.

---

## Normal operation

- **Deploy:** merge to `main`. The workflow runs and deploys automatically.
- **Manual deploy:** GitHub → **Actions → "Deploy (prerender + Netlify)" → Run
  workflow**.
- **Watch:** the Actions run log shows build → verify → deploy → smoke. A green
  run means the live site returned HTTP 200 + correct `<title>` + JSON-LD for
  every route as GPTBot/Googlebot.

## When a run fails, read which step

| Failing step | Meaning / fix |
|---|---|
| **Install Chromium** | Playwright download/apt hiccup — re-run; if persistent, pin/download issue. |
| **Build (with required prerender)** | Either a real TS/Vite build error, or prerender no-op'd (Chromium not found) — `PRERENDER_REQUIRED=1` turned that into a failure on purpose. Check the `[prerender]` log line. |
| **Verify QR engine (gate)** | The QR engine regressed — **do not bypass**; the deploy is correctly blocked. Fix the engine. |
| **Deploy to Netlify** | Bad/expired `NETLIFY_AUTH_TOKEN`, wrong `NETLIFY_SITE_ID`, or Netlify outage. |
| **Smoke-test the live deploy** | The deploy went out but the live site isn't bot-visible: a route 404'd, the `<title>` didn't match the registry, JSON-LD was missing, or a bot UA got blocked (403/429 → a host/CDN bot rule; reconcile with `public/robots.txt`). The bad deploy is already live — fix forward and re-run, or roll back in the Netlify dashboard (**Deploys → pick a previous deploy → Publish deploy**). |

## Local dry-run

You can run everything the workflow does except the Netlify deploy:

```bash
npm ci
# Chromium: this repo's sandbox has one pre-installed at $PLAYWRIGHT_BROWSERS_PATH;
# otherwise: npx playwright@1.61.1 install chromium
PRERENDER_REQUIRED=1 npm run build      # must prerender all routes or fail
npm run verify && npm run verify:card    # must stay 96/96 + 27/27
# Smoke a local static server (Netlify-style):
( cd dist && python3 -m http.server 8080 ) &
SMOKE_BASE_URL=http://127.0.0.1:8080 npm run smoke:live
```

## Removing this pipeline later (Sightline edge swap)

When Sightline's edge layer serves rendered HTML/Markdown to bots, the
build-time prerender is redundant:

1. Delete `scripts/prerender.mjs` and drop the ` && node … prerender.mjs` tail
   from `package.json`'s `build` script.
2. Either keep this workflow (still a fine CI-build + CLI-deploy path) or, if
   Netlify can build the now-Chromium-free site again, re-add `[build] command
   = "npm run build"` to `netlify.toml`, remove `ignore`, and re-enable Netlify
   builds in the dashboard.
3. The live smoke (`smoke:live`) stays useful either way — keep it.

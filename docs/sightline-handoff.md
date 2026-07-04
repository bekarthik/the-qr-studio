# Context Handoff: theqr.studio × Sightline
### For the theqr.studio project window — full background, immediate SEO/GEO work, and SDK-readiness prep
*Prepared July 2026 in Karthik's Sightline planning conversation. This document is self-contained; the reader (Claude, in the theqr.studio project) is assumed to know theqr.studio's codebase but nothing about Sightline.*

---

## 1. Why you're receiving this

Karthik is building a separate product, codenamed **Sightline** — an SEO/GEO control plane for single-page applications. **theqr.studio has been chosen as dogfood site #1**: it will (a) get its search and AI visibility fixed *manually now*, and (b) later become the first integration of the Sightline SDK, producing the before/after case study that launches the product. Your job in this project is to execute (a) and prepare the codebase for (b) — details in §4 and §5.

## 2. The problem Sightline exists to solve (and that theqr.studio has right now)

Client-side-rendered SPAs ship an empty `<div id="root"></div>` plus a JS bundle. Two consequences, both verified by 2026 research:

1. **AI invisibility.** GPTBot (ChatGPT), ClaudeBot, PerplexityBot and OAI-SearchBot **do not execute JavaScript**. A CSR app's content is invisible to them — the site cannot be cited or recommended by AI assistants, which now drive small but fast-growing, high-converting referral traffic (~1% of web traffic, converting at multiples of organic).
2. **Search friction.** Google renders JS but at a cost: render-queue delays, wasted crawl budget, late meta tags, soft-404s (HTTP 200 on "not found" views), and social scrapers (WhatsApp, Twitter/X, LinkedIn, Slack) never execute JS, so link previews break.

Additional 2026 facts that shape the work: schema/JSON-LD meaningfully lifts AI-answer selection; answer-first content structure (direct 40–80-word answers under question-style headings, FAQs, stats with sources) measurably increases AI citations; `llms.txt` is a near-zero-value checkbox (97% of these files are never fetched by anyone, per a 137K-domain Ahrefs study — Google confirmed no ranking effect) but Chrome Lighthouse now audits for it, so we add it cheaply and move on; and if the site sits behind Cloudflare, its **default AI-bot blocking** may be silently rejecting the very crawlers we want.

## 3. What Sightline is (full picture, so future decisions align)

Sightline = three parts sharing one compiled-config contract:

1. **`@sightline/react` npm SDK (open source).** A `<SeoProvider siteKey>` wraps the app; per-route title/meta/canonical/OG/JSON-LD resolve from a CDN-cached config JSON; `<Slot id>` components render marketer-managed structured content blocks; `<ManagedPages>` serves dashboard-created landing pages under `/lp/*`. Template variables (`{{productName}}`) bind runtime values. Core budget < 12 KB gzip.
2. **Control plane (dashboard).** Marketers edit SEO fields, structured blocks (FAQ, answer summary, stat callout, expert quote, comparison table, how-to, testimonial, LocalBusiness, CTA, constrained rich text — never raw HTML), robots/AI-bot policy, redirects, sitemaps; versioned publish/rollback, no deploys.
3. **Edge layer (Cloudflare Workers + headless rendering).** Classifies traffic: humans → untouched SPA; search bots → rendered HTML snapshots with config merged in; AI bots → clean Markdown + schema. Fail-open always. A "proof" dashboard shows verified crawler visits and what-the-bot-saw diffs.

Build phases: P0 control plane + SDK → P1 edge/rendering/proof → P2 blocks/landing pages → P3 framework adapters + OSS launch. **theqr.studio integration is milestone P0.7** — it happens after the SDK core exists but *before* the edge layer is built, precisely so SDK API mistakes surface early.

## 4. Work to do NOW in theqr.studio (manual, no Sightline dependency)

Execute in this order. Everything must be reversible and must not alter the human-facing experience or the navy/gold brand.

**4.1 Audit first (do not skip).** Confirm the actual stack and current state before changing anything: build tool and router (History API vs hash — hash routing must be replaced if present), hosting/CDN (check for Cloudflare AI-bot blocking), how titles/meta are currently set, whether unknown routes return real 404s, what `curl -A "GPTBot" <url>` and a JS-disabled fetch of each public route actually return today. Save this audit output — it is the "before" of the case study.

**4.2 Rendering fix.** Public, indexable routes (home, each tool page, pricing, blog/guides if any) must return meaningful HTML without JS execution. Preferred order for a Vite-style SPA: (1) build-time prerendering of the known static routes (e.g., vite prerender plugin / SSG pass) since tool pages are finite and stable; (2) hosting-level prerender extension if on Netlify/Cloudflare; (3) only if neither fits, a lightweight self-hosted snapshot for bots. Do **not** start an SSR framework migration — Sightline's edge layer will own dynamic rendering later; over-investing here creates throwaway work.

**4.3 Head correctness per route.** Unique title (≤60 chars) and description (≤160), self-referencing canonical, OG + Twitter card tags (brand-consistent share image), real 404 status for unknown paths. Centralize this in ONE module (see §5 — this is also SDK prep).

**4.4 Structured data.** JSON-LD per page type: `Organization` (site-wide), `WebApplication`/`SoftwareApplication` for the platform and each QR tool page (name, description, offers if freemium), `FAQPage` on tool pages, `HowTo` for "how to create a QR code for X" content, `BreadcrumbList`. Validate with Google's Rich Results test.

**4.5 Crawl plumbing.** XML sitemap of all public routes (auto-generated at build, submitted in Search Console); `robots.txt` explicitly allowing Googlebot, Bingbot, **OAI-SearchBot, GPTBot, PerplexityBot, ClaudeBot, Applebot**; `llms.txt` listing the main tool pages with one-line descriptions (checkbox value only — 10 minutes, no more).

**4.6 GEO content structure.** For each tool page: an answer-first opening (40–80 words directly answering "what is / how to"), question-style H2s, an FAQ section (5–8 real questions), at least one cited statistic where honest, and consistent H1→H2→H3 hierarchy. AI engines reward exactly this structure; it also feeds the FAQPage/HowTo schema in 4.4.

**4.7 Verify and record.** Search Console URL Inspection on key routes; `curl` as GPTBot/Googlebot showing full content; Lighthouse (note it now includes agentic-readiness checks); screenshot/log everything into `docs/seo-baseline.md` with dates. AI citation of new/changed pages typically appears within ~7–37 days — check ChatGPT/Perplexity for "best free QR code generator"-style prompts after that window and record results.

## 5. SDK-readiness prep (do alongside §4 — makes P0.7 a one-day job)

1. **Single head-management module.** All title/meta/canonical/JSON-LD writes go through one file (e.g., `src/seo/head.ts`) with a per-route config map — when Sightline arrives, `<SeoProvider>` replaces this one module, nothing else.
2. **Route registry.** Export a single typed list of public routes (path pattern, page type, params). Sightline's dashboard route inventory will be seeded from it.
3. **History API routing only**; clean param routes (`/tools/:type`), no hash URLs, no meaning-bearing query strings on indexable pages.
4. **Slot placeholders.** Where marketing content will eventually be dashboard-managed (below-hero FAQ, stat strips, CTA banners), render from local structured data objects shaped like Sightline blocks (`{ type: 'faq', items: [{q, a}] }`) rather than inline JSX — swapping to `<Slot id>` later becomes mechanical.
5. **No raw-HTML injection anywhere** for content — keep everything structured data → components (matches Sightline's security model).
6. Keep the §4.2 prerender setup cleanly removable (one plugin/config block), since Sightline's edge layer will supersede it.

## 6. Guardrails

Do not: migrate to Next.js/SSR, restructure the app architecture, change brand or human UX, buy third-party SEO tools, or block any AI bots in robots.txt (Karthik's policy for this site is fully open — visibility is the goal and the case study). Every change lands as a small reviewable commit. If the audit (4.1) reveals the stack differs materially from a Vite/React CSR SPA, pause and surface it to Karthik before executing 4.2.

## 7. Definition of done (this phase)

`curl -A "GPTBot" https://theqr.studio/<each public route>` returns complete, correct HTML with title/meta/JSON-LD; Search Console shows the routes indexed without soft-404s; link previews render on WhatsApp/X/LinkedIn; `docs/seo-baseline.md` captures the before/after; and the §5 refactors are merged so the future SDK swap touches exactly one module plus the slot data files.

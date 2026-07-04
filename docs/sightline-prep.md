# Sightline dogfood prep — theqr.studio (pre-P0.7 handoff)

Date: 2026-07-04
Branch: `claude/qr-studio-seo-geo-5olypk`

What this repo looks like going into Sightline SDK integration (P0.7), the
seams the SDK swaps into, and findings the P0.7 task should know. The
before/after visibility baseline lives in [`seo-baseline.md`](./seo-baseline.md);
this doc is the SDK-readiness summary.

## TL;DR for P0.7

- **One head seam.** `src/seo/head.ts` owns *every* `<head>` write — title,
  meta, canonical, OG/Twitter, **and** JSON-LD. Nothing else touches
  `document.title` or injects meta/link/ld+json. This is the single module
  `@sightline/react`'s `<SeoProvider>` replaces.
- **One typed route registry.** `src/seo/routes.ts` (`ROUTES: RouteDef[]`) is
  the single source of truth for router, head, JSON-LD, sitemap, and
  prerender. Each entry carries `path`, `pageType`, per-route `title` /
  `description` / `canonical` / `ogImage`, structured `content: ContentBlock[]`,
  and which `jsonLd` schema kinds to emit.
- **History-API routing** (`BrowserRouter`), not hash. The only hash usage is
  the client-only `#d=` share link (`GeneratorContext.tsx`) — it encodes tool
  state, never affects `<head>`, and must be preserved.
- **Marketing content is data, not markup.** Per-route copy lives as
  `ContentBlock[]` in the registry and is rendered by
  `src/components/ContentBlocks.tsx` — the seam a Sightline `<Slot>` swaps.

## The swap map (what P0.7 replaces vs. keeps)

| Concern | Today | After Sightline |
|---|---|---|
| Head writes | `src/seo/head.ts` (`applyRouteHead` / `applyNotFoundHead`) | `<SeoProvider>` drives head from Sightline; `head.ts` becomes a thin adapter or is removed |
| Route → SEO data | `src/seo/routes.ts` `RouteDef` | Sightline dashboard becomes the source; either it generates this file or the SDK fetches per-route slot data keyed by `path` / `pageType` |
| Structured marketing copy | `ContentBlock[]` in registry → `ContentBlocks.tsx` | `<Slot>` renders the same shape from Sightline-managed content |
| Bot-visible HTML | build-time prerender (`scripts/prerender.mjs`) | Sightline edge serves rendered HTML to search bots / Markdown to AI bots (supersedes the prerender — see finding 1) |
| JSON-LD | `src/seo/jsonld.ts` builders, injected by `head.ts` | SDK owns injection; builders can stay as the data source |

### Head module contract (what `<SeoProvider>` must reproduce)

`applyHead(state)` in `head.ts` writes, per route:
- `document.title`
- `meta[name=description]`, `meta[name=robots]` (`index, follow` or
  `noindex, follow` for the 404 page)
- `link[rel=canonical]` (removed when absent)
- OG: `og:type`, `og:site_name`, `og:title`, `og:description`, `og:url`,
  `og:image` (defaults to `/og-image.png`)
- Twitter: `summary_large_image`, `twitter:title/description/image`
- JSON-LD: one `<script type="application/ld+json" data-seo-jsonld>` per
  object, **cleared-then-written** on every call (see finding 2)

Meta/link are upserted by selector (idempotent). JSON-LD tags are marked with
`data-seo-jsonld` so a write clears the previous route's structured data
without touching anything else. If the SDK takes over head, it should either
reuse that marker or clear the existing marked tags on mount.

## What changed in this prep pass (vs. the earlier SEO/GEO commits)

The router, per-route head, JSON-LD, sitemap/robots/llms, GEO content and
prerender all landed in earlier commits on this branch. This pre-P0.7 pass
added only SDK-readiness tightening, no behavior change:

1. **Folded JSON-LD writes into `head.ts`.** They previously lived in a
   separate `JsonLd.tsx` React component — a *second* head seam. Removed the
   component; `applyRouteHead` now emits JSON-LD alongside title/meta so there
   is exactly **one** module to swap. This also fixed a latent wart (finding 2).
2. **Added `pageType` to the route registry.** A typed `'home' | 'tool'`
   discriminant, distinct from the concrete `jsonLd` schema set, for Sightline
   rules/slots to key off.

Verified after both: `npm run build` green, `npm run verify` **96/96** and
`npm run verify:card` **27/27** (engine untouched), and a headless-Chromium
pass over the built `dist/` — every route's live DOM after hydration has
exactly the right JSON-LD set (3 on home, 5 on tool pages), all marked, **no
duplication**; titles/canonical/OG match the registry; the 404 page is
`noindex` with zero JSON-LD.

## Findings P0.7 should know

1. **Prerender no-ops on Netlify's build image (no Chromium).** So the
   *deployed* site currently serves the plain client-rendered SPA shell to
   bots — AI crawlers (which never run JS) see almost nothing. This is exactly
   the gap Sightline's edge is meant to close: once the edge serves rendered
   HTML/Markdown to bots, it **supersedes** `scripts/prerender.mjs`, which can
   then be deleted. Until one or the other is live, bot visibility is broken
   in production regardless of the client-side head work. (Details:
   `seo-baseline.md` §7 item 6.)
2. **JSON-LD duplication on hydration (fixed here, note for the SDK).** A
   prerendered page ships with JSON-LD baked in; the old `JsonLd.tsx` appended
   *more* on hydration without removing them → doubled structured data in the
   live DOM for JS-executing crawlers. `head.ts` now clears `data-seo-jsonld`
   before writing. **The SDK must do the same** — clear existing marked tags
   before injecting, or it reintroduces the double.
3. **Unknown routes are a soft 404 (HTTP 200), not a hard 404.** Static host +
   SPA fallback. The app renders a `noindex` 404 *page*, but the *status* is
   200. If Sightline's edge wants to return a real `404` status for unknown
   paths, it can — the client can't. (`seo-baseline.md` §1.)
4. **Routes are static and param-less today.** `RouteDef` has no `params`
   field because no route has dynamic segments. If P0.7 introduces
   parameterised routes, extend `RouteDef` with `params` and teach the
   router + `scripts/prerender.mjs` + `scripts/gen-sitemap.mjs` to expand
   them — all three read `ROUTES`, so it's one shape to extend.
5. **Preserve the `#d=` share hash.** It's client-only tool state
   (`GeneratorContext.tsx`), decoded before render, and takes precedence over
   the route preset. It doesn't touch `<head>`, so the SDK can ignore it — but
   head/routing changes must not strip or rewrite the URL hash.
6. **`index.html` static shell carries home-route defaults.** Title,
   description, canonical (`/`), and OG are baked into `index.html` as the
   pre-hydration fallback for `/`. Per-route static HTML comes from the
   prerender (or, later, the edge). The SDK/edge should override these
   per-route; they're correct only for the home route.

## Key files

```
src/seo/routes.ts        ROUTES registry — single source of truth (path, pageType, title, …, content, jsonLd)
src/seo/head.ts          the ONE head module — applyHead / applyRouteHead / applyNotFoundHead
src/seo/jsonld.ts        JSON-LD builders (organization, softwareApplication, faqPage, howTo, breadcrumb)
src/seo/content.ts       ContentBlock types (intro | section | howto | faq | stat)
src/components/ContentBlocks.tsx   renders ContentBlock[] → HTML (the <Slot> seam)
src/components/ToolPage.tsx        route shell: calls applyRouteHead + renders the tool + ContentBlocks
scripts/prerender.mjs    removable build-time bot-HTML snapshotter (superseded by Sightline edge)
scripts/gen-sitemap.mjs  sitemap.xml + llms.txt from ROUTES
public/robots.txt        allows all search + AI crawlers; references sitemap
docs/seo-baseline.md     before/after visibility baseline + live crawler checklist
```

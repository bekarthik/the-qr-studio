import { SITE_NAME, SITE_URL } from './routes';
import type { RouteDef } from './routes';
import { buildJsonLd, type JsonLdObject } from './jsonld';

const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;

/** Marks the <script type="application/ld+json"> tags this module manages, so
 *  a subsequent applyHead() can clear the previous route's structured data
 *  before writing the new route's — without ever touching unrelated scripts. */
const JSONLD_MARK = 'data-seo-jsonld';

function upsert(selector: string, make: () => HTMLElement, attr: string, value: string): void {
  let el = document.head.querySelector(selector) as HTMLElement | null;
  if (!el) {
    el = make();
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
}

function setMeta(name: string, content: string, attr: 'name' | 'property' = 'name'): void {
  upsert(
    `meta[${attr}="${name}"]`,
    () => {
      const el = document.createElement('meta');
      el.setAttribute(attr, name);
      return el;
    },
    'content',
    content,
  );
}

function setLink(rel: string, href: string): void {
  upsert(
    `link[rel="${rel}"]`,
    () => {
      const el = document.createElement('link');
      el.setAttribute('rel', rel);
      return el;
    },
    'href',
    href,
  );
}

/** Replace the managed JSON-LD block set. Removes the previously-injected
 *  tags first, so client-side navigation swaps structured data cleanly and a
 *  prerendered page's baked-in tags are replaced (not duplicated) on
 *  hydration. */
function setJsonLd(objects: JsonLdObject[]): void {
  document.head.querySelectorAll(`script[type="application/ld+json"][${JSONLD_MARK}]`).forEach((el) => el.remove());
  for (const obj of objects) {
    const el = document.createElement('script');
    el.type = 'application/ld+json';
    el.setAttribute(JSONLD_MARK, '');
    el.textContent = JSON.stringify(obj);
    document.head.appendChild(el);
  }
}

export interface HeadState {
  title: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  noindex?: boolean;
  /** Structured-data objects to emit as <script type="application/ld+json">. */
  jsonLd?: JsonLdObject[];
}

/**
 * The ONE place page <head> is set — title, meta, canonical, OG/Twitter, AND
 * JSON-LD. Every route (and the 404 page) funnels through here. This is the
 * module a future `@sightline/react` <SeoProvider> replaces; everything else
 * keeps calling `applyRouteHead`/`applyNotFoundHead`.
 */
export function applyHead(state: HeadState): void {
  document.title = state.title;

  if (state.description) setMeta('description', state.description);

  if (state.canonical) setLink('canonical', state.canonical);
  else document.head.querySelector('link[rel="canonical"]')?.remove();

  setMeta('robots', state.noindex ? 'noindex, follow' : 'index, follow');

  setMeta('og:type', 'website', 'property');
  setMeta('og:site_name', SITE_NAME, 'property');
  setMeta('og:title', state.title, 'property');
  if (state.description) setMeta('og:description', state.description, 'property');
  if (state.canonical) setMeta('og:url', state.canonical, 'property');
  setMeta('og:image', state.ogImage ?? DEFAULT_OG_IMAGE, 'property');

  setMeta('twitter:card', 'summary_large_image');
  setMeta('twitter:title', state.title);
  if (state.description) setMeta('twitter:description', state.description);
  setMeta('twitter:image', state.ogImage ?? DEFAULT_OG_IMAGE);

  setJsonLd(state.jsonLd ?? []);
}

export function applyRouteHead(route: RouteDef): void {
  applyHead({
    title: route.title,
    description: route.description,
    canonical: route.canonical,
    ogImage: route.ogImage,
    jsonLd: buildJsonLd(route),
  });
}

export function applyNotFoundHead(): void {
  applyHead({
    title: `Page not found | ${SITE_NAME}`,
    noindex: true,
  });
}

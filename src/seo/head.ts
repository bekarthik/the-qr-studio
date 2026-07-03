import { SITE_NAME, SITE_URL } from './routes';
import type { RouteDef } from './routes';

const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;

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

export interface HeadState {
  title: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  noindex?: boolean;
}

/**
 * The ONE place page <head> is set — every route (and the 404 page) funnels
 * through here. This is the module a future `@sightline/react` swap replaces;
 * everything else keeps calling `applyRouteHead`/`applyNotFoundHead`.
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
}

export function applyRouteHead(route: RouteDef): void {
  applyHead({
    title: route.title,
    description: route.description,
    canonical: route.canonical,
    ogImage: route.ogImage,
  });
}

export function applyNotFoundHead(): void {
  applyHead({
    title: `Page not found | ${SITE_NAME}`,
    noindex: true,
  });
}

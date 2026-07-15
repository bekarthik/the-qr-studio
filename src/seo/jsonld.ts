import type { RouteDef } from './routes';
import { SITE_NAME, SITE_URL } from './routes';

export type JsonLdObject = Record<string, unknown>;

export function organization(): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    email: 'contact@theqr.studio',
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: 'contact@theqr.studio',
    },
  };
}

export function softwareApplication(route: RouteDef): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SITE_NAME,
    url: route.canonical,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Any (runs in any modern browser)',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    description: route.description,
  };
}

/** null when the route has no FAQ content block yet (see src/seo/content.ts) —
 *  the schema activates automatically once GEO content is written per route. */
export function faqPage(route: RouteDef): JsonLdObject | null {
  const faq = route.content.find((b) => b.type === 'faq');
  if (!faq || faq.type !== 'faq' || faq.items.length === 0) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.items.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };
}

/** null when the route has no HowTo content block yet. */
export function howTo(route: RouteDef): JsonLdObject | null {
  const block = route.content.find((b) => b.type === 'howto');
  if (!block || block.type !== 'howto' || block.steps.length === 0) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: block.heading || route.title,
    step: block.steps.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.name,
      text: s.text,
    })),
  };
}

/** null on the home route — a single-crumb trail adds no value there. */
export function breadcrumb(route: RouteDef): JsonLdObject | null {
  if (route.path === '/') return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: route.title.split(' — ')[0], item: route.canonical },
    ],
  };
}

/** Organization is included on every route; the rest follow `route.jsonLd`. */
export function buildJsonLd(route: RouteDef): JsonLdObject[] {
  const blocks: JsonLdObject[] = [organization()];
  for (const kind of route.jsonLd) {
    if (kind === 'softwareApplication') blocks.push(softwareApplication(route));
    else if (kind === 'faqPage') {
      const b = faqPage(route);
      if (b) blocks.push(b);
    } else if (kind === 'howTo') {
      const b = howTo(route);
      if (b) blocks.push(b);
    } else if (kind === 'breadcrumb') {
      const b = breadcrumb(route);
      if (b) blocks.push(b);
    }
  }
  return blocks;
}

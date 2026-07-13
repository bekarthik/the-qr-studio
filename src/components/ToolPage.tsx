import { useEffect } from 'react';
import type { RouteDef } from '../seo/routes';
import { applyRouteHead } from '../seo/head';
import { GeneratorProvider } from '../state/GeneratorContext';
import { Nav } from './Nav';
import { Hero } from './Hero';
import { Footer } from './Footer';
import { Workstation } from './Workstation';
import { Features } from './Features';
import { ContentBlocks } from './ContentBlocks';

/**
 * The same interactive tool rendered at every route, initialised to that
 * route's preset source type. The full generator lives in <Workstation> — a
 * three-pane studio that embeds here and expands to a full-window overlay.
 * Only the initial source and the surrounding static SEO content differ per
 * route.
 */
export function ToolPage({ route }: { route: RouteDef }) {
  // head.ts owns every <head> write for this route — title, meta, canonical,
  // OG/Twitter and JSON-LD — in one call. This is the single seam Sightline's
  // <SeoProvider> will replace.
  useEffect(() => applyRouteHead(route), [route]);

  return (
    <GeneratorProvider preset={route.preset}>
      <Nav />
      <Hero />
      <Workstation />
      <ContentBlocks blocks={route.content} />
      <Features />
      <Footer />
    </GeneratorProvider>
  );
}

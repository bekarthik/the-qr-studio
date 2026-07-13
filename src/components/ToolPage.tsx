import { useEffect } from 'react';
import type { RouteDef } from '../seo/routes';
import { applyRouteHead } from '../seo/head';
import { GeneratorProvider } from '../state/GeneratorContext';
import { Nav } from './Nav';
import { Hero } from './Hero';
import { Footer } from './Footer';
import { Workstation } from './Workstation';
import { WholePoint } from './WholePoint';
import { TypeCards } from './TypeCards';
import { Features } from './Features';
import { CtaBanner } from './CtaBanner';
import { ContentBlocks } from './ContentBlocks';

/**
 * The landing page rendered at every route, initialised to that route's preset
 * source type. Structure follows the "previewinter" design: hero → studio band
 * (the functional <Workstation>) → survive-the-print → source types → features
 * → route GEO/FAQ → closing CTA. Only the initial source and the per-route
 * ContentBlocks differ between routes.
 */
export function ToolPage({ route }: { route: RouteDef }) {
  // head.ts owns every <head> write for this route — title, meta, canonical,
  // OG/Twitter and JSON-LD — in one call. This is the single seam Sightline's
  // <SeoProvider> will replace.
  useEffect(() => applyRouteHead(route), [route]);

  return (
    <GeneratorProvider preset={route.preset}>
      <div className="warm-glow" aria-hidden="true" />
      <Nav />
      <main id="top">
        <Hero />

        <section id="studio" className="band">
          <div className="wrap">
            <span className="kicker">The studio</span>
            <h2>Make your code. Verify it. Keep it.</h2>
            <p className="lead">
              The whole studio, right on the page — hit <b>Open studio</b> to expand it to the full
              browser window.
            </p>
            <Workstation />
          </div>
        </section>

        <WholePoint />
        <TypeCards />
        <Features />

        {route.content.length > 0 && (
          <section id="faq" className="band">
            <div className="wrap">
              <span className="kicker">Good to know</span>
              <h2>Questions, answered.</h2>
              <ContentBlocks blocks={route.content} />
            </div>
          </section>
        )}

        <CtaBanner />
      </main>
      <Footer />
    </GeneratorProvider>
  );
}

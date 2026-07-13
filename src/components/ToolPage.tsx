import { useEffect, useRef } from 'react';
import { ROUTES, type RouteDef } from '../seo/routes';
import { applyRouteHead } from '../seo/head';
import { GeneratorProvider, useGen } from '../state/GeneratorContext';
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

        <GeoSection route={route} />

        <CtaBanner />
      </main>
      <Footer />
    </GeneratorProvider>
  );
}

/**
 * "Questions, answered." — the route's GEO content, following the studio.
 *
 * The first render always shows THIS route's own blocks, so the prerendered
 * HTML (what crawlers read) stays in lockstep with the route's JSON-LD. Once
 * the user switches the source type in the workstation, the section swaps to
 * the content of the route dedicated to that type (/upi, /vcard, …) so the
 * copy always matches what they're building; types without a dedicated page
 * fall back to this route's blocks.
 */
function GeoSection({ route }: { route: RouteDef }) {
  const { cfg } = useGen();
  const initialType = useRef(cfg.type);
  const switched = cfg.type !== initialType.current;
  const matched = switched ? ROUTES.find((r) => r.pageType === 'tool' && r.preset === cfg.type) : undefined;
  const blocks = matched?.content ?? route.content;

  if (blocks.length === 0) return null;
  return (
    <section id="faq" className="band">
      <div className="wrap">
        <span className="kicker">Good to know</span>
        <h2>Questions, answered.</h2>
        <ContentBlocks blocks={blocks} />
      </div>
    </section>
  );
}

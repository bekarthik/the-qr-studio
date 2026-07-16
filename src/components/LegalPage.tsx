import { useEffect } from 'react';
import type { RouteDef } from '../seo/routes';
import { applyRouteHead } from '../seo/head';
import { LEGAL } from '../content/legal';
import { Nav } from './Nav';
import { Footer } from './Footer';

/**
 * /terms and /privacy — plain legal prose pages. Content comes from
 * src/content/legal.ts, keyed by the route's path; the route registry supplies
 * the title/description/canonical so head, sitemap and prerender pick these up
 * like any other route.
 */
export function LegalPage({ route }: { route: RouteDef }) {
  useEffect(() => applyRouteHead(route), [route]);

  const doc = LEGAL[route.path];
  if (!doc) return null;

  return (
    <>
      <Nav />
      <main id="top">
        <section className="band" style={{ borderTop: 0 }}>
          <div className="wrap legal">
            <span className="kicker">Legal</span>
            <h2>{doc.title}</h2>
            <p className="legal__updated">Last updated: {doc.updated}</p>

            {doc.intro.map((p, i) => (
              <p className="legal__intro" key={i}>
                {p}
              </p>
            ))}

            {doc.sections.map((section, i) => (
              <section className="legal__section" key={i}>
                <h3>{section.heading}</h3>
                {section.blocks.map((block, j) =>
                  'ul' in block ? (
                    <ul key={j}>
                      {block.ul.map((li, k) => (
                        <li key={k}>{li}</li>
                      ))}
                    </ul>
                  ) : (
                    <p key={j}>{block.p}</p>
                  ),
                )}
              </section>
            ))}

            <p className="legal__foot">
              Questions? Email <a href="mailto:contact@theqr.studio">contact@theqr.studio</a>.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

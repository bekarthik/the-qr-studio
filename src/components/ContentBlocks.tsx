import type { ContentBlock } from '../seo/content';

/**
 * Renders a route's structured `ContentBlock[]` — the ONLY place per-route
 * marketing/GEO copy becomes markup. A future `@sightline/react` `<Slot>`
 * swap replaces just this component; every route keeps passing the same
 * `ContentBlock[]` data.
 */
export function ContentBlocks({ blocks }: { blocks: ContentBlock[] }) {
  if (blocks.length === 0) return null;

  return (
    <section className="geo">
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'intro':
            return (
              <div className="geo__intro" key={i}>
                {block.heading && <h2>{block.heading}</h2>}
                <p>{block.text}</p>
              </div>
            );

          case 'section':
            return (
              <div className="geo-section" key={i}>
                <h2>{block.heading}</h2>
                <p>{block.text}</p>
              </div>
            );

          case 'howto':
            return (
              <div className="geo-howto" key={i}>
                <h2>{block.heading}</h2>
                <ol>
                  {block.steps.map((step, j) => (
                    <li key={j}>
                      <strong>{step.name}</strong> — {step.text}
                    </li>
                  ))}
                </ol>
              </div>
            );

          case 'faq':
            return (
              <div className="geo-faq" key={i}>
                <h2>{block.heading ?? 'Frequently asked questions'}</h2>
                {block.items.map((item, j) => (
                  <div className="geo-faq__item" key={j}>
                    <h3>{item.q}</h3>
                    <p>{item.a}</p>
                  </div>
                ))}
              </div>
            );

          case 'stat':
            return (
              <p className="geo-stat" key={i}>
                {block.text}
                {block.source && <cite> — {block.source}</cite>}
              </p>
            );

          default:
            return null;
        }
      })}
    </section>
  );
}

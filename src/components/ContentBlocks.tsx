import type { ContentBlock } from '../seo/content';

/**
 * Renders a route's structured `ContentBlock[]` — the ONLY place per-route
 * marketing/GEO copy becomes markup. A future `@sightline/react` `<Slot>`
 * swap replaces just this component; every route keeps passing the same
 * `ContentBlock[]` data.
 *
 * Layout notes: consecutive `section` blocks are grouped into a two-up card
 * grid (same surface as the Features cards), the HowTo renders as the tool
 * panel's numbered-chip steps, and FAQs sit in a single card with hairline
 * separators — so the section reads as part of the studio, not appended
 * SEO text.
 */

type Rendered =
  | { kind: 'sections'; blocks: Extract<ContentBlock, { type: 'section' }>[] }
  | { kind: 'single'; block: ContentBlock };

function group(blocks: ContentBlock[]): Rendered[] {
  const out: Rendered[] = [];
  for (const block of blocks) {
    const last = out[out.length - 1];
    if (block.type === 'section') {
      if (last?.kind === 'sections') last.blocks.push(block);
      else out.push({ kind: 'sections', blocks: [block] });
    } else {
      out.push({ kind: 'single', block });
    }
  }
  return out;
}

export function ContentBlocks({ blocks }: { blocks: ContentBlock[] }) {
  if (blocks.length === 0) return null;

  return (
    <section className="geo">
      {group(blocks).map((g, i) => {
        if (g.kind === 'sections') {
          return (
            <div className="geo__grid" key={i}>
              {g.blocks.map((s, j) => (
                <div className="geo-card" key={j}>
                  <h2>{s.heading}</h2>
                  <p>{s.text}</p>
                </div>
              ))}
            </div>
          );
        }

        const block = g.block;
        switch (block.type) {
          case 'intro':
            return (
              <div className="geo__intro" key={i}>
                {block.heading && <h2>{block.heading}</h2>}
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
                      <strong>{step.name}</strong>
                      {step.text}
                    </li>
                  ))}
                </ol>
              </div>
            );

          case 'faq':
            return (
              <div className="geo-faq" key={i}>
                {block.heading && <h2>{block.heading}</h2>}
                <div className="geo-faq__list">
                  {block.items.map((item, j) => (
                    <div className="geo-faq__item" key={j}>
                      <h3>{item.q}</h3>
                      <p>{item.a}</p>
                    </div>
                  ))}
                </div>
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

/**
 * Structured marketing content for a route. Rendered by
 * `src/components/ContentBlocks.tsx` — never write inline JSX/raw HTML for a
 * page's SEO/GEO copy. Keeping content as data here (rather than markup) is
 * what makes a future `@sightline/react` `<Slot>` swap mechanical: the slot
 * component reads the same shape and only the render step changes.
 */

export interface FaqItem {
  q: string;
  a: string;
}

export interface HowToStep {
  name: string;
  text: string;
}

export type ContentBlock =
  | { type: 'intro'; heading?: string; text: string }
  | { type: 'section'; heading: string; text: string }
  | { type: 'howto'; heading: string; steps: HowToStep[] }
  | { type: 'faq'; heading?: string; items: FaqItem[] }
  | { type: 'stat'; text: string; source?: string };

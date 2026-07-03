import { useEffect } from 'react';
import type { JsonLdObject } from '../seo/jsonld';

/**
 * Injects one `<script type="application/ld+json">` tag per object into
 * `<head>`, replacing whatever this component injected last time. The
 * build-time prerenderer snapshots the full document, so these end up in the
 * static HTML crawlers see.
 */
export function JsonLd({ data }: { data: JsonLdObject[] }) {
  useEffect(() => {
    const tags = data.map((obj) => {
      const el = document.createElement('script');
      el.type = 'application/ld+json';
      el.textContent = JSON.stringify(obj);
      document.head.appendChild(el);
      return el;
    });
    return () => {
      for (const el of tags) el.remove();
    };
  }, [data]);

  return null;
}

// Post-build: generate dist/sitemap.xml and dist/llms.txt from the ONE route
// registry (src/seo/routes.ts), so they can never drift from the actual
// routes. Run after `vite build` (see package.json "build" script). Requires
// Node's TS type-stripping (--experimental-strip-types) since routes.ts is
// plain TypeScript with only erasable syntax (types/interfaces).
import { writeFileSync } from 'node:fs';
import { ROUTES, SITE_URL } from '../src/seo/routes.ts';

function sitemapXml() {
  const urls = ROUTES.map(
    (r) => `  <url>\n    <loc>${r.canonical}</loc>\n    <priority>${r.path === '/' ? '1.0' : '0.8'}</priority>\n  </url>`,
  ).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

function llmsTxt() {
  const links = ROUTES.map((r) => {
    const label = r.title.split(' — ')[0].split(' | ')[0];
    return `- [${label}](${r.canonical}): ${r.description}`;
  }).join('\n');
  return `# QR Studio\n\n> Free, in-browser, privacy-first QR code generator. Style QR codes with your brand colour or an image, verify they scan before you download, and export as PNG or SVG. Nothing is ever uploaded — everything runs client-side in the browser.\n\n## Tools\n\n${links}\n`;
}

writeFileSync(new URL('../dist/sitemap.xml', import.meta.url), sitemapXml());
writeFileSync(new URL('../dist/llms.txt', import.meta.url), llmsTxt());
console.log(`wrote dist/sitemap.xml + dist/llms.txt (${ROUTES.length} routes, ${SITE_URL})`);

// Post-build: crawl every ROUTES[i].path with a real (headless) Chromium and
// snapshot the fully-rendered HTML into dist/<path>/index.html. This is what
// lets non-JS crawlers (GPTBot, ClaudeBot, and Google's first pass) see the
// title/meta/JSON-LD/FAQ content that would otherwise only exist after React
// runs. It is a PURE post-build step: delete this file (and its npm script)
// to remove prerendering entirely — nothing else depends on it.
//
// Uses the environment's pre-installed Chromium (PLAYWRIGHT_BROWSERS_PATH) —
// never runs `playwright install`. Netlify's build image has no Chromium, so
// this script detects that and exits 0 (no-op) rather than failing the
// build; dist/ then just keeps the plain client-rendered SPA shell for every
// route, same as before this script existed.
import { createServer } from 'node:http';
import { existsSync, readdirSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join, dirname } from 'node:path';
import { chromium } from 'playwright-core';
import { ROUTES } from '../src/seo/routes.ts';

const DIST = new URL('../dist/', import.meta.url).pathname;

function findChromium() {
  const envPath = process.env.PLAYWRIGHT_CHROMIUM_PATH;
  if (envPath && existsSync(envPath)) return envPath;
  const browsersRoot = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  if (!existsSync(browsersRoot)) return null;
  const dirs = readdirSync(browsersRoot).filter((d) => d.startsWith('chromium-') && !d.includes('headless_shell'));
  for (const d of dirs) {
    const exe = join(browsersRoot, d, 'chrome-linux', 'chrome');
    if (existsSync(exe)) return exe;
  }
  return null;
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

/**
 * Serves the crawl from a PRISTINE, in-memory copy of the just-built shell —
 * never from dist/index.html on disk. Route snapshots get written to disk as
 * the crawl proceeds (dist/upi/index.html etc.), and if the server fell back
 * to re-reading disk for navigations, a later route would boot from an
 * earlier route's already-mutated shell: the stale <head> tags that shell's
 * client-side render left behind (JSON-LD, title, canonical…) would still be
 * sitting in the served HTML, and the new route's render would layer its own
 * tags on top instead of replacing them — duplicated, wrong JSON-LD in the
 * output. Every navigation must start from the same untouched shell.
 */
function makeServeDist(pristineShell) {
  return async function serveDist(req, res) {
    const urlPath = decodeURIComponent(req.url.split('?')[0]);
    const isAsset = extname(urlPath) !== '';
    if (isAsset) {
      try {
        const body = await readFile(join(DIST, urlPath));
        res.writeHead(200, { 'Content-Type': MIME[extname(urlPath)] || 'application/octet-stream' });
        res.end(body);
        return;
      } catch {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
    }
    // Any extension-less path (a route, or an unknown path) — the SPA shell,
    // exactly as vite build produced it. Mirrors the Netlify `/* ->
    // /index.html 200` fallback, but immune to this script's own writes.
    res.writeHead(200, { 'Content-Type': MIME['.html'] });
    res.end(pristineShell);
  };
}

async function main() {
  const exe = findChromium();
  if (!exe) {
    console.warn(
      '[prerender] No pre-installed Chromium found (checked $PLAYWRIGHT_CHROMIUM_PATH and ' +
        '$PLAYWRIGHT_BROWSERS_PATH/chromium-*). Skipping — dist/ keeps the plain client-rendered ' +
        'SPA shell for every route. This is a no-op, not a failure.',
    );
    return;
  }
  if (!existsSync(join(DIST, 'index.html'))) {
    console.warn('[prerender] dist/index.html not found — run `vite build` first. Skipping.');
    return;
  }

  const pristineShell = await readFile(join(DIST, 'index.html'), 'utf8');
  if (pristineShell.includes('application/ld+json')) {
    console.error(
      '[prerender] dist/index.html already contains prerendered output (from a previous run of this ' +
        'script without a fresh `vite build` in between). Re-crawling it would layer new JSON-LD/head ' +
        'tags on top of the stale ones instead of replacing them. Run `npm run build` (which always ' +
        'empties dist/ first) instead of `npm run prerender` on its own.',
    );
    process.exitCode = 1;
    return;
  }

  const server = createServer(makeServeDist(pristineShell));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();

  const browser = await chromium.launch({ executablePath: exe, headless: true });
  const page = await browser.newPage();
  // Snapshot needs the DOM, not the webfonts — abort those for speed/determinism.
  await page.route('**/fonts.googleapis.com/**', (route) => route.abort());
  await page.route('**/fonts.gstatic.com/**', (route) => route.abort());

  let written = 0;
  for (const route of ROUTES) {
    const url = `http://127.0.0.1:${port}${route.path}`;
    await page.goto(url, { waitUntil: 'load' });
    await page
      .waitForFunction((title) => document.title === title, route.title, { timeout: 8000 })
      .catch(() => console.warn(`[prerender] ${route.path}: head never matched expected title, snapshotting anyway`));

    const html = await page.content();
    const outPath =
      route.path === '/' ? join(DIST, 'index.html') : join(DIST, route.path.replace(/^\//, ''), 'index.html');
    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, html);
    written++;
    console.log(`[prerender] ${route.path} -> ${outPath.replace(DIST, 'dist/')}`);
  }

  await browser.close();
  await new Promise((resolve) => server.close(resolve));
  console.log(`[prerender] done — ${written}/${ROUTES.length} routes snapshotted`);
}

await main();

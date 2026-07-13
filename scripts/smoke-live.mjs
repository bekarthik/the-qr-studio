// Post-deploy smoke test: fetch the LIVE site as GPTBot and Googlebot for
// every route in the registry and assert the deploy is actually bot-visible —
// HTTP 200, the route's expected <title>, and at least one JSON-LD block in
// the RAW HTML (i.e. present without executing any JavaScript, which is all an
// AI crawler ever sees). Also checks robots.txt / sitemap.xml / llms.txt. Any
// failure exits non-zero so the deploy workflow fails.
//
// Base URL: $SMOKE_BASE_URL (defaults to SITE_URL from the registry). Reads the
// same src/seo/routes.ts the router/prerender use, so it can never drift from
// the real route set. Run via `npm run smoke:live`.
//
// Uses the global `fetch`; works anywhere with normal outbound networking
// (GitHub Actions runners included). It will NOT run inside a sandbox that
// injects a global proxy dispatcher into Node — that's a local-tooling
// limitation, not a script issue.
import { ROUTES, SITE_URL } from '../src/seo/routes.ts';

const BASE = (process.env.SMOKE_BASE_URL || SITE_URL).replace(/\/$/, '');
const RETRIES = Number(process.env.SMOKE_RETRIES ?? 4); // total attempts per request
const RETRY_DELAY_MS = Number(process.env.SMOKE_RETRY_DELAY_MS ?? 8000);

const UAS = {
  GPTBot: 'Mozilla/5.0 (compatible; GPTBot/1.0; +https://openai.com/gptbot)',
  Googlebot: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Fetch with a bot UA, retrying transient failures / not-yet-propagated 404s
 *  (a fresh --prod deploy can take a few seconds to reach every edge). */
async function fetchAsBot(url, ua) {
  let last;
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': ua }, redirect: 'follow' });
      const body = await res.text();
      // 5xx / 404 right after deploy is usually propagation; retry. 200 wins.
      if (res.status === 200 || (res.status !== 404 && res.status < 500)) return { status: res.status, body };
      last = { status: res.status, body };
    } catch (err) {
      last = { status: 0, body: '', error: String(err) };
    }
    if (attempt < RETRIES) await sleep(RETRY_DELAY_MS);
  }
  return last;
}

/** Decode the minimal HTML entities React's serializer emits in <title>. */
function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(?:39|x27);/g, "'");
}

function extractTitle(html) {
  const m = html.match(/<title>([\s\S]*?)<\/title>/i);
  return m ? decodeEntities(m[1]).trim() : null;
}

function countJsonLd(html) {
  return (html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>/gi) || []).length;
}

const failures = [];
function check(ok, label, detail) {
  console.log(`${ok ? '✅' : '❌'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures.push(label);
}

console.log(`Smoke-testing ${BASE} (${ROUTES.length} routes) as GPTBot + Googlebot\n`);

for (const route of ROUTES) {
  const url = BASE + route.path;
  for (const [botName, ua] of Object.entries(UAS)) {
    const res = await fetchAsBot(url, ua);
    const status200 = res?.status === 200;
    if (!status200) {
      check(false, `${botName} ${route.path}`, `HTTP ${res?.status ?? 'ERR'}${res?.error ? ` (${res.error})` : ''}`);
      continue;
    }
    const title = extractTitle(res.body);
    const titleOk = title === route.title;
    const ldCount = countJsonLd(res.body);
    const ldOk = ldCount >= 1;
    check(
      titleOk && ldOk,
      `${botName} ${route.path}`,
      `HTTP 200, title ${titleOk ? 'ok' : `MISMATCH (got "${title}")`}, ld+json=${ldCount}`,
    );
  }
}

console.log('');
for (const file of ['/robots.txt', '/sitemap.xml', '/llms.txt']) {
  const res = await fetchAsBot(BASE + file, UAS.Googlebot);
  check(res?.status === 200, `static ${file}`, `HTTP ${res?.status ?? 'ERR'}`);
}

console.log('');
if (failures.length) {
  console.error(`SMOKE FAILED — ${failures.length} check(s) failed: ${failures.join(', ')}`);
  process.exit(1);
}
console.log(`SMOKE PASSED — all ${ROUTES.length} routes bot-visible, static files served.`);

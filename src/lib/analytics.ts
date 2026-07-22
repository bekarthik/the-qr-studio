/**
 * Web analytics — privacy-first and cookieless.
 *
 * TODAY — Cloudflare Web Analytics (a RUM beacon). Free, cookieless, no PII;
 * it reports pageviews, unique visitors, locations, referrers and devices, and
 * auto-tracks client-side route changes (History API), so the per-type pages
 * (/upi, /wifi, /vcard, /url, /whatsapp) already show which types draw traffic.
 * Cloudflare has NO custom events, so the precise "which type did they build /
 * which format did they export" is NOT captured yet.
 *
 * FUTURE — Umami (see docs/runbooks/analytics.md) adds cookieless custom
 * events. The `track()` seam below is the single place that will forward to it;
 * the GTM-critical events are already called at their sites (QR type selected,
 * export), so enabling Umami is a one-file change — not a re-instrumentation.
 *
 * PRIVACY RULE: only ever capture CATEGORY-LEVEL data (which type, which
 * format). NEVER pass a QR payload — the URL / UPI VPA / Wi-Fi password /
 * contact details a user types must never leave their device.
 */

const CF_BEACON_TOKEN = import.meta.env.VITE_CF_BEACON_TOKEN as string | undefined;

/**
 * Inject the Cloudflare Web Analytics beacon — for real visitors only. Skipped
 * in dev, when no token is configured, and during the prerender crawl
 * (Playwright sets navigator.webdriver), so the beacon is never baked into the
 * prerendered HTML and dev/CI never pollute the stats.
 */
export function initAnalytics(): void {
  if (!import.meta.env.PROD) return;
  if (!CF_BEACON_TOKEN) return;
  if (typeof navigator !== 'undefined' && navigator.webdriver) return;
  if (document.querySelector('script[data-cf-beacon]')) return;

  const s = document.createElement('script');
  s.defer = true;
  s.src = 'https://static.cloudflareinsights.com/beacon.min.js';
  s.setAttribute('data-cf-beacon', JSON.stringify({ token: CF_BEACON_TOKEN }));
  document.head.appendChild(s);
}

/** Category-level values only — no free-form / payload data. */
export type EventProps = Record<string, string | number | boolean>;

/**
 * Custom-event seam. A no-op today (Cloudflare has no custom events); when
 * Umami is wired this forwards to it. Call sites already exist (see the runbook)
 * so GTM's "what kind of QR" question is answered the moment Umami is enabled.
 */
export function track(event: string, props?: EventProps): void {
  if (!import.meta.env.PROD) return;
  if (typeof navigator !== 'undefined' && navigator.webdriver) return;
  // Future (Umami): window.umami?.track(event, props);
  void event;
  void props;
}

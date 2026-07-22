/**
 * Web analytics — privacy-first and cookieless (Umami Cloud).
 *
 * Umami reports pageviews, unique visitors, locations, referrers and devices,
 * AND custom events — and it auto-tracks client-side route changes, so the
 * per-type pages (/upi, /wifi, /vcard, /url, /whatsapp) are counted on SPA
 * navigation too. The custom events are what GTM cares about: which QR type
 * people build and which format they export (see `track()` call sites).
 *
 * PRIVACY RULE: only ever capture CATEGORY-LEVEL data (which type, which
 * format). NEVER pass a QR payload — the URL / UPI VPA / Wi-Fi password /
 * contact details a user types must never leave their device.
 *
 * Config is env-gated (blank = analytics off), matching the support/Supabase
 * pattern. The website id is public (it ships in the page), so set it as a repo
 * *variable*, not a secret. See docs/runbooks/analytics.md.
 */

const UMAMI_WEBSITE_ID = import.meta.env.VITE_UMAMI_WEBSITE_ID as string | undefined;
const UMAMI_SRC =
  (import.meta.env.VITE_UMAMI_SRC as string | undefined) || 'https://cloud.umami.is/script.js';

declare global {
  interface Window {
    umami?: { track: (event: string, data?: Record<string, unknown>) => void };
  }
}

/**
 * Inject the Umami tracker — for real visitors only. Skipped in dev, when no
 * website id is configured, and during the prerender crawl (Playwright sets
 * navigator.webdriver), so the tag is never baked into the prerendered HTML and
 * dev/CI never pollute the stats.
 */
export function initAnalytics(): void {
  if (!import.meta.env.PROD) return;
  if (!UMAMI_WEBSITE_ID) return;
  if (typeof navigator !== 'undefined' && navigator.webdriver) return;
  if (document.querySelector('script[data-website-id]')) return;

  const s = document.createElement('script');
  s.defer = true;
  s.src = UMAMI_SRC;
  s.setAttribute('data-website-id', UMAMI_WEBSITE_ID);
  document.head.appendChild(s);
}

/** Category-level values only — no free-form / payload data. */
export type EventProps = Record<string, string | number | boolean>;

/**
 * Record a custom event. No-ops until the Umami tracker has loaded (real
 * visitors in prod), so dev/prerender calls are silently ignored.
 */
export function track(event: string, props?: EventProps): void {
  if (typeof window === 'undefined') return;
  window.umami?.track(event, props);
}

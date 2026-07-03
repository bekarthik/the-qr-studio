import type { SourceType } from '../content/payloads';
import type { ContentBlock } from './content';

export const SITE_URL = 'https://theqr.studio';
export const SITE_NAME = 'QR Studio';

export type JsonLdKind = 'softwareApplication' | 'faqPage' | 'howTo' | 'breadcrumb';

/**
 * One entry per public route. This is the single source of truth consumed by
 * the router, `src/seo/head.ts`, `src/seo/jsonld.ts`, the sitemap generator,
 * and `scripts/prerender.mjs` — add a route here and every surface picks it
 * up automatically.
 */
export interface RouteDef {
  /** History-API path, e.g. '/upi'. No '-qr-code' suffix — the domain already says QR. */
  path: string;
  /** Presets the tool's source type on load; '/' leaves the default (url). */
  preset?: SourceType;
  /** <title> — kept under ~60 chars where possible. */
  title: string;
  /** <meta name="description"> — ~120-160 chars. */
  description: string;
  /** Absolute canonical URL. */
  canonical: string;
  /** Absolute URL to a 1200x630 social card; falls back to the site default when unset. */
  ogImage?: string;
  /** Answer-first intro, question H2s, FAQs — see src/seo/content.ts. */
  content: ContentBlock[];
  /** Which JSON-LD blocks to emit for this route (Organization is emitted site-wide). */
  jsonLd: JsonLdKind[];
}

export const ROUTES: RouteDef[] = [
  {
    path: '/',
    title: 'QR Studio — Free QR Code Generator, Styled & Verified Scannable',
    description:
      'Create QR codes for links, UPI, Wi-Fi, vCards and more — style them with your brand colour or image, verify they scan, and download PNG/SVG. Free, private, runs entirely in your browser.',
    canonical: `${SITE_URL}/`,
    content: [],
    jsonLd: ['softwareApplication', 'faqPage'],
  },
  {
    path: '/upi',
    preset: 'upi',
    title: 'UPI QR Code Generator — Free & Verified Scannable | QR Studio',
    description:
      'Generate a UPI payment QR code for free. Enter your VPA, payee name and optional amount, style it, verify it scans, and download as PNG or SVG. Nothing is uploaded.',
    canonical: `${SITE_URL}/upi`,
    content: [],
    jsonLd: ['softwareApplication', 'faqPage', 'howTo', 'breadcrumb'],
  },
  {
    path: '/wifi',
    preset: 'wifi',
    title: 'Wi-Fi QR Code Generator — Free & Verified Scannable | QR Studio',
    description:
      'Create a Wi-Fi QR code that lets guests join your network with a scan — no typing passwords. Style it, verify it scans, and download PNG or SVG. Free and private.',
    canonical: `${SITE_URL}/wifi`,
    content: [],
    jsonLd: ['softwareApplication', 'faqPage', 'howTo', 'breadcrumb'],
  },
  {
    path: '/vcard',
    preset: 'vcard',
    title: 'vCard QR Code Generator — Digital Business Card | QR Studio',
    description:
      'Turn your contact details into a scannable vCard QR code, a free digital business card. Style it to match your brand, verify it scans, and export PNG, SVG or a print-ready card.',
    canonical: `${SITE_URL}/vcard`,
    content: [],
    jsonLd: ['softwareApplication', 'faqPage', 'howTo', 'breadcrumb'],
  },
  {
    path: '/url',
    preset: 'url',
    title: 'URL QR Code Generator — Free & Verified Scannable | QR Studio',
    description:
      'Turn any link into a styled, scannable QR code in seconds. Brand colours or your own image, verified scannable before download — free and private, nothing uploaded.',
    canonical: `${SITE_URL}/url`,
    content: [],
    jsonLd: ['softwareApplication', 'faqPage', 'howTo', 'breadcrumb'],
  },
  {
    path: '/whatsapp',
    preset: 'whatsapp',
    title: 'WhatsApp QR Code Generator — Free & Verified Scannable | QR Studio',
    description:
      'Create a QR code that opens a WhatsApp chat with your number pre-filled, optionally with a starter message. Style it, verify it scans, download free.',
    canonical: `${SITE_URL}/whatsapp`,
    content: [],
    jsonLd: ['softwareApplication', 'faqPage', 'howTo', 'breadcrumb'],
  },
];

export function findRoute(pathname: string): RouteDef | undefined {
  return ROUTES.find((r) => r.path === pathname);
}

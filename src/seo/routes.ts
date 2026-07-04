import type { SourceType } from '../content/payloads';
import type { ContentBlock } from './content';

export const SITE_URL = 'https://theqr.studio';
export const SITE_NAME = 'QR Studio';

export type JsonLdKind = 'softwareApplication' | 'faqPage' | 'howTo' | 'breadcrumb';

/**
 * Semantic page category — what a Sightline `<Slot>`/rule set keys off, distinct
 * from `jsonLd` (the concrete schema types emitted). 'home' is the root landing
 * page; 'tool' is a per-use-case generator page.
 */
export type PageType = 'home' | 'tool';

/**
 * One entry per public route. This is the single source of truth consumed by
 * the router, `src/seo/head.ts`, `src/seo/jsonld.ts`, the sitemap generator,
 * and `scripts/prerender.mjs` — add a route here and every surface picks it
 * up automatically.
 *
 * All routes today are STATIC, param-less paths (no dynamic segments). If P0.7
 * introduces parameterised routes, extend this with a `params` field and teach
 * the router/prerender/sitemap to expand them; nothing here assumes params.
 */
export interface RouteDef {
  /** History-API path, e.g. '/upi'. No '-qr-code' suffix — the domain already says QR. */
  path: string;
  /** Semantic category for SDK rules/slots (not the concrete schema set). */
  pageType: PageType;
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
    pageType: 'home',
    title: 'QR Studio — Free QR Code Generator, Styled & Verified Scannable',
    description:
      'Create QR codes for links, UPI, Wi-Fi, vCards and more — style them with your brand colour or image, verify they scan, and download PNG/SVG. Free, private, runs entirely in your browser.',
    canonical: `${SITE_URL}/`,
    content: [
      {
        type: 'intro',
        text: 'QR Studio generates QR codes for links, UPI payments, Wi-Fi networks, contact cards and more — entirely in your browser. Style each code with a solid brand colour or your own image, verify it actually scans before downloading, and export as PNG or SVG. No account, no upload, no tracking: the code is built and decoded on your device from start to finish.',
      },
      {
        type: 'section',
        heading: 'What can I make a QR code for?',
        text: 'Links, UPI payments, Wi-Fi logins, vCard contact cards and WhatsApp chats each have a dedicated preset with the right fields — see the UPI, Wi-Fi, vCard, URL and WhatsApp generators. QR Studio also supports email, SMS, phone, PayPal, Venmo, Cash App, Bitcoin, SEPA transfers, app-store links and plain text from the full source picker.',
      },
      {
        type: 'section',
        heading: 'Why verify a QR code before printing it?',
        text: 'A QR code can look fine and still fail to scan once you add a logo, a colour, or a halftone image — dense payloads and low-contrast styling are the usual culprits. QR Studio decodes every code it builds with the open-source jsQR library, right in your browser, so you catch a scanning problem before it reaches print.',
      },
      {
        type: 'faq',
        items: [
          {
            q: 'Is QR Studio really free?',
            a: 'Yes — every feature, including styled colours, image halftones, logo embedding and the visiting-card composer, is free with no sign-up.',
          },
          {
            q: 'Does QR Studio upload my data anywhere?',
            a: "No. The QR code is generated and decoded entirely in your browser using JavaScript; nothing you type or upload ever leaves your device.",
          },
          {
            q: 'How do I know a QR code will actually scan?',
            a: 'QR Studio decodes the code it just built using the open-source jsQR library at multiple scales, right in your browser, before you download it — a "Studio-grade" toggle raises the bar to a full-resolution decode for print work.',
          },
          {
            q: 'What file formats can I download?',
            a: 'PNG for quick sharing and SVG for print or resizing without quality loss, plus a business-card layout from the visiting-card composer.',
          },
          {
            q: 'Can I use my own image or logo in the QR code?',
            a: "Yes — upload an image to drive a halftone pattern, embed it as a centre logo, or add it as a subtle watermark; QR Studio raises the code's error-correction level automatically to keep it scannable.",
          },
          {
            q: 'Does QR Studio work offline?',
            a: 'Yes, after your first visit — it registers a service worker so the generator keeps working without a network connection.',
          },
        ],
      },
    ],
    jsonLd: ['softwareApplication', 'faqPage'],
  },
  {
    path: '/upi',
    pageType: 'tool',
    preset: 'upi',
    title: 'UPI QR Code Generator — Free & Verified Scannable | QR Studio',
    description:
      'Generate a UPI payment QR code for free. Enter your VPA, payee name and optional amount, style it, verify it scans, and download as PNG or SVG. Nothing is uploaded.',
    canonical: `${SITE_URL}/upi`,
    content: [
      {
        type: 'intro',
        text: "A UPI QR code lets someone pay you instantly by scanning it with any UPI app — Google Pay, PhonePe, Paytm, BHIM and others. QR Studio builds a standard upi://pay deep link from your UPI ID (VPA), so the payer's app opens pre-filled with your name and, optionally, a fixed amount — no typing, no manual entry errors.",
      },
      {
        type: 'section',
        heading: 'What is a UPI QR code?',
        text: 'It encodes a upi://pay link with your VPA (pa), payee name (pn), currency and, if you set one, a fixed amount (am) and note (tn) — the same open BHIM-UPI deep-link format every UPI app reads, not a proprietary one.',
      },
      {
        type: 'section',
        heading: 'Do I need a business account to accept UPI payments?',
        text: "No — any UPI ID (VPA) works, personal or merchant. Leaving the amount blank lets the payer enter any amount, which suits tip jars and donations; filling it in fixes an exact price for a single item.",
      },
      {
        type: 'howto',
        heading: 'How to create a UPI QR code',
        steps: [
          { name: 'Choose UPI as your source', text: 'This page already has UPI Pay selected in the source picker.' },
          { name: 'Enter your UPI ID', text: 'Add your VPA (e.g. name@bank), your payee name, and an optional fixed amount or note.' },
          { name: 'Style, verify and download', text: 'Pick a colour or image style, confirm the in-browser scan check passes, then download as PNG or SVG.' },
        ],
      },
      {
        type: 'faq',
        items: [
          {
            q: 'What information does a UPI QR code contain?',
            a: 'Just your UPI ID (VPA), payee name, and — if you choose to set one — a fixed amount and a short note. No bank account or card number is ever encoded.',
          },
          {
            q: 'Can I leave the amount blank?',
            a: 'Yes — leaving it blank lets the payer type in whatever amount they want, which is common for tip jars, donations or variable-price stalls.',
          },
          {
            q: 'Will this work with Google Pay, PhonePe and Paytm?',
            a: "Yes — upi://pay is the standard BHIM-UPI deep link every UPI-enabled app supports, since UPI is a shared national payment rail, not a single app's protocol.",
          },
          {
            q: 'Is my UPI ID uploaded anywhere when I make this QR code?',
            a: 'No — the code is generated entirely in your browser; your VPA and other details never leave your device.',
          },
          {
            q: 'Can I reuse the same UPI QR code for multiple payments?',
            a: 'Yes, unless you set a fixed amount and note tied to one transaction — a blank-amount code can be scanned and paid any number of times.',
          },
          {
            q: 'What error-correction level does QR Studio use for payment codes?',
            a: 'High (level H) by default, which keeps the code scannable even if part of it is covered by a logo, watermark, or minor print damage.',
          },
        ],
      },
    ],
    jsonLd: ['softwareApplication', 'faqPage', 'howTo', 'breadcrumb'],
  },
  {
    path: '/wifi',
    pageType: 'tool',
    preset: 'wifi',
    title: 'Wi-Fi QR Code Generator — Free & Verified Scannable | QR Studio',
    description:
      'Create a Wi-Fi QR code that lets guests join your network with a scan — no typing passwords. Style it, verify it scans, and download PNG or SVG. Free and private.',
    canonical: `${SITE_URL}/wifi`,
    content: [
      {
        type: 'intro',
        text: "A Wi-Fi QR code lets a guest join your network by scanning it with their phone's camera — no typing a long password. QR Studio encodes your network name, password and encryption type into the standard WIFI: URI format that Android and iOS camera apps have understood since 2017.",
      },
      {
        type: 'section',
        heading: 'What is the WIFI: QR format?',
        text: 'It’s plain text — WIFI:T:<encryption>;S:<network name>;P:<password>;H:<hidden>;; — with fields for the encryption type (WPA/WPA2, WEP or none), the SSID, the password, and whether the network is hidden. It’s a widely supported convention, not a proprietary format, and nothing in it is uploaded anywhere.',
      },
      {
        type: 'section',
        heading: 'Does this work for hidden or open networks?',
        text: "Yes to both. Mark the network hidden and QR Studio sets the format's hidden flag; choose \"no password\" as the encryption type and it omits the password field entirely, matching an open network.",
      },
      {
        type: 'howto',
        heading: 'How to create a Wi-Fi QR code',
        steps: [
          { name: 'Choose Wi-Fi as your source', text: 'Select Wi-Fi in the source picker — this page already has it selected.' },
          { name: 'Enter your network details', text: 'Add the network name (SSID), password and encryption type.' },
          { name: 'Style, verify and share', text: 'Style it if you like, confirm it scans, then download it or just show the screen to a guest.' },
        ],
      },
      {
        type: 'faq',
        items: [
          {
            q: "What's actually inside a Wi-Fi QR code?",
            a: 'Your network name (SSID), password, encryption type (WPA/WPA2, WEP or none) and whether the network is hidden — encoded as plain text in the standard WIFI: URI format, nothing else.',
          },
          {
            q: 'Is my Wi-Fi password safe to put into this tool?',
            a: 'The code is built entirely in your browser — your SSID and password are never sent anywhere. Treat the downloaded QR code itself like the password: anyone who scans it can join your network.',
          },
          {
            q: 'Will this work with an iPhone?',
            a: 'Yes — iOS and Android camera apps have recognised WIFI: QR codes natively since iOS 11 and Android 10, so most guests can just point their camera at it.',
          },
          {
            q: 'What if my network has no password?',
            a: 'Choose "no password" as the encryption type and QR Studio omits the password field entirely, matching an open network.',
          },
          {
            q: 'Can I use this for a hidden network?',
            a: 'Yes — mark the network as hidden and QR Studio sets the WIFI: format’s hidden flag so connecting devices know to probe for it by name.',
          },
          {
            q: 'Does the QR code expire if I change my Wi-Fi password?',
            a: 'The code only encodes the password at the moment you generate it, so reprint or regenerate it whenever your password changes.',
          },
        ],
      },
    ],
    jsonLd: ['softwareApplication', 'faqPage', 'howTo', 'breadcrumb'],
  },
  {
    path: '/vcard',
    pageType: 'tool',
    preset: 'vcard',
    title: 'vCard QR Code Generator — Digital Business Card | QR Studio',
    description:
      'Turn your contact details into a scannable vCard QR code, a free digital business card. Style it to match your brand, verify it scans, and export PNG, SVG or a print-ready card.',
    canonical: `${SITE_URL}/vcard`,
    content: [
      {
        type: 'intro',
        text: "A vCard QR code turns your contact details into a free digital business card — scan it and the name, phone, email and company save straight into a phone's contacts app. QR Studio builds a standard vCard 3.0 record and can also lay it out as a printable, styled business card.",
      },
      {
        type: 'section',
        heading: 'What is a vCard QR code?',
        text: 'It encodes a vCard 3.0 record — the same BEGIN:VCARD…END:VCARD format email and contacts apps have exchanged for decades — with whichever fields you fill in: name, organisation, title, phone, email, website and address.',
      },
      {
        type: 'section',
        heading: 'Can I turn this into a printed business card?',
        text: 'Yes — the Card tab designs a full business-card layout around the same QR code, with colour, pattern and single- or two-sided options, so the QR code and the printed card stay in sync.',
      },
      {
        type: 'howto',
        heading: 'How to create a vCard QR code',
        steps: [
          { name: 'Choose vCard as your source', text: 'Select vCard in the source picker — this page already has it selected.' },
          { name: 'Enter your contact details', text: 'Add your name, phone, email, company and any other fields you want included.' },
          { name: 'Style the QR — or design a full card', text: 'Style the QR code, or switch to the Card tab to lay out a printable business card around it.' },
        ],
      },
      {
        type: 'faq',
        items: [
          {
            q: 'What fields can a vCard QR code hold?',
            a: 'Name, organisation, job title, phone number, email, website and address — QR Studio only includes the fields you actually fill in.',
          },
          {
            q: 'What happens when someone scans it?',
            a: 'Their phone recognises the vCard 3.0 format and offers to save it as a new contact — no app or account needed, just the built-in camera or contacts app.',
          },
          {
            q: 'Is this the same as a digital business card app?',
            a: 'It does the same job without an app, a sign-up, or a subscription — the QR code is the entire card.',
          },
          {
            q: 'Can I make a printable card, not just a QR code?',
            a: 'Yes — the Card tab designs a full business-card layout around the same QR code, including single- and two-sided options.',
          },
          {
            q: 'Is my contact information uploaded anywhere?',
            a: 'No — the vCard is assembled entirely in your browser and only exists in the QR code you download.',
          },
          {
            q: 'Will it work on both iPhone and Android?',
            a: "Yes — vCard 3.0 is a decades-old open standard supported by every major phone's contacts app.",
          },
        ],
      },
    ],
    jsonLd: ['softwareApplication', 'faqPage', 'howTo', 'breadcrumb'],
  },
  {
    path: '/url',
    pageType: 'tool',
    preset: 'url',
    title: 'URL QR Code Generator — Free & Verified Scannable | QR Studio',
    description:
      'Turn any link into a styled, scannable QR code in seconds. Brand colours or your own image, verified scannable before download — free and private, nothing uploaded.',
    canonical: `${SITE_URL}/url`,
    content: [
      {
        type: 'intro',
        text: 'A URL QR code is the simplest kind — scan it and a phone opens the exact link you encoded, no app or account required. QR Studio styles the code with your brand colour or an image, verifies it decodes correctly, and lets you download it as PNG or SVG.',
      },
      {
        type: 'section',
        heading: 'What can I link to?',
        text: 'Any web address — a website, an online menu, a form, a social profile, a landing page. Paste a bare domain like example.com and QR Studio adds https:// for you automatically.',
      },
      {
        type: 'section',
        heading: 'Why style a URL QR code instead of a plain black-and-white one?',
        text: "A brand colour, halftone image or logo makes a QR code recognisably yours, and QR Studio's built-in decode check confirms the styling hasn't broken scanning before you download it — the same verification a plain code skips just as easily.",
      },
      {
        type: 'howto',
        heading: 'How to create a URL QR code',
        steps: [
          { name: 'Choose Web link as your source', text: 'This page already has Web link selected in the source picker.' },
          { name: 'Paste or type the URL', text: 'A bare domain like example.com works too — https:// is added automatically.' },
          { name: 'Style, verify and download', text: 'Pick a colour or image style, confirm it scans, then download as PNG or SVG.' },
        ],
      },
      {
        type: 'faq',
        items: [
          {
            q: 'Does the link have to start with https://?',
            a: 'No — paste a bare domain like example.com and QR Studio adds https:// automatically; you can also point to http://, or another URL scheme.',
          },
          {
            q: 'Can I track how many times my QR code was scanned?',
            a: "No — QR Studio doesn't add any tracking or redirect service; the code encodes your URL directly, so nothing is logged when it's scanned.",
          },
          {
            q: 'Will a styled QR code still scan reliably?',
            a: 'Yes — QR Studio decodes every code it builds with the open-source jsQR library before you download it, so a colour, halftone or logo that would break scanning gets flagged immediately.',
          },
          {
            q: 'Can I update the destination after printing the QR code?',
            a: 'Not with a plain URL QR code — it encodes the exact link you entered. If you need an editable destination, point it at a URL you control that you can update later.',
          },
          {
            q: 'What’s the largest amount of text a URL QR code can hold?',
            a: 'A QR code can hold over 2,000 characters at the lowest error-correction level, but shorter links scan faster and more reliably, especially at small print sizes.',
          },
        ],
      },
    ],
    jsonLd: ['softwareApplication', 'faqPage', 'howTo', 'breadcrumb'],
  },
  {
    path: '/whatsapp',
    pageType: 'tool',
    preset: 'whatsapp',
    title: 'WhatsApp QR Code Generator — Free & Verified Scannable | QR Studio',
    description:
      'Create a QR code that opens a WhatsApp chat with your number pre-filled, optionally with a starter message. Style it, verify it scans, download free.',
    canonical: `${SITE_URL}/whatsapp`,
    content: [
      {
        type: 'intro',
        text: 'A WhatsApp QR code opens a chat with your number pre-filled — and, if you want, a starter message already typed in — the moment someone scans it. QR Studio builds the standard wa.me link so it works on any phone with WhatsApp installed, no saved contact required.',
      },
      {
        type: 'section',
        heading: 'What is a wa.me QR code?',
        text: "wa.me is WhatsApp's own click-to-chat domain: a link in the form https://wa.me/<number>?text=<message> that opens a chat with that number, with your message pre-filled in the text box if you set one.",
      },
      {
        type: 'section',
        heading: 'Do I need to save the number as a contact first?',
        text: 'No — wa.me opens the chat directly by number, so neither side needs to save a contact before messaging.',
      },
      {
        type: 'howto',
        heading: 'How to create a WhatsApp QR code',
        steps: [
          { name: 'Choose WhatsApp as your source', text: 'This page already has WhatsApp selected in the source picker.' },
          { name: 'Enter your number and message', text: 'Add your phone number with country code, and an optional pre-filled message.' },
          { name: 'Style, verify and download', text: 'Pick a colour or image style, confirm it scans, then download as PNG or SVG.' },
        ],
      },
      {
        type: 'faq',
        items: [
          {
            q: 'What is a wa.me link?',
            a: 'wa.me is WhatsApp’s own official click-to-chat domain — scanning or tapping a wa.me link opens a chat with the given number on any device with WhatsApp installed.',
          },
          {
            q: 'Do I need to include the country code?',
            a: 'Yes — the number must include the country code (e.g. +91 for India, +1 for the US) with no leading zeros, so WhatsApp can route the chat to the right number.',
          },
          {
            q: 'Can I pre-fill a message?',
            a: 'Yes — anything you enter appears already typed in the chat box when it opens; the person scanning still has to tap send.',
          },
          {
            q: 'Does the other person need my number saved as a contact?',
            a: 'No — wa.me opens the chat directly by number, so neither side needs to save a contact first.',
          },
          {
            q: "Will this work if someone doesn't have WhatsApp installed?",
            a: "Scanning the code will try to open WhatsApp; if it isn't installed, most phones prompt to install it or open wa.me in a browser instead.",
          },
          {
            q: 'Is this different from a regular phone-number QR code?',
            a: 'Yes — a phone-number (tel:) QR code starts a call, while this wa.me code opens a WhatsApp chat with your number and optional message pre-filled.',
          },
        ],
      },
    ],
    jsonLd: ['softwareApplication', 'faqPage', 'howTo', 'breadcrumb'],
  },
];

export function findRoute(pathname: string): RouteDef | undefined {
  return ROUTES.find((r) => r.path === pathname);
}

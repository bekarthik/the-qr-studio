/**
 * Configure how visitors can support / pay you.
 *
 * Everything here is just a public URL — this is a static, client-side app, so
 * NEVER put a Stripe secret key (or any secret) here. For card payments use a
 * Stripe **Payment Link** (a hosted checkout URL you create in the Stripe
 * dashboard) — that's safe to ship in the browser.
 *
 * Set a handle/URL for each method you want to offer. Anything left blank is
 * hidden. You can also override these at build time with VITE_SUPPORT_* env
 * vars (see .env.example) without editing this file.
 */
const env = import.meta.env;

export interface SupportMethod {
  id: string;
  label: string;
  icon: string;
  href: string;
  hint?: string;
}

/** Edit these, or set the matching VITE_SUPPORT_* env vars. Blank = hidden. */
const HANDLES = {
  buyMeACoffee: env.VITE_SUPPORT_BMC ?? '',
  kofi: env.VITE_SUPPORT_KOFI ?? '',
  githubSponsors: env.VITE_SUPPORT_GITHUB ?? '',
  paypal: env.VITE_SUPPORT_PAYPAL ?? '',
  stripePaymentLink: env.VITE_SUPPORT_STRIPE_URL ?? '', // full https://buy.stripe.com/… URL
  upiVpa: env.VITE_SUPPORT_UPI ?? '',
};

export const SUPPORT_HEADLINE = 'Enjoying QR Studio?';
export const SUPPORT_BLURB =
  "It's free and runs entirely in your browser — no ads, no accounts. If it saved you time, you can chip in. Totally optional. 💛";

export const SUPPORT_METHODS: SupportMethod[] = (
  [
    HANDLES.buyMeACoffee && {
      id: 'bmc',
      label: 'Buy me a coffee',
      icon: '☕',
      href: `https://www.buymeacoffee.com/${HANDLES.buyMeACoffee}`,
    },
    HANDLES.stripePaymentLink && {
      id: 'stripe',
      label: 'Pay with card',
      icon: '💳',
      href: HANDLES.stripePaymentLink,
      hint: 'Secure checkout via Stripe',
    },
    HANDLES.kofi && { id: 'kofi', label: 'Ko-fi', icon: '❤️', href: `https://ko-fi.com/${HANDLES.kofi}` },
    HANDLES.githubSponsors && {
      id: 'ghs',
      label: 'GitHub Sponsors',
      icon: '★',
      href: `https://github.com/sponsors/${HANDLES.githubSponsors}`,
    },
    HANDLES.paypal && {
      id: 'paypal',
      label: 'PayPal',
      icon: '🅿️',
      href: `https://paypal.me/${HANDLES.paypal}`,
    },
    HANDLES.upiVpa && {
      id: 'upi',
      label: 'UPI',
      icon: '₹',
      href: `upi://pay?pa=${HANDLES.upiVpa}&cu=INR&tn=QR%20Studio`,
      hint: 'Opens a UPI app on mobile',
    },
  ] as (SupportMethod | '' | false)[]
).filter((m): m is SupportMethod => Boolean(m));

export const SUPPORT_ENABLED = SUPPORT_METHODS.length > 0;

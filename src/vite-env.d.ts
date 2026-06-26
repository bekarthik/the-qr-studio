/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Buy Me a Coffee handle → buymeacoffee.com/<handle> */
  readonly VITE_SUPPORT_BMC?: string;
  /** Ko-fi handle → ko-fi.com/<handle> */
  readonly VITE_SUPPORT_KOFI?: string;
  /** GitHub Sponsors handle → github.com/sponsors/<handle> */
  readonly VITE_SUPPORT_GITHUB?: string;
  /** Full Stripe Payment Link URL (created in the Stripe dashboard) */
  readonly VITE_SUPPORT_STRIPE_URL?: string;
  /** PayPal.me handle → paypal.me/<handle> */
  readonly VITE_SUPPORT_PAYPAL?: string;
  /** UPI VPA (India) → upi://pay?pa=<vpa> */
  readonly VITE_SUPPORT_UPI?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

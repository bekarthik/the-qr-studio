import type { SourceType } from '../content/payloads';

export interface Field {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'tel' | 'email' | 'url' | 'number' | 'select' | 'checkbox';
  placeholder?: string;
  options?: { value: string; label: string }[];
  value?: string;
}

export interface SourceDef {
  type: SourceType;
  label: string;
  icon: string;
  fields: Field[];
  /** Optional guidance shown under the form (e.g. scanner caveats). */
  note?: string;
}

/** Groupings used to organise the source picker. */
export type SourceCategory = 'Link & text' | 'Contact' | 'Payment' | 'App' | 'Network' | 'Location';

export const CATEGORY_ORDER: SourceCategory[] = [
  'Link & text',
  'Contact',
  'Payment',
  'App',
  'Network',
  'Location',
];

export const SOURCE_CATEGORY: Record<SourceType, SourceCategory> = {
  url: 'Link & text',
  text: 'Link & text',
  email: 'Contact',
  phone: 'Contact',
  sms: 'Contact',
  whatsapp: 'Contact',
  vcard: 'Contact',
  upi: 'Payment',
  paypal: 'Payment',
  venmo: 'Payment',
  cashapp: 'Payment',
  bitcoin: 'Payment',
  sepa: 'Payment',
  appstore: 'App',
  playstore: 'App',
  wifi: 'Network',
  geo: 'Location',
};

/** Icon + short label for the category (source-type) selector. */
export const CATEGORY_META: Record<SourceCategory, { icon: string; label: string }> = {
  'Link & text': { icon: '🔗', label: 'Links' },
  Contact: { icon: '👤', label: 'Contact' },
  Payment: { icon: '💳', label: 'Payment' },
  App: { icon: '📱', label: 'Apps' },
  Network: { icon: '📶', label: 'Network' },
  Location: { icon: '📍', label: 'Location' },
};

export const SOURCES: SourceDef[] = [
  {
    type: 'url',
    label: 'Web link',
    icon: '🔗',
    fields: [{ key: 'url', label: 'URL', type: 'url', placeholder: 'example.com or https://…' }],
  },
  {
    type: 'text',
    label: 'Text',
    icon: '📝',
    fields: [{ key: 'text', label: 'Text', type: 'textarea', placeholder: 'Any text…' }],
    note: 'Plain-text codes show the text but don’t trigger an action — many phone cameras (and Google Lens) won’t pop a result. Use “Web link” if you need a tap-through.',
  },
  {
    type: 'email',
    label: 'Email',
    icon: '✉️',
    fields: [
      { key: 'to', label: 'To', type: 'email', placeholder: 'name@example.com' },
      { key: 'subject', label: 'Subject', type: 'text', placeholder: 'Optional subject' },
      { key: 'body', label: 'Body', type: 'textarea', placeholder: 'Optional message' },
    ],
  },
  {
    type: 'phone',
    label: 'Phone',
    icon: '📞',
    fields: [{ key: 'phone', label: 'Phone number', type: 'tel', placeholder: '+91 98765 43210' }],
  },
  {
    type: 'sms',
    label: 'SMS',
    icon: '💬',
    fields: [
      { key: 'phone', label: 'Phone number', type: 'tel', placeholder: '+91 98765 43210' },
      { key: 'message', label: 'Message', type: 'textarea', placeholder: 'Optional pre-filled text' },
    ],
  },
  {
    type: 'whatsapp',
    label: 'WhatsApp',
    icon: '🟢',
    fields: [
      { key: 'phone', label: 'Phone (with country code)', type: 'tel', placeholder: '+91 98765 43210' },
      { key: 'message', label: 'Message', type: 'textarea', placeholder: 'Optional pre-filled text' },
    ],
  },
  {
    type: 'upi',
    label: 'UPI Pay',
    icon: '₹',
    fields: [
      { key: 'vpa', label: 'UPI ID (VPA)', type: 'text', placeholder: 'name@bank' },
      { key: 'name', label: 'Payee name', type: 'text', placeholder: 'Acme Store' },
      { key: 'amount', label: 'Amount ₹ (optional)', type: 'number', placeholder: 'Blank = payer enters' },
      { key: 'note', label: 'Note (optional)', type: 'text', placeholder: 'Order #123' },
    ],
    note: 'Scan UPI codes inside a UPI app (GPay, PhonePe, Paytm) — a plain camera or Google Lens won’t open them. Use a real VPA; test payee IDs show as “invalid”.',
  },
  {
    type: 'paypal',
    label: 'PayPal',
    icon: '🅿️',
    fields: [
      { key: 'user', label: 'PayPal.Me username', type: 'text', placeholder: 'yourname' },
      { key: 'amount', label: 'Amount (optional)', type: 'number', placeholder: 'Blank = payer enters' },
      { key: 'currency', label: 'Currency (optional)', type: 'text', placeholder: 'USD, EUR, GBP…' },
    ],
    note: 'Creates a PayPal.Me link. Leave amount blank to let the payer choose; currency uses your PayPal default if omitted.',
  },
  {
    type: 'venmo',
    label: 'Venmo',
    icon: '💸',
    fields: [
      { key: 'user', label: 'Venmo username', type: 'text', placeholder: 'without the @' },
      { key: 'amount', label: 'Amount $ (optional)', type: 'number', placeholder: 'e.g. 10' },
      { key: 'note', label: 'Note (optional)', type: 'text', placeholder: 'What’s it for?' },
    ],
    note: 'Venmo is US-only. Best scanned with a phone signed in to Venmo.',
  },
  {
    type: 'cashapp',
    label: 'Cash App',
    icon: '💵',
    fields: [
      { key: 'cashtag', label: '$Cashtag', type: 'text', placeholder: 'yourtag (no $)' },
      { key: 'amount', label: 'Amount (optional)', type: 'number', placeholder: 'e.g. 10' },
    ],
    note: 'Cash App is US/UK. Opens cash.app to pay your $Cashtag.',
  },
  {
    type: 'bitcoin',
    label: 'Bitcoin',
    icon: '₿',
    fields: [
      { key: 'address', label: 'BTC address', type: 'text', placeholder: 'bc1… / 1… / 3…' },
      { key: 'amount', label: 'Amount in BTC (optional)', type: 'text', placeholder: 'e.g. 0.0015' },
      { key: 'label', label: 'Label (optional)', type: 'text', placeholder: 'Your name / store' },
      { key: 'message', label: 'Message (optional)', type: 'text', placeholder: 'Order #123' },
    ],
    note: 'Standard BIP-21 “bitcoin:” URI — opens most wallet apps.',
  },
  {
    type: 'sepa',
    label: 'Bank transfer (SEPA)',
    icon: '🏦',
    fields: [
      { key: 'name', label: 'Beneficiary name', type: 'text', placeholder: 'Acme GmbH' },
      { key: 'iban', label: 'IBAN', type: 'text', placeholder: 'DE89 3704 0044 0532 0130 00' },
      { key: 'bic', label: 'BIC (optional)', type: 'text', placeholder: 'COBADEFFXXX' },
      { key: 'amount', label: 'Amount € (optional)', type: 'number', placeholder: 'e.g. 49.99' },
      { key: 'remittance', label: 'Reference (optional)', type: 'text', placeholder: 'Invoice 2024-01' },
    ],
    note: 'EPC “Girocode” for euro-area SEPA transfers. Scan in a European banking app.',
  },
  {
    type: 'appstore',
    label: 'App Store',
    icon: '🍎',
    fields: [
      { key: 'app', label: 'App ID or URL', type: 'text', placeholder: '310633997 or apps.apple.com link' },
      { key: 'country', label: 'Country code (optional)', type: 'text', placeholder: 'in, us, gb…' },
    ],
  },
  {
    type: 'playstore',
    label: 'Play Store',
    icon: '▶️',
    fields: [
      { key: 'app', label: 'Package ID or URL', type: 'text', placeholder: 'com.whatsapp or play.google.com link' },
      { key: 'lang', label: 'Language (optional)', type: 'text', placeholder: 'en, hi…' },
    ],
  },
  {
    type: 'wifi',
    label: 'Wi-Fi',
    icon: '📶',
    fields: [
      { key: 'ssid', label: 'Network name (SSID)', type: 'text', placeholder: 'MyNetwork' },
      { key: 'password', label: 'Password', type: 'text', placeholder: 'Wi-Fi password' },
      {
        key: 'encryption',
        label: 'Security',
        type: 'select',
        value: 'WPA',
        options: [
          { value: 'WPA', label: 'WPA/WPA2' },
          { value: 'WEP', label: 'WEP' },
          { value: 'nopass', label: 'None' },
        ],
      },
      { key: 'hidden', label: 'Hidden network', type: 'checkbox' },
    ],
  },
  {
    type: 'vcard',
    label: 'Visiting card',
    icon: '👤',
    fields: [
      { key: 'first', label: 'First name', type: 'text', placeholder: 'Asha' },
      { key: 'last', label: 'Last name', type: 'text', placeholder: 'Rao' },
      { key: 'org', label: 'Company', type: 'text', placeholder: 'Acme Pvt Ltd' },
      { key: 'title', label: 'Job title', type: 'text', placeholder: 'Founder' },
      { key: 'phone', label: 'Phone', type: 'tel', placeholder: '+91 98765 43210' },
      { key: 'email', label: 'Email', type: 'email', placeholder: 'asha@acme.com' },
      { key: 'url', label: 'Website', type: 'url', placeholder: 'acme.com' },
      { key: 'address', label: 'Address', type: 'text', placeholder: 'Street, City' },
    ],
  },
  {
    type: 'geo',
    label: 'Location',
    icon: '📍',
    fields: [
      { key: 'lat', label: 'Latitude', type: 'number', placeholder: '12.9716' },
      { key: 'lng', label: 'Longitude', type: 'number', placeholder: '77.5946' },
    ],
  },
];

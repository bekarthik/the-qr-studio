/** Builders that turn structured form input into the string encoded by the QR. */

export type SourceType =
  | 'url'
  | 'text'
  | 'email'
  | 'phone'
  | 'sms'
  | 'whatsapp'
  | 'upi'
  | 'indbank'
  | 'paypal'
  | 'venmo'
  | 'cashapp'
  | 'bitcoin'
  | 'sepa'
  | 'appstore'
  | 'playstore'
  | 'wifi'
  | 'vcard'
  | 'geo';

/** Escape special chars for WIFI: and vCard payloads ( \ ; , : " ). */
function esc(value: string): string {
  return value.replace(/([\\;,:"])/g, '\\$1');
}

/** Strip everything but digits and a leading + (for tel/wa numbers). */
function cleanPhone(value: string): string {
  const trimmed = value.trim();
  const plus = trimmed.startsWith('+') ? '+' : '';
  return plus + trimmed.replace(/[^\d]/g, '');
}

export interface PayloadInput {
  [key: string]: string | boolean;
}

export function buildPayload(type: SourceType, f: PayloadInput): string {
  switch (type) {
    case 'url': {
      const url = String(f.url || '').trim();
      if (!url) return '';
      return /^[a-z][a-z0-9+.-]*:\/\//i.test(url) ? url : `https://${url}`;
    }

    case 'text':
      return String(f.text || '');

    case 'email': {
      // mailto: follows RFC 6068, NOT form-urlencoding — so spaces must be
      // %20 (a literal "+" means a plus sign here, not a space). Build the
      // query with encodeURIComponent rather than URLSearchParams, whose
      // toString() encodes spaces as "+".
      const to = String(f.to || '').trim();
      const params: string[] = [];
      if (f.subject) params.push(`subject=${encodeURIComponent(String(f.subject))}`);
      if (f.body) params.push(`body=${encodeURIComponent(String(f.body))}`);
      const q = params.join('&');
      return `mailto:${to}${q ? `?${q}` : ''}`;
    }

    case 'phone':
      return `tel:${cleanPhone(String(f.phone || ''))}`;

    case 'sms': {
      const num = cleanPhone(String(f.phone || ''));
      const msg = String(f.message || '');
      return `SMSTO:${num}:${msg}`;
    }

    case 'whatsapp': {
      // wa.me expects digits only, no + sign.
      const num = cleanPhone(String(f.phone || '')).replace('+', '');
      const text = String(f.message || '');
      const q = text ? `?text=${encodeURIComponent(text)}` : '';
      return num ? `https://wa.me/${num}${q}` : '';
    }

    case 'upi': {
      // BHIM-UPI deep link: upi://pay?pa=<vpa>&pn=<name>&am=<amount>&cu=INR&tn=<note>
      // Keep the VPA's "@" literal (query-safe and most compatible) and encode
      // other values with %20 for spaces, which UPI apps parse most reliably.
      const pa = String(f.vpa || '').trim();
      if (!pa) return '';
      const parts = [`pa=${pa}`];
      if (f.name) parts.push(`pn=${encodeURIComponent(String(f.name))}`);
      const amount = String(f.amount || '').trim();
      if (amount) parts.push(`am=${encodeURIComponent(amount)}`);
      parts.push('cu=INR');
      if (f.note) parts.push(`tn=${encodeURIComponent(String(f.note))}`);
      return `upi://pay?${parts.join('&')}`;
    }

    case 'indbank': {
      // Indian bank account details for NEFT/IMPS/RTGS or adding a beneficiary.
      // There's no universal scan-to-pay standard for account+IFSC, so this is
      // a clean labelled-text "share my details" code (any scanner shows it).
      const acc = String(f.account || '').replace(/\s+/g, '');
      const ifsc = String(f.ifsc || '').replace(/\s+/g, '').toUpperCase();
      if (!acc || !ifsc) return '';
      const lines = ['Bank transfer (India)'];
      const name = String(f.name || '').trim();
      if (name) lines.push(`Name: ${name}`);
      lines.push(`A/C: ${acc}`);
      lines.push(`IFSC: ${ifsc}`);
      const bank = String(f.bank || '').trim();
      if (bank) lines.push(`Bank: ${bank}`);
      const type = String(f.acctype || '').trim();
      if (type) lines.push(`Type: ${type}`);
      return lines.join('\n');
    }

    case 'paypal': {
      // PayPal.Me link. Accept a bare handle or a pasted paypal.me URL. Amount
      // is optional; PayPal.Me supports an appended currency code (e.g. 10.50EUR).
      const user = String(f.user || '')
        .trim()
        .replace(/^@/, '')
        .replace(/^https?:\/\//i, '')
        .replace(/^(www\.)?paypal\.me\//i, '')
        .replace(/^(www\.)?paypal\.com\/paypalme\//i, '')
        .replace(/\/.*$/, '');
      if (!user) return '';
      const amount = String(f.amount || '').replace(/[^0-9.]/g, '');
      const cur = String(f.currency || '').toUpperCase().replace(/[^A-Z]/g, '');
      return `https://paypal.me/${user}${amount ? `/${amount}${cur}` : ''}`;
    }

    case 'venmo': {
      // Venmo web pay intent (US only). https opens the app/site from a scan.
      const user = String(f.user || '').trim().replace(/^@/, '');
      if (!user) return '';
      const parts = [`txn=pay`, `recipients=${encodeURIComponent(user)}`];
      const amount = String(f.amount || '').replace(/[^0-9.]/g, '');
      if (amount) parts.push(`amount=${amount}`);
      if (f.note) parts.push(`note=${encodeURIComponent(String(f.note))}`);
      return `https://venmo.com/?${parts.join('&')}`;
    }

    case 'cashapp': {
      // Cash App (US/UK): https://cash.app/$cashtag[/amount]
      const tag = String(f.cashtag || '')
        .trim()
        .replace(/^https?:\/\//i, '')
        .replace(/^cash\.app\//i, '')
        .replace(/^\$/, '');
      if (!tag) return '';
      const amount = String(f.amount || '').replace(/[^0-9.]/g, '');
      return `https://cash.app/$${tag}${amount ? `/${amount}` : ''}`;
    }

    case 'bitcoin': {
      // BIP-21 URI: bitcoin:<address>?amount=<btc>&label=<…>&message=<…>
      const addr = String(f.address || '').trim().replace(/^bitcoin:/i, '');
      if (!addr) return '';
      const parts: string[] = [];
      const amount = String(f.amount || '').replace(/[^0-9.]/g, '');
      if (amount) parts.push(`amount=${amount}`);
      if (f.label) parts.push(`label=${encodeURIComponent(String(f.label))}`);
      if (f.message) parts.push(`message=${encodeURIComponent(String(f.message))}`);
      return `bitcoin:${addr}${parts.length ? `?${parts.join('&')}` : ''}`;
    }

    case 'sepa': {
      // EPC069-12 "Girocode" — SEPA Credit Transfer. Fixed line order; trailing
      // empty fields are dropped. Amount must be in euro (e.g. EUR12.50).
      const name = String(f.name || '').trim();
      const iban = String(f.iban || '').replace(/\s+/g, '').toUpperCase();
      if (!name || !iban) return '';
      const bic = String(f.bic || '').replace(/\s+/g, '').toUpperCase();
      const amount = String(f.amount || '').replace(/[^0-9.]/g, '');
      const remittance = String(f.remittance || '').trim();
      const lines = [
        'BCD',
        '002', // version 2 (BIC optional)
        '1', // charset 1 = UTF-8
        'SCT', // SEPA Credit Transfer
        bic,
        name,
        iban,
        amount ? `EUR${amount}` : '',
        '', // purpose code
        '', // structured remittance / reference
        remittance, // unstructured remittance
      ];
      while (lines.length && lines[lines.length - 1] === '') lines.pop();
      return lines.join('\n');
    }

    case 'appstore': {
      // Apple App Store. Accept a full URL, an "apps.apple.com/…" path, or just
      // the numeric app ID (with or without a leading "id"). The app-name slug
      // is optional — Apple redirects /app/id<ID> to the right listing.
      const raw = String(f.app || '').trim();
      if (!raw) return '';
      if (/^https?:\/\//i.test(raw)) return raw;
      if (/^apps\.apple\.com\//i.test(raw)) return `https://${raw}`;
      const id = raw.replace(/^id/i, '').replace(/[^\d]/g, '');
      if (!id) return '';
      const cc = String(f.country || '').trim().toLowerCase().replace(/[^a-z]/g, '');
      return `https://apps.apple.com/${cc ? `${cc}/` : ''}app/id${id}`;
    }

    case 'playstore': {
      // Google Play. Accept a full URL, a "play.google.com/…" path, or just the
      // application/package id (e.g. com.example.app).
      const raw = String(f.app || '').trim();
      if (!raw) return '';
      if (/^https?:\/\//i.test(raw)) return raw;
      if (/^play\.google\.com\//i.test(raw)) return `https://${raw}`;
      const pkg = raw.replace(/[^a-zA-Z0-9._]/g, '');
      if (!pkg) return '';
      const params = new URLSearchParams({ id: pkg });
      const hl = String(f.lang || '').trim();
      if (hl) params.set('hl', hl);
      return `https://play.google.com/store/apps/details?${params.toString()}`;
    }

    case 'wifi': {
      const ssid = esc(String(f.ssid || ''));
      const pass = esc(String(f.password || ''));
      const enc = String(f.encryption || 'WPA'); // WPA | WEP | nopass
      const hidden = f.hidden ? 'true' : 'false';
      const passPart = enc === 'nopass' ? '' : `P:${pass};`;
      return `WIFI:T:${enc};S:${ssid};${passPart}H:${hidden};;`;
    }

    case 'geo': {
      const lat = String(f.lat || '').trim();
      const lng = String(f.lng || '').trim();
      return lat && lng ? `geo:${lat},${lng}` : '';
    }

    case 'vcard': {
      const first = String(f.first || '').trim();
      const last = String(f.last || '').trim();
      const lines = ['BEGIN:VCARD', 'VERSION:3.0'];
      lines.push(`N:${esc(last)};${esc(first)};;;`);
      lines.push(`FN:${esc(`${first} ${last}`.trim())}`);
      if (f.org) lines.push(`ORG:${esc(String(f.org))}`);
      if (f.title) lines.push(`TITLE:${esc(String(f.title))}`);
      if (f.phone) lines.push(`TEL;TYPE=CELL:${cleanPhone(String(f.phone))}`);
      if (f.email) lines.push(`EMAIL:${esc(String(f.email))}`);
      if (f.url) lines.push(`URL:${esc(String(f.url))}`);
      if (f.address) lines.push(`ADR;TYPE=WORK:;;${esc(String(f.address))};;;;`);
      lines.push('END:VCARD');
      return lines.join('\n');
    }

    default:
      return '';
  }
}

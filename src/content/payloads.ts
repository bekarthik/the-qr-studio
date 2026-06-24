/** Builders that turn structured form input into the string encoded by the QR. */

export type SourceType =
  | 'url'
  | 'text'
  | 'email'
  | 'phone'
  | 'sms'
  | 'whatsapp'
  | 'upi'
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
      const to = String(f.to || '').trim();
      const params = new URLSearchParams();
      if (f.subject) params.set('subject', String(f.subject));
      if (f.body) params.set('body', String(f.body));
      const q = params.toString();
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

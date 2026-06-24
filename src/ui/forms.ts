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
}

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

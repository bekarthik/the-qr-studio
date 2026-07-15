/**
 * Terms & Conditions and Privacy Policy content, transcribed from the source
 * document. Kept as structured data (not raw HTML) so LegalPage renders it with
 * the site's own type scale and it prerenders as crawlable text. Routed at
 * /terms and /privacy via the 'legal' pageType in src/seo/routes.ts.
 */
export type LegalBlock = { p: string } | { ul: string[] };

export interface LegalSection {
  heading: string;
  blocks: LegalBlock[];
}

export interface LegalDoc {
  /** Page H2 (the site reserves H1 for the home hero). */
  title: string;
  /** Human date shown under the title. */
  updated: string;
  /** Lead paragraphs shown before the numbered sections. */
  intro: string[];
  sections: LegalSection[];
}

const TERMS: LegalDoc = {
  title: 'Terms & Conditions',
  updated: 'July 13, 2026',
  intro: [
    'Welcome to theqr.studio ("QR Generator app", "Service", "Website", "we", "our", or "us"). By accessing or using this website, you agree to these Terms & Conditions. If you do not agree with these terms, please do not use the Service.',
  ],
  sections: [
    {
      heading: '1. Description of the Service',
      blocks: [
        { p: 'Our website provides a free tool that allows users to generate QR codes for text, URLs, contact information, Wi-Fi credentials, and other supported formats.' },
        { p: 'The Service is provided free of charge and without requiring users to create an account.' },
      ],
    },
    {
      heading: '2. Acceptable Use',
      blocks: [
        { p: 'You agree not to use the Service to:' },
        {
          ul: [
            'Generate QR codes that promote illegal activities.',
            'Distribute malware, phishing links, or malicious software.',
            'Impersonate another person or organization.',
            'Violate intellectual property rights.',
            'Harass, abuse, or defraud others.',
            'Circumvent applicable laws or regulations.',
          ],
        },
        { p: 'We reserve the right to block access to users who misuse the Service.' },
      ],
    },
    {
      heading: '3. User Responsibility',
      blocks: [
        { p: 'You are solely responsible for:' },
        {
          ul: [
            'The content you encode into QR codes.',
            'Verifying that your QR codes function correctly before distribution.',
            'Ensuring your use complies with applicable laws.',
          ],
        },
        { p: 'We do not review or verify the accuracy, legality, or safety of the information encoded into QR codes.' },
      ],
    },
    {
      heading: '4. Intellectual Property',
      blocks: [
        { p: 'The website, its design, software, branding, and content are owned by us or licensed to us and are protected by applicable intellectual property laws.' },
        { p: 'You retain ownership of any information you enter into the QR code generator.' },
      ],
    },
    {
      heading: '5. Availability',
      blocks: [
        { p: 'We aim to keep the Service available at all times but cannot guarantee uninterrupted access.' },
        { p: 'We may modify, suspend, or discontinue any part of the Service without prior notice.' },
      ],
    },
    {
      heading: '6. Disclaimer',
      blocks: [
        { p: 'The Service is provided "as is" and "as available" without warranties of any kind.' },
        { p: 'We make no guarantees regarding:' },
        { ul: ['Accuracy', 'Availability', 'Reliability', 'Fitness for a particular purpose', 'Error-free operation'] },
        { p: 'Use of the Service is at your own risk.' },
      ],
    },
    {
      heading: '7. Limitation of Liability',
      blocks: [
        { p: 'To the maximum extent permitted by law, we shall not be liable for any direct, indirect, incidental, consequential, special, or punitive damages arising from:' },
        {
          ul: [
            'Use of the Service',
            'Inability to use the Service',
            'Loss of data',
            'Business interruption',
            'QR codes that fail to scan',
            'Third-party websites linked through generated QR codes',
          ],
        },
      ],
    },
    {
      heading: '8. Third-Party Links',
      blocks: [
        { p: 'QR codes generated using the Service may point to third-party websites.' },
        { p: 'We are not responsible for the content, privacy practices, or availability of third-party websites.' },
      ],
    },
    {
      heading: '9. Changes to These Terms',
      blocks: [
        { p: 'We may update these Terms from time to time.' },
        { p: 'Updated versions become effective immediately upon publication on this page.' },
        { p: 'Continued use of the Service constitutes acceptance of the revised Terms.' },
      ],
    },
    {
      heading: '10. Governing Law',
      blocks: [
        { p: 'These Terms shall be governed by the laws applicable in the jurisdiction where the website operator is established, without regard to conflict of law principles.' },
      ],
    },
    {
      heading: '11. Contact',
      blocks: [
        { p: 'If you have questions regarding these Terms, you may contact us through the contact information provided on this website.' },
      ],
    },
  ],
};

const PRIVACY: LegalDoc = {
  title: 'Privacy Policy',
  updated: 'July 13, 2026',
  intro: [
    'Your privacy is important to us.',
    'This Privacy Policy explains what information we collect when you use our free QR Code Generator and how that information is used.',
  ],
  sections: [
    {
      heading: '1. Information We Collect',
      blocks: [
        { p: 'Our Service is designed to require no account or sign-in.' },
        { p: 'We do not intentionally collect personal information unless you voluntarily provide it through a contact form or email.' },
        { p: 'Depending on how the website is implemented, we may automatically collect limited technical information such as:' },
        {
          ul: [
            'Browser type',
            'Device type',
            'Operating system',
            'Language preference',
            'Anonymous usage statistics',
            'IP address (through server logs)',
            'Date and time of access',
          ],
        },
        { p: 'This information is used solely for security, maintenance, and improving the Service.' },
      ],
    },
    {
      heading: '2. QR Code Content',
      blocks: [
        { p: 'The information you enter to generate a QR code is processed only for generating the QR code.' },
        { p: 'We do not permanently store the content of generated QR codes unless explicitly stated elsewhere on the website.' },
        { p: 'If QR code generation occurs entirely within your browser, your data never leaves your device except for standard requests needed to load the website.' },
      ],
    },
    {
      heading: '3. Cookies',
      blocks: [
        { p: 'We may use essential cookies necessary for website functionality.' },
        { p: 'If analytics are used, cookies may collect anonymous usage information to help us improve the Service.' },
        { p: 'You can disable cookies through your browser settings, although some features may not function correctly.' },
      ],
    },
    {
      heading: '4. Analytics',
      blocks: [
        { p: 'We may use privacy-friendly analytics tools to understand how visitors use the website.' },
        { p: 'These tools collect aggregated, non-identifiable information such as:' },
        { ul: ['Pages visited', 'Device type', 'Browser', 'Approximate location', 'Referring website'] },
        { p: 'Analytics data is used only to improve the Service.' },
      ],
    },
    {
      heading: '5. Third-Party Services',
      blocks: [
        { p: 'The website may use third-party providers for:' },
        { ul: ['Hosting', 'Analytics', 'Security', 'Content delivery'] },
        { p: 'These providers may process limited technical information necessary to provide their services.' },
      ],
    },
    {
      heading: '6. Data Security',
      blocks: [
        { p: 'We take reasonable technical and organizational measures to protect our website and infrastructure.' },
        { p: 'However, no method of transmission or storage over the internet can be guaranteed to be completely secure.' },
      ],
    },
    {
      heading: "7. Children's Privacy",
      blocks: [
        { p: 'The Service is not directed toward children under the age required by applicable law.' },
        { p: 'We do not knowingly collect personal information from children.' },
      ],
    },
    {
      heading: '8. Your Rights',
      blocks: [
        { p: 'Depending on your jurisdiction, you may have rights regarding your personal information, including the right to:' },
        {
          ul: [
            'Request access',
            'Request correction',
            'Request deletion',
            'Object to certain processing',
            'Lodge a complaint with a supervisory authority',
          ],
        },
        { p: 'If you wish to exercise these rights, please contact us.' },
      ],
    },
    {
      heading: '9. Changes to This Policy',
      blocks: [
        { p: 'We may update this Privacy Policy from time to time.' },
        { p: 'Changes become effective once published on this page.' },
      ],
    },
    {
      heading: '10. Contact',
      blocks: [
        { p: 'If you have questions regarding this Privacy Policy, please contact us using the contact information available on this website.' },
      ],
    },
  ],
};

/** Keyed by route path — LegalPage looks the doc up from its RouteDef. */
export const LEGAL: Record<string, LegalDoc> = {
  '/terms': TERMS,
  '/privacy': PRIVACY,
};

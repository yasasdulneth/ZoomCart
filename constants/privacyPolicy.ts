/**
 * Privacy Policy copy — shown in-app (Settings → Privacy Policy).
 */

export type PrivacyBlock =
  | { kind: 'title'; text: string }
  | { kind: 'heading'; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'divider' }
  | { kind: 'bullets'; items: string[] };

export const PRIVACY_POLICY_BLOCKS: PrivacyBlock[] = [
  { kind: 'title', text: 'Privacy Policy' },
  { kind: 'heading', text: 'ZoomCart Privacy Policy' },
  {
    kind: 'paragraph',
    text: 'Effective Date: 01/05/2026\nWelcome to ZoomCart. Your privacy is important to us. This Privacy Policy explains how ZoomCart collects, uses, stores, and protects your information when using the mobile application and related services.',
  },
  { kind: 'divider' },
  { kind: 'heading', text: '1. Information We Collect' },
  {
    kind: 'paragraph',
    text: 'ZoomCart may collect the following information from users:',
  },
  {
    kind: 'bullets',
    items: [
      'Full name',
      'Email address',
      'Mobile phone number',
      'Account credentials',
      'Shopping cart and transaction information',
      'Loyalty points information',
      'Product scanning activity',
      'Shared shopping session information',
      'Device and application usage data',
    ],
  },
  { kind: 'divider' },
  { kind: 'heading', text: '2. How We Use Your Information' },
  {
    kind: 'paragraph',
    text: 'The collected information is used to:',
  },
  {
    kind: 'bullets',
    items: [
      'Create and manage user accounts',
      'Provide barcode scanning and shopping features',
      'Synchronize shared shopping sessions',
      'Track loyalty points and shopping history',
      'Improve application functionality and user experience',
      'Manage inventory and transactions',
      'Provide customer support and notifications',
      'Maintain system security and prevent unauthorized access',
    ],
  },
  { kind: 'divider' },
  { kind: 'heading', text: '3. Barcode and Camera Usage' },
  {
    kind: 'paragraph',
    text:
      'ZoomCart requires access to the device camera to scan product barcodes. Camera access is used only for barcode scanning purposes and no camera footage is stored unless explicitly stated.',
  },
  { kind: 'divider' },
  { kind: 'heading', text: '4. Shared Shopping Sessions' },
  {
    kind: 'paragraph',
    text:
      'Users may participate in shared shopping sessions with selected contacts. Shared session participants may view shopping items, allocated budgets, and session-related updates in real time.',
  },
  { kind: 'divider' },
  { kind: 'heading', text: '5. Data Storage and Security' },
  {
    kind: 'paragraph',
    text:
      'User information is stored securely using protected databases and authentication mechanisms. Reasonable security measures are implemented to reduce unauthorized access, data loss, or misuse.',
  },
  { kind: 'divider' },
  { kind: 'heading', text: '6. Third-Party Services' },
  {
    kind: 'paragraph',
    text: 'ZoomCart may use third-party technologies and services, including:',
  },
  {
    kind: 'bullets',
    items: [
      'MongoDB Atlas',
      'Authentication services',
      'Barcode scanning libraries',
      'Cloud hosting platforms',
    ],
  },
  {
    kind: 'paragraph',
    text: 'These services may process limited information required for system functionality.',
  },
  { kind: 'divider' },
  { kind: 'heading', text: '7. User Rights' },
  {
    kind: 'paragraph',
    text: 'Users may:',
  },
  {
    kind: 'bullets',
    items: [
      'Access their account information',
      'Update personal information',
      'Request account deactivation',
      'Request deletion of account data where applicable',
    ],
  },
  { kind: 'divider' },
  { kind: 'heading', text: '8. Data Retention' },
  {
    kind: 'paragraph',
    text:
      'User data may be retained as long as necessary for operational, security, and legal purposes.',
  },
  { kind: 'divider' },
  { kind: 'heading', text: '9. Changes to This Privacy Policy' },
  {
    kind: 'paragraph',
    text:
      'ZoomCart reserves the right to update this Privacy Policy at any time. Updated versions will be published within the application.',
  },
  { kind: 'divider' },
  { kind: 'heading', text: '10. Contact Information' },
  {
    kind: 'paragraph',
    text:
      'For questions or concerns regarding this Privacy Policy, please contact:\n\nEmail: zoomcart111@gmail.com\nApplication: ZoomCart',
  },
  { kind: 'divider' },
  {
    kind: 'paragraph',
    text:
      'By using ZoomCart, you agree to the collection and use of information in accordance with this Privacy Policy.',
  },
];

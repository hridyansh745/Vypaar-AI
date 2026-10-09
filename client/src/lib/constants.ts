/** Shared constants: wizard steps, states, document categories, limits. */

export const WIZARD_STEPS = [
  { key: 'owner', path: '/register/owner' },
  { key: 'business', path: '/register/business' },
  { key: 'documents', path: '/register/documents' },
  { key: 'location', path: '/register/location' },
  { key: 'review', path: '/register/review' },
] as const;

export type StepKey = (typeof WIZARD_STEPS)[number]['key'];

export const DOC_CATEGORIES = ['shopPhoto', 'registrationCert', 'gstCert', 'licence', 'other'] as const;
export type DocCategory = (typeof DOC_CATEGORIES)[number];

export const ACCEPTED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
export const ACCEPTED_FILE_LABEL = 'JPG, PNG, WEBP, PDF';
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_PDF_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_PHOTO_BYTES = 2 * 1024 * 1024; // 2 MB (profile photo)

/** States/UTs kept in their official English names across languages (proper nouns). */
export const INDIAN_STATES = [
  'Andaman and Nicobar Islands',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu and Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Ladakh',
  'Lakshadweep',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Puducherry',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
];

export const APPLICATION_STATUSES = [
  'draft',
  'submitted',
  'pending',
  'additional',
  'approved',
  'rejected',
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

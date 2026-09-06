export const LEGAL_MIN_AGE = 18;

export const LEGAL_VERSIONS = {
  privacyPolicy: '2026-09-06',
  kvkkConsent: '2026-09-06',
  aiChatConsent: '2026-09-06',
  proofPhotoConsent: '2026-09-06',
  marketingConsent: '2026-09-06',
  terms: '2026-09-06',
} as const;

export const LEGAL_IDENTITY = {
  service: 'Niyetsen',
  dataController: 'Şahin Çelebi',
  email: 'ai@niyetsen.com',
  website: 'https://niyetsen.com',
  packages: 'com.niyetsenai / com.niyetsen.app',
} as const;

export type LegalDocumentId = 'privacy' | 'kvkk' | 'consent' | 'terms';

export type LegalSection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

export type LegalDocument = {
  title: string;
  shortTitle: string;
  version: string;
  summary: string;
  sections: LegalSection[];
};

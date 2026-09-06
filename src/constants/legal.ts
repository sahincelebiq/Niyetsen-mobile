import type { AppLocale } from '@/i18n/types';
import {
  LEGAL_IDENTITY,
  LEGAL_MIN_AGE,
  LEGAL_VERSIONS,
  type LegalDocument,
  type LegalDocumentId,
  type LegalSection,
} from '@/constants/legal-shared';

import { LEGAL_DOCUMENTS_AR } from '@/constants/legal-docs/ar';
import { LEGAL_DOCUMENTS_DE } from '@/constants/legal-docs/de';
import { LEGAL_DOCUMENTS_EN } from '@/constants/legal-docs/en';
import { LEGAL_DOCUMENTS_FR } from '@/constants/legal-docs/fr';
import { LEGAL_DOCUMENTS_TR } from '@/constants/legal-docs/tr';

export {
  LEGAL_IDENTITY,
  LEGAL_MIN_AGE,
  LEGAL_VERSIONS,
  type LegalDocument,
  type LegalDocumentId,
  type LegalSection,
};

const LEGAL_EFFECTIVE: Record<AppLocale, string> = {
  tr: '6 Eylül 2026',
  'en-US': '6 September 2026',
  'en-GB': '6 September 2026',
  de: '6. September 2026',
  fr: '6 septembre 2026',
  ar: '6 سبتمبر 2026',
};

const LEGAL_BY_LOCALE: Record<AppLocale, Record<LegalDocumentId, LegalDocument>> = {
  tr: LEGAL_DOCUMENTS_TR,
  'en-US': LEGAL_DOCUMENTS_EN,
  'en-GB': LEGAL_DOCUMENTS_EN,
  de: LEGAL_DOCUMENTS_DE,
  fr: LEGAL_DOCUMENTS_FR,
  ar: LEGAL_DOCUMENTS_AR,
};

export function getLegalEffectiveDate(locale: AppLocale): string {
  return LEGAL_EFFECTIVE[locale] ?? LEGAL_EFFECTIVE['en-US'];
}

export function getLegalDocuments(
  locale: AppLocale,
): Record<LegalDocumentId, LegalDocument> {
  return LEGAL_BY_LOCALE[locale] ?? LEGAL_DOCUMENTS_EN;
}

/** Geriye dönük varsayılan (Türkçe). Ekranlar `getLegalDocuments(locale)` kullanır. */
export const LEGAL_DOCUMENTS = LEGAL_DOCUMENTS_TR;

export const LEGAL_EFFECTIVE_DATE = LEGAL_EFFECTIVE.tr;

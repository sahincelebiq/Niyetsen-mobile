import type { AppLocale, Messages } from '@/i18n/types';
import { ar } from '@/i18n/locales/ar';
import { de } from '@/i18n/locales/de';
import { enGB } from '@/i18n/locales/en-GB';
import { enUS } from '@/i18n/locales/en-US';
import { fr } from '@/i18n/locales/fr';
import { tr } from '@/i18n/locales/tr';

export const LOCALES: AppLocale[] = ['tr', 'en-US', 'en-GB', 'de', 'fr', 'ar'];

const CATALOG: Record<AppLocale, Messages> = {
  tr,
  'en-US': enUS,
  'en-GB': enGB,
  de,
  fr,
  ar,
};

export function messagesFor(locale: AppLocale): Messages {
  return CATALOG[locale] ?? tr;
}

export function isAppLocale(value: string | null | undefined): value is AppLocale {
  return !!value && (LOCALES as string[]).includes(value);
}

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

const ALIASES: Record<string, AppLocale> = {
  en: 'en-US',
  'en-us': 'en-US',
  eng: 'en-US',
  english: 'en-US',
  'en-gb': 'en-GB',
  gb: 'en-GB',
  uk: 'en-GB',
  de: 'de',
  deu: 'de',
  ger: 'de',
  german: 'de',
  fr: 'fr',
  fra: 'fr',
  french: 'fr',
  ar: 'ar',
  ara: 'ar',
  arabic: 'ar',
  tr: 'tr',
  tur: 'tr',
  turkish: 'tr',
};

/** "en" sızıntısını en-US'e çevir — UI'da ham "en" yazılmasın. */
export function coerceAppLocale(value: string | null | undefined): AppLocale | null {
  if (!value) return null;
  const raw = value.trim().replace(/_/g, '-');
  if ((LOCALES as string[]).includes(raw)) return raw as AppLocale;
  const lower = raw.toLowerCase();
  if ((LOCALES as string[]).includes(lower)) return lower as AppLocale;
  if (ALIASES[lower]) return ALIASES[lower];
  const lang = lower.split('-')[0];
  return ALIASES[lang] ?? null;
}

export function messagesFor(locale: AppLocale): Messages {
  return CATALOG[locale] ?? tr;
}

export function isAppLocale(value: string | null | undefined): value is AppLocale {
  return !!value && (LOCALES as string[]).includes(value);
}

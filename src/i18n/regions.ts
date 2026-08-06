import type { RegionOption } from '@/i18n/types';

/** Ülke/bölge → dil + timezone. Giriş ve onboarding seçicisi. */
export const REGIONS: RegionOption[] = [
  { id: 'TR', timezone: 'Europe/Istanbul', locale: 'tr', labelKey: 'TR' },
  { id: 'US', timezone: 'America/New_York', locale: 'en-US', labelKey: 'US' },
  { id: 'UK', timezone: 'Europe/London', locale: 'en-GB', labelKey: 'UK' },
  { id: 'DE', timezone: 'Europe/Berlin', locale: 'de', labelKey: 'DE' },
  { id: 'FR', timezone: 'Europe/Paris', locale: 'fr', labelKey: 'FR' },
  /** Arapça UI — varsayılan Riyad TZ (kullanıcı cihaz TZ ile override edilebilir). */
  { id: 'AR', timezone: 'Asia/Riyadh', locale: 'ar', labelKey: 'AR' },
];

export function regionById(id: string | null | undefined): RegionOption {
  return REGIONS.find((r) => r.id === id) ?? REGIONS[0];
}

export function regionByLocale(locale: string | null | undefined): RegionOption {
  return REGIONS.find((r) => r.locale === locale) ?? REGIONS[0];
}

/** Backend / AI için BCP-47 benzeri dil kodu. */
export function aiLanguageName(locale: string): string {
  switch (locale) {
    case 'tr':
      return 'Turkish';
    case 'en-GB':
      return 'British English';
    case 'de':
      return 'German';
    case 'fr':
      return 'French';
    case 'ar':
      return 'Arabic';
    case 'en-US':
    default:
      return 'American English';
  }
}

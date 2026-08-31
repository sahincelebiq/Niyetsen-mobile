import { coerceAppLocale, messagesFor } from '@/i18n/catalog';
import { getApiLocale } from '@/lib/api-locale';
import type { Messages } from '@/i18n/types';

/** API/servis katmanı — React hook yok, güncel locale'den kopya. */
export function uiCopy(): Messages {
  return messagesFor(coerceAppLocale(getApiLocale()) ?? 'tr');
}

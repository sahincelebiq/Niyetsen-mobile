/**
 * Yasal doküman bağlantıları.
 * Uygulama içi /legal/* diline göre metin gösterir.
 * Web URL'leri mağaza ve “Web’de aç” için yerel sayfaya gider.
 */
import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';
import { Linking, Platform } from 'react-native';

import type { LegalDocumentId } from '@/constants/legal';
import type { AppLocale } from '@/i18n/types';

export const LEGAL_APP_ROUTES: Record<LegalDocumentId, '/legal/privacy' | '/legal/kvkk' | '/legal/consent' | '/legal/terms'> =
  {
    privacy: '/legal/privacy',
    kvkk: '/legal/kvkk',
    consent: '/legal/consent',
    terms: '/legal/terms',
  };

const WEB_BY_LOCALE: Record<AppLocale, Record<LegalDocumentId | 'deletion', string>> = {
  tr: {
    privacy: 'https://niyetsen.com/gizlilik.html',
    kvkk: 'https://niyetsen.com/gizlilik.html',
    consent: 'https://niyetsen.com/gizlilik.html',
    terms: 'https://niyetsen.com/kullanim-kosullari.html',
    deletion: 'https://niyetsen.com/hesap-silme.html',
  },
  'en-US': {
    privacy: 'https://niyetsen.com/privacy.html',
    kvkk: 'https://niyetsen.com/privacy.html',
    consent: 'https://niyetsen.com/privacy.html',
    terms: 'https://niyetsen.com/terms.html',
    deletion: 'https://niyetsen.com/account-deletion.html',
  },
  'en-GB': {
    privacy: 'https://niyetsen.com/privacy.html',
    kvkk: 'https://niyetsen.com/privacy.html',
    consent: 'https://niyetsen.com/privacy.html',
    terms: 'https://niyetsen.com/terms.html',
    deletion: 'https://niyetsen.com/account-deletion.html',
  },
  de: {
    privacy: 'https://niyetsen.com/datenschutz.html',
    kvkk: 'https://niyetsen.com/datenschutz.html',
    consent: 'https://niyetsen.com/datenschutz.html',
    terms: 'https://niyetsen.com/nutzungsbedingungen.html',
    deletion: 'https://niyetsen.com/konto-loeschen.html',
  },
  fr: {
    privacy: 'https://niyetsen.com/confidentialite.html',
    kvkk: 'https://niyetsen.com/confidentialite.html',
    consent: 'https://niyetsen.com/confidentialite.html',
    terms: 'https://niyetsen.com/conditions.html',
    deletion: 'https://niyetsen.com/suppression-compte.html',
  },
  ar: {
    privacy: 'https://niyetsen.com/privacy-ar.html',
    kvkk: 'https://niyetsen.com/privacy-ar.html',
    consent: 'https://niyetsen.com/privacy-ar.html',
    terms: 'https://niyetsen.com/terms-ar.html',
    deletion: 'https://niyetsen.com/account-deletion-ar.html',
  },
};

/** Mağaza formları: İngilizce kanonik URL. */
export const STORE_PRIVACY_URL = 'https://niyetsen.com/privacy.html';
export const STORE_TERMS_URL = 'https://niyetsen.com/terms.html';
export const STORE_DELETION_URL = 'https://niyetsen.com/account-deletion.html';

export const LEGAL_WEB_URLS: Record<LegalDocumentId, string> = {
  privacy: STORE_PRIVACY_URL,
  kvkk: STORE_PRIVACY_URL,
  consent: STORE_PRIVACY_URL,
  terms: STORE_TERMS_URL,
};

export function legalWebUrl(
  id: LegalDocumentId | 'deletion',
  locale: AppLocale = 'en-US',
): string {
  return WEB_BY_LOCALE[locale]?.[id] ?? WEB_BY_LOCALE['en-US'][id];
}

export async function openLegalDocument(
  id: LegalDocumentId,
  locale: AppLocale = 'en-US',
): Promise<void> {
  const url = legalWebUrl(id, locale);
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.open(url, '_blank', 'noopener');
    return;
  }
  try {
    await openBrowserAsync(url, {
      presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
      dismissButtonStyle: 'close',
    });
  } catch {
    try {
      await Linking.openURL(url);
    } catch {
      // Sessiz: kullanıcı uygulama içi /legal ekranını kullanabilir.
    }
  }
}

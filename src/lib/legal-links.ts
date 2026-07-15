/**
 * Niyetsen — Yasal doküman web bağlantıları.
 * Uygulama içi /legal/* ekranları korunur; kullanıcıya dönük linkler artık
 * niyetsen.com üzerindeki güncel HTML sayfalarını uygulama içi tarayıcıda açar.
 * KVKK Aydınlatma ve Açık Rıza web'de ayrı sayfa olarak yayınlanana kadar
 * ilgili içerik gizlilik sayfasında yer alır; yayınlanınca URL'leri güncelle.
 */
import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';
import { Linking, Platform } from 'react-native';

import type { LegalDocumentId } from '@/constants/legal';

export const LEGAL_WEB_URLS: Record<LegalDocumentId, string> = {
  privacy: 'https://niyetsen.com/gizlilik.html',
  kvkk: 'https://niyetsen.com/gizlilik.html',
  consent: 'https://niyetsen.com/gizlilik.html',
  terms: 'https://niyetsen.com/kullanim-kosullari.html',
};

/** Yasal sayfayı uygulama içi tarayıcıda açar; başarısız olursa sistem tarayıcısına düşer. */
export async function openLegalDocument(id: LegalDocumentId): Promise<void> {
  const url = LEGAL_WEB_URLS[id];
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
    // In-app browser kullanılamıyorsa (ör. bazı Android WebView eksikleri)
    // sistem tarayıcısı son çare olarak denenir.
    try {
      await Linking.openURL(url);
    } catch {
      // Sessiz geç: link açılamadıysa kullanıcı uygulama içi ekranı kullanabilir.
    }
  }
}

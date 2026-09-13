/**
 * Merkezi hata raporu (06 — yatay altyapı).
 *
 * Tüm ekranlar hatayı buradan geçirir: `bildirHata(hata, 'bonus.load')`.
 * KVKK: sohbet içeriği, fotoğraf, e-posta, token loglanmaz — ekstra veri
 * `veriyiTemizle` ile maskelenir. Kullanıcı yalnız id ile bağlanır (PII yok).
 */
import { captureException as sentryYakala } from '@/lib/sentry';
import { isUygulamaHatasi, type UygulamaHatasi } from '@/lib/app-error';
import { veriyiTemizle } from '@/lib/pii-scrub';

export { metniTemizle, veriyiTemizle } from '@/lib/pii-scrub';

export type HataBaglami = {
  ekran?: string;
  hataKodu?: string;
  istekKimligi?: string;
  kullaniciId?: string;
  niyetId?: string;
  agDurumu?: string;
  ekstra?: Record<string, unknown>;
};

/**
 * Hatayı Sentry'ye gönderir (+ __DEV__'de konsola). DÖNÜŞ YOK — akışı kesmez.
 * PII asla eklenmez: `ekstra` otomatik temizlenir.
 */
export function bildirHata(hata: unknown, baglam: string, alan?: HataBaglami): void {
  const uygulamaHatasi = isUygulamaHatasi(hata) ? (hata as UygulamaHatasi) : undefined;
  const temizBaglam: HataBaglami = {
    ekran: alan?.ekran,
    hataKodu: uygulamaHatasi?.hataKodu ?? alan?.hataKodu,
    istekKimligi: uygulamaHatasi?.istekKimligi ?? alan?.istekKimligi,
    kullaniciId: alan?.kullaniciId,
    niyetId: alan?.niyetId,
    agDurumu: alan?.agDurumu,
    ekstra: alan?.ekstra ? (veriyiTemizle(alan.ekstra) as Record<string, unknown>) : undefined,
  };
  if (__DEV__) {
    console.warn(
      `[hata:${baglam}]`,
      uygulamaHatasi?.name ?? (hata instanceof Error ? hata.name : typeof hata),
      temizBaglam.hataKodu ?? '',
      // Teknik detay konsolda görünür ama EKRANA basılmaz.
      uygulamaHatasi?.teknikDetay ?? (hata instanceof Error ? hata.message : String(hata)),
    );
  }
  try {
    sentryYakala(
      hata,
      `${baglam}${temizBaglam.hataKodu ? `:${temizBaglam.hataKodu}` : ''}`,
      temizBaglam,
    );
  } catch {
    // Raporlama patlarsa ürün akışı etkilenmez.
  }
}

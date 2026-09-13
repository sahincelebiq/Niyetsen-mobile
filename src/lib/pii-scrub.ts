/**
 * KVKK PII temizliği — yaprak modül (döngüsel import yok).
 * Sentry `beforeSend` ve merkezi rapor (`error-report.ts`) burayı kullanır.
 */

const HASSAS_ANAHTAR = /(content|message|photo|image|email|token|password|secret|authorization|cookie|phone|telefon|e-posta|sohbet)/i;
const EPOSTA_DESENI = /[\w.+-]+@[\w-]+\.[\w.]+/g;
const URL_DESENI = /https?:\/\/\S+/g;
const JWT_DESENI = /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g;

/** PII içerebilecek serbest metni raporlanabilir hale getirir. */
export function metniTemizle(metin: string): string {
  return metin
    .replace(JWT_DESENI, '[token]')
    .replace(EPOSTA_DESENI, '[e-posta]')
    .replace(URL_DESENI, '[bağlantı]')
    .slice(0, 500);
}

/** Ekstra verideki hassas anahtarları maskeler (derinlik sınırlı, döngü güvenli). */
export function veriyiTemizle(deger: unknown, derinlik = 0): unknown {
  if (deger === null || deger === undefined) return deger;
  if (typeof deger === 'string') return metniTemizle(deger);
  if (typeof deger !== 'object' || derinlik > 3) {
    return typeof deger === 'object' ? '[nesne]' : deger;
  }
  if (Array.isArray(deger)) {
    return deger.slice(0, 10).map((o) => veriyiTemizle(o, derinlik + 1));
  }
  const giris = Object.entries(deger as Record<string, unknown>).slice(0, 30);
  const temiz: Record<string, unknown> = {};
  for (const [anahtar, alt] of giris) {
    temiz[anahtar] = HASSAS_ANAHTAR.test(anahtar) ? '[maskelendi]' : veriyiTemizle(alt, derinlik + 1);
  }
  return temiz;
}

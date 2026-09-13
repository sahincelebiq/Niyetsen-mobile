/**
 * Niyetsen hata taksonomisi (06 — yatay altyapı).
 *
 * Kural: kullanıcıya gösterilen metin HER ZAMAN i18n'den gelir
 * (`hataMesaji(hata, t)`). Ham `error.message`, stack, URL ve sağlayıcı adı
 * asla ekrana basılmaz — `teknikDetay` alanı yalnız log/Sentry yoluna gider.
 *
 * Diğer agent'lar için kullanım:
 *   try { ... } catch (deger) {
 *     const hata = siniflaHata(deger, 'BUGUN_YUKLEME_001');
 *     bildirHata(hata, 'daily.load');
 *     setHata(hata); // ekranda: <HataSatiri hata={hata} onRetry={...} />
 *   }
 */
import type { Messages } from '@/i18n/types';

/**
 * ApiError yapısal olarak tanınır (bilerek `instanceof` yok): testler ve
 * gelecekteki refactor'lar modül döngüsüne girmez, mapping yine çalışır.
 */
type ApiHataSekli = {
  status: number;
  message: string;
  code?: string;
  istekKimligi?: string;
  neden?: 'ag' | 'zaman-asimi' | 'http';
};

function apiHatasiMi(deger: unknown): deger is ApiHataSekli {
  if (typeof deger !== 'object' || deger === null) return false;
  const aday = deger as Record<string, unknown>;
  return typeof aday.status === 'number' && typeof aday.message === 'string';
}

export type HataTuru = 'ag' | 'sunucu' | 'yetki' | 'kota' | 'dogrulama' | 'beklenmeyen';

const TUR_ADI: Record<HataTuru, string> = {
  ag: 'AgHatasi',
  sunucu: 'SunucuHatasi',
  yetki: 'YetkiHatasi',
  kota: 'KotaHatasi',
  dogrulama: 'DogrulamaHatasi',
  beklenmeyen: 'BeklenmeyenHata',
};

export class UygulamaHatasi extends Error {
  readonly tur: HataTuru;
  /** Destek için: örn. `BUGUN_YUKLEME_001`. UI'da küçük gri satırda gösterilir. */
  readonly hataKodu: string;
  /** Uçtan uca eşleştirme: backend JSON logundaki `request_id` ile aynı değer. */
  readonly istekKimligi?: string;
  readonly tekrarDenebilir: boolean;
  /** ASLA render edilmez — yalnız Sentry/log. */
  readonly teknikDetay?: string;

  constructor(
    tur: HataTuru,
    hataKodu: string,
    options?: {
      istekKimligi?: string;
      tekrarDenebilir?: boolean;
      teknikDetay?: string;
      neden?: unknown;
    },
  ) {
    super(`${TUR_ADI[tur]}:${hataKodu}`);
    this.name = TUR_ADI[tur];
    this.tur = tur;
    this.hataKodu = hataKodu;
    this.istekKimligi = options?.istekKimligi;
    this.tekrarDenebilir = options?.tekrarDenebilir ?? (tur === 'ag' || tur === 'sunucu');
    this.teknikDetay = options?.teknikDetay;
    if (options?.neden !== undefined) {
      (this as { cause?: unknown }).cause = options.neden;
    }
  }
}

export class AgHatasi extends UygulamaHatasi {
  readonly zamanAsimi: boolean;
  constructor(hataKodu: string, options?: { zamanAsimi?: boolean; istekKimligi?: string; teknikDetay?: string; neden?: unknown }) {
    super('ag', hataKodu, { ...options, tekrarDenebilir: true });
    this.zamanAsimi = options?.zamanAsimi ?? false;
  }
}

export class SunucuHatasi extends UygulamaHatasi {
  readonly durum?: number;
  constructor(hataKodu: string, options?: { durum?: number; istekKimligi?: string; teknikDetay?: string; neden?: unknown }) {
    super('sunucu', hataKodu, { ...options, tekrarDenebilir: true });
    this.durum = options?.durum;
  }
}

export class YetkiHatasi extends UygulamaHatasi {
  constructor(hataKodu: string, options?: { istekKimligi?: string; teknikDetay?: string; neden?: unknown }) {
    super('yetki', hataKodu, { ...options, tekrarDenebilir: false });
  }
}

export class KotaHatasi extends UygulamaHatasi {
  /** true = hız sınırı (429); false = ödeme/kota (402/paywall). Mesaj farklıdır. */
  readonly hizSiniri: boolean;
  constructor(hataKodu: string, options?: { hizSiniri?: boolean; istekKimligi?: string; teknikDetay?: string; neden?: unknown }) {
    super('kota', hataKodu, { ...options, tekrarDenebilir: false });
    this.hizSiniri = options?.hizSiniri ?? false;
  }
}

export class DogrulamaHatasi extends UygulamaHatasi {
  /** Backend'in alan açıklaması (kısa, steril). Yoksa jenerik metin gösterilir. */
  readonly alanMesaji?: string;
  constructor(hataKodu: string, options?: { alanMesaji?: string; istekKimligi?: string; teknikDetay?: string; neden?: unknown }) {
    super('dogrulama', hataKodu, { ...options, tekrarDenebilir: false });
    this.alanMesaji = options?.alanMesaji;
  }
}

export class BeklenmeyenHata extends UygulamaHatasi {
  constructor(hataKodu: string, options?: { istekKimligi?: string; teknikDetay?: string; neden?: unknown }) {
    super('beklenmeyen', hataKodu, { ...options, tekrarDenebilir: true });
  }
}

export function isUygulamaHatasi(deger: unknown): deger is UygulamaHatasi {
  return deger instanceof UygulamaHatasi;
}

function teknikOzet(deger: unknown): string {
  if (deger instanceof Error) return `${deger.name}: ${deger.message}`.slice(0, 300);
  try {
    return String(deger).slice(0, 300);
  } catch {
    return 'bilinmeyen-hata';
  }
}

/**
 * Bilinmeyen bir throw değerini taksonomiye sokar. `hataKodu` her çağrı
 * noktasında sabit verilir (ör. `BUGUN_YUKLEME_001`) — destek bu kodla arar.
 */
export function siniflaHata(deger: unknown, hataKodu: string, istekKimligi?: string): UygulamaHatasi {
  if (deger instanceof UygulamaHatasi) return deger;
  const teknikDetay = teknikOzet(deger);

  if (apiHatasiMi(deger)) {
    const kod = deger.istekKimligi ?? istekKimligi;
    if (deger.neden === 'ag' || deger.status === 0) {
      return new AgHatasi(hataKodu, {
        zamanAsimi: deger.neden === 'zaman-asimi',
        istekKimligi: kod,
        teknikDetay,
        neden: deger,
      });
    }
    if (deger.status === 401 || deger.status === 403) {
      return new YetkiHatasi(hataKodu, { istekKimligi: kod, teknikDetay, neden: deger });
    }
    if (deger.status === 402 || deger.status === 429 || deger.code === 'paywall_required') {
      return new KotaHatasi(hataKodu, {
        hizSiniri: deger.status === 429 && deger.code !== 'paywall_required',
        istekKimligi: kod,
        teknikDetay,
        neden: deger,
      });
    }
    if (deger.status === 400 || deger.status === 422) {
      return new DogrulamaHatasi(hataKodu, {
        // 400/422 gövdesi kullanıcıya yönelik alan açıklaması taşıyabilir;
        // teknik sızıntı olmasın diye kısa ve steril tutulur.
        alanMesaji: sterilAlanMesaji(deger.message),
        istekKimligi: kod,
        teknikDetay,
        neden: deger,
      });
    }
    if (deger.status >= 500) {
      return new SunucuHatasi(hataKodu, { durum: deger.status, istekKimligi: kod, teknikDetay, neden: deger });
    }
    return new BeklenmeyenHata(hataKodu, { istekKimligi: kod, teknikDetay, neden: deger });
  }

  if (deger instanceof Error) {
    const ad = deger.name;
    const ileti = deger.message.toLowerCase();
    if (
      ad === 'AbortError'
      || ad === 'TimeoutError'
      || ileti.includes('abort')
      || ileti.includes('timeout')
      || ileti.includes('zaman aşımı')
    ) {
      return new AgHatasi(hataKodu, { zamanAsimi: true, istekKimligi, teknikDetay, neden: deger });
    }
    if (
      ileti.includes('network request failed')
      || ileti.includes('fetch failed')
      || ileti.includes('failed to fetch')
      || ileti.includes('load failed')
      || ileti.includes('bağlantı')
    ) {
      return new AgHatasi(hataKodu, { istekKimligi, teknikDetay, neden: deger });
    }
  }
  return new BeklenmeyenHata(hataKodu, { istekKimligi, teknikDetay, neden: deger });
}

/** Backend alan açıklamasını steril tut: URL/e-posta sızmasın, 140 karakteri aşmasın. */
function sterilAlanMesaji(metin: string): string | undefined {
  const temiz = metin
    .replace(/https?:\/\/\S+/g, '[bağlantı]')
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[e-posta]')
    .trim();
  if (!temiz || temiz.length > 140) return undefined;
  return temiz;
}

/**
 * Ekranda gösterilecek metin — daima i18n. `t` çağrı noktasının dilinden gelir,
 * bu yüzden yeni i18n anahtarı gerekmez; mevcut `common` + `paywall` kullanılır.
 */
export function hataMesaji(hata: UygulamaHatasi, t: Messages): string {
  switch (hata.tur) {
    case 'ag':
      return hata instanceof AgHatasi && hata.zamanAsimi ? t.common.timeout : t.common.unreachable;
    case 'sunucu':
      return t.common.starsUnreachable;
    case 'yetki':
      return t.common.sessionExpired;
    case 'kota':
      return hata instanceof KotaHatasi && hata.hizSiniri
        ? t.common.rateLimited
        : t.paywall.notYetActive;
    case 'dogrulama':
      return hata instanceof DogrulamaHatasi && hata.alanMesaji
        ? hata.alanMesaji
        : t.common.errorGeneric;
    case 'beklenmeyen':
      return t.common.errorGeneric;
  }
}

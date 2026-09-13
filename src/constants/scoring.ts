/**
 * Niyetsen — PUAN KURAL TABLOSU (tek gerçek kaynak, mobil taraf).
 *
 * OTORİTE: Puanı SUNUCU yazar (backend `app/services/scoring.py`; olay bazlı,
 * `olay_id` benzersiz kısıtıyla idempotent). Mobil hiçbir zaman yerel puan
 * eklemez; bu tablo yalnız
 *   1) tamamlama ÖNCESİ ipucu ("+50"),
 *   2) sunucu yanıtında puan yoksa gösterim yedeği,
 *   3) kilometre taşı kutlaması / ilerleme çubuğu
 * için okunur. Backend tablosu değişirse burası da değişir — başka yerde
 * `+50`, `10`, `−25` gibi sabit YAZMA; buradan oku (i18n metinleri dahil).
 *
 * ┌──────────────────────────────┬────────┬───────────────────────────────────┐
 * │ Kural                        │ Değer  │ Durum                              │
 * ├──────────────────────────────┼────────┼───────────────────────────────────┤
 * │ Ana plan görevi (kanıt/beyan)│ +50    │ CANLI (backend)                    │
 * │ Plan etkinliği "Yaptım"      │ +50    │ CANLI (kategori başına)            │
 * │ Bonus görev                  │ +10    │ CANLI — zinciri ETKİLEMEZ          │
 * │ Mazeret                      │ −25    │ CANLI — raporda görselleştirilmez  │
 * │ Kategori çubuğu tavanı       │ 1000   │ CANLI (rank ekranı görseli)        │
 * │ Fotoğraf kanıtı onay bonusu  │ +10    │ ÖNERİ — backend'e eklenmeli        │
 * │ Süre/zorluk çarpanı          │ ×1     │ ÖNERİ: yok (bkz. gerekçe)          │
 * │ Kilometre taşı 7/30/90/180   │ gün×10 │ ÖNERİ: 70 / 300 / 900 / 1800       │
 * │ Geriye dönük tamamlama       │ onarmaz│ ÜRÜN KARARI bekliyor (varsayılan)  │
 * └──────────────────────────────┴────────┴───────────────────────────────────┘
 *
 * ÖNERİ satırları `ProposedScoringRules` altındadır: ekranda PUAN olarak
 * gösterilmez (sunucu henüz yazmıyor), yalnız kutlama/ilerleme için okunur.
 * Ürün sahibi onaylayıp backend uygulayınca değer `ScoringRules`'a taşınır.
 *
 * Süre çarpanı gerekçesi: puan, davranışı (tamamlama) ödüllendirir; süreye
 * göre şişirmek 5 dakikalık alışkanlık görevlerini cezalandırır ve kullanıcıyı
 * uzun görev seçmeye iter. Zorluk sinyali yerine kilometre taşları kullanılır.
 */

export type CompletionKind = 'plan_gorev' | 'plan_etkinlik' | 'bonus';

export const MILESTONE_DAYS = [7, 30, 90, 180] as const;
export type MilestoneDay = (typeof MILESTONE_DAYS)[number];

/** CANLI kurallar — backend ile birebir. */
export const ScoringRules = {
  planGorevi: 50,
  planEtkinlik: 50,
  bonusGorev: 10,
  mazeret: -25,
  /** Rank ekranı kategori çubuğu tavanı (görsel; rütbe eşiğini backend belirler). */
  kategoriTavani: 1000,
  /**
   * Geriye dönük tamamlama (dünün görevini bugün kapatmak) kırılmış zinciri
   * onarır mı? Varsayılan HAYIR: backend geçmiş güne taşımayı zaten reddeder
   * ve "bugün bir halka at" daveti daha dürüsttür. Ürün sahibi değiştirebilir.
   */
  geriyeDonukOnarim: false,
} as const;

/** ÖNERİ kurallar — onay + backend bekliyor; puan olarak GÖSTERİLMEZ. */
export const ProposedScoringRules = {
  fotoKanitBonusu: 10,
  sureCarpani: 1,
  kilometreTaslari: { 7: 70, 30: 300, 90: 900, 180: 1800 } as Record<MilestoneDay, number>,
} as const;

/** Bonus görev ana planı, zinciri ve fotoğraf kanıtı görevlerini değiştirmez. */
export function affectsStreak(kind: CompletionKind): boolean {
  return kind !== 'bonus';
}

/** Plan ilerlemesini yalnız ana plan görevleri hareket ettirir. */
export function affectsPlanProgress(kind: CompletionKind): boolean {
  return kind === 'plan_gorev';
}

/**
 * Tamamlama öncesi / sunucu puan bildirmediğinde gösterilecek puan. Yalnız
 * CANLI kurallar; sunucu farklı verirse sunucu kazanır (`awardedPointsFromMessage`).
 */
export function pointsForCompletion(kind: CompletionKind): number {
  switch (kind) {
    case 'plan_gorev':
      return ScoringRules.planGorevi;
    case 'plan_etkinlik':
      return ScoringRules.planEtkinlik;
    case 'bonus':
      return ScoringRules.bonusGorev;
  }
}

/**
 * Sunucu mesajındaki "+N" puanı okur ("Halka tamamlandı · +50 puan").
 * Yoksa tabloya düşer — sunucu otoritesi korunur, ekran boş kalmaz.
 */
export function awardedPointsFromMessage(message: string | null | undefined, fallback: number): number {
  if (!message) return fallback;
  const match = message.match(/\+\s?(\d+)/);
  if (!match) return fallback;
  const value = Number(match[1]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function isMilestoneDay(days: number): days is MilestoneDay {
  return (MILESTONE_DAYS as readonly number[]).includes(days);
}

/** Önerilen kilometre taşı ödülü (kutlama metni için; puan sunucu yazar). */
export function milestoneReward(days: number): number {
  return isMilestoneDay(days) ? ProposedScoringRules.kilometreTaslari[days] : 0;
}

/**
 * Zincir `previous` → `next` geçişinde TAM olarak bir kilometre taşına
 * basıldı mı? Yalnız `next` bir taş ise ve `previous` onun altındaysa
 * tetiklenir; böylece aynı taş için ikinci kutlama/ödül oluşmaz.
 */
export function milestoneReached(previous: number, next: number): MilestoneDay | null {
  if (!isMilestoneDay(next)) return null;
  return previous < next ? next : null;
}

/** Bir sonraki kilometre taşı ve kalan gün ("30 güne 3 gün"). */
export function nextMilestone(days: number): { day: MilestoneDay; remaining: number } | null {
  for (const day of MILESTONE_DAYS) {
    if (days < day) return { day, remaining: day - days };
  }
  return null;
}

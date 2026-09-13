/**
 * DOMAIN OLAYI: `gorevTamamlandi` (saf otobüs; RN importu yok).
 *
 * Tamamlama → puan → zincir → rapor hattının TEK giriş kapısı. Kim tamamlarsa
 * tamamlasın (fotoğraf kanıtı, etkinlik "Yaptım", bonus, plan asistanı) bu
 * olayı yayınlar; ekranlar birbirini görmek için başka kanal kullanmaz.
 *
 * Akış (emitGorevTamamlandi):
 *   1. Olay defteri (idempotent): aynı `olayId` ikinci kez → hiçbir şey olmaz.
 *   2. Yerel zincir iyimser güncellenir (sunucu otoritedir; okuma anında
 *      `reconcileWithServer` ile düzeltilir). Kilometre taşı burada bir kez
 *      tespit edilir.
 *   3. Cache invalidation: ['gun', bugün], ['zincir'], ['puan','ozet'],
 *      ['rapor'], ['plan', planId] — ekranlar sessiz yenilenir.
 *   4. Aboneler (kutlama, analitik) uyandırılır.
 *
 * Not (04 ile sözleşme): plan/etkinlik motoru bu tipi üretir; `planAdimiId`
 * plan uyumu metriğini mümkün kılar. Tip burada tanımlıdır ki 04 ve 05 aynı
 * yükü konuşsun; alan adlarını değiştirmeden genişletin.
 */
import type { CompletionKind, MilestoneDay } from '@/constants/scoring';
import { EMPTY_LEDGER, ledgerApply, type Ledger } from '@/lib/completion-ledger';
import { CacheKeys, invalidate, type CacheKey } from '@/lib/query-cache';
import { applyCompletion, EMPTY_STREAK, localDayKey, type StreakState } from '@/lib/streak';

export type GorevTamamlandiOlayi = {
  /** Idempotency anahtarı — sunucudaki olay_id ile aynı (proof_id / occurrence_id / completion_id). */
  olayId: string;
  kaynak: CompletionKind;
  planId: string | null;
  /** Plan adımı kimliği (04): adım → etkinlik → tamamlama izlenebilirliği. */
  planAdimiId: string | null;
  /** Görev / etkinlik oluşumu / bonus teklifi kimliği. */
  hedefId: string;
  kategoriler: readonly string[];
  /** ISO zaman damgası. */
  tamamlandiAt: string;
  /** Sunucunun bildirdiği puan; yoksa tablo ipucu (gösterim). */
  puan: number;
  /** Sunucu yanıtı zincir uzunluğu taşıyorsa (etkinlik tamamlamada var). */
  zincir?: number | null;
};

export type GorevTamamlandiSonucu = {
  applied: boolean;
  puan: number;
  streak: StreakState;
  extended: boolean;
  milestone: MilestoneDay | null;
  invalidated: readonly CacheKey[];
};

type Subscriber = (olay: GorevTamamlandiOlayi, sonuc: GorevTamamlandiSonucu) => void;

const subscribers = new Set<Subscriber>();
let ledger: Ledger = EMPTY_LEDGER;
let streak: StreakState = EMPTY_STREAK;
let timeZone: string | undefined;
let persistLedger: ((next: Ledger) => void) | null = null;

/** `gorevTamamlandi` sonrası tazelenen anahtarların EKSİKSİZ listesi. */
export function gorevTamamlandiInvalidationKeys(
  olay: Pick<GorevTamamlandiOlayi, 'planId'>,
  today: string,
): CacheKey[] {
  return [
    CacheKeys.gun(today),
    CacheKeys.zincir(),
    CacheKeys.puanOzet(),
    CacheKeys.rapor(),
    CacheKeys.plan(olay.planId ?? undefined),
  ];
}

export function emitGorevTamamlandi(
  olay: GorevTamamlandiOlayi,
  options: { now?: number } = {},
): GorevTamamlandiSonucu {
  const now = options.now ?? Date.now();
  const applied = ledgerApply(ledger, olay.olayId, olay.puan, olay.tamamlandiAt);
  if (!applied.applied) {
    return {
      applied: false,
      puan: applied.puan,
      streak,
      extended: false,
      milestone: null,
      invalidated: [],
    };
  }
  ledger = applied.ledger;
  persistLedger?.(ledger);

  const applied2 = applyCompletion(streak, {
    kind: olay.kaynak,
    completedAt: olay.tamamlandiAt,
    timeZone,
  });
  streak = applied2.state;

  const today = localDayKey(now, timeZone);
  const keys = gorevTamamlandiInvalidationKeys(olay, today);
  invalidate(keys, now);

  const sonuc: GorevTamamlandiSonucu = {
    applied: true,
    puan: applied.puan,
    streak,
    extended: applied2.extended,
    milestone: applied2.milestone,
    invalidated: keys,
  };
  for (const subscriber of Array.from(subscribers)) {
    try {
      subscriber(olay, sonuc);
    } catch {
      // Bir abonenin hatası hattı kesmez.
    }
  }
  return sonuc;
}

export function subscribeGorevTamamlandi(subscriber: Subscriber): () => void {
  subscribers.add(subscriber);
  return () => {
    subscribers.delete(subscriber);
  };
}

/** Kalıcılık ve saat dilimi bağlantısı (gamification.ts tarafından kurulur). */
export function configureDomainEvents(config: {
  ledger?: Ledger;
  streak?: StreakState;
  timeZone?: string;
  persistLedger?: ((next: Ledger) => void) | null;
}): void {
  if (config.ledger) ledger = config.ledger;
  if (config.streak) streak = config.streak;
  if ('timeZone' in config) timeZone = config.timeZone;
  if ('persistLedger' in config) persistLedger = config.persistLedger ?? null;
}

/** Sunucu /me/state okunduğunda yerel zinciri otoriteyle hizalar. */
export function setLocalStreak(next: StreakState): void {
  streak = next;
}

export function getLocalStreak(): StreakState {
  return streak;
}

export function getLedger(): Ledger {
  return ledger;
}

/** Yalnız testler için. */
export function resetDomainEventsForTests(): void {
  subscribers.clear();
  ledger = EMPTY_LEDGER;
  streak = EMPTY_STREAK;
  timeZone = undefined;
  persistLedger = null;
}

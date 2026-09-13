/**
 * ZİNCİR MANTIĞI — tek yer, yorumlu. Saf fonksiyonlar; React/RN importu YOK
 * (node:test ile doğrudan test edilir).
 *
 * Kurallar
 * - ARTAR: o YEREL günde en az bir PLAN KAYNAKLI tamamlama (ana plan görevi
 *   veya plan etkinliği) varsa ve önceki aktif gün "dün" ise +1. Aynı gün
 *   ikinci tamamlama artırmaz.
 * - KIRILIR: yerel gün sonu (23:59) hiç plan kaynaklı tamamlama yoksa. Yani
 *   son aktif gün ≤ evvelsi gün olduğunda zincir 0'a düşer.
 * - NE ZAMAN HESAPLANIR: gece yarısı job'ı DEĞİL, OKUMA ANINDA (lazy,
 *   `settleStreak`). Gerekçe: çevrimdışı kullanıcının cihazı gece yarısı
 *   sunucuya ulaşamaz; job kaçırılırsa zincir hayalet gibi yaşar. Okuma anı
 *   cihaz saati + saat dilimiyle her zaman doğru sonucu verir; backend aynı
 *   kuralı GET /me/state'te uygular, iki taraf aynı fonksiyonu yansıtır.
 * - BONUS görev zincire DOKUNMAZ (bkz. scoring.affectsStreak).
 * - GERİYE DÖNÜK tamamlama zinciri onarmaz (ScoringRules.geriyeDonukOnarim);
 *   ürün sahibi açarsa `creditDay` ile o gün kredilendirilir.
 * - TON: kırılma bir "kayıp + yeniden başla" anıdır; bu modül metin üretmez,
 *   ekran `chain.brokenGentle` ile davet eder — suçlama yok.
 */
import { affectsStreak, milestoneReached, ScoringRules, type CompletionKind, type MilestoneDay } from '@/constants/scoring';

export type StreakState = {
  streakLen: number;
  bestStreak: number;
  /** Zincirin son kredilendiği yerel gün (YYYY-MM-DD); hiç yoksa null. */
  lastActiveDay: string | null;
};

export const EMPTY_STREAK: StreakState = { streakLen: 0, bestStreak: 0, lastActiveDay: null };

const DAY_MS = 86_400_000;
const DAY_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

/**
 * Bir anın, verilen saat diliminde hangi YEREL güne düştüğü (YYYY-MM-DD).
 * `timeZone` verilmezse cihazın yerel saati kullanılır. Intl desteklenmiyorsa
 * (çok eski Hermes) cihaz yereline düşer — zincir asla çökmez.
 */
export function localDayKey(at: Date | string | number, timeZone?: string): string {
  const date = at instanceof Date ? at : new Date(at);
  if (Number.isNaN(date.getTime())) {
    throw new RangeError('localDayKey: geçersiz tarih');
  }
  if (timeZone) {
    try {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).formatToParts(date);
      const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
      const key = `${get('year')}-${get('month')}-${get('day')}`;
      if (DAY_KEY.test(key)) return key;
    } catch {
      // Intl/timeZone desteklenmiyor → cihaz yereline düş.
    }
  }
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function dayKeyToUtcMs(day: string): number {
  const match = DAY_KEY.exec(day);
  if (!match) throw new RangeError(`dayKey bekleniyor (YYYY-MM-DD): ${day}`);
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

/** `to - from` gün farkı (takvim günü; saat dilimi bağımsız). */
export function dayDiff(from: string, to: string): number {
  return Math.round((dayKeyToUtcMs(to) - dayKeyToUtcMs(from)) / DAY_MS);
}

export function shiftDayKey(day: string, delta: number): string {
  const date = new Date(dayKeyToUtcMs(day) + delta * DAY_MS);
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

export type SettleResult = { state: StreakState; broken: boolean };

/**
 * OKUMA ANI değerlendirmesi. Bugün veya dün aktifse zincir yaşar; son aktif
 * gün daha eskiyse kırılmış sayılır (0). `bestStreak` asla düşmez —
 * "23 günlük izin senin" cümlesi bu sayıya yaslanır.
 */
export function settleStreak(state: StreakState, today: string): SettleResult {
  if (!state.lastActiveDay || state.streakLen === 0) {
    return { state: { ...state, streakLen: 0 }, broken: false };
  }
  const gap = dayDiff(state.lastActiveDay, today);
  if (gap <= 1) return { state, broken: false };
  return {
    state: { ...state, streakLen: 0 },
    broken: true,
  };
}

export type CompletionInput = {
  kind: CompletionKind;
  /** Tamamlama anı (ISO veya Date). */
  completedAt: Date | string | number;
  /** IANA saat dilimi (profil.timezone, ör. "Europe/Istanbul"). */
  timeZone?: string;
  /**
   * Geriye dönük tamamlamada kredilendirilecek gün (görevin günü). Yalnız
   * ScoringRules.geriyeDonukOnarim açıkken dikkate alınır.
   */
  creditDay?: string;
};

export type ApplyResult = {
  state: StreakState;
  /** Zincir bu olayla uzadı mı (aynı gün ikinci tamamlama → false). */
  extended: boolean;
  /** Olay öncesi zincir kırık bulunup 1'den başladı mı. */
  restarted: boolean;
  /** Tam bu olayla basılan kilometre taşı (7/30/90/180) — bir kez. */
  milestone: MilestoneDay | null;
  /** Olayın kredilendiği yerel gün. */
  creditedDay: string;
};

/**
 * Tamamlama olayını zincire uygular. Bonus → dokunmaz. Gün sınırı yerel saat
 * dilimine göre çizilir (23:59 → 00:01 iki ayrı gündür).
 */
export function applyCompletion(state: StreakState, input: CompletionInput): ApplyResult {
  const completionDay = localDayKey(input.completedAt, input.timeZone);
  const creditedDay =
    ScoringRules.geriyeDonukOnarim && input.creditDay ? input.creditDay : completionDay;

  if (!affectsStreak(input.kind)) {
    return { state, extended: false, restarted: false, milestone: null, creditedDay };
  }

  if (state.lastActiveDay && dayDiff(state.lastActiveDay, creditedDay) <= 0) {
    // Aynı gün (veya onarım kapalıyken geçmiş gün): zaten kredili.
    return { state, extended: false, restarted: false, milestone: null, creditedDay };
  }

  const settled = settleStreak(state, creditedDay).state;
  const previous = settled.streakLen;
  const restarted = previous === 0 && state.streakLen > 0;
  const nextLen = previous + 1;
  const next: StreakState = {
    streakLen: nextLen,
    bestStreak: Math.max(settled.bestStreak, nextLen),
    lastActiveDay: creditedDay,
  };
  return {
    state: next,
    extended: true,
    restarted,
    milestone: milestoneReached(previous, nextLen),
    creditedDay,
  };
}

/**
 * Sunucu `/me/state` ile yerel durumu birleştirir: sunucu otoritedir; yerel
 * yalnız `lastActiveDay`'i taşır (sunucu göndermiyorsa). Sunucu zinciri daha
 * uzunsa (başka cihazda tamamlama) sunucu kazanır; kısaysa da kazanır — yerel
 * iyimser artış çevrimdışı gösterim içindir, kalıcı değildir.
 */
export function reconcileWithServer(
  local: StreakState,
  server: { streak_len: number; best_streak: number; last_active_day?: string | null },
  today: string,
): StreakState {
  const lastActiveDay =
    server.last_active_day
    ?? (server.streak_len > 0 ? (local.lastActiveDay ?? today) : null);
  return {
    streakLen: Math.max(0, server.streak_len),
    bestStreak: Math.max(server.best_streak, local.bestStreak, server.streak_len),
    lastActiveDay,
  };
}

/**
 * Oyunlaştırma köprüsü (React Native tarafı).
 *
 * Saf çekirdek (`domain-events`, `completion-ledger`, `streak`, `query-cache`)
 * RN'den habersizdir; bu dosya onu cihaza bağlar:
 *   - olay defteri AsyncStorage'da kalıcıdır (çevrimdışı kuyruk tekrarına karşı),
 *   - profil saat dilimi zincir gün sınırını çizer,
 *   - `/me/state` her okunduğunda yerel zincir sunucuyla hizalanır,
 *   - rapor anlık görüntüsü tamamlama sonrası temizlenir.
 *
 * Ekranlar YALNIZ buradaki `emitGorevTamamlandi`'yi çağırır (domain-events'i
 * doğrudan değil) — böylece kalıcılık kurulmadan olay yayınlanamaz.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  configureDomainEvents,
  emitGorevTamamlandi as emitCore,
  getLocalStreak,
  setLocalStreak,
  subscribeGorevTamamlandi,
  type GorevTamamlandiOlayi,
  type GorevTamamlandiSonucu,
} from '@/lib/domain-events';
import { parseLedger, pruneLedger, type Ledger } from '@/lib/completion-ledger';
import type { StateResponse } from '@/lib/api';
import { clearReportSnapshots } from '@/lib/report-snapshot';
import { localDayKey, reconcileWithServer } from '@/lib/streak';

const LEDGER_KEY = 'niyetsen.gamification.ledger.v1';
const LEDGER_KEEP_DAYS = 14;

let hydration: Promise<void> | null = null;
let activeTimeZone: string | undefined;

function persist(next: Ledger): void {
  void AsyncStorage.setItem(LEDGER_KEY, JSON.stringify(next)).catch(() => {
    // Kalıcılık başarısızsa oturum içi defter yine korur; sunucu nihai otorite.
  });
}

async function hydrate(): Promise<void> {
  let ledger: Ledger = parseLedger(null);
  try {
    const raw = await AsyncStorage.getItem(LEDGER_KEY);
    const threshold = new Date(Date.now() - LEDGER_KEEP_DAYS * 86_400_000).toISOString();
    ledger = pruneLedger(parseLedger(raw), threshold);
  } catch {
    // Okunamazsa boş defterle başla.
  }
  configureDomainEvents({ ledger, persistLedger: persist, timeZone: activeTimeZone });
}

/** İlk çağrıda defteri diskten yükler; sonraki çağrılar aynı sözü döndürür. */
export function ensureGamificationReady(): Promise<void> {
  if (!hydration) hydration = hydrate();
  return hydration;
}

/** Profil saat dilimi (IANA) — zincir gün sınırı bununla çizilir. */
export function setGamificationTimeZone(timeZone: string | null | undefined): void {
  activeTimeZone = timeZone || undefined;
  configureDomainEvents({ timeZone: activeTimeZone });
}

export function gamificationToday(): string {
  return localDayKey(Date.now(), activeTimeZone);
}

/**
 * Tek giriş kapısı: tamamlama → defter → zincir → invalidation → aboneler.
 * Kalıcılık hazır değilse bekler (ilk saniyeler); idempotency asla atlanmaz.
 */
export async function emitGorevTamamlandi(
  olay: GorevTamamlandiOlayi,
): Promise<GorevTamamlandiSonucu> {
  await ensureGamificationReady();
  return emitCore(olay);
}

/** `/me/state` yanıtı gelince yerel zinciri sunucu otoritesiyle hizala. */
export function recordServerState(
  state: Pick<StateResponse, 'streak_len' | 'best_streak' | 'last_active_day'>,
): void {
  setLocalStreak(reconcileWithServer(getLocalStreak(), state, gamificationToday()));
}

// Rapor anlık görüntüsü tamamlama sonrası bayattır; bir sonraki açılış taze çeker.
subscribeGorevTamamlandi(() => {
  void clearReportSnapshots();
});

export { subscribeGorevTamamlandi } from '@/lib/domain-events';
export type { GorevTamamlandiOlayi, GorevTamamlandiSonucu } from '@/lib/domain-events';

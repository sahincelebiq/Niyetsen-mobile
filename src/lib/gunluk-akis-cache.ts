/**
 * Bugün önbelleği — saf kurallar (RN importu yok).
 *
 * Kök neden: `boot-cache` içindeki `niyetsen.boot.daily.v1` yazılıp
 * okunmuyordu; Bugün `gunluk-akis` kullanıyor. Bu dosya o akışın
 * "hangi kayıt bugün / bu kullanıcı" ve "iskelet mi boş mu" kararını tutar.
 */

export type PersistedGunluk<T> = {
  date: string;
  savedAt: number;
  userId?: string;
  payload: T;
};

export function isFreshGunlukRecord<T>(
  record: PersistedGunluk<T> | null | undefined,
  today: string,
  userId: string | null,
): record is PersistedGunluk<T> {
  if (!record || !record.payload || record.date !== today) return false;
  if (userId && record.userId && record.userId !== userId) return false;
  return true;
}

/**
 * İlk kare: hidrate bitmeden veya ilk fetch dururken boş kart yok.
 * Hata varken iskelet yok — error-banner yolu açılır.
 */
export function shouldShowDailySkeleton(state: {
  data: unknown;
  loading: boolean;
  hydrated: boolean;
  error: unknown;
  stale: boolean;
}): boolean {
  if (state.data) return false;
  if (state.error) return false;
  return !state.hydrated || state.loading || state.stale;
}

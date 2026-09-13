/**
 * Anahtar tabanlı CACHE INVALIDATION otobüsü (saf; RN importu yok).
 *
 * Ekranlar kendi verisini kendi `load()` fonksiyonuyla çeker; bu modül yalnız
 * "şu anahtar bayatladı" sinyalini taşır. `useWarmFocusReload` bu sinyali
 * dinler: ekran odaktaysa sessiz yeniler, değilse bir sonraki odakta
 * yeniler. Kullanıcı hiçbir ekranı elle yenilemek zorunda kalmaz.
 *
 * Anahtar eşleşmesi ÖN EK mantığıyla çalışır: `['rapor']` geçersiz kılınırsa
 * `['rapor','7d']`'yi dinleyen de tetiklenir (ve tersi).
 */

export type CacheKey = readonly [string, ...(string | number)[]];

export const CacheKeys = {
  /** Bugün ekranı: görevler + etkinlikler + günün ilerlemesi; gün verilmezse tüm günler. */
  gun: (day?: string): CacheKey => (day ? ['gun', day] : ['gun']),
  /** Zincir (rank ekranı hero + sohbet başlığı). */
  zincir: (): CacheKey => ['zincir'],
  /** Puan özeti (kategori puanları, toplam, rütbe). */
  puanOzet: (): CacheKey => ['puan', 'ozet'],
  /** Rapor paneli; dönem verilmezse tüm dönemler. */
  rapor: (period?: string): CacheKey => (period ? ['rapor', period] : ['rapor']),
  /** Planım (vizyon panosu + etkinlik listesi). */
  plan: (planId?: string): CacheKey => (planId ? ['plan', planId] : ['plan']),
} as const;

export function keysOverlap(a: CacheKey, b: CacheKey): boolean {
  const shorter = a.length <= b.length ? a : b;
  const longer = shorter === a ? b : a;
  return shorter.every((part, index) => String(part) === String(longer[index]));
}

export function keyToString(key: CacheKey): string {
  return key.map(String).join('/');
}

type Listener = { keys: readonly CacheKey[] | 'all'; callback: (hit: CacheKey) => void };

const listeners = new Set<Listener>();
let lastInvalidation = 0;
const lastByKey = new Map<string, number>();

/**
 * Anahtarları bayat işaretle ve dinleyicileri uyandır. Aynı senkron döngüde
 * gelen çoklu anahtarlar için dinleyici EN FAZLA bir kez çağrılır (aynı ekran
 * beş anahtarın beşini dinliyorsa tek yenileme yapar).
 */
export function invalidate(keys: readonly CacheKey[], now: number = Date.now()): void {
  if (keys.length === 0) return;
  lastInvalidation = Math.max(lastInvalidation, now);
  for (const key of keys) lastByKey.set(keyToString(key), now);
  for (const listener of Array.from(listeners)) {
    const hit =
      listener.keys === 'all'
        ? keys[0]
        : keys.find((key) => listener.keys !== 'all' && listener.keys.some((own) => keysOverlap(own, key)));
    if (hit) {
      try {
        listener.callback(hit);
      } catch {
        // Bir dinleyicinin hatası diğerlerini durdurmasın.
      }
    }
  }
}

export function subscribeInvalidation(
  keys: readonly CacheKey[] | 'all',
  callback: (hit: CacheKey) => void,
): () => void {
  const listener: Listener = { keys, callback };
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Son geçersiz kılma zamanı (ms). Odak yenilemesi bununla karşılaştırılır. */
export function lastInvalidatedAt(keys?: readonly CacheKey[]): number {
  if (!keys) return lastInvalidation;
  let latest = 0;
  for (const [stored, at] of lastByKey) {
    const storedKey = stored.split('/') as unknown as CacheKey;
    if (keys.some((key) => keysOverlap(key, storedKey))) latest = Math.max(latest, at);
  }
  return latest;
}

/** Yalnız testler için. */
export function resetInvalidationForTests(): void {
  listeners.clear();
  lastInvalidation = 0;
  lastByKey.clear();
}

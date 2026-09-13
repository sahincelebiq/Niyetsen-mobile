/**
 * İDEMPOTENT OLAY DEFTERİ (saf çekirdek).
 *
 * Sunucu `olay_id` için veritabanı seviyesinde benzersiz kısıt uygular (ikinci
 * puan kaydı yazılamaz). Bu defter aynı garantiyi İSTEMCİ tarafında verir:
 * çift dokunma, retry ve çevrimdışı kuyruğun tekrar oynatması aynı `olayId`
 * ile gelir → ikinci uygulama `applied: false` döner; kutlama, puan
 * animasyonu ve cache invalidation ikinci kez çalışmaz.
 *
 * Kayıt biçimi bilinçli olarak küçük tutulur: { puan, at }. Kalıcılık
 * (AsyncStorage) bu modülün dışında, `gamification.ts` içinde bağlanır.
 */

export type LedgerEntry = { puan: number; at: string };
export type Ledger = Readonly<Record<string, LedgerEntry>>;

export const EMPTY_LEDGER: Ledger = Object.freeze({});

export type LedgerApplyResult = {
  ledger: Ledger;
  /** İlk kez uygulandı mı? false = aynı olay daha önce işlendi. */
  applied: boolean;
  /** Bu olay için (ilk uygulamada) yazılan puan. */
  puan: number;
};

export function ledgerHas(ledger: Ledger, olayId: string): boolean {
  return Object.prototype.hasOwnProperty.call(ledger, olayId);
}

export function ledgerApply(
  ledger: Ledger,
  olayId: string,
  puan: number,
  at: string,
): LedgerApplyResult {
  if (!olayId) throw new RangeError('ledgerApply: olayId boş olamaz');
  if (ledgerHas(ledger, olayId)) {
    return { ledger, applied: false, puan: ledger[olayId].puan };
  }
  return {
    ledger: Object.freeze({ ...ledger, [olayId]: { puan, at } }),
    applied: true,
    puan,
  };
}

export function ledgerTotal(ledger: Ledger): number {
  return Object.values(ledger).reduce((sum, entry) => sum + entry.puan, 0);
}

/**
 * Eski kayıtları budar; sunucu zaten kalıcı kısıt uyguladığı için istemci
 * defterinin yalnız yakın geçmişi (retry penceresi) tutması yeterlidir.
 */
export function pruneLedger(ledger: Ledger, olderThanIso: string): Ledger {
  const threshold = Date.parse(olderThanIso);
  if (!Number.isFinite(threshold)) return ledger;
  const kept: Record<string, LedgerEntry> = {};
  for (const [id, entry] of Object.entries(ledger)) {
    const at = Date.parse(entry.at);
    if (!Number.isFinite(at) || at >= threshold) kept[id] = entry;
  }
  return Object.freeze(kept);
}

/** AsyncStorage'dan gelen ham JSON'u güvenle deftere çevirir. */
export function parseLedger(raw: string | null | undefined): Ledger {
  if (!raw) return EMPTY_LEDGER;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return EMPTY_LEDGER;
    const entries: Record<string, LedgerEntry> = {};
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (
        value
        && typeof value === 'object'
        && typeof (value as LedgerEntry).puan === 'number'
        && typeof (value as LedgerEntry).at === 'string'
      ) {
        entries[id] = { puan: (value as LedgerEntry).puan, at: (value as LedgerEntry).at };
      }
    }
    return Object.freeze(entries);
  } catch {
    return EMPTY_LEDGER;
  }
}

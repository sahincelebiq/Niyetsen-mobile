/**
 * Paywall katalog görünümü — fiyat ASLA uydurulmaz.
 * Mağaza yalnızca aylık veya yalnızca yıllık dönerse eksik kart
 * "Fiyat yükleniyor…" diye bırakılmaz; o paket gizlenir.
 */

export type PaywallCatalogState = 'loading' | 'ready' | 'unavailable';

export function paywallCatalogFromPrices(
  monthly: string | null,
  yearly: string | null,
): {
  state: 'ready' | 'unavailable';
  showMonthly: boolean;
  showYearly: boolean;
} {
  const showMonthly = Boolean(monthly);
  const showYearly = Boolean(yearly);
  return {
    state: showMonthly || showYearly ? 'ready' : 'unavailable',
    showMonthly,
    showYearly,
  };
}

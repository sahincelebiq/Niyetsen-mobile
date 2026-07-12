/**
 * RevenueCat iskeleti — gerçek IAP yalnız development/production build'de.
 * Expo Go'da backend `/me/subscription` durumu ve paywall UI çalışır.
 */
import { Platform } from 'react-native';

export type PurchasePlan = 'monthly' | 'yearly';

export type PurchaseResult =
  | { ok: true; plan: PurchasePlan }
  | { ok: false; message: string };

const REVENUECAT_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY?.trim();

export function purchasesAvailable(): boolean {
  return Boolean(REVENUECAT_KEY) && Platform.OS !== 'web';
}

export async function purchasePlan(plan: PurchasePlan): Promise<PurchaseResult> {
  if (!purchasesAvailable()) {
    return {
      ok: false,
      message:
        'Mağaza satın alması Expo Go’da çalışmaz. TestFlight/EAS build ile dene; ' +
        'şimdilik backend deneme süresi aktif.',
    };
  }
  // FAZ 5: react-native-purchases entegrasyonu bir sonraki build adımında.
  return {
    ok: false,
    message: 'RevenueCat SDK henüz bağlanmadı. Webhook + backend abonelik hazır.',
  };
}

export async function restorePurchases(): Promise<PurchaseResult> {
  if (!purchasesAvailable()) {
    return {
      ok: false,
      message: 'Geri yükleme yalnız mağaza build’inde kullanılabilir.',
    };
  }
  return {
    ok: false,
    message: 'RevenueCat SDK henüz bağlanmadı.',
  };
}

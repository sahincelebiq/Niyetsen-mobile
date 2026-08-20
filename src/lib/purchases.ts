/**
 * RevenueCat IAP — Supabase user id = app_user_id (webhook ile backend senkron).
 * Expo Go'da Preview API Mode; gerçek satın alma için EAS/dev build gerekir.
 */
import { Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL,
  PACKAGE_TYPE,
  type PurchasesError,
  type PurchasesPackage,
} from 'react-native-purchases';

export type PurchasePlan = 'monthly' | 'yearly';

export type PurchaseResult =
  | { ok: true; plan: PurchasePlan }
  | { ok: false; message: string };

export type StorePrices = {
  monthly: string | null;
  yearly: string | null;
};

const ENTITLEMENT_ID =
  process.env.EXPO_PUBLIC_RC_ENTITLEMENT_ID?.trim() || 'premium';

const PACKAGE_IDS: Record<PurchasePlan, string | undefined> = {
  monthly: process.env.EXPO_PUBLIC_RC_MONTHLY_PACKAGE?.trim(),
  yearly: process.env.EXPO_PUBLIC_RC_YEARLY_PACKAGE?.trim(),
};

let configured = false;
let configureTask: Promise<void> | null = null;

/**
 * Yalnız gerçek RevenueCat public SDK anahtarını kabul et.
 * eas.json'a yanlışlıkla `$EXPO_PUBLIC_...` gibi çözülmemiş bir yer tutucu
 * girerse anahtar "dolu" görünüp Purchases.configure sessizce patlıyordu;
 * uygulama satın alınabilir sanılıp App Review'da reddedilirdi.
 */
function validKey(value: string | undefined): string | undefined {
  const key = value?.trim();
  if (!key) return undefined;
  if (!/^(appl|goog|amzn|rcb)_[A-Za-z0-9]+$/.test(key)) {
    if (__DEV__) {
      console.warn(
        `[purchases] Geçersiz RevenueCat anahtarı yok sayıldı: "${key.slice(0, 12)}…" `
        + '(appl_/goog_ önekli public SDK anahtarı bekleniyor)',
      );
    }
    return undefined;
  }
  return key;
}

function getApiKey(): string | undefined {
  if (Platform.OS === 'ios') {
    return (
      validKey(process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY)
      || validKey(process.env.EXPO_PUBLIC_REVENUECAT_API_KEY)
    );
  }
  if (Platform.OS === 'android') {
    return (
      validKey(process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY)
      || validKey(process.env.EXPO_PUBLIC_REVENUECAT_API_KEY)
    );
  }
  return undefined;
}

function isPurchasesError(error: unknown): error is PurchasesError {
  return typeof error === 'object' && error !== null && 'userCancelled' in error;
}

function pickPackage(
  packages: PurchasesPackage[],
  plan: PurchasePlan,
): PurchasesPackage | undefined {
  const explicitId = PACKAGE_IDS[plan];
  if (explicitId) {
    const byId = packages.find(
      (item) => item.identifier === explicitId || item.product.identifier === explicitId,
    );
    if (byId) return byId;
  }
  const targetType = plan === 'monthly' ? PACKAGE_TYPE.MONTHLY : PACKAGE_TYPE.ANNUAL;
  return packages.find((item) => item.packageType === targetType);
}

export function purchasesAvailable(): boolean {
  return Boolean(getApiKey()) && Platform.OS !== 'web';
}

export async function configurePurchases(appUserId?: string): Promise<void> {
  if (Platform.OS === 'web' || !getApiKey()) return;
  if (!configureTask) {
    configureTask = (async () => {
      try {
        Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.WARN);
        Purchases.configure({
          apiKey: getApiKey()!,
          appUserID: appUserId,
        });
        configured = true;
      } catch {
        configureTask = null;
      }
    })();
  }
  await configureTask;
  if (!configured || !appUserId) return;
  try {
    await Purchases.logIn(appUserId);
  } catch {
    // Oturum zaten bağlı olabilir; webhook senkronu yine çalışır.
  }
}

export async function logOutPurchases(): Promise<void> {
  if (!configured || Platform.OS === 'web') return;
  try {
    await Purchases.logOut();
  } catch {
    // Sessiz — çıkış akışını bloklamasın.
  }
}

export async function getStorePrices(): Promise<StorePrices> {
  if (!purchasesAvailable()) {
    return { monthly: null, yearly: null };
  }
  // Paywall, auth sağlayıcısı configure'u bitirmeden açılabiliyordu; beklemeden
  // çağırınca configured=false olup fiyatlar hep null dönüyordu → ekranda sabit
  // "150 TL" görünüyordu. Mağaza fiyatı ASLA uydurulmaz (App Store 3.1.2).
  await configurePurchases();
  if (!configured) {
    return { monthly: null, yearly: null };
  }
  try {
    const offerings = await Purchases.getOfferings();
    const packages = offerings.current?.availablePackages ?? [];
    const monthly = pickPackage(packages, 'monthly');
    const yearly = pickPackage(packages, 'yearly');
    return {
      monthly: monthly?.product.priceString ?? null,
      yearly: yearly?.product.priceString ?? null,
    };
  } catch {
    return { monthly: null, yearly: null };
  }
}

export function subscribeToPurchaseUpdates(onUpdate: () => void): () => void {
  if (Platform.OS === 'web' || !getApiKey()) return () => {};
  Purchases.addCustomerInfoUpdateListener(onUpdate);
  // Dinleyici gerçekten kaldırılmalı — no-op dönmek her remount'ta yeni
  // listener biriktiriyor ve unmount sonrası setState'e yol açıyordu.
  return () => {
    Purchases.removeCustomerInfoUpdateListener(onUpdate);
  };
}

/**
 * Mağaza satın alması bu build'de mümkün mü? Paywall bunu kullanarak butonları
 * gizler — yoksa App Review "satın alınamayan paywall" diye reddeder.
 */
export function storeUnavailableReason(): string | null {
  if (Platform.OS === 'web') return 'store_unsupported_platform';
  if (!getApiKey()) return 'store_not_configured';
  return null;
}

export async function purchasePlan(plan: PurchasePlan): Promise<PurchaseResult> {
  if (!purchasesAvailable()) {
    return {
      ok: false,
      message: __DEV__
        ? 'Mağaza satın alması Expo Go’da çalışmaz. TestFlight veya EAS build ile dene.'
        : 'Mağaza şu an ulaşılamıyor. Birazdan tekrar dener misin?',
    };
  }
  await configurePurchases();
  if (!configured) {
    return {
      ok: false,
      message: __DEV__
        ? 'RevenueCat yapılandırılamadı. EXPO_PUBLIC_REVENUECAT_API_KEY kontrol et.'
        : 'Mağaza şu an ulaşılamıyor. Birazdan tekrar dener misin?',
    };
  }

  try {
    const offerings = await Purchases.getOfferings();
    const packages = offerings.current?.availablePackages ?? [];
    const selected = pickPackage(packages, plan);
    if (!selected) {
      return {
        ok: false,
        message: 'Mağaza paketi bulunamadı. RevenueCat offering ayarlarını kontrol et.',
      };
    }

    const { customerInfo } = await Purchases.purchasePackage(selected);
    const active = customerInfo.entitlements.active[ENTITLEMENT_ID];
    if (!active) {
      return {
        ok: false,
        message:
          'Satın alma tamamlandı ama abonelik henüz aktif görünmüyor. Birkaç saniye sonra tekrar dene.',
      };
    }
    return { ok: true, plan };
  } catch (error) {
    if (isPurchasesError(error) && error.userCancelled) {
      return { ok: false, message: 'Satın alma iptal edildi.' };
    }
    const message = error instanceof Error
      ? error.message
      : 'Satın alma tamamlanamadı. Birazdan tekrar dener misin?';
    return { ok: false, message };
  }
}

export async function restorePurchases(): Promise<PurchaseResult> {
  if (!purchasesAvailable()) {
    return {
      ok: false,
      message: 'Geri yükleme yalnız mağaza build’inde kullanılabilir.',
    };
  }
  await configurePurchases();
  if (!configured) {
    return { ok: false, message: 'Mağaza şu an ulaşılamıyor. Birazdan tekrar dene.' };
  }

  try {
    const customerInfo = await Purchases.restorePurchases();
    const active = customerInfo.entitlements.active[ENTITLEMENT_ID];
    if (!active) {
      return {
        ok: false,
        message: 'Geri yüklenecek aktif abonelik bulunamadı.',
      };
    }
    // Sabit 'monthly' dönmek yıllık aboneyi analitikte aylık gösteriyordu.
    const yearlyId = PACKAGE_IDS.yearly;
    const product = active.productIdentifier ?? '';
    const isYearly = (yearlyId && product.includes(yearlyId))
      || /year|annual|yillik|yıllık/i.test(product);
    return { ok: true, plan: isYearly ? 'yearly' : 'monthly' };
  } catch (error) {
    if (isPurchasesError(error) && error.userCancelled) {
      return { ok: false, message: 'Geri yükleme iptal edildi.' };
    }
    const message = error instanceof Error
      ? error.message
      : 'Geri yükleme başarısız oldu.';
    return { ok: false, message };
  }
}

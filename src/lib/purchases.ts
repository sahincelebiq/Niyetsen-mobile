/**
 * RevenueCat IAP — Supabase user id = app_user_id (webhook ile backend senkron).
 * Gerçek satın alma için EAS/dev build gerekir (önizleme modunda işlem yok).
 */
import Constants from 'expo-constants';
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
  /** Yalnız RC ücretsiz giriş dönemi varsa gün sayısı; yoksa uydurma 7 gün yok. */
  monthlyIntroDays: number | null;
  yearlyIntroDays: number | null;
};

const ENTITLEMENT_ID =
  process.env.EXPO_PUBLIC_RC_ENTITLEMENT_ID?.trim() || 'premium';

const PACKAGE_IDS: Record<PurchasePlan, string> = {
  monthly: process.env.EXPO_PUBLIC_RC_MONTHLY_PACKAGE?.trim() || '$rc_monthly',
  yearly: process.env.EXPO_PUBLIC_RC_YEARLY_PACKAGE?.trim() || '$rc_annual',
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
  // test_ = RevenueCat Test Store (Play/App Store olmadan SDK denemesi).
  if (!/^(appl|goog|amzn|rcb|test)_[A-Za-z0-9]+$/.test(key)) {
    if (__DEV__) {
      console.warn(
        `[purchases] Geçersiz RevenueCat anahtarı yok sayıldı: "${key.slice(0, 12)}…" `
        + '(appl_/goog_/test_ önekli public SDK anahtarı bekleniyor)',
      );
    }
    return undefined;
  }
  return key;
}

function isExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

function getApiKey(): string | undefined {
  // Expo Go'da native Purchases modülü yok — anahtar dolu olsa da yapılandırılmaz.
  if (isExpoGo()) return undefined;
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

function purchaseErrorMessage(error: unknown): string {
  if (isPurchasesError(error) && error.userCancelled) {
    return 'Satın alma iptal edildi.';
  }
  const text = (error instanceof Error ? error.message : String(error)).toLowerCase();
  if (text.includes('not available') || text.includes('productnotavailable')) {
    return 'Bu paket henüz bu cihazda görünmüyor. Play’de uygulamayı güncelleyip tekrar dene.';
  }
  if (text.includes('network') || text.includes('offline')) {
    return 'Bağlantı koptu. Birazdan tekrar dene.';
  }
  if (text.includes('not allowed') || text.includes('purchasenotallowed')) {
    return 'Bu Google hesabında satın alma kapalı. Lisans testi e-postasını kullan.';
  }
  // ss-01 kuralı: bilinmeyen ham hata metni (İngilizce SDK metni, URL, kod)
  // EKRANA basılmaz — jenerik, yerelleşmiş metne düşülür.
  return 'Satın alma tamamlanamadı. Birazdan tekrar dener misin?';
}

function packagesFromOfferings(
  offerings: Awaited<ReturnType<typeof Purchases.getOfferings>>,
): PurchasesPackage[] {
  const current = offerings.current?.availablePackages ?? [];
  if (current.length) return current;
  return Object.values(offerings.all ?? {}).flatMap(
    (offering) => offering.availablePackages ?? [],
  );
}

async function loadPackages(): Promise<PurchasesPackage[]> {
  const first = await Purchases.getOfferings();
  const packages = packagesFromOfferings(first);
  if (packages.length) return packages;
  await new Promise((resolve) => setTimeout(resolve, 500));
  const second = await Purchases.getOfferings();
  return packagesFromOfferings(second);
}

function introFreeDays(pkg?: PurchasesPackage): number | null {
  const intro = pkg?.product.introPrice;
  if (!intro || intro.price > 0) return null;
  const units = intro.periodNumberOfUnits;
  if (!units || units < 1) return null;
  const unit = String(intro.periodUnit ?? '').toUpperCase();
  if (unit.includes('DAY')) return units;
  if (unit.includes('WEEK')) return units * 7;
  if (unit.includes('MONTH')) return units * 30;
  return null;
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
  const storeNeedle = plan === 'monthly' ? 'niyetsen_monthly' : 'niyetsen_yearly';
  const byStore = packages.find((item) =>
    item.product.identifier.toLowerCase().includes(storeNeedle),
  );
  if (byStore) return byStore;
  const targetType = plan === 'monthly' ? PACKAGE_TYPE.MONTHLY : PACKAGE_TYPE.ANNUAL;
  return packages.find((item) => item.packageType === targetType);
}

export function purchasesAvailable(): boolean {
  return Boolean(getApiKey()) && Platform.OS !== 'web';
}

async function resolveAppUserId(explicit?: string): Promise<string | undefined> {
  const given = explicit?.trim();
  if (given) return given;
  try {
    const { supabase } = await import('@/lib/supabase');
    const { data } = await supabase.auth.getSession();
    return data.session?.user.id;
  } catch {
    return undefined;
  }
}

export async function configurePurchases(appUserId?: string): Promise<void> {
  if (Platform.OS === 'web' || !getApiKey()) return;
  const userId = await resolveAppUserId(appUserId);
  if (!configureTask) {
    if (!userId) {
      // Anonim $RCAnonymousID webhook'ta yok sayılır; oturum gelene kadar bekle.
      return;
    }
    configureTask = (async () => {
      try {
        Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.WARN);
        Purchases.configure({
          apiKey: getApiKey()!,
          appUserID: userId,
        });
        configured = true;
      } catch {
        configureTask = null;
      }
    })();
  }
  await configureTask;
  if (!configured) return;
  const loginId = userId ?? (await resolveAppUserId());
  if (!loginId) return;
  try {
    await Purchases.logIn(loginId);
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
    return { monthly: null, yearly: null, monthlyIntroDays: null, yearlyIntroDays: null };
  }
  // Paywall, auth oturumu SDK'ya bağlanmadan açılabiliyor. Anonim configure
  // YASAK (webhook $RCAnonymousID yok sayıyor); oturum için kısa bekleriz.
  // Mağaza fiyatı ASLA uydurulmaz (App Store 3.1.2 / Play).
  for (let attempt = 0; attempt < 4 && !configured; attempt += 1) {
    await configurePurchases();
    if (configured) break;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  if (!configured) {
    return { monthly: null, yearly: null, monthlyIntroDays: null, yearlyIntroDays: null };
  }
  try {
    const packages = await loadPackages();
    const monthly = pickPackage(packages, 'monthly');
    const yearly = pickPackage(packages, 'yearly');
    return {
      monthly: monthly?.product.priceString ?? null,
      yearly: yearly?.product.priceString ?? null,
      monthlyIntroDays: introFreeDays(monthly),
      yearlyIntroDays: introFreeDays(yearly),
    };
  } catch {
    return { monthly: null, yearly: null, monthlyIntroDays: null, yearlyIntroDays: null };
  }
}

export function subscribeToPurchaseUpdates(onUpdate: () => void): () => void {
  if (Platform.OS === 'web' || !getApiKey()) return () => {};
  // Anahtar dolu olsa da native modül (Expo Go, çevrimdışı ilk açılış) fırlatabilir.
  // Kök gezgin bu yüzden çökmesin; abonelik önbelleği SubscriptionProvider'da kalır.
  try {
    Purchases.addCustomerInfoUpdateListener(onUpdate);
  } catch {
    return () => {};
  }
  // Dinleyici gerçekten kaldırılmalı — no-op dönmek her remount'ta yeni
  // listener biriktiriyor ve unmount sonrası setState'e yol açıyordu.
  return () => {
    try {
      Purchases.removeCustomerInfoUpdateListener(onUpdate);
    } catch {
      // Native modül kalkmış olabilir; çıkış akışı sürmeli.
    }
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
        ? 'Mağaza satın alması bu sürümde çalışmaz. TestFlight veya EAS build ile dene.'
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
    const packages = await loadPackages();
    const selected = pickPackage(packages, plan);
    if (!selected) {
      return {
        ok: false,
        message: 'Mağaza paketi bulunamadı. Birazdan fiyatları yenileyip tekrar dene.',
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
    return { ok: false, message: purchaseErrorMessage(error) };
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
    // Ham SDK metni sızdırılmaz (ss-01).
    return { ok: false, message: 'Geri yükleme başarısız oldu. Birazdan tekrar dene.' };
  }
}

/** Mağazada gerçek entitlement var mı? Dev/tester kısa devresi Customer Center açmaz. */
export async function hasStoreEntitlement(): Promise<boolean> {
  if (!purchasesAvailable()) return false;
  await configurePurchases();
  if (!configured) return false;
  try {
    const info = await Purchases.getCustomerInfo();
    return Boolean(info.entitlements.active[ENTITLEMENT_ID]);
  } catch {
    return false;
  }
}

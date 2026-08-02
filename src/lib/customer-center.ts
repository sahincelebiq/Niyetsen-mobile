/**
 * RevenueCat Customer Center — abonelik yönetimi (iptal/geri yükle/destek).
 * Native-only; Expo Go'da çalışmaz → graceful mesaj.
 */
import { Platform } from 'react-native';
import RevenueCatUI from 'react-native-purchases-ui';

import { configurePurchases, purchasesAvailable } from '@/lib/purchases';

export type CustomerCenterResult =
  | { ok: true }
  | { ok: false; message: string };

export async function presentCustomerCenter(options?: {
  onRestoreCompleted?: () => void;
}): Promise<CustomerCenterResult> {
  if (Platform.OS === 'web') {
    return {
      ok: false,
      message: 'Abonelik yönetimi web’de yok. iOS veya Android uygulama build’ini kullan.',
    };
  }
  if (!purchasesAvailable()) {
    return {
      ok: false,
      message:
        'Abonelik merkezi Expo Go’da açılmaz. Development / EAS build ile dene.',
    };
  }

  await configurePurchases();

  try {
    await RevenueCatUI.presentCustomerCenter({
      callbacks: {
        onRestoreCompleted: () => {
          options?.onRestoreCompleted?.();
        },
      },
    });
    return { ok: true };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Abonelik merkezi açılamadı. Birazdan tekrar dene.';
    return { ok: false, message };
  }
}

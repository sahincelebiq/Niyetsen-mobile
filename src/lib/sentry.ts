/**
 * Sentry — release + dist EAS build numarasıyla eşleşir, source map EAS'ta
 * yüklenir (eas.json `sentry` alanı + `SENTRY_*` secret'ları; ayrıntı
 * docs/RELEASE.md). `@sentry/react-native` kurulu değilse veya DSN yoksa
 * no-op — uygulama asla bu yüzden düşmez.
 *
 * KVKK: `beforeSend` her olayı `pii-scrub`tan geçirir; sohbet içeriği,
 * fotoğraf, e-posta, token Sentry'ye gitmez. Kullanıcı yalnız id ile bağlanır.
 */
import { Platform } from 'react-native';
import Constants from 'expo-constants';

import { metniTemizle } from '@/lib/pii-scrub';

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim();

type SentrySdk = {
  init: (options: Record<string, unknown>) => void;
  captureException: (error: unknown, hint?: Record<string, unknown>) => void;
  setUser: (user: Record<string, unknown> | null) => void;
  addBreadcrumb: (crumb: Record<string, unknown>) => void;
};

let sdk: SentrySdk | null = null;
let initialized = false;

function loadSdk(): SentrySdk | null {
  if (sdk) return sdk;
  try {
    // Opsiyonel bağımlılık — kurulu değilse sessizce no-op.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@sentry/react-native') as { default?: SentrySdk } & SentrySdk;
    sdk = mod.default ?? mod;
    return sdk;
  } catch {
    return null;
  }
}

function surumBilgisi(): { release: string; dist: string } {
  const cfg = Constants.expoConfig;
  const ad = cfg?.slug ?? 'niyetsen';
  const surum = cfg?.version ?? '1.1.2';
  const dagitim = Constants.nativeBuildVersion ?? Constants.nativeAppVersion ?? '0';
  return { release: `${ad}@${surum}`, dist: String(dagitim) };
}

export function initSentry(): void {
  if (!SENTRY_DSN || initialized || Platform.OS === 'web') return;
  initialized = true;
  const istemci = loadSdk();
  if (!istemci) return;
  const { release, dist } = surumBilgisi();
  try {
    istemci.init({
      dsn: SENTRY_DSN,
      release,
      dist,
      tracesSampleRate: __DEV__ ? 0 : 0.1,
      enableAutoSessionTracking: true,
      beforeSend(olay: unknown) {
        // PII sızıntısına karşı son kapı: tüm string alanları temizle.
        try {
          const metin = JSON.stringify(olay);
          const temiz = JSON.parse(
            metin
              .replace(/eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g, '[token]')
              .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[e-posta]'),
          );
          return temiz;
        } catch {
          return olay;
        }
      },
    });
  } catch {
    sdk = null;
  }
}

/** Yalnız id bağlanır — e-posta, isim, fotoğraf YOK. */
export function setSentryUser(kullaniciId: string | null): void {
  if (!sdk) return;
  try {
    sdk.setUser(kullaniciId ? { id: kullaniciId } : null);
  } catch {
    // Sessiz.
  }
}

export function addSentryBreadcrumb(
  ileti: string,
  veri?: Record<string, unknown>,
): void {
  if (!sdk) return;
  try {
    sdk.addBreadcrumb({
      message: metniTemizle(ileti),
      data: veri,
      level: 'info',
    });
  } catch {
    // Sessiz.
  }
}

export function captureException(
  error: unknown,
  context?: string,
  ekstra?: Record<string, unknown>,
): void {
  if (__DEV__) {
    console.warn('[sentry]', context ?? 'error', error);
  }
  if (!sdk || !SENTRY_DSN) return;
  try {
    sdk.captureException(error, {
      contexts: {
        niyetsen: {
          baglam: context ? metniTemizle(context) : undefined,
          ...(ekstra ?? {}),
        },
      },
    });
  } catch {
    // Raporlama akışı kesmez.
  }
}

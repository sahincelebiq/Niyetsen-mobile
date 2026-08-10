import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { DevSettings, I18nManager, Platform } from 'react-native';

import { isAppLocale, messagesFor } from '@/i18n/catalog';
import { regionById, regionByLocale, REGIONS } from '@/i18n/regions';
import type { AppLocale, Messages, RegionId } from '@/i18n/types';
import { setApiLocale } from '@/lib/api-locale';

const STORAGE_LOCALE = 'niyetsen.locale';
const STORAGE_REGION = 'niyetsen.region';

type LocaleContextValue = {
  locale: AppLocale;
  regionId: RegionId;
  timezone: string;
  t: Messages;
  ready: boolean;
  isRtl: boolean;
  setLocale: (locale: AppLocale) => Promise<void>;
  setRegion: (regionId: RegionId) => Promise<void>;
  /**
   * RTL yönü değişecekse true. Çağıran (RegionLanguageSheet) onay +
   * forceRTL'i restart'a bağlar; onay yoksa dil değişmez.
   */
  wouldChangeRtl: (nextLocale: AppLocale) => boolean;
  /** Onay sonrası: kaydet + forceRTL. Yeniden yükleme çağıran tarafın işi. */
  commitLocaleWithRtl: (locale: AppLocale, regionId: RegionId) => Promise<void>;
  tryReloadApp: () => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function isRtlLocale(locale: AppLocale): boolean {
  return locale === 'ar';
}

function applyRtl(locale: AppLocale) {
  const rtl = isRtlLocale(locale);
  if (I18nManager.isRTL !== rtl) {
    I18nManager.allowRTL(rtl);
    I18nManager.forceRTL(rtl);
  }
}

function tryReloadApp() {
  // Prod'da expo-updates yok; __DEV__'de hot reload, değilse kullanıcı kapat-aç.
  if (__DEV__ && Platform.OS !== 'web' && typeof DevSettings?.reload === 'function') {
    DevSettings.reload();
  }
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>('tr');
  const [regionId, setRegionState] = useState<RegionId>('TR');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [storedLocale, storedRegion] = await Promise.all([
          AsyncStorage.getItem(STORAGE_LOCALE),
          AsyncStorage.getItem(STORAGE_REGION),
        ]);
        if (cancelled) return;
        const region = storedRegion
          ? regionById(storedRegion)
          : isAppLocale(storedLocale)
            ? regionByLocale(storedLocale)
            : REGIONS[0];
        const nextLocale = isAppLocale(storedLocale) ? storedLocale : region.locale;
        setRegionState(region.id);
        setLocaleState(nextLocale);
        setApiLocale(nextLocale);
        // Soğuk açılışta kaydedilmiş RTL'i uygula (önceki oturumda onaylanmış).
        applyRtl(nextLocale);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const wouldChangeRtl = useCallback(
    (next: AppLocale) => isRtlLocale(next) !== isRtlLocale(locale),
    [locale],
  );

  const commitLocaleWithRtl = useCallback(async (nextLocale: AppLocale, nextRegion: RegionId) => {
    setLocaleState(nextLocale);
    setRegionState(nextRegion);
    setApiLocale(nextLocale);
    applyRtl(nextLocale);
    await Promise.all([
      AsyncStorage.setItem(STORAGE_LOCALE, nextLocale),
      AsyncStorage.setItem(STORAGE_REGION, nextRegion),
    ]);
  }, []);

  const setLocale = useCallback(async (next: AppLocale) => {
    // RTL değişmiyorsa anında uygula; değişiyorsa RegionLanguageSheet onay ister.
    if (isRtlLocale(next) !== isRtlLocale(locale)) {
      return;
    }
    const matched = regionByLocale(next);
    setLocaleState(next);
    setApiLocale(next);
    setRegionState(matched.id);
    await Promise.all([
      AsyncStorage.setItem(STORAGE_LOCALE, next),
      AsyncStorage.setItem(STORAGE_REGION, matched.id),
    ]);
  }, [locale]);

  const setRegion = useCallback(async (nextId: RegionId) => {
    const region = regionById(nextId);
    if (isRtlLocale(region.locale) !== isRtlLocale(locale)) {
      // Onaysız RTL/LTR geçişi yok — sheet commitLocaleWithRtl kullanır.
      return;
    }
    setRegionState(region.id);
    setLocaleState(region.locale);
    setApiLocale(region.locale);
    await Promise.all([
      AsyncStorage.setItem(STORAGE_REGION, region.id),
      AsyncStorage.setItem(STORAGE_LOCALE, region.locale),
    ]);
  }, [locale]);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      regionId,
      timezone: regionById(regionId).timezone,
      t: messagesFor(locale),
      ready,
      isRtl: isRtlLocale(locale),
      setLocale,
      setRegion,
      wouldChangeRtl,
      commitLocaleWithRtl,
      tryReloadApp,
    }),
    [
      locale,
      regionId,
      ready,
      setLocale,
      setRegion,
      wouldChangeRtl,
      commitLocaleWithRtl,
    ],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useI18n() {
  const value = useContext(LocaleContext);
  if (!value) throw new Error('useI18n, LocaleProvider içinde kullanılmalı.');
  return value;
}

/** Fable 8.11.1 / FAZ8 alias — useI18n ile aynı. */
export const useLocale = useI18n;

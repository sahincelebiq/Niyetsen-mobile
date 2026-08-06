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
import { I18nManager } from 'react-native';

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
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function applyRtl(locale: AppLocale) {
  const rtl = locale === 'ar';
  if (I18nManager.isRTL !== rtl) {
    I18nManager.allowRTL(rtl);
    I18nManager.forceRTL(rtl);
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
        applyRtl(nextLocale);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setLocale = useCallback(async (next: AppLocale) => {
    setLocaleState(next);
    setApiLocale(next);
    applyRtl(next);
    await AsyncStorage.setItem(STORAGE_LOCALE, next);
    const matched = regionByLocale(next);
    setRegionState(matched.id);
    await AsyncStorage.setItem(STORAGE_REGION, matched.id);
  }, []);

  const setRegion = useCallback(async (nextId: RegionId) => {
    const region = regionById(nextId);
    setRegionState(region.id);
    setLocaleState(region.locale);
    setApiLocale(region.locale);
    applyRtl(region.locale);
    await Promise.all([
      AsyncStorage.setItem(STORAGE_REGION, region.id),
      AsyncStorage.setItem(STORAGE_LOCALE, region.locale),
    ]);
  }, []);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      regionId,
      timezone: regionById(regionId).timezone,
      t: messagesFor(locale),
      ready,
      isRtl: locale === 'ar',
      setLocale,
      setRegion,
    }),
    [locale, regionId, ready, setLocale, setRegion],
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

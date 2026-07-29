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
import { Appearance, useColorScheme as useSystemColorScheme } from 'react-native';

export type AppearancePreference = 'light' | 'dark';

type AppearanceContextValue = {
  preference: AppearancePreference;
  colorScheme: AppearancePreference;
  setPreference: (next: AppearancePreference) => void;
  isDark: boolean;
  toggleDark: (enabled: boolean) => void;
  ready: boolean;
};

const STORAGE_KEY = 'niyetsen.appearance';

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

function applyNativeScheme(scheme: AppearancePreference) {
  // RN 0.72+: tüm useColorScheme() tüketicilerini (tab, scrim, navigation) günceller.
  Appearance.setColorScheme?.(scheme);
}

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const system = useSystemColorScheme();
  const [preference, setPreferenceState] = useState<AppearancePreference>('light');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (cancelled) return;
        if (stored === 'light' || stored === 'dark') {
          setPreferenceState(stored);
          applyNativeScheme(stored);
        } else {
          const initial = system === 'dark' ? 'dark' : 'light';
          setPreferenceState(initial);
          applyNativeScheme(initial);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [system]);

  const setPreference = useCallback((next: AppearancePreference) => {
    setPreferenceState(next);
    applyNativeScheme(next);
    void AsyncStorage.setItem(STORAGE_KEY, next);
  }, []);

  const toggleDark = useCallback(
    (enabled: boolean) => {
      setPreference(enabled ? 'dark' : 'light');
    },
    [setPreference],
  );

  const value = useMemo<AppearanceContextValue>(
    () => ({
      preference,
      colorScheme: preference,
      setPreference,
      isDark: preference === 'dark',
      toggleDark,
      ready,
    }),
    [preference, setPreference, toggleDark, ready],
  );

  return (
    <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>
  );
}

export function useAppearance(): AppearanceContextValue {
  const ctx = useContext(AppearanceContext);
  if (!ctx) {
    throw new Error('useAppearance AppearanceProvider içinde kullanılmalı');
  }
  return ctx;
}

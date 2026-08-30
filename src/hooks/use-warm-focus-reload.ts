import { useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';

/** Sekme/mistik dönüşünde taze veri varsa tam ekran yenileme yapma. */
const DEFAULT_STALE_MS = 12_000;

type LoadFn = (refresh?: boolean) => void | Promise<void>;

/**
 * İlk odakta veri yoksa yükle. Kısa süre içinde geri gelince ağı atla.
 * Eski veri varsa sessiz yenile (RefreshControl) — spinner ile ekranı silme.
 */
export function useWarmFocusReload(
  load: LoadFn,
  hasData: boolean,
  staleMs: number = DEFAULT_STALE_MS,
): void {
  const lastAt = useRef(0);

  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      if (!hasData) {
        lastAt.current = now;
        void load(false);
        return;
      }
      if (now - lastAt.current < staleMs) {
        return;
      }
      lastAt.current = now;
      void load(true);
    }, [hasData, load, staleMs]),
  );
}

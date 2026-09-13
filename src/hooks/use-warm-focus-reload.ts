import { useCallback, useEffect, useRef } from 'react';
import { useFocusEffect } from 'expo-router';

import {
  lastInvalidatedAt,
  subscribeInvalidation,
  type CacheKey,
} from '@/lib/query-cache';

/** Sekme/mistik dönüşünde taze veri varsa tam ekran yenileme yapma. */
const DEFAULT_STALE_MS = 12_000;

type LoadFn = (refresh?: boolean) => void | Promise<void>;

/**
 * İlk odakta veri yoksa yükle. Kısa süre içinde geri gelince ağı atla.
 * Eski veri varsa sessiz yenile (RefreshControl) — spinner ile ekranı silme.
 *
 * Cache invalidation (gorevTamamlandi hattı): `keys` verilirse yalnız o
 * anahtarlar, verilmezse HER geçersiz kılma ekranı ilgilendirir. Ekran
 * odaktaysa hemen sessiz yeniler; değilse bir sonraki odakta bayatlık süresine
 * bakmadan yeniler. Kullanıcı hiçbir ekranı elle yenilemek zorunda kalmaz.
 */
export function useWarmFocusReload(
  load: LoadFn,
  hasData: boolean,
  staleMs: number = DEFAULT_STALE_MS,
  keys?: readonly CacheKey[],
): void {
  const lastAt = useRef(0);
  const focused = useRef(false);
  const loadRef = useRef(load);
  loadRef.current = load;
  const keysSignature = keys ? keys.map((key) => key.join('/')).join('|') : '';

  useEffect(() => {
    const scope = keys ?? 'all';
    return subscribeInvalidation(scope, () => {
      if (focused.current) {
        lastAt.current = Date.now();
        void loadRef.current(true);
      } else {
        lastAt.current = 0;
      }
    });
    // keys dizisi her render'da yeni referans olabilir; imzayla karşılaştır.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keysSignature]);

  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      const now = Date.now();
      if (!hasData) {
        lastAt.current = now;
        void load(false);
      } else if (
        now - lastAt.current >= staleMs
        || lastInvalidatedAt(keys) > lastAt.current
      ) {
        lastAt.current = now;
        void load(true);
      }
      return () => {
        focused.current = false;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasData, load, staleMs, keysSignature]),
  );
}

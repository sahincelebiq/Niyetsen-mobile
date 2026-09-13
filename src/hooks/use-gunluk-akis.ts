/**
 * useGunlukAkis — Bugün ekranının tek veri kapısı (03-Bugün, madde A).
 *
 * Store'u dinler, ilk abonelikte önbelleği hidrate eder ve günü geçmiş
 * kayıt varsa rollover tetikler. Ekran odaklanınca bayat veriyi sessizce
 * tazeler (12 sn eşiği useWarmFocusReload ile aynı).
 */
import { useEffect, useSyncExternalStore } from 'react';

import {
  ensureGunlukHydrated,
  getGunlukAkis,
  refreshGunlukAkis,
  rolloverGunlukAkisIfNeeded,
  subscribeGunlukAkis,
  type GunlukAkisState,
} from '@/lib/gunluk-akis';

export function useGunlukAkis(): GunlukAkisState {
  const state = useSyncExternalStore(subscribeGunlukAkis, getGunlukAkis, getGunlukAkis);

  useEffect(() => {
    void ensureGunlukHydrated().then(() => {
      if (!rolloverGunlukAkisIfNeeded() && getGunlukAkis().stale) {
        void refreshGunlukAkis(getGunlukAkis().data ? 'silent' : 'full');
      }
    });
  }, []);

  return state;
}

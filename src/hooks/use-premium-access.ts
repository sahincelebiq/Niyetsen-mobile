import { type Href, useRouter } from 'expo-router';
import { useCallback, useEffect } from 'react';

import type { SubscriptionInfo } from '@/lib/api';
import { useSubscription } from '@/providers/subscription-provider';

/**
 * Mistik / idol / rapor gibi PRO modüller:
 * yalnız trial + active (ve backend'de status=active dönen dev hesabı).
 * `has_premium_access` free'de de true olabilir — onu kullanma.
 */
export function canUseProModules(
  status: SubscriptionInfo | null | undefined,
): boolean {
  return status?.status === 'trial' || status?.status === 'active';
}

/**
 * Trial + active = PRO modül erişimi. Free/expired → paywall.
 * Dev hesabı backend'de status=active (+ has_premium_access) döner.
 */
export function usePremiumAccess() {
  const { status, loading, refresh } = useSubscription();
  const hasPremium = canUseProModules(status);

  return {
    hasPremium,
    loading,
    status,
    refresh,
  };
}

/** Ekran açılınca PRO değilse paywall'a atar (deep link koruması). */
export function useRequirePremium(enabled = true) {
  const router = useRouter();
  const { hasPremium, loading, refresh, status } = usePremiumAccess();

  useEffect(() => {
    // status henüz hydrate olmadan (null) paywall'a atma — rapor "açılmıyor" bug'ı.
    if (!enabled || loading || status == null) return;
    if (!hasPremium) {
      router.replace('/paywall' as Href);
    }
  }, [enabled, hasPremium, loading, router, status]);

  const openPaywall = useCallback(() => {
    router.push('/paywall' as Href);
  }, [router]);

  return { hasPremium, loading, refresh, openPaywall };
}

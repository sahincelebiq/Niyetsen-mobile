import { type Href, useRouter } from 'expo-router';
import { useCallback } from 'react';

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
 * Trial + active = PRO modül erişimi.
 * Free kullanıcıyı ekrandan DIŞARI ATMA — kapı içeride (rapor/yollar/yol-detay).
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

/**
 * @deprecated Kapı-içeride: otomatik paywall yönlendirmesi YOK.
 * Eski useRequirePremium(replace) kaldırıldı — PRO yüzeyler kilit kartı gösterir.
 * CTA için openPaywall kullan.
 */
export function useRequirePremium(_enabled = true) {
  const router = useRouter();
  const { hasPremium, loading, refresh } = usePremiumAccess();

  const openPaywall = useCallback(() => {
    router.push('/paywall' as Href);
  }, [router]);

  return { hasPremium, loading, refresh, openPaywall };
}

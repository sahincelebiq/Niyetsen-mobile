import { type Href, useRouter } from 'expo-router';
import { useCallback } from 'react';

import type { SubscriptionInfo } from '@/lib/api';
import { useSubscription } from '@/providers/subscription-provider';

/**
 * Deneme (trial) + ödenmiş (active) + kapalı test/dev (backend status=active).
 * Plan, görev, bonus, kanıt bu pencerede açık kalır.
 */
export function canUseProModules(
  status: SubscriptionInfo | null | undefined,
): boolean {
  return status?.status === 'trial' || status?.status === 'active';
}

/** Satın alma / kapalı test / dev — 2. plan, yol aktivasyonu, detaylı rapor, avatar. */
export function hasPaidProAccess(
  status: SubscriptionInfo | null | undefined,
): boolean {
  return status?.status === 'active';
}

/**
 * Trial + active = 7 günlük plan/görev penceresi.
 * hasPaidAccess = mağaza aboneliği (veya allowlist).
 * Free kullanıcıyı ekrandan DIŞARI ATMA — kapı içeride.
 */
export function usePremiumAccess() {
  const { status, loading, refresh } = useSubscription();
  const hasPremium = canUseProModules(status);
  const hasPaidAccess = hasPaidProAccess(status);

  return {
    hasPremium,
    hasPaidAccess,
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
  const { hasPremium, hasPaidAccess, loading, refresh } = usePremiumAccess();

  const openPaywall = useCallback(() => {
    router.push('/paywall' as Href);
  }, [router]);

  return { hasPremium, hasPaidAccess, loading, refresh, openPaywall };
}

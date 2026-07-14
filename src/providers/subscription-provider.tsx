import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';

import {
  ApiError,
  DEFAULT_SUBSCRIPTION,
  getSubscription,
  type SubscriptionInfo,
} from '@/lib/api';
import { trackEvent } from '@/lib/analytics';

type SubscriptionContextValue = {
  status: SubscriptionInfo | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

function shouldUseLegacyFallback(error: unknown): boolean {
  // Eski Railway build'de /me/subscription yok → 404
  return error instanceof ApiError && error.status === 404;
}

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const previousStatus = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await getSubscription();
      const prior = previousStatus.current;
      if (
        prior
        && prior !== next.status
        && (next.status === 'cancelled' || next.status === 'expired')
      ) {
        void trackEvent('subscription_cancelled', { status: next.status });
      }
      previousStatus.current = next.status;
      setStatus(next);
      if (next.show_paywall) {
        void trackEvent('paywall_shown', { status: next.status });
      }
    } catch (value) {
      if (shouldUseLegacyFallback(value)) {
        setStatus(DEFAULT_SUBSCRIPTION);
        return;
      }
      setError(
        value instanceof ApiError
          ? value.message
          : 'Abonelik durumu yüklenemedi.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ status, loading, error, refresh }),
    [status, loading, error, refresh],
  );

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription yalnız SubscriptionProvider içinde kullanılabilir.');
  }
  return context;
}

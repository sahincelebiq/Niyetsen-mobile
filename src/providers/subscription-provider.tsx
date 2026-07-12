import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';

import { getSubscription, type SubscriptionInfo } from '@/lib/api';
import { trackEvent } from '@/lib/analytics';

type SubscriptionContextValue = {
  status: SubscriptionInfo | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await getSubscription();
      setStatus(next);
      if (next.show_paywall) {
        void trackEvent('paywall_shown', { status: next.status });
      }
    } catch (value) {
      setError(
        value instanceof Error ? value.message : 'Abonelik durumu yüklenemedi.',
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

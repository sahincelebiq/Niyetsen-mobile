import { type Href, usePathname, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ConnectivityBanner } from '@/components/connectivity-banner';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { isMysticPath } from '@/lib/mystic-routes';
import { useSubscription } from '@/providers/subscription-provider';

type SubscriptionGateProps = {
  children: React.ReactNode;
};

export function SubscriptionGate({ children }: SubscriptionGateProps) {
  const theme = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const { status, loading, error, offline, refresh } = useSubscription();
  const [retrying, setRetrying] = useState(false);
  const didAutoPush = useRef(false);

  useEffect(() => {
    // Çevrimdışı varsayılanda paywall'a atma — kullanıcı uygulama içinde kalır.
    if (offline) return;
    if (!status?.show_paywall) {
      didAutoPush.current = false;
      return;
    }
    // Fal ücretsizdir — süresi bitmiş deneme mistik ekranı paywall ile çalamaz.
    if (isMysticPath(pathname) || pathname === '/paywall') return;
    if (didAutoPush.current) return;
    didAutoPush.current = true;
    router.push('/paywall' as Href);
  }, [offline, pathname, router, status?.show_paywall]);

  async function retry() {
    setRetrying(true);
    try {
      await refresh();
    } finally {
      setRetrying(false);
    }
  }

  if (loading && !status) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator color={theme.tint} />
      </ThemedView>
    );
  }

  // Ağ hatası + hiç durum yok (nadir) — yine de tekrar dene; düşürme.
  if (error && !status) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText themeColor="danger">{error}</ThemedText>
        <Pressable onPress={() => void retry()} hitSlop={12} style={styles.retryHit}>
          <ThemedText themeColor="tint">Tekrar dene</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  return (
    <View style={styles.flex}>
      <ConnectivityBanner
        visible={offline}
        onRetry={() => void retry()}
        retrying={retrying}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  retryHit: { minHeight: 44, justifyContent: 'center' },
});

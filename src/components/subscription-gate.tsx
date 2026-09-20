import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ConnectivityBanner } from '@/components/connectivity-banner';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useLocale } from '@/providers/locale-provider';
import { useSubscription } from '@/providers/subscription-provider';

type SubscriptionGateProps = {
  children: React.ReactNode;
};

/**
 * KAPI İÇERİDE: PRO yüzeyler görünür kalır; `replace('/paywall')` ile dışarı
 * atma yok. Fal zaten ücretsiz — otomatik paywall push/replace YOK.
 * Ekranlar kilit önizlemesi + CTA ile `push('/paywall')` açar.
 */
export function SubscriptionGate({ children }: SubscriptionGateProps) {
  const theme = useTheme();
  const { t } = useLocale();
  const { status, loading, error, offline, refresh } = useSubscription();
  const [retrying, setRetrying] = useState(false);

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
          <ThemedText themeColor="tint">{t.common.retry}</ThemedText>
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

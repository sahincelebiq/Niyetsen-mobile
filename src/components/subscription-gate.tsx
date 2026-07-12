import { type Href, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radii, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSubscription } from '@/providers/subscription-provider';

type SubscriptionGateProps = {
  children: React.ReactNode;
};

export function SubscriptionGate({ children }: SubscriptionGateProps) {
  const theme = useTheme();
  const router = useRouter();
  const { status, loading, error, refresh } = useSubscription();

  useEffect(() => {
    if (status?.show_paywall) {
      router.push('/paywall' as Href);
    }
  }, [router, status?.show_paywall]);

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator color={theme.tint} />
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText themeColor="danger">{error}</ThemedText>
        <Pressable onPress={() => void refresh()}>
          <ThemedText themeColor="tint">Tekrar dene</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  return children;
}

const styles = StyleSheet.create({
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
});

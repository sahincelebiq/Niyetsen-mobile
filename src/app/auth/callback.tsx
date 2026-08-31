import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { completeAuthFromUrl } from '@/lib/auth-redirect';

/**
 * E-posta onay / OAuth / şifre sıfırlama dönüşü: niyetsen://auth/callback
 * PKCE code, hash token veya token_hash varsa oturumu kurar.
 */
export default function AuthCallbackScreen() {
  const theme = useTheme();
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const url = await Linking.getInitialURL();
        if (url) {
          await completeAuthFromUrl(url);
        }
      } catch {
        // Onay/sıfırlama linki bozuksa giriş ekranına düşer.
      } finally {
        if (!cancelled) router.replace('/');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <ThemedView style={styles.center}>
      <ActivityIndicator color={theme.tint} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

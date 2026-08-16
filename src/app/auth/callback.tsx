import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

/**
 * E-posta onay / OAuth dönüşü: niyetsen://auth/callback
 * Token veya PKCE code varsa oturumu kurar; yoksa ana ekrana döner.
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
          const parsed = Linking.parse(url);
          const query = parsed.queryParams ?? {};
          const hash = url.includes('#') ? new URLSearchParams(url.split('#')[1]) : null;
          const pick = (key: string): string | undefined => {
            const fromQuery = query[key];
            if (typeof fromQuery === 'string' && fromQuery) return fromQuery;
            return hash?.get(key) || undefined;
          };
          const code = pick('code');
          const tokenHash = pick('token_hash') ?? pick('token');
          const type = pick('type');
          if (code) {
            await supabase.auth.exchangeCodeForSession(code);
          } else if (tokenHash && type) {
            await supabase.auth.verifyOtp({
              token_hash: tokenHash,
              type: type as 'signup' | 'email' | 'recovery' | 'invite',
            });
          }
        }
      } catch {
        // Onay linki bozuksa giriş ekranına düşer.
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

import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { completeAuthFromUrl, NATIVE_AUTH_REDIRECT } from '@/lib/auth-redirect';
import { supabase } from '@/lib/supabase';

/**
 * E-posta onay / OAuth / şifre sıfırlama dönüşü: niyetsen://auth/callback
 * PKCE code, hash token veya token_hash varsa oturumu kurar.
 */
export default function AuthCallbackScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{
    code?: string | string[];
    access_token?: string | string[];
    refresh_token?: string | string[];
    token_hash?: string | string[];
    type?: string | string[];
  }>();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const pick = (value?: string | string[]) =>
          Array.isArray(value) ? value[0] : value;
        const code = pick(params.code);
        const accessToken = pick(params.access_token);
        const refreshToken = pick(params.refresh_token);
        const tokenHash = pick(params.token_hash);
        const type = pick(params.type);
        if (code || (accessToken && refreshToken) || (tokenHash && type)) {
          const query = new URLSearchParams();
          if (code) query.set('code', code);
          if (accessToken) query.set('access_token', accessToken);
          if (refreshToken) query.set('refresh_token', refreshToken);
          if (tokenHash) query.set('token_hash', tokenHash);
          if (type) query.set('type', type);
          const joiner = accessToken ? '#' : '?';
          await completeAuthFromUrl(
            `${NATIVE_AUTH_REDIRECT}${joiner}${query.toString()}`,
          );
        } else {
          const url = await Linking.getInitialURL();
          if (url) await completeAuthFromUrl(url);
        }
        if (!cancelled) {
          for (let i = 0; i < 20; i += 1) {
            const { data } = await supabase.auth.getSession();
            if (data.session) break;
            await new Promise((resolve) => setTimeout(resolve, 200));
          }
        }
      } catch {
        // Onay/sıfırlama linki bozuksa giriş ekranına düşer.
      } finally {
        // Döngü oturumu bekledi; AuthProvider deepLinkHold kapanmadan reset yok.
        if (!cancelled) router.replace('/');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.code, params.type, router]);

  return (
    <ThemedView style={styles.center}>
      <ActivityIndicator color={theme.tint} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

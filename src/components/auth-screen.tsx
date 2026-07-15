import { useState } from 'react';
import { Image } from 'expo-image';

import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { openLegalDocument } from '@/lib/legal-links';
import { useAuth } from '@/providers/auth-provider';

type Mode = 'sign-in' | 'sign-up';

export function AuthScreen() {
  const theme = useTheme();
  const auth = useAuth();
  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(label: string, action: () => Promise<void>) {
    setBusy(label);
    setError(null);
    setMessage(null);
    try {
      await action();
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Giriş işlemi başarısız.');
    } finally {
      setBusy(null);
    }
  }

  function submitEmail() {
    if ((!auth.recovery && !email.trim()) || password.length < 6) {
      setError('Geçerli bir e-posta ve en az 6 karakterli şifre gir.');
      return;
    }
    void run('email', async () => {
      if (auth.recovery) {
        await auth.updatePassword(password);
        setMessage('Şifren güncellendi.');
      } else if (mode === 'sign-in') {
        await auth.signInWithEmail(email.trim(), password);
      } else {
        await auth.signUpWithEmail(email.trim(), password);
        setMessage('Doğrulama bağlantısı e-posta adresine gönderildi.');
      }
    });
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ThemedView style={styles.flex}>
        <SafeAreaView style={styles.flex}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled">
            <View style={styles.hero}>
              <Image
                source={require('@/assets/images/niyetsen-logo.png')}
                style={styles.logo}
                contentFit="contain"
              />
              <ThemedText type="title">Niyetsen</ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.center}>
                Niyetini görünür bir plana, planını kalıcı bir zincire dönüştür.
              </ThemedText>
            </View>

            <ThemedView
              type="backgroundElement"
              style={[styles.card, { borderColor: theme.border }]}>
              <ThemedText type="subtitle">
                {auth.recovery
                  ? 'Yeni şifreni belirle'
                  : mode === 'sign-in'
                    ? 'Tekrar hoş geldin'
                    : 'Yolculuğunu başlat'}
              </ThemedText>

              {!auth.recovery && (
                <TextInput
                  autoCapitalize="none"
                  autoComplete="email"
                  inputMode="email"
                  keyboardType="email-address"
                  placeholder="E-posta"
                  placeholderTextColor={theme.textSecondary}
                  value={email}
                  onChangeText={setEmail}
                  style={[
                    styles.input,
                    {
                      borderColor: theme.border,
                      color: theme.text,
                      fontFamily: Fonts.sans,
                    },
                  ]}
                />
              )}
              <TextInput
                autoCapitalize="none"
                autoComplete={
                  mode === 'sign-in' && !auth.recovery
                    ? 'current-password'
                    : 'new-password'
                }
                placeholder="Şifre"
                placeholderTextColor={theme.textSecondary}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                onSubmitEditing={submitEmail}
                style={[
                  styles.input,
                  {
                    borderColor: theme.border,
                    color: theme.text,
                    fontFamily: Fonts.sans,
                  },
                ]}
              />

              {error && <ThemedText themeColor="danger">{error}</ThemedText>}
              {message && <ThemedText themeColor="success">{message}</ThemedText>}

              <AuthButton
                label={
                  auth.recovery
                    ? 'Şifreyi Güncelle'
                    : mode === 'sign-in'
                      ? 'Giriş Yap'
                      : 'Hesap Oluştur'
                }
                busy={busy === 'email'}
                onPress={submitEmail}
                primary
              />

              {mode === 'sign-in' && !auth.recovery && (
                <Pressable
                  disabled={!email.trim() || !!busy}
                  onPress={() =>
                    void run('reset', async () => {
                      await auth.resetPassword(email.trim());
                      setMessage('Şifre yenileme bağlantısı gönderildi.');
                    })
                  }>
                  <ThemedText type="small" themeColor="tint" style={styles.center}>
                    Şifremi unuttum
                  </ThemedText>
                </Pressable>
              )}

              {!auth.recovery && (
                <>
                  <View style={styles.dividerRow}>
                    <View style={[styles.divider, { backgroundColor: theme.border }]} />
                    <ThemedText type="small" themeColor="textSecondary">
                      veya
                    </ThemedText>
                    <View style={[styles.divider, { backgroundColor: theme.border }]} />
                  </View>

                  <AuthButton
                    label="Google ile devam et"
                    busy={busy === 'google'}
                    onPress={() => void run('google', auth.signInWithGoogle)}
                  />
                  <AuthButton
                    label="Apple ile devam et"
                    busy={busy === 'apple'}
                    onPress={() => void run('apple', auth.signInWithApple)}
                  />

                  <Pressable
                    onPress={() => {
                      setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in');
                      setError(null);
                      setMessage(null);
                    }}>
                    <ThemedText type="small" themeColor="tint" style={styles.center}>
                      {mode === 'sign-in'
                        ? 'Hesabın yok mu? Kayıt ol'
                        : 'Zaten hesabın var mı? Giriş yap'}
                    </ThemedText>
                  </Pressable>
                </>
              )}
            </ThemedView>

            <View style={styles.legalLinks}>
              <Pressable
                accessibilityRole="link"
                hitSlop={8}
                onPress={() => void openLegalDocument('privacy')}>
                <ThemedText type="smallBold" themeColor="tint">
                  Gizlilik
                </ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="link"
                hitSlop={8}
                onPress={() => void openLegalDocument('kvkk')}>
                <ThemedText type="smallBold" themeColor="tint">
                  KVKK
                </ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="link"
                hitSlop={8}
                onPress={() => void openLegalDocument('consent')}>
                <ThemedText type="smallBold" themeColor="tint">
                  Açık Rıza
                </ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="link"
                hitSlop={8}
                onPress={() => void openLegalDocument('terms')}>
                <ThemedText type="smallBold" themeColor="tint">
                  Kullanım Koşulları
                </ThemedText>
              </Pressable>
            </View>
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

function AuthButton({
  label,
  busy,
  onPress,
  primary = false,
}: {
  label: string;
  busy: boolean;
  onPress: () => void;
  primary?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: primary ? theme.accentWarm : theme.background,
          borderColor: primary ? theme.accentWarm : theme.border,
          opacity: pressed || busy ? 0.7 : 1,
        },
      ]}>
      {busy ? (
        <ActivityIndicator color={primary ? theme.onAccent : theme.tint} />
      ) : (
        <ThemedText
          type="smallBold"
          style={{ color: primary ? theme.onAccent : theme.text }}>
          {label}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: Math.min(MaxContentWidth, 520),
    alignSelf: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.four,
  },
  hero: { alignItems: 'center', gap: Spacing.one },
  logo: { width: 84, height: 84, borderRadius: 22, marginBottom: Spacing.one },
  center: { textAlign: 'center' },
  card: {
    borderWidth: 1,
    borderRadius: Spacing.four,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  button: {
    minHeight: 50,
    borderWidth: 1,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  divider: { height: StyleSheet.hairlineWidth, flex: 1 },
  legalLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.three,
  },
});

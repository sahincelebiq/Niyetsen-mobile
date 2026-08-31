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

import { RegionLanguageSheet } from '@/components/region-language-sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { openLegalDocument } from '@/lib/legal-links';
import { AuthFlowError, useAuth } from '@/providers/auth-provider';
import { useLocale } from '@/providers/locale-provider';
import { supabaseConfigured } from '@/lib/supabase';

type Mode = 'sign-in' | 'sign-up';

export function AuthScreen() {
  const theme = useTheme();
  const auth = useAuth();
  const { t, regionId, setRegion } = useLocale();
  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preferGoogle, setPreferGoogle] = useState(false);

  function normalizedEmail() {
    return email.trim().toLowerCase();
  }

  async function run(label: string, action: () => Promise<void>) {
    setBusy(label);
    setError(null);
    setMessage(null);
    try {
      await action();
    } catch (value) {
      if (value instanceof AuthFlowError) {
        const mapped = {
          email_not_confirmed: t.auth.emailNotConfirmed,
          wrong_password: t.auth.wrongPassword,
          already_registered: t.auth.alreadyRegistered,
          google_incomplete: t.auth.googleIncomplete,
          provider_not_enabled: t.auth.providerNotEnabled,
          session_failed: t.auth.sessionFailed,
          recovery_expired: t.auth.recoveryExpired,
          generic: value.message || t.common.errorGeneric,
        }[value.code];
        setError(mapped);
        if (value.code === 'wrong_password') setPreferGoogle(true);
      } else {
        setError(value instanceof Error ? value.message : t.common.errorGeneric);
      }
    } finally {
      setBusy(null);
    }
  }

  function submitEmail() {
    if ((!auth.recovery && !email.trim()) || password.length < 6) {
      setError(t.auth.invalidCredentials);
      return;
    }
    void run('email', async () => {
      if (auth.recovery) {
        await auth.updatePassword(password);
        setMessage(t.auth.passwordUpdated);
      } else if (mode === 'sign-in') {
        await auth.signInWithEmail(normalizedEmail(), password);
      } else {
        const needsVerification = await auth.signUpWithEmail(normalizedEmail(), password);
        if (needsVerification) setMessage(t.auth.verifySent);
      }
    });
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ThemedView style={styles.flex}>
        <SafeAreaView style={styles.flex}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View style={styles.topBar}>
              <View style={styles.langWrap}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  {t.auth.languageRegion}
                </ThemedText>
                <RegionLanguageSheet
                  value={regionId}
                  onChange={(id) => void setRegion(id)}
                />
              </View>
            </View>

            <View style={styles.hero}>
              <Image
                source={require('@/assets/images/niyetsen-logo.png')}
                style={styles.logo}
                contentFit="contain"
              />
              <ThemedText type="screenTitle">Niyetsen</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
                {t.auth.hero}
              </ThemedText>
              {!supabaseConfigured ? (
                <ThemedText themeColor="danger" style={styles.center}>
                  {t.auth.supabaseMissing}
                </ThemedText>
              ) : null}
            </View>

            <ThemedView
              type="backgroundElement"
              style={[styles.card, { borderColor: theme.border }]}>
              <ThemedText type="subtitle">
                {auth.recovery
                  ? t.auth.newPassword
                  : mode === 'sign-in'
                    ? t.auth.welcomeBack
                    : t.auth.startJourney}
              </ThemedText>

              {!auth.recovery && (
                <TextInput
                  autoCapitalize="none"
                  autoComplete="email"
                  inputMode="email"
                  keyboardType="email-address"
                  placeholder={t.auth.email}
                  placeholderTextColor={theme.textSecondary}
                  value={email}
                  onChangeText={(value) => {
                    setEmail(value);
                    setPreferGoogle(false);
                  }}
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
                placeholder={t.auth.password}
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
                    ? t.common.save
                    : mode === 'sign-in'
                      ? t.auth.signIn
                      : t.auth.signUp
                }
                busy={busy === 'email'}
                onPress={submitEmail}
                primary
              />

              {mode === 'sign-in' && !auth.recovery && (
                <Pressable
                  disabled={!!busy}
                  onPress={() => {
                    if (!normalizedEmail()) {
                      setError(t.auth.resetEmailRequired);
                      return;
                    }
                    void run('reset', async () => {
                      await auth.resetPassword(normalizedEmail());
                      setMessage(t.auth.resetLinkSent);
                    });
                  }}>
                  <ThemedText type="small" themeColor="tint" style={styles.center}>
                    {t.auth.forgotPassword}
                  </ThemedText>
                </Pressable>
              )}

              {!auth.recovery && (
                <>
                  <View style={styles.dividerRow}>
                    <View style={[styles.divider, { backgroundColor: theme.border }]} />
                    <ThemedText type="small" themeColor="textSecondary">
                      {t.auth.orDivider}
                    </ThemedText>
                    <View style={[styles.divider, { backgroundColor: theme.border }]} />
                  </View>

                  <AuthButton
                    label={t.auth.continueWithGoogle}
                    busy={busy === 'google'}
                    highlighted={preferGoogle}
                    onPress={() => void run('google', auth.signInWithGoogle)}
                  />
                  <AuthButton
                    label={t.auth.continueWithApple}
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
                        ? t.auth.switchToSignUp
                        : t.auth.switchToSignIn}
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
                  {t.auth.legalPrivacy}
                </ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="link"
                hitSlop={8}
                onPress={() => void openLegalDocument('kvkk')}>
                <ThemedText type="smallBold" themeColor="tint">
                  {t.auth.legalKvkk}
                </ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="link"
                hitSlop={8}
                onPress={() => void openLegalDocument('consent')}>
                <ThemedText type="smallBold" themeColor="tint">
                  {t.auth.legalConsent}
                </ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="link"
                hitSlop={8}
                onPress={() => void openLegalDocument('terms')}>
                <ThemedText type="smallBold" themeColor="tint">
                  {t.auth.legalTerms}
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
  highlighted = false,
}: {
  label: string;
  busy: boolean;
  onPress: () => void;
  primary?: boolean;
  highlighted?: boolean;
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
          borderColor: primary
            ? theme.accentWarm
            : highlighted
              ? theme.tint
              : theme.border,
          borderWidth: highlighted && !primary ? 2 : 1,
          opacity: pressed || busy ? 0.7 : 1,
        },
      ]}>
      {busy ? (
        <ActivityIndicator color={primary ? theme.onAccent : theme.tint} />
      ) : (
        <ThemedText
          type="smallBold"
          style={{ color: primary ? theme.onAccent : highlighted ? theme.tint : theme.text }}>
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
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    gap: Spacing.three,
  },
  topBar: {
    alignItems: 'stretch',
  },
  langWrap: {
    gap: Spacing.one,
  },
  hero: { alignItems: 'center', gap: Spacing.half },
  logo: { width: 64, height: 64, borderRadius: 18, marginBottom: Spacing.half },
  center: { textAlign: 'center' },
  card: {
    borderWidth: 1,
    borderRadius: Spacing.four,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  button: {
    minHeight: 48,
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

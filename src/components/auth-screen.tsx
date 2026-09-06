import { type Href, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image } from 'expo-image';

import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ErrorBanner } from '@/components/error-banner';
import { KeyboardAwareView } from '@/components/keyboard-aware-view';
import { RegionLanguageSheet } from '@/components/region-language-sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts, MaxContentWidth, Spacing } from '@/constants/theme';
import { authMesaji } from '@/features/auth/auth-errors';
import { useTheme } from '@/hooks/use-theme';
import { LEGAL_APP_ROUTES } from '@/lib/legal-links';
import { AuthFlowError, useAuth } from '@/providers/auth-provider';
import { useLocale } from '@/providers/locale-provider';
import { supabaseConfigured } from '@/lib/supabase';

const MAIL_COOLDOWN_MS = 60_000;
/** GoTrue OTP 6 veya 8 hane olabilir; kutuyu 6'da kesmek kodu kırar. */
const OTP_MAX_LEN = 8;

type Mode = 'sign-in' | 'sign-up';
type Step = 'form' | 'otp';

export function AuthScreen() {
  const theme = useTheme();
  const auth = useAuth();
  const { t, regionId, setRegion } = useLocale();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('sign-in');
  const [step, setStep] = useState<Step>('form');
  const [otpPurpose, setOtpPurpose] = useState<'recovery' | 'signup'>('recovery');
  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [lastIntent, setLastIntent] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preferGoogle, setPreferGoogle] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (cooldownUntil <= now) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [cooldownUntil, now]);

  const cooldownSec = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));
  const mailLocked = cooldownSec > 0;

  function startMailCooldown() {
    const until = Date.now() + MAIL_COOLDOWN_MS;
    setCooldownUntil(until);
    setNow(Date.now());
  }

  function normalizedEmail() {
    return email.trim().toLowerCase();
  }

  async function run(label: string, action: () => Promise<void>) {
    setBusy(label);
    setLastIntent(label);
    setError(null);
    setMessage(null);
    try {
      await action();
      if (label === 'reset' || (label === 'email' && mode === 'sign-up')) {
        startMailCooldown();
      }
    } catch (value) {
      if (value instanceof AuthFlowError) {
        if (value.kod === 'iptal') return;
        setError(authMesaji(value.kod, t));
        if (value.kod === 'gecersiz_kimlik') setPreferGoogle(true);
        if (
          value.kod === 'cok_fazla_deneme' ||
          (value.kod === 'sunucu_hatasi' && (label === 'reset' || label === 'email'))
        ) {
          startMailCooldown();
        }
      } else {
        setError(t.common.errorGeneric);
      }
    } finally {
      setBusy(null);
    }
  }

  function retryLast() {
    if (lastIntent === 'otp') {
      submitOtp();
      return;
    }
    if (lastIntent === 'reset') {
      if (mailLocked || !normalizedEmail()) return;
      void run('reset', async () => {
        await auth.sendEmailOtp(normalizedEmail(), otpPurpose);
        setMessage(t.auth.otpSent);
      });
      return;
    }
    if (lastIntent === 'google') {
      void run('google', auth.signInWithGoogle);
      return;
    }
    if (lastIntent === 'apple') {
      void run('apple', auth.signInWithApple);
      return;
    }
    submitEmail();
  }

  function submitEmail() {
    if (auth.recovery) {
      if (password.length < 6) {
        setError(t.auth.invalidCredentials);
        return;
      }
      void run('email', async () => {
        await auth.updatePassword(password);
        setMessage(t.auth.passwordUpdated);
        setStep('form');
        setOtp('');
      });
      return;
    }
    if (!email.trim() || password.length < 6) {
      setError(t.auth.invalidCredentials);
      return;
    }
    void run('email', async () => {
      if (mode === 'sign-in') {
        await auth.signInWithEmail(normalizedEmail(), password);
      } else {
        const needsVerification = await auth.signUpWithEmail(normalizedEmail(), password);
        if (needsVerification) {
          setOtpPurpose('signup');
          setStep('otp');
          setOtp('');
          setMessage(t.auth.otpSent);
        }
      }
    });
  }

  function submitOtp() {
    if (!normalizedEmail() || otp.replace(/\s/g, '').length < 6) {
      setError(t.auth.invalidOtp);
      return;
    }
    void run('otp', async () => {
      await auth.verifyEmailOtp(normalizedEmail(), otp, otpPurpose);
      setMessage(otpPurpose === 'recovery' ? t.auth.newPasswordHint : t.auth.passwordUpdated);
      if (otpPurpose === 'recovery') {
        setStep('form');
        setOtp('');
        setPassword('');
      }
    });
  }

  return (
    <KeyboardAwareView>
      <ThemedView style={styles.flex}>
        <SafeAreaView style={styles.flex}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View style={styles.topBar}>
              <ThemedView
                type="backgroundElement"
                style={[styles.langCard, { borderColor: theme.tint }]}>
                <ThemedText type="smallBold">{t.auth.languageRegion}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {t.auth.languageRegionHint}
                </ThemedText>
                <RegionLanguageSheet
                  value={regionId}
                  onChange={(id) => void setRegion(id)}
                />
              </ThemedView>
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
                  : step === 'otp'
                    ? t.auth.otpVerify
                    : mode === 'sign-in'
                      ? t.auth.welcomeBack
                      : t.auth.startJourney}
              </ThemedText>

              {auth.recovery ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {t.auth.newPasswordHint}
                </ThemedText>
              ) : null}

              {step === 'otp' && !auth.recovery ? (
                <>
                  <ThemedText type="small" themeColor="textSecondary">
                    {t.auth.otpHint}
                  </ThemedText>
                  <TextInput
                    autoCapitalize="none"
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    keyboardType="number-pad"
                    maxLength={OTP_MAX_LEN}
                    placeholder={t.auth.otpPlaceholder}
                    placeholderTextColor={theme.textSecondary}
                    value={otp}
                    onChangeText={(value) =>
                      setOtp(value.replace(/[^\d]/g, '').slice(0, OTP_MAX_LEN))
                    }
                    onSubmitEditing={submitOtp}
                    style={[
                      styles.input,
                      {
                        borderColor: theme.border,
                        color: theme.text,
                        fontFamily: Fonts.sans,
                        letterSpacing: 6,
                        textAlign: 'center',
                      },
                    ]}
                  />
                  {error ? (
                    <ErrorBanner
                      message={error}
                      onRetry={retryLast}
                      retrying={!!busy}
                      retryLabel={t.common.retry}
                      retryingLabel={t.common.loading}
                    />
                  ) : null}
                  {message && <ThemedText themeColor="success">{message}</ThemedText>}
                  <AuthButton
                    label={t.auth.otpVerify}
                    busy={busy === 'otp'}
                    onPress={submitOtp}
                    primary
                  />
                  <Pressable
                    disabled={!!busy || mailLocked}
                    onPress={() => {
                      if (mailLocked) return;
                      void run('reset', async () => {
                        await auth.sendEmailOtp(normalizedEmail(), otpPurpose);
                        setMessage(t.auth.otpSent);
                      });
                    }}>
                    <ThemedText type="small" themeColor="tint" style={styles.center}>
                      {mailLocked
                        ? t.auth.cooldownWait(cooldownSec)
                        : t.auth.otpResend}
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    disabled={!!busy}
                    onPress={() => {
                      setStep('form');
                      setOtp('');
                      setError(null);
                      setMessage(null);
                    }}>
                    <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
                      {t.common.back}
                    </ThemedText>
                  </Pressable>
                </>
              ) : (
                <>
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

              {error ? (
                <ErrorBanner
                  message={error}
                  onRetry={retryLast}
                  retrying={!!busy}
                  retryLabel={t.common.retry}
                  retryingLabel={t.common.loading}
                />
              ) : null}
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
                warm={mode === 'sign-up' && !auth.recovery}
              />

              {mode === 'sign-in' && !auth.recovery && (
                <Pressable
                  disabled={!!busy || mailLocked}
                  onPress={() => {
                    if (mailLocked) return;
                    if (!normalizedEmail()) {
                      setError(t.auth.resetEmailRequired);
                      return;
                    }
                    void run('reset', async () => {
                      await auth.sendEmailOtp(normalizedEmail(), 'recovery');
                      setOtpPurpose('recovery');
                      setStep('otp');
                      setOtp('');
                      setMessage(t.auth.otpSent);
                    });
                  }}>
                  <ThemedText type="small" themeColor="tint" style={styles.center}>
                    {mailLocked
                      ? t.auth.cooldownWait(cooldownSec)
                      : t.auth.forgotPassword}
                  </ThemedText>
                </Pressable>
              )}
                </>
              )}

              {step !== 'otp' && !auth.recovery && (
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
                      setStep('form');
                      setOtp('');
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
                onPress={() => router.push(LEGAL_APP_ROUTES.privacy as Href)}>
                <ThemedText type="smallBold" themeColor="tint">
                  {t.auth.legalPrivacy}
                </ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="link"
                hitSlop={8}
                onPress={() => router.push(LEGAL_APP_ROUTES.kvkk as Href)}>
                <ThemedText type="smallBold" themeColor="tint">
                  {t.auth.legalKvkk}
                </ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="link"
                hitSlop={8}
                onPress={() => router.push(LEGAL_APP_ROUTES.consent as Href)}>
                <ThemedText type="smallBold" themeColor="tint">
                  {t.auth.legalConsent}
                </ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="link"
                hitSlop={8}
                onPress={() => router.push(LEGAL_APP_ROUTES.terms as Href)}>
                <ThemedText type="smallBold" themeColor="tint">
                  {t.auth.legalTerms}
                </ThemedText>
              </Pressable>
            </View>
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
    </KeyboardAwareView>
  );
}

function AuthButton({
  label,
  busy,
  onPress,
  primary = false,
  highlighted = false,
  warm = false,
}: {
  label: string;
  busy: boolean;
  onPress: () => void;
  primary?: boolean;
  highlighted?: boolean;
  warm?: boolean;
}) {
  const theme = useTheme();
  const fill = primary ? (warm ? theme.accentWarm : theme.tint) : theme.background;
  const onFill = primary ? theme.onAccent : highlighted ? theme.tint : theme.text;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: fill,
          borderColor: primary
            ? fill
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
          style={{ color: onFill }}>
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
  langCard: {
    borderWidth: 1.5,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
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

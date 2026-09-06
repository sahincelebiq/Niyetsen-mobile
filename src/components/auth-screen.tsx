import { type Href, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image } from 'expo-image';

import {
  ActivityIndicator,
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
import { Fonts, MaxContentWidth, Radii, Spacing } from '@/constants/theme';
import { authMesaji } from '@/features/auth/auth-errors';
import { useTheme } from '@/hooks/use-theme';
import { LEGAL_APP_ROUTES } from '@/lib/legal-links';
import { AuthFlowError, useAuth } from '@/providers/auth-provider';
import { useLocale } from '@/providers/locale-provider';
import { supabaseConfigured } from '@/lib/supabase';

const MAIL_COOLDOWN_MS = 60_000;
const OTP_MAX_LEN = 8;

type Screen = 'sign-in' | 'email' | 'password' | 'otp';
type Intent = 'sign-in' | 'sign-up' | 'forgot';

function emailLooksValid(value: string): boolean {
  const email = value.trim();
  const at = email.indexOf('@');
  return at > 0 && email.includes('.', at) && !email.includes(' ') && email.length >= 6;
}

export function AuthScreen() {
  const theme = useTheme();
  const auth = useAuth();
  const { t, regionId, setRegion } = useLocale();
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>(auth.recovery ? 'password' : 'sign-in');
  const [intent, setIntent] = useState<Intent>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [lastIntent, setLastIntent] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preferGoogle, setPreferGoogle] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (auth.recovery) setScreen('password');
  }, [auth.recovery]);

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

  function goBackToSignIn() {
    setScreen('sign-in');
    setIntent('sign-in');
    setOtp('');
    setError(null);
    setMessage(null);
    if (!auth.recovery) setPassword('');
  }

  async function run(label: string, action: () => Promise<void>) {
    setBusy(label);
    setLastIntent(label);
    setError(null);
    setMessage(null);
    try {
      await action();
      if (label === 'reset' || (label === 'email' && intent === 'sign-up')) {
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
      submitEmailOnly();
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
    if (screen === 'password') {
      submitPassword();
      return;
    }
    submitSignIn();
  }

  function openEmailScreen(nextIntent: 'sign-up' | 'forgot') {
    setIntent(nextIntent);
    setScreen('email');
    setError(null);
    setMessage(null);
    setOtp('');
    setPassword('');
  }

  function submitEmailOnly() {
    if (!emailLooksValid(normalizedEmail())) {
      setError(t.auth.invalidEmail);
      return;
    }
    if (intent === 'forgot') {
      if (mailLocked) return;
      void run('reset', async () => {
        await auth.sendEmailOtp(normalizedEmail(), 'recovery');
        setScreen('otp');
        setOtp('');
        setMessage(t.auth.otpSent);
      });
      return;
    }
    setError(null);
    setMessage(null);
    setScreen('password');
  }

  function submitSignIn() {
    if (!emailLooksValid(normalizedEmail()) || password.length < 6) {
      setError(t.auth.invalidCredentials);
      return;
    }
    void run('email', async () => {
      await auth.signInWithEmail(normalizedEmail(), password);
    });
  }

  function submitPassword() {
    if (password.length < 6) {
      setError(t.auth.invalidCredentials);
      return;
    }
    if (auth.recovery) {
      void run('email', async () => {
        await auth.updatePassword(password);
        setMessage(t.auth.passwordUpdated);
        setScreen('sign-in');
        setIntent('sign-in');
        setOtp('');
      });
      return;
    }
    void run('email', async () => {
      const needsVerification = await auth.signUpWithEmail(normalizedEmail(), password);
      if (needsVerification) {
        setScreen('otp');
        setOtp('');
        setMessage(t.auth.otpSent);
      }
    });
  }

  function submitOtp() {
    if (!normalizedEmail() || otp.replace(/\s/g, '').length < 6) {
      setError(t.auth.invalidOtp);
      return;
    }
    const purpose = intent === 'sign-up' ? 'signup' : 'recovery';
    void run('otp', async () => {
      await auth.verifyEmailOtp(normalizedEmail(), otp, purpose);
      setMessage(purpose === 'recovery' ? t.auth.newPasswordHint : t.auth.passwordUpdated);
      if (purpose === 'recovery') {
        setScreen('password');
        setOtp('');
        setPassword('');
      }
    });
  }

  const title = auth.recovery
    ? t.auth.newPassword
    : screen === 'otp'
      ? t.auth.otpVerify
      : screen === 'email'
        ? intent === 'forgot'
          ? t.auth.forgotTitle
          : t.auth.emailFirstTitle
        : screen === 'password' && intent === 'sign-up'
          ? t.auth.createPasswordTitle
          : t.auth.welcomeBack;

  const subtitle = auth.recovery
    ? t.auth.newPasswordHint
    : screen === 'otp'
      ? t.auth.otpHint
      : screen === 'email'
        ? intent === 'forgot'
          ? t.auth.forgotHint
          : t.auth.emailFirstHint
        : screen === 'password' && intent === 'sign-up'
          ? t.auth.createPasswordHint
          : t.auth.hero;

  return (
    <KeyboardAwareView>
      <ThemedView style={styles.flex}>
        <SafeAreaView style={styles.flex}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View style={styles.langRow}>
              <ThemedText type="small" themeColor="textSecondary">
                {t.auth.languageRegionHint}
              </ThemedText>
              <RegionLanguageSheet
                value={regionId}
                onChange={(id) => void setRegion(id)}
              />
            </View>

            <View style={styles.hero}>
              <Image
                source={require('@/assets/images/niyetsen-logo.png')}
                style={styles.logo}
                contentFit="contain"
              />
              <ThemedText type="screenTitle">Niyetsen</ThemedText>
              {!supabaseConfigured ? (
                <ThemedText themeColor="danger" style={styles.center}>
                  {t.auth.supabaseMissing}
                </ThemedText>
              ) : null}
            </View>

            <ThemedView
              type="backgroundElement"
              style={[styles.card, { borderColor: theme.border }]}>
              <ThemedText type="subtitle">{title}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {subtitle}
              </ThemedText>

              {screen === 'otp' ? (
                <TextInput
                  autoFocus
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
                      letterSpacing: 4,
                      textAlign: 'center',
                    },
                  ]}
                />
              ) : null}

              {screen === 'email' || screen === 'sign-in' ? (
                <TextInput
                  autoFocus={screen === 'email'}
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                  inputMode="email"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  placeholder={t.auth.email}
                  placeholderTextColor={theme.textSecondary}
                  value={email}
                  onChangeText={(value) => {
                    setEmail(value);
                    setPreferGoogle(false);
                  }}
                  onSubmitEditing={screen === 'email' ? submitEmailOnly : undefined}
                  style={[
                    styles.input,
                    {
                      borderColor: theme.border,
                      color: theme.text,
                      fontFamily: Fonts.sans,
                    },
                  ]}
                />
              ) : null}

              {screen === 'sign-in' || screen === 'password' ? (
                <TextInput
                  autoFocus={screen === 'password'}
                  autoCapitalize="none"
                  autoComplete={
                    screen === 'sign-in' && !auth.recovery
                      ? 'current-password'
                      : 'new-password'
                  }
                  placeholder={t.auth.password}
                  placeholderTextColor={theme.textSecondary}
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                  onSubmitEditing={screen === 'sign-in' ? submitSignIn : submitPassword}
                  style={[
                    styles.input,
                    {
                      borderColor: theme.border,
                      color: theme.text,
                      fontFamily: Fonts.sans,
                    },
                  ]}
                />
              ) : null}

              {error ? (
                <ErrorBanner
                  message={error}
                  onRetry={retryLast}
                  retrying={!!busy}
                  retryLabel={t.common.retry}
                  retryingLabel={t.common.loading}
                />
              ) : null}
              {message ? <ThemedText themeColor="success">{message}</ThemedText> : null}

              {screen === 'otp' ? (
                <>
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
                        await auth.sendEmailOtp(
                          normalizedEmail(),
                          intent === 'sign-up' ? 'signup' : 'recovery',
                        );
                        setMessage(t.auth.otpSent);
                      });
                    }}>
                    <ThemedText type="small" themeColor="tint" style={styles.center}>
                      {mailLocked ? t.auth.cooldownWait(cooldownSec) : t.auth.otpResend}
                    </ThemedText>
                  </Pressable>
                </>
              ) : null}

              {screen === 'email' ? (
                <AuthButton
                  label={intent === 'forgot' ? t.auth.sendCode : t.common.continue}
                  busy={busy === 'reset'}
                  onPress={submitEmailOnly}
                  primary
                />
              ) : null}

              {screen === 'password' ? (
                <AuthButton
                  label={auth.recovery ? t.common.save : t.auth.signUp}
                  busy={busy === 'email'}
                  onPress={submitPassword}
                  primary
                  warm={!auth.recovery}
                />
              ) : null}

              {screen === 'sign-in' ? (
                <>
                  <AuthButton
                    label={t.auth.signIn}
                    busy={busy === 'email'}
                    onPress={submitSignIn}
                    primary
                  />
                  <Pressable
                    disabled={!!busy}
                    onPress={() => openEmailScreen('forgot')}>
                    <ThemedText type="small" themeColor="tint" style={styles.center}>
                      {t.auth.forgotPassword}
                    </ThemedText>
                  </Pressable>
                </>
              ) : null}

              {screen !== 'sign-in' ? (
                <Pressable disabled={!!busy} onPress={goBackToSignIn}>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
                    {t.common.back}
                  </ThemedText>
                </Pressable>
              ) : null}

              {screen === 'sign-in' ? (
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
                    disabled={!!busy}
                    onPress={() => openEmailScreen('sign-up')}>
                    <ThemedText type="small" themeColor="tint" style={styles.center}>
                      {t.auth.switchToSignUp}
                    </ThemedText>
                  </Pressable>
                </>
              ) : null}
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
          borderColor: primary ? fill : highlighted ? theme.tint : theme.border,
          borderWidth: highlighted && !primary ? 2 : 1,
          opacity: pressed || busy ? 0.7 : 1,
        },
      ]}>
      {busy ? (
        <ActivityIndicator color={primary ? theme.onAccent : theme.tint} />
      ) : (
        <ThemedText type="smallBold" style={{ color: onFill }}>
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
    maxWidth: Math.min(MaxContentWidth, 440),
    alignSelf: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
    gap: Spacing.four,
  },
  langRow: {
    gap: Spacing.two,
  },
  hero: { alignItems: 'center', gap: Spacing.two },
  logo: { width: 56, height: 56, borderRadius: 16, marginBottom: Spacing.one },
  center: { textAlign: 'center' },
  card: {
    borderWidth: 1,
    borderRadius: Radii.large,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: Radii.medium,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  button: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: Radii.medium,
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
    paddingBottom: Spacing.two,
  },
});

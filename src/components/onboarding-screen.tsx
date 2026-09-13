import { useEffect, useMemo, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BirthDateField } from '@/components/birth-date-field';
import { ChatWallpaper } from '@/components/chat-wallpaper';
import {
  ConsentChoices,
  ConsentChoicesValue,
  EMPTY_CONSENT_CHOICES,
} from '@/components/consent-choices';
import { ErrorBanner } from '@/components/error-banner';
import { KeyboardAwareView } from '@/components/keyboard-aware-view';
import { RegionLanguageSheet } from '@/components/region-language-sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TimeOfDayField, type TimeOfDayValue } from '@/components/time-of-day-field';
import { SurfaceCard } from '@/components/ui/surface-card';
import { LEGAL_MIN_AGE } from '@/constants/legal';
import { Fonts, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { trackEvent } from '@/lib/analytics';
import { ApiError, updateConsent, updateProfile, GENDER_OPTIONS, type GenderOption } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import {
  birthDateDisplayFromIso,
  birthDateIsoFromDisplay,
  isAtLeastYearsOld,
  isValidBirthDateDisplay,
} from '@/lib/birth-date';
import { enablePushNotifications } from '@/lib/push-notifications';
import { clearOnboardingDraft, readOnboardingDraft, writeOnboardingDraft } from '@/lib/onboarding-draft';
import { useLocale } from '@/providers/locale-provider';
import { useProfile } from '@/providers/profile-provider';

type OnboardingStepId = 'region' | 'name' | 'gender' | 'birth' | 'notif' | 'consent';

export function OnboardingScreen() {
  const theme = useTheme();
  const scheme = useColorScheme();
  const { t, regionId, setRegion, timezone, locale } = useLocale();
  const { profile, refresh } = useProfile();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [gender, setGender] = useState<GenderOption | null>(null);
  const [birthDate, setBirthDate] = useState('');
  const [notifTime, setNotifTime] = useState<TimeOfDayValue>({ hour: 8, minute: 0 });
  const [consents, setConsents] = useState<ConsentChoicesValue>(EMPTY_CONSENT_CHOICES);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const wallpaperScrim = scheme === 'dark' ? 0.52 : 0.38;

  useEffect(() => {
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    return () => sub.remove();
  }, []);
  const [draftReady, setDraftReady] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);

  const steps = useMemo(() => {
    const all: { id: OnboardingStepId; title: string }[] = [
      { id: 'region', title: t.onboarding.regionTitle },
      { id: 'name', title: t.onboarding.nameTitle },
      { id: 'gender', title: t.onboarding.genderTitle },
      { id: 'birth', title: t.onboarding.birthTitle },
      { id: 'notif', title: t.onboarding.notifTitle },
      { id: 'consent', title: t.onboarding.consentTitle },
    ];
    // Cinsiyet zaten kayıtlıysa bu adımı sorma (B6 — tekrar sorma).
    return profile?.gender ? all.filter((item) => item.id !== 'gender') : all;
  }, [profile?.gender, t]);
  const current = steps[step] ?? steps[0];
  const isLast = step === steps.length - 1;

  useEffect(() => {
    let cancelled = false;
    const userId = user?.id;
    if (!userId) {
      setDraftLoaded(false);
      setDraftReady(false);
      return;
    }
    void (async () => {
      const draft = await readOnboardingDraft(userId);
      if (cancelled) return;
      if (draft) {
        const draftIndex = steps.findIndex((item) => item.id === draft.stepId);
        setStep(draftIndex >= 0 ? draftIndex : 0);
        setName(draft.name);
        setGender(draft.gender);
        setBirthDate(draft.birthDate);
        setNotifTime(draft.notifTime);
        setConsents(draft.consents);
        setDraftLoaded(true);
      } else {
        setDraftLoaded(false);
      }
      setDraftReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [steps, user?.id]);

  useEffect(() => {
    if (!draftReady || draftLoaded) return;
    if (profile?.gender) setGender(profile.gender);
    if (profile?.name) setName(profile.name);
    if (profile?.birth_date) setBirthDate(birthDateDisplayFromIso(profile.birth_date));
    if (typeof profile?.notif_hour === 'number') {
      setNotifTime({
        hour: profile.notif_hour,
        minute: profile.notif_minute ?? 0,
      });
    }
  }, [
    draftLoaded,
    draftReady,
    profile?.birth_date,
    profile?.gender,
    profile?.name,
    profile?.notif_hour,
    profile?.notif_minute,
  ]);

  useEffect(() => {
    setStep((value) => Math.min(value, Math.max(steps.length - 1, 0)));
  }, [steps.length]);

  useEffect(() => {
    if (!user?.id || !draftReady) return;
    const currentStep = current?.id ?? steps[0]?.id ?? 'region';
    void writeOnboardingDraft(user.id, {
      stepId: currentStep,
      name,
      gender,
      birthDate,
      notifTime,
      consents: {
        ...consents,
        age18: Boolean(consents.age18),
      },
    });
  }, [birthDate, consents, current, draftReady, gender, name, notifTime, steps, user?.id]);

  function validateCurrent() {
    if (current.id === 'name' && !name.trim()) return t.onboarding.nameRequired;
    if (current.id === 'birth') {
      if (!isValidBirthDateDisplay(birthDate)) return t.onboarding.birthInvalid;
      const iso = birthDateIsoFromDisplay(birthDate);
      if (!iso || !isAtLeastYearsOld(iso, LEGAL_MIN_AGE)) return t.onboarding.under18;
    }
    if (current.id === 'notif' && notifTime.hour === undefined) {
      return t.onboarding.notifRequired;
    }
    if (current.id === 'consent' && (!consents.privacy || !consents.age18)) {
      return t.onboarding.consentRequired;
    }
    return null;
  }

  async function next() {
    if (busy) return;
    const validationError = validateCurrent();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    if (current.id === 'notif' && user?.id) {
      try {
        await enablePushNotifications(user.id);
        void trackEvent('bildirim_izni_sonucu', { enabled: true, source: 'onboarding' });
      } catch {
        // İzin reddi / desteklenmeyen sürüm onboarding'i durdurmaz;
        // Profil'den tekrar açılır.
      }
    }
    if (step < steps.length - 1) {
      setStep((value) => value + 1);
      return;
    }
    setBusy(true);
    try {
      const isoBirthDate = birthDateIsoFromDisplay(birthDate);
      if (!isoBirthDate) {
        setError(t.onboarding.birthSaveInvalid);
        setBusy(false);
        return;
      }
      if (!isAtLeastYearsOld(isoBirthDate, LEGAL_MIN_AGE)) {
        setError(t.onboarding.under18);
        setBusy(false);
        return;
      }
      await updateProfile({
        name: name.trim(),
        birth_date: isoBirthDate,
        timezone,
        preferred_language: locale,
        notif_hour: notifTime.hour,
        notif_minute: notifTime.minute,
        kvkk_consent: true,
        gender,
      });
      await updateConsent({
        privacy_policy: { accepted: consents.privacy },
        kvkk_explicit_consent: { accepted: consents.privacy },
        ai_chat_processing: { accepted: consents.ai },
        proof_photo_processing: { accepted: consents.proofPhoto },
        marketing_communications: { accepted: consents.marketing },
      });
      if (user?.id) {
        await clearOnboardingDraft(user.id);
      }
      await refresh();
      void trackEvent('onboarding_complete');
    } catch (value) {
      if (value instanceof ApiError && value.status === 429) {
        setError(t.common.rateLimited);
      } else {
        setError(t.onboarding.profileSaveFailed);
      }
    } finally {
      setBusy(false);
    }
  }

  function pressScale(pressed: boolean) {
    return pressed && !reduceMotion ? 0.97 : 1;
  }

  return (
    <KeyboardAwareView>
      <ThemedView style={styles.flex}>
        <ChatWallpaper />
        <View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[
            styles.wallpaperScrim,
            { backgroundColor: theme.background, opacity: wallpaperScrim },
          ]}
        />
        <SafeAreaView style={styles.flex}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View
              style={styles.progressRow}
              accessibilityRole="progressbar"
              accessibilityLabel={t.onboarding.stepOf(step + 1, steps.length)}
              accessibilityValue={{
                min: 1,
                max: steps.length,
                now: step + 1,
              }}>
              {steps.map((item, index) => (
                <View
                  key={item.id}
                  style={[
                    styles.progress,
                    { backgroundColor: index <= step ? theme.tint : theme.border },
                  ]}
                />
              ))}
            </View>
            <ThemedText type="small" themeColor="textSecondary" style={styles.stepLabel}>
              {t.onboarding.stepOf(step + 1, steps.length)}
            </ThemedText>

            <SurfaceCard elevated style={styles.card}>
              <ThemedText type="subtitle" accessibilityRole="header">
                {current.title}
              </ThemedText>
              {current.id === 'region' ? (
                <>
                  <ThemedText type="small" themeColor="textSecondary">
                    {t.onboarding.regionHint}
                  </ThemedText>
                  <RegionLanguageSheet
                    value={regionId}
                    onChange={(id) => void setRegion(id)}
                  />
                </>
              ) : null}
              {current.id === 'name' ? (
                <>
                  <ThemedText type="small" themeColor="textSecondary">
                    {t.onboarding.nameHint}
                  </ThemedText>
                  <Field
                    value={name}
                    onChangeText={setName}
                    placeholder={t.onboarding.namePlaceholder}
                    accessibilityLabel={t.onboarding.namePlaceholder}
                  />
                </>
              ) : null}
              {current.id === 'gender' ? (
                <>
                  <ThemedText type="small" themeColor="textSecondary">
                    {t.onboarding.genderHint}
                  </ThemedText>
                  <View style={styles.genderRow} accessibilityRole="radiogroup">
                    {GENDER_OPTIONS.map((option) => {
                      const selected = gender === option;
                      return (
                        <Pressable
                          key={option}
                          accessibilityRole="radio"
                          accessibilityState={{ selected }}
                          accessibilityLabel={t.gender[option]}
                          onPress={() => setGender(option)}
                          style={({ pressed }) => [
                            styles.genderChip,
                            {
                              borderColor: selected ? theme.tint : theme.border,
                              backgroundColor: selected
                                ? theme.backgroundSelected
                                : theme.surfaceMuted,
                              opacity: pressed ? 0.85 : 1,
                              transform: [{ scale: pressScale(pressed) }],
                            },
                          ]}>
                          <ThemedText type="smallBold" themeColor={selected ? 'tint' : 'text'}>
                            {t.gender[option]}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t.onboarding.skipGender}
                    onPress={() => {
                      setGender(null);
                      setError(null);
                      setStep((value) => Math.min(value + 1, steps.length - 1));
                    }}
                    style={({ pressed }) => [
                      styles.textHit,
                      {
                        opacity: pressed ? 0.85 : 1,
                        transform: [{ scale: pressScale(pressed) }],
                      },
                    ]}>
                    <ThemedText type="small" themeColor="textSecondary">
                      {t.onboarding.skipGender}
                    </ThemedText>
                  </Pressable>
                </>
              ) : null}
              {current.id === 'birth' ? (
                <>
                  <ThemedText type="small" themeColor="textSecondary">
                    {t.onboarding.birthHint}
                  </ThemedText>
                  <BirthDateField value={birthDate} onChangeText={setBirthDate} />
                </>
              ) : null}
              {current.id === 'notif' ? (
                <>
                  <ThemedText type="small" themeColor="textSecondary">
                    {t.onboarding.notifHint}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {t.onboarding.notifEnable}
                  </ThemedText>
                  <TimeOfDayField
                    label={t.onboarding.notifHourLabel}
                    hint={t.onboarding.notifHint}
                    doneLabel={t.common.done}
                    value={notifTime}
                    onChange={setNotifTime}
                  />
                </>
              ) : null}
              {current.id === 'consent' ? (
                <ConsentChoices value={consents} onChange={setConsents} />
              ) : null}

              {error ? (
                <ErrorBanner
                  message={error}
                  onRetry={isLast ? () => void next() : undefined}
                  retrying={busy}
                />
              ) : null}

              <View style={styles.actions}>
                {step > 0 ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t.common.back}
                    onPress={() => {
                      setError(null);
                      setStep((value) => value - 1);
                    }}
                    style={({ pressed }) => [
                      styles.backHit,
                      {
                        borderColor: theme.border,
                        opacity: pressed ? 0.85 : 1,
                        transform: [{ scale: pressScale(pressed) }],
                      },
                    ]}>
                    <ThemedText type="smallBold" themeColor="tint">
                      {t.common.back}
                    </ThemedText>
                  </Pressable>
                ) : (
                  <View style={styles.backSpacer} />
                )}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={isLast ? t.common.done : t.common.continue}
                  disabled={busy}
                  onPress={() => void next()}
                  style={({ pressed }) => [
                    styles.nextButton,
                    {
                      backgroundColor: theme.accentWarm,
                      opacity: busy ? 0.7 : pressed ? 0.9 : 1,
                      transform: [{ scale: pressScale(pressed) }],
                    },
                  ]}>
                  {busy ? (
                    <ActivityIndicator color={theme.onAccent} />
                  ) : (
                    <ThemedText type="smallBold" style={{ color: theme.onAccent }}>
                      {isLast ? t.common.done : t.common.continue}
                    </ThemedText>
                  )}
                </Pressable>
              </View>
            </SurfaceCard>
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
    </KeyboardAwareView>
  );
}

function Field(props: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  accessibilityLabel?: string;
  keyboardType?: 'default' | 'number-pad' | 'numbers-and-punctuation';
}) {
  const theme = useTheme();
  const { accessibilityLabel, placeholder, ...rest } = props;
  return (
    <TextInput
      {...rest}
      placeholder={placeholder}
      placeholderTextColor={theme.textSecondary}
      accessibilityLabel={accessibilityLabel ?? placeholder}
      autoCorrect={false}
      style={[
        styles.input,
        {
          borderColor: theme.border,
          color: theme.text,
          backgroundColor: theme.surfaceMuted,
          fontFamily: Fonts.sans,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wallpaperScrim: { ...StyleSheet.absoluteFillObject },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
    gap: Spacing.three,
  },
  progressRow: { flexDirection: 'row', gap: Spacing.two },
  progress: { height: 4, flex: 1, borderRadius: Radii.pill },
  stepLabel: { textAlign: 'center' },
  card: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  genderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  genderChip: {
    minHeight: 44,
    borderWidth: 1.5,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: '100%',
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: Radii.medium,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  actions: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  backHit: {
    minHeight: 52,
    minWidth: 72,
    paddingHorizontal: Spacing.three,
    borderWidth: 1,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backSpacer: { minWidth: Spacing.one },
  textHit: {
    minHeight: 44,
    justifyContent: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.one,
  },
  nextButton: {
    minHeight: 52,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.three,
  },
});

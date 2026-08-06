import { useEffect, useMemo, useState } from 'react';
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

import { BirthDateField } from '@/components/birth-date-field';
import { TimeOfDayField, type TimeOfDayValue } from '@/components/time-of-day-field';
import {
  ConsentChoices,
  ConsentChoicesValue,
  EMPTY_CONSENT_CHOICES,
} from '@/components/consent-choices';
import { RegionPicker } from '@/components/region-picker';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts, Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { updateConsent, updateProfile, GENDER_OPTIONS, type GenderOption } from '@/lib/api';
import {
  birthDateIsoFromDisplay,
  isValidBirthDateDisplay,
} from '@/lib/birth-date';
import { trackEvent } from '@/lib/analytics';
import { useI18n } from '@/providers/locale-provider';
import { useProfile } from '@/providers/profile-provider';

type OnboardingStepId = 'region' | 'name' | 'gender' | 'birth' | 'notif' | 'consent';

export function OnboardingScreen() {
  const theme = useTheme();
  const { t, regionId, setRegion, timezone, locale } = useI18n();
  const { profile, refresh } = useProfile();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [gender, setGender] = useState<GenderOption | null>(null);
  const [birthDate, setBirthDate] = useState('');
  const [notifTime, setNotifTime] = useState<TimeOfDayValue>({ hour: 8, minute: 0 });
  const [consents, setConsents] = useState<ConsentChoicesValue>(EMPTY_CONSENT_CHOICES);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    if (profile?.gender) setGender(profile.gender);
    if (profile?.name) setName(profile.name);
  }, [profile?.gender, profile?.name]);

  useEffect(() => {
    setStep((value) => Math.min(value, Math.max(steps.length - 1, 0)));
  }, [steps.length]);

  function validateCurrent() {
    if (current.id === 'name' && !name.trim()) return t.onboarding.nameRequired;
    // cinsiyet atlanabilir — zorunlu değil.
    if (current.id === 'birth' && !isValidBirthDateDisplay(birthDate)) {
      return t.onboarding.birthInvalid;
    }
    if (current.id === 'notif' && notifTime.hour === undefined) {
      return t.onboarding.notifRequired;
    }
    if (current.id === 'consent' && !consents.privacy) {
      return t.onboarding.consentRequired;
    }
    return null;
  }

  async function next() {
    const validationError = validateCurrent();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
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
      await refresh();
      void trackEvent('onboarding_complete');
    } catch (value) {
      setError(value instanceof Error ? value.message : t.onboarding.profileSaveFailed);
    } finally {
      setBusy(false);
    }
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
            <View style={styles.progressRow}>
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

            <ThemedView
              type="backgroundElement"
              style={[styles.card, { borderColor: theme.border }]}>
              <ThemedText type="subtitle" style={styles.stepTitle}>
                {current.title}
              </ThemedText>
              {current.id === 'region' && (
                <>
                  <ThemedText themeColor="textSecondary">
                    {t.onboarding.regionHint}
                  </ThemedText>
                  <RegionPicker
                    value={regionId}
                    onChange={(id) => void setRegion(id)}
                  />
                </>
              )}
              {current.id === 'name' && (
                <>
                  <ThemedText themeColor="textSecondary">
                    Planın ve rehberin sana bu isimle seslenecek.
                  </ThemedText>
                  <Field value={name} onChangeText={setName} placeholder="İsmin" />
                </>
              )}
              {current.id === 'gender' && (
                <>
                  <ThemedText themeColor="textSecondary">
                    İstersen paylaş — yalnız hitabı kişiselleştirmek için. Atlayabilirsin.
                  </ThemedText>
                  <View style={styles.genderRow}>
                    {GENDER_OPTIONS.map((option) => {
                      const selected = gender === option;
                      return (
                        <Pressable
                          key={option}
                          accessibilityRole="button"
                          accessibilityState={{ selected }}
                          accessibilityLabel={option}
                          onPress={() => setGender(option)}
                          style={({ pressed }) => [
                            styles.genderChip,
                            {
                              borderColor: selected ? theme.tint : theme.border,
                              backgroundColor: selected
                                ? theme.backgroundSelected
                                : theme.surfaceMuted,
                              opacity: pressed ? 0.85 : 1,
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
                    accessibilityLabel="Cinsiyet sorusunu atla"
                    hitSlop={12}
                    onPress={() => {
                      setGender(null);
                      setError(null);
                      setStep((value) => Math.min(value + 1, steps.length - 1));
                    }}>
                    <ThemedText type="small" themeColor="textSecondary">
                      Şimdilik atla
                    </ThemedText>
                  </Pressable>
                </>
              )}
              {current.id === 'birth' && (
                <>
                  <ThemedText themeColor="textSecondary">
                    Burcunu otomatik hesaplamak için kullanılır.
                  </ThemedText>
                  <BirthDateField value={birthDate} onChangeText={setBirthDate} />
                </>
              )}
              {current.id === 'notif' && (
                <>
                  <ThemedText themeColor="textSecondary">
                    Günlük görev hatırlatıcını hangi saatte almak istersin?
                  </ThemedText>
                  <TimeOfDayField
                    label="Bildirim saati"
                    value={notifTime}
                    onChange={setNotifTime}
                  />
                </>
              )}
              {current.id === 'consent' && (
                <ConsentChoices value={consents} onChange={setConsents} />
              )}

              {error && <ThemedText themeColor="danger">{error}</ThemedText>}

              <View style={styles.actions}>
                {step > 0 && (
                  <Pressable
                    hitSlop={12}
                    onPress={() => setStep((value) => value - 1)}>
                    <ThemedText themeColor="tint">{t.common.back}</ThemedText>
                  </Pressable>
                )}
                <Pressable
                  disabled={busy}
                  onPress={() => void next()}
                  style={[
                    styles.nextButton,
                    { backgroundColor: theme.accentWarm, opacity: busy ? 0.7 : 1 },
                  ]}>
                  {busy ? (
                    <ActivityIndicator color={theme.onAccent} />
                  ) : (
                    <ThemedText
                      type="smallBold"
                      style={{ color: theme.onAccent }}>
                      {step === steps.length - 1 ? t.common.done : t.common.continue}
                    </ThemedText>
                  )}
                </Pressable>
              </View>
            </ThemedView>
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

function Field(props: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'number-pad' | 'numbers-and-punctuation';
}) {
  const theme = useTheme();
  return (
    <TextInput
      {...props}
      placeholderTextColor={theme.textSecondary}
      style={[
        styles.input,
        {
          borderColor: theme.border,
          color: theme.text,
          fontFamily: Fonts.sans,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  progressRow: { flexDirection: 'row', gap: Spacing.two },
  progress: { height: 5, flex: 1, borderRadius: 99 },
  card: {
    borderWidth: 1,
    borderRadius: Spacing.four,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  stepTitle: {
    fontSize: 22,
    lineHeight: 28,
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
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: Spacing.three,
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
  nextButton: {
    minHeight: 48,
    flex: 1,
    maxWidth: 280,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
});

import { useMemo, useState } from 'react';
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
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { updateConsent, updateProfile } from '@/lib/api';
import {
  birthDateIsoFromDisplay,
  isValidBirthDateDisplay,
} from '@/lib/birth-date';
import { trackEvent } from '@/lib/analytics';
import { useProfile } from '@/providers/profile-provider';

const STEP_TITLES = [
  'Sana nasıl hitap edelim?',
  'Doğum tarihin',
  'Hatırlatma saatin',
  'Gizlilik ve tercihler',
];

export function OnboardingScreen() {
  const theme = useTheme();
  const { refresh } = useProfile();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [notifTime, setNotifTime] = useState<TimeOfDayValue>({ hour: 8, minute: 0 });
  const [consents, setConsents] = useState<ConsentChoicesValue>(EMPTY_CONSENT_CHOICES);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Istanbul';
    } catch {
      return 'Europe/Istanbul';
    }
  }, []);

  function validateCurrent() {
    if (step === 0 && !name.trim()) return 'İsmini yazmalısın.';
    if (step === 1 && !isValidBirthDateDisplay(birthDate)) {
      return 'Tarihi gün.ay.yıl olarak yaz (ör. 10.04.1995).';
    }
    if (step === 2 && notifTime.hour === undefined) {
      return 'Bildirim saati seçmelisin.';
    }
    if (step === 3 && !consents.privacy) {
      return 'Devam etmek için aydınlatma metinlerini okuduğunu belirtmelisin.';
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
    if (step < STEP_TITLES.length - 1) {
      setStep((value) => value + 1);
      return;
    }
    setBusy(true);
    try {
      const isoBirthDate = birthDateIsoFromDisplay(birthDate);
      if (!isoBirthDate) {
        setError('Geçerli bir doğum tarihi gir.');
        setBusy(false);
        return;
      }
      await updateProfile({
        name: name.trim(),
        birth_date: isoBirthDate,
        timezone,
        notif_hour: notifTime.hour,
        notif_minute: notifTime.minute,
        kvkk_consent: true,
      });
      // KVKK açık rıza, zorunlu aydınlatma onayıyla (privacy) birlikte kaydedilir;
      // AI/fotoğraf amaç bazlı izinlerdir ve KVKK temel rızasını etkilemez.
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
      setError(value instanceof Error ? value.message : 'Profil kaydedilemedi.');
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
              {STEP_TITLES.map((_, index) => (
                <View
                  key={index}
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
              <ThemedText type="title">{STEP_TITLES[step]}</ThemedText>
              {step === 0 && (
                <>
                  <ThemedText themeColor="textSecondary">
                    Planın ve rehberin sana bu isimle seslenecek.
                  </ThemedText>
                  <Field value={name} onChangeText={setName} placeholder="İsmin" />
                </>
              )}
              {step === 1 && (
                <>
                  <ThemedText themeColor="textSecondary">
                    Burcunu otomatik hesaplamak için kullanılır.
                  </ThemedText>
                  <BirthDateField value={birthDate} onChangeText={setBirthDate} />
                </>
              )}
              {step === 2 && (
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
              {step === 3 && (
                <ConsentChoices value={consents} onChange={setConsents} />
              )}

              {error && <ThemedText themeColor="danger">{error}</ThemedText>}

              <View style={styles.actions}>
                {step > 0 && (
                  <Pressable
                    hitSlop={12}
                    onPress={() => setStep((value) => value - 1)}>
                    <ThemedText themeColor="tint">Geri</ThemedText>
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
                      {step === STEP_TITLES.length - 1 ? 'Niyetini Yazmaya Başla' : 'Devam'}
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

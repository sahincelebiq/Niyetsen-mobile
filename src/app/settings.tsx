import { useEffect, useState } from 'react';
import { type Href, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BirthDateField } from '@/components/birth-date-field';
import { KeyboardAwareView } from '@/components/keyboard-aware-view';
import { TimeOfDayField, type TimeOfDayValue } from '@/components/time-of-day-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useConsentPreferences } from '@/components/consent-gate';
import { Copy } from '@/constants/copy';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SurfaceCard } from '@/components/ui/surface-card';
import { Fonts, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { deleteAccount, updateProfile } from '@/lib/api';
import { openLegalDocument } from '@/lib/legal-links';
import type { LegalDocumentId } from '@/constants/legal';
import {
  birthDateDisplayFromIso,
  birthDateIsoFromDisplay,
} from '@/lib/birth-date';
import {
  disablePushNotifications,
  enablePushNotifications,
  getPushStatus,
  type PushStatus,
} from '@/lib/push-notifications';
import { useAuth } from '@/providers/auth-provider';
import { useProfile } from '@/providers/profile-provider';
import { useSubscription } from '@/providers/subscription-provider';

export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const { profile, refresh } = useProfile();
  const { status: subscriptionStatus } = useSubscription();
  const { status: consentStatus, saveChoices } = useConsentPreferences();
  const [name, setName] = useState(profile?.name ?? '');
  const [birthDate, setBirthDate] = useState(profile?.birth_date ?? '');
  const [notifTime, setNotifTime] = useState<TimeOfDayValue>({ hour: 8, minute: 0 });
  const [iradeMode, setIradeMode] = useState(profile?.irade_modu_active ?? false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [consentBusy, setConsentBusy] = useState(false);
  const [consentError, setConsentError] = useState<string | null>(null);
  const [pushStatus, setPushStatus] = useState<PushStatus | null>(null);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);

  useEffect(() => {
    setName(profile?.name ?? '');
    setBirthDate(birthDateDisplayFromIso(profile?.birth_date));
    setNotifTime({
      hour: profile?.notif_hour ?? 8,
      minute: profile?.notif_minute ?? 0,
    });
    setIradeMode(profile?.irade_modu_active ?? false);
  }, [profile]);

  useEffect(() => {
    if (!auth.user?.id) return;
    let active = true;
    getPushStatus(auth.user.id)
      .then((status) => {
        if (active) setPushStatus(status);
      })
      .catch((value) => {
        if (active) {
          setPushError(value instanceof Error ? value.message : 'Bildirim durumu okunamadı.');
        }
      });
    return () => {
      active = false;
    };
  }, [auth.user?.id]);

  async function save() {
    if (!profile) return;
    setBusy('save');
    setError(null);
    setMessage(null);
    try {
      const isoBirthDate = birthDateIsoFromDisplay(birthDate);
      if (!isoBirthDate) {
        setError('Doğum tarihini gün.ay.yıl olarak gir (ör. 10.04.1995).');
        setBusy(null);
        return;
      }
      await updateProfile({
        name: name.trim(),
        birth_date: isoBirthDate,
        timezone: profile.timezone,
        notif_hour: notifTime.hour,
        notif_minute: notifTime.minute,
        irade_modu_active: iradeMode,
      });
      await refresh();
      setMessage('Ayarların kaydedildi.');
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Ayarlar kaydedilemedi.');
    } finally {
      setBusy(null);
    }
  }

  function confirmDelete() {
    const perform = async () => {
      setBusy('delete');
      setError(null);
      try {
        await deleteAccount();
        await auth.signOut();
      } catch (value) {
        setError(value instanceof Error ? value.message : 'Hesap silinemedi.');
      } finally {
        setBusy(null);
      }
    };
    if (Platform.OS === 'web') {
      if (globalThis.confirm?.('Hesabın ve tüm verilerin kalıcı olarak silinsin mi?')) {
        void perform();
      }
      return;
    }
    Alert.alert(
      'Hesabımı sil',
      'Planın, sohbetlerin ve kanıt fotoğrafların kalıcı olarak silinecek. Bu işlem geri alınamaz.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Kalıcı olarak sil', style: 'destructive', onPress: () => void perform() },
      ],
    );
  }

  // İrade Modu switch'i artık anında kaydedilir — önceden "Değişiklikleri Kaydet"e
  // basılmazsa tercih sessizce kayboluyordu (switch deseni otomatik kayıt bekletir).
  async function changeIradeMode(nextValue: boolean) {
    if (!profile?.name || !profile.birth_date) return;
    setIradeMode(nextValue);
    setBusy('irade');
    setError(null);
    try {
      await updateProfile({
        name: profile.name,
        birth_date: profile.birth_date,
        timezone: profile.timezone,
        notif_hour: profile.notif_hour ?? 8,
        notif_minute: profile.notif_minute ?? 0,
        irade_modu_active: nextValue,
      });
      await refresh();
    } catch (value) {
      setIradeMode(!nextValue);
      setError(value instanceof Error ? value.message : 'İrade Modu kaydedilemedi.');
    } finally {
      setBusy(null);
    }
  }

  async function changeConsent(
    key: 'ai' | 'proofPhoto' | 'marketing',
    accepted: boolean,
  ) {
    setConsentBusy(true);
    setConsentError(null);
    try {
      await saveChoices({
        privacy: consentStatus.privacy_policy.accepted,
        ai: key === 'ai' ? accepted : consentStatus.ai_chat_processing.accepted,
        proofPhoto:
          key === 'proofPhoto' ? accepted : consentStatus.proof_photo_processing.accepted,
        marketing:
          key === 'marketing' ? accepted : consentStatus.marketing_communications.accepted,
      });
    } catch (value) {
      setConsentError(value instanceof Error ? value.message : 'Tercih kaydedilemedi.');
    } finally {
      setConsentBusy(false);
    }
  }

  async function changePushPreference(enabled: boolean) {
    if (!auth.user?.id || pushBusy) return;
    setPushBusy(true);
    setPushError(null);
    try {
      const nextStatus = enabled
        ? await enablePushNotifications(auth.user.id)
        : await disablePushNotifications(auth.user.id);
      setPushStatus(nextStatus);
    } catch (value) {
      setPushError(value instanceof Error ? value.message : 'Bildirim tercihi değiştirilemedi.');
      setPushStatus(await getPushStatus(auth.user.id));
    } finally {
      setPushBusy(false);
    }
  }

  return (
    <ThemedView style={styles.flex}>
      <KeyboardAwareView offset={Platform.OS === 'ios' ? insets.top : 0}>
        <ScreenScaffold scrollable>
        <ScreenHeader title={Copy.profile.title} subtitle={Copy.profile.subtitle} />

        <SurfaceCard>
          <View style={styles.profileRow}>
            <View style={[styles.avatar, { backgroundColor: theme.accentWarm }]}>
              <ThemedText type="subtitle" style={{ color: theme.onAccent }}>
                {(name.trim()[0] || 'S').toUpperCase()}
              </ThemedText>
            </View>
            <View style={styles.profileMeta}>
              <ThemedText type="subtitle">{name.trim() || 'Sen'}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {subscriptionStatus?.status === 'active' ? 'Abonelik aktif' : 'Deneme / ücretsiz'}
              </ThemedText>
            </View>
          </View>
        </SurfaceCard>

        <ThemedView
          type="backgroundElement"
          style={[styles.card, { borderColor: theme.border }]}>
          <ThemedText type="subtitle">Hesap</ThemedText>
            <Field label="İsim" value={name} onChangeText={setName} />
            <View style={styles.field}>
              <ThemedText type="smallBold">Doğum tarihi</ThemedText>
              <BirthDateField value={birthDate} onChangeText={setBirthDate} />
            </View>
            <TimeOfDayField
              label="Bildirim saati"
              value={notifTime}
              onChange={setNotifTime}
            />
            {profile?.zodiac_sign && (
              <ThemedText themeColor="textSecondary">
                Burcun: {profile.zodiac_sign}
              </ThemedText>
            )}
            {error && <ThemedText themeColor="danger">{error}</ThemedText>}
            {message && <ThemedText themeColor="success">{message}</ThemedText>}
            <ActionButton
              label="Değişiklikleri Kaydet"
              busy={busy === 'save'}
              onPress={() => void save()}
            />
          </ThemedView>

          <ThemedView
            type="backgroundElement"
            style={[styles.card, { borderColor: theme.border }]}>
            <ThemedText type="subtitle">Abonelik</ThemedText>
            <ThemedText themeColor="textSecondary">
              {subscriptionStatus?.status === 'active'
                ? 'Premium aktif — zincirine kesintisiz devam edebilirsin.'
                : subscriptionStatus?.status === 'trial'
                  ? `Deneme süresi — ${subscriptionStatus.trial_days_remaining} gün kaldı.`
                  : subscriptionStatus?.show_paywall
                    ? 'Deneme bitti — devam etmek için abonelik gerekli.'
                    : 'Durum yükleniyor veya ücretsiz erişim.'}
            </ThemedText>
            {subscriptionStatus?.show_paywall ? (
              <ActionButton
                label="Aboneliği Gör"
                onPress={() => router.push('/paywall' as Href)}
              />
            ) : null}
          </ThemedView>

          <ThemedView
            type="backgroundElement"
            style={[styles.card, { borderColor: theme.border }]}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleCopy}>
                <ThemedText type="subtitle">Bildirimler</ThemedText>
                <ThemedText themeColor="textSecondary">
                  Günlük görev ve bonus görev haberlerini al. İzin yalnız bu anahtarı kendin
                  açtığında istenir; tarot bildirimi gönderilmez.
                </ThemedText>
              </View>
              <Switch
                accessibilityLabel="Push bildirimleri"
                value={pushStatus?.enabled ?? false}
                disabled={pushBusy || pushStatus?.supported === false}
                onValueChange={(value) => void changePushPreference(value)}
                trackColor={{ false: theme.border, true: theme.tint }}
                thumbColor={theme.background}
              />
            </View>
            {!pushStatus && !pushError && <ActivityIndicator color={theme.tint} />}
            {pushStatus?.message && (
              <ThemedText type="small" themeColor="textSecondary">
                {pushStatus.message}
              </ThemedText>
            )}
            {pushError && <ThemedText themeColor="danger">{pushError}</ThemedText>}
          </ThemedView>

          <ThemedView
            type="backgroundElement"
            style={[styles.card, { borderColor: theme.border }]}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleCopy}>
                <ThemedText type="subtitle">İrade Modu</ThemedText>
                <ThemedText themeColor="textSecondary">
                  İrade ve Disiplin görevlerinde yerel hatırlatıcı kurmanı sağlar. Gerçek bir sistem
                  alarmı değildir; izinler yalnız hatırlatıcı istediğinde sorulur.
                </ThemedText>
              </View>
              <Switch
                accessibilityLabel="İrade Modu"
                value={iradeMode}
                disabled={busy === 'irade'}
                onValueChange={(value) => void changeIradeMode(value)}
                trackColor={{ false: theme.border, true: theme.tint }}
                thumbColor={theme.background}
              />
            </View>
            {busy === 'irade' ? <ActivityIndicator color={theme.tint} /> : null}
          </ThemedView>

          <ThemedView
            type="backgroundElement"
            style={[styles.card, { borderColor: theme.border }]}>
            <ThemedText type="subtitle">Gizlilik ve rıza tercihleri</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Aydınlatma metni sürümü: {consentStatus.privacy_policy.version}
            </ThemedText>
            <ConsentSwitch
              label="AI sohbeti ve kişiselleştirme"
              detail="Kapatırsan sohbet ve kişisel plan özellikleri kullanılamaz."
              value={consentStatus.ai_chat_processing.accepted}
              disabled={consentBusy}
              onValueChange={(value) => void changeConsent('ai', value)}
            />
            <ConsentSwitch
              label="Kanıt fotoğrafı işleme"
              detail="Kapalıysa görev kanıtı fotoğrafı gönderilemez."
              value={consentStatus.proof_photo_processing.accepted}
              disabled={consentBusy}
              onValueChange={(value) => void changeConsent('proofPhoto', value)}
            />
            <ConsentSwitch
              label="Pazarlama iletişimi"
              detail="Varsayılan kapalıdır; pazarlama gönderimi şu anda aktif değildir."
              value={consentStatus.marketing_communications.accepted}
              disabled={consentBusy}
              onValueChange={(value) => void changeConsent('marketing', value)}
            />
            {consentError && <ThemedText themeColor="danger">{consentError}</ThemedText>}
            <View style={styles.legalLinks}>
              <LegalLink documentId="privacy" label="Gizlilik Politikası" />
              <LegalLink documentId="kvkk" label="KVKK Aydınlatma" />
              <LegalLink documentId="consent" label="Açık Rıza Metni" />
              <LegalLink documentId="terms" label="Kullanım Koşulları" />
            </View>
          </ThemedView>

          <ThemedView
            type="backgroundElement"
            style={[styles.card, { borderColor: theme.border }]}>
            <ThemedText type="subtitle">Oturum</ThemedText>
            <ThemedText themeColor="textSecondary">{auth.user?.email}</ThemedText>
            <ActionButton label="Çıkış Yap" onPress={() => void auth.signOut()} />
          </ThemedView>

          <Pressable
            accessibilityLabel="Mistik keşif"
            delayLongPress={700}
            onLongPress={() => router.push('/mystic' as Href)}
            style={styles.mysticHint}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.mysticHintText}>
              ☾
            </ThemedText>
          </Pressable>

          <ThemedView
            type="backgroundElement"
            style={[styles.card, { borderColor: theme.danger }]}>
            <ThemedText type="subtitle" themeColor="danger">
              Tehlikeli alan
            </ThemedText>
            <ThemedText themeColor="textSecondary">
              Hesabını silmek tüm verilerini ve gelecekteki erişimini kalıcı olarak kaldırır.
            </ThemedText>
            <ActionButton
              label="Hesabımı Sil"
              busy={busy === 'delete'}
              danger
              onPress={confirmDelete}
            />
          </ThemedView>
        </ScreenScaffold>
      </KeyboardAwareView>
    </ThemedView>
  );
}

function ConsentSwitch({
  label,
  detail,
  value,
  disabled,
  onValueChange,
}: {
  label: string;
  detail: string;
  value: boolean;
  disabled: boolean;
  onValueChange: (value: boolean) => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleCopy}>
        <ThemedText type="smallBold">{label}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {detail}
        </ThemedText>
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        disabled={disabled}
        onValueChange={onValueChange}
        trackColor={{ false: theme.border, true: theme.tint }}
        thumbColor={theme.background}
      />
    </View>
  );
}

function LegalLink({
  documentId,
  label,
}: {
  documentId: LegalDocumentId;
  label: string;
}) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${label} sayfasını aç`}
      hitSlop={8}
      onPress={() => void openLegalDocument(documentId)}
      style={({ pressed }) => pressed && { opacity: 0.6 }}>
      <ThemedText type="smallBold" themeColor="tint">
        {label}
      </ThemedText>
    </Pressable>
  );
}

function Field({
  label,
  ...props
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'number-pad' | 'numbers-and-punctuation';
}) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">{label}</ThemedText>
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
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  busy = false,
  danger = false,
}: {
  label: string;
  onPress: () => void;
  busy?: boolean;
  danger?: boolean;
}) {
  const theme = useTheme();
  const color = danger ? theme.danger : theme.accentWarm;
  const labelColor = danger ? theme.background : theme.onAccent;
  return (
    <Pressable
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: color, opacity: pressed || busy ? 0.7 : 1 },
      ]}>
      {busy ? (
        <ActivityIndicator color={labelColor} />
      ) : (
        <ThemedText type="smallBold" style={{ color: labelColor }}>
          {label}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.three,
    gap: Spacing.three,
  },
  /** Gizli mistik giriş: ay simgesi sade bir süs gibi durur, uzun basınca açılır. */
  mysticHint: {
    alignSelf: 'center',
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
  },
  mysticHintText: {
    fontSize: 18,
    lineHeight: 22,
    opacity: 0.55,
  },
  header: { gap: Spacing.one, paddingVertical: Spacing.two },
  card: {
    borderWidth: 1,
    borderRadius: Spacing.four,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileMeta: {
    flex: 1,
    gap: Spacing.half,
  },
  field: { gap: Spacing.one },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  toggleCopy: {
    flex: 1,
    gap: Spacing.one,
  },
  legalLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
    minHeight: 48,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
});

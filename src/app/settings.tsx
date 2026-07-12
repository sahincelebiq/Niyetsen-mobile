import { useEffect, useState } from 'react';
import { Link, type Href } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BirthDateField } from '@/components/birth-date-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useConsentPreferences } from '@/components/consent-gate';
import { BottomTabInset, Fonts, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { deleteAccount, updateProfile } from '@/lib/api';
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

export default function SettingsScreen() {
  const theme = useTheme();
  const auth = useAuth();
  const { profile, refresh } = useProfile();
  const { status: consentStatus, saveChoices } = useConsentPreferences();
  const [name, setName] = useState(profile?.name ?? '');
  const [birthDate, setBirthDate] = useState(profile?.birth_date ?? '');
  const [notifHour, setNotifHour] = useState(String(profile?.notif_hour ?? 8));
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
    setNotifHour(String(profile?.notif_hour ?? 8));
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
        notif_hour: Number(notifHour),
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
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: BottomTabInset + Spacing.four },
          ]}>
          <View style={styles.header}>
            <ThemedText type="title">Ayarlar</ThemedText>
            <ThemedText themeColor="textSecondary">
              Profilin, bildirim saatin ve hesabın.
            </ThemedText>
          </View>

          <ThemedView
            type="backgroundElement"
            style={[styles.card, { borderColor: theme.border }]}>
            <ThemedText type="subtitle">Profil</ThemedText>
            <Field label="İsim" value={name} onChangeText={setName} />
            <View style={styles.field}>
              <ThemedText type="smallBold">Doğum tarihi</ThemedText>
              <BirthDateField value={birthDate} onChangeText={setBirthDate} />
            </View>
            <Field
              label="Bildirim saati (0–23)"
              value={notifHour}
              onChangeText={setNotifHour}
              keyboardType="number-pad"
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
                onValueChange={setIradeMode}
                trackColor={{ false: theme.border, true: theme.tint }}
                thumbColor={theme.background}
              />
            </View>
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
              <LegalLink href="/legal/privacy" label="Gizlilik Politikası" />
              <LegalLink href="/legal/kvkk" label="KVKK Aydınlatma" />
              <LegalLink href="/legal/consent" label="Açık Rıza Metni" />
              <LegalLink href="/legal/terms" label="Kullanım Koşulları" />
            </View>
          </ThemedView>

          <ThemedView
            type="backgroundElement"
            style={[styles.card, { borderColor: theme.border }]}>
            <ThemedText type="subtitle">Oturum</ThemedText>
            <ThemedText themeColor="textSecondary">{auth.user?.email}</ThemedText>
            <ActionButton label="Çıkış Yap" onPress={() => void auth.signOut()} />
          </ThemedView>

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
        </ScrollView>
      </SafeAreaView>
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
  href,
  label,
}: {
  href: '/legal/privacy' | '/legal/kvkk' | '/legal/consent' | '/legal/terms';
  label: string;
}) {
  return (
    <Link href={href as Href}>
      <ThemedText type="smallBold" themeColor="tint">
        {label}
      </ThemedText>
    </Link>
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
  const color = danger ? theme.danger : theme.tint;
  return (
    <Pressable
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: color, opacity: pressed || busy ? 0.7 : 1 },
      ]}>
      {busy ? (
        <ActivityIndicator color={theme.background} />
      ) : (
        <ThemedText type="smallBold" style={{ color: theme.background }}>
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
  header: { gap: Spacing.one, paddingVertical: Spacing.two },
  card: {
    borderWidth: 1,
    borderRadius: Spacing.four,
    padding: Spacing.four,
    gap: Spacing.three,
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

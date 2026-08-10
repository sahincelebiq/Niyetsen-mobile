import { useEffect, useMemo, useState } from 'react';
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
import { RegionLanguageSheet } from '@/components/region-language-sheet';
import { TimeOfDayField, type TimeOfDayValue } from '@/components/time-of-day-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useConsentPreferences } from '@/components/consent-gate';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { SurfaceCard } from '@/components/ui/surface-card';
import { Fonts, Radii, Spacing } from '@/constants/theme';
import { getZodiacGlyph, zodiacFromBirthDate, zodiacLabel } from '@/constants/zodiac';
import { useTheme } from '@/hooks/use-theme';
import { regionById } from '@/i18n/regions';
import type { RegionId } from '@/i18n/types';
import { deleteAccount, GENDER_OPTIONS, type GenderOption, updateProfile } from '@/lib/api';
import { openLegalDocument } from '@/lib/legal-links';
import {
  birthDateDisplayFromIso,
  birthDateIsoFromDisplay,
} from '@/lib/birth-date';
import { presentCustomerCenter } from '@/lib/customer-center';
import {
  disablePushNotifications,
  enablePushNotifications,
  getPushStatus,
  type PushStatus,
} from '@/lib/push-notifications';
import { restorePurchases } from '@/lib/purchases';
import { useAuth } from '@/providers/auth-provider';
import { useAppearance } from '@/providers/appearance-provider';
import { useI18n } from '@/providers/locale-provider';
import { useProfile } from '@/providers/profile-provider';
import { useSubscription } from '@/providers/subscription-provider';

export default function SettingsScreen() {
  const theme = useTheme();
  const appearance = useAppearance();
  const { t, regionId, setRegion, timezone, locale } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const { profile, refresh } = useProfile();
  const { status: subscriptionStatus, refresh: refreshSubscription } = useSubscription();
  const { status: consentStatus, saveChoices } = useConsentPreferences();
  const [name, setName] = useState(profile?.name ?? '');
  const [birthDate, setBirthDate] = useState(profile?.birth_date ?? '');
  const [gender, setGender] = useState<GenderOption | null>(profile?.gender ?? null);
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
    setGender(profile?.gender ?? null);
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

  const previewZodiac = useMemo(() => {
    const iso = birthDateIsoFromDisplay(birthDate);
    return zodiacFromBirthDate(iso) ?? profile?.zodiac_sign ?? null;
  }, [birthDate, profile?.zodiac_sign]);

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
        timezone,
        preferred_language: locale,
        notif_hour: notifTime.hour,
        notif_minute: notifTime.minute,
        irade_modu_active: iradeMode,
        gender,
      });
      await refresh();
      setMessage(t.common.done);
    } catch (value) {
      setError(value instanceof Error ? value.message : t.common.errorGeneric);
    } finally {
      setBusy(null);
    }
  }

  async function changeRegion(next: RegionId) {
    await setRegion(next);
    if (!profile?.name || !profile.birth_date) return;
    setBusy('locale');
    setError(null);
    try {
      const region = regionById(next);
      await updateProfile({
        name: profile.name,
        birth_date: profile.birth_date,
        timezone: region.timezone,
        preferred_language: region.locale,
        notif_hour: profile.notif_hour ?? 8,
        notif_minute: profile.notif_minute ?? 0,
        irade_modu_active: profile.irade_modu_active ?? false,
        gender: profile.gender,
      });
      await refresh();
    } catch (value) {
      setError(value instanceof Error ? value.message : t.common.errorGeneric);
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
        timezone,
        preferred_language: locale,
        notif_hour: profile.notif_hour ?? 8,
        notif_minute: profile.notif_minute ?? 0,
        irade_modu_active: nextValue,
        gender: profile.gender,
      });
      await refresh();
    } catch (value) {
      setIradeMode(!nextValue);
      setError(value instanceof Error ? value.message : t.common.errorGeneric);
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
        <ScreenScaffold scrollable contentStyle={styles.scaffoldTight}>
        {/* Kimlik → mistik → hesap → tercihler; uzun kart yığını yok */}
        <SurfaceCard>
          <View style={styles.profileRow}>
            <View
              style={[
                styles.avatar,
                {
                  backgroundColor: theme.backgroundSelected,
                  borderColor: theme.tint,
                },
              ]}>
              <ThemedText type="smallBold" style={[styles.avatarLetter, { color: theme.tint }]}>
                {(name.trim()[0] || 'S').toUpperCase()}
              </ThemedText>
            </View>
            <View style={styles.profileMeta}>
              <View style={styles.nameGlyphRow}>
                <ThemedText type="smallBold" style={styles.profileName} numberOfLines={1}>
                  {name.trim() || 'Sen'}
                </ThemedText>
                {previewZodiac ? (
                  <ThemedText style={[styles.zodiacGlyph, { color: theme.tint }]}>
                    {getZodiacGlyph(previewZodiac)}
                  </ThemedText>
                ) : null}
              </View>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                {previewZodiac
                  ? zodiacLabel(previewZodiac)
                  : subscriptionStatus?.status === 'active'
                    ? 'Abonelik aktif'
                    : 'Deneme / ücretsiz'}
              </ThemedText>
            </View>
          </View>
        </SurfaceCard>

        {/* faz8.13/7: mistik girişi ayarlardan kalktı — yeni evi Bugün sekmesi (2a). */}
        <ThemedView
          type="backgroundElement"
          style={[styles.card, { borderColor: theme.border }]}>
          <SettingsRow
            label="🏆  Arkadaşlar & Lig"
            value="Haftalık gelişim"
            onPress={() => router.push('/arkadaslar' as Href)}
          />
        </ThemedView>

        <CollapsibleCard title="HESAP" initiallyOpen>
          <Field label="İsim" value={name} onChangeText={setName} />
          <View style={styles.field}>
            <ThemedText type="smallBold">Doğum tarihi</ThemedText>
            <BirthDateField value={birthDate} onChangeText={setBirthDate} />
            {previewZodiac ? (
              <ThemedText type="small" themeColor="textSecondary">
                Burç: {zodiacLabel(previewZodiac)}
              </ThemedText>
            ) : null}
          </View>
          <View style={styles.field}>
            <ThemedText type="smallBold">Cinsiyet</ThemedText>
            <View style={styles.genderRow}>
              {GENDER_OPTIONS.map((option) => {
                const selected = gender === option;
                return (
                  <Pressable
                    key={option}
                    accessibilityRole="button"
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
                      },
                    ]}>
                    <ThemedText
                      type="smallBold"
                      themeColor={selected ? 'tint' : 'text'}>
                      {t.gender[option]}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <TimeOfDayField
            label="Bildirim saati"
            value={notifTime}
            onChange={setNotifTime}
          />
          {error && <ThemedText themeColor="danger">{error}</ThemedText>}
          {message && <ThemedText themeColor="success">{message}</ThemedText>}
          <ActionButton
            label={t.common.save}
            busy={busy === 'save'}
            onPress={() => void save()}
          />
        </CollapsibleCard>

        <CollapsibleCard title="TERCİHLER & BİLDİRİMLER">
          <View style={styles.toggleRow}>
            <View style={styles.toggleCopy}>
              <ThemedText type="smallBold">{t.profile.appearance}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {appearance.isDark ? t.profile.dark : t.profile.light}
              </ThemedText>
            </View>
            <Switch
              accessibilityLabel={t.profile.dark}
              accessibilityHint={t.profile.appearance}
              value={appearance.isDark}
              onValueChange={(value) => appearance.toggleDark(value)}
              trackColor={{ false: theme.border, true: theme.tint }}
              thumbColor={theme.backgroundElement}
            />
          </View>
          <View style={styles.langRow}>
            <ThemedText type="smallBold" style={styles.rowLabel}>
              {t.profile.language}
            </ThemedText>
            <View style={styles.langSheet}>
              <RegionLanguageSheet
                value={regionId}
                onChange={(id) => void changeRegion(id)}
                busy={busy === 'locale'}
              />
            </View>
          </View>
          {busy === 'locale' ? <ActivityIndicator color={theme.tint} /> : null}
          <View style={styles.toggleRow}>
            <View style={styles.toggleCopy}>
              <ThemedText type="smallBold">Bildirimler</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Günlük görev ve bonus haberleri
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
          {pushStatus?.message ? (
            <ThemedText type="small" themeColor="textSecondary">
              {pushStatus.message}
            </ThemedText>
          ) : null}
          {pushError ? <ThemedText themeColor="danger">{pushError}</ThemedText> : null}
          <View style={styles.toggleRow}>
            <View style={styles.toggleCopy}>
              <ThemedText type="smallBold">İrade Modu</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Yerel hatırlatıcı (sistem alarmı değil)
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
        </CollapsibleCard>

        <CollapsibleCard title="ABONELİK">
          <SettingsRow
            label="Durum"
            value={
              subscriptionStatus?.status === 'active'
                ? 'Premium'
                : subscriptionStatus?.status === 'trial'
                  ? `Deneme · ${subscriptionStatus.trial_days_remaining}g`
                  : subscriptionStatus?.show_paywall
                    ? 'Bitti'
                    : '…'
            }
          />
          {subscriptionStatus?.show_paywall
            || (subscriptionStatus
              && subscriptionStatus.status !== 'trial'
              && subscriptionStatus.status !== 'active') ? (
            <SettingsRow
              label="PRO'ya Geç"
              onPress={() => router.push('/paywall' as Href)}
            />
          ) : null}
          <SettingsRow
            label="Aboneliği Yönet"
            busy={busy === 'customer-center'}
            onPress={() => {
              void (async () => {
                setBusy('customer-center');
                setError(null);
                setMessage(null);
                const result = await presentCustomerCenter({
                  onRestoreCompleted: () => {
                    void refreshSubscription();
                  },
                });
                setBusy(null);
                if (!result.ok) {
                  setError(result.message);
                  return;
                }
                await refreshSubscription();
                setMessage('Abonelik merkezi kapatıldı.');
              })();
            }}
          />
          <SettingsRow
            label="Satın Alımları Geri Yükle"
            busy={busy === 'restore'}
            onPress={() => {
              void (async () => {
                setBusy('restore');
                setError(null);
                setMessage(null);
                const result = await restorePurchases();
                await refreshSubscription();
                setBusy(null);
                if (!result.ok) {
                  setError(result.message);
                  return;
                }
                setMessage('Satın alımlar geri yüklendi — PRO özellikler açıldı.');
              })();
            }}
          />
        </CollapsibleCard>

        <CollapsibleCard title="GÜVENLİK & GİZLİLİK">
          <ConsentSwitch
            label="AI sohbeti"
            detail="Kapalıysa sohbet/plan kilitlenir"
            value={consentStatus.ai_chat_processing.accepted}
            disabled={consentBusy}
            onValueChange={(value) => void changeConsent('ai', value)}
          />
          <ConsentSwitch
            label="Kanıt fotoğrafı"
            detail="Kapalıysa kanıt yok"
            value={consentStatus.proof_photo_processing.accepted}
            disabled={consentBusy}
            onValueChange={(value) => void changeConsent('proofPhoto', value)}
          />
          <ConsentSwitch
            label="Pazarlama"
            detail="Varsayılan kapalı"
            value={consentStatus.marketing_communications.accepted}
            disabled={consentBusy}
            onValueChange={(value) => void changeConsent('marketing', value)}
          />
          {consentError && <ThemedText themeColor="danger">{consentError}</ThemedText>}
          <SettingsRow
            label="Gizlilik Politikası"
            onPress={() => void openLegalDocument('privacy')}
          />
          <SettingsRow
            label="KVKK Aydınlatma"
            onPress={() => void openLegalDocument('kvkk')}
          />
          <SettingsRow
            label="Açık Rıza Metni"
            onPress={() => void openLegalDocument('consent')}
          />
          <SettingsRow
            label="Kullanım Koşulları"
            onPress={() => void openLegalDocument('terms')}
          />
        </CollapsibleCard>

        <CollapsibleCard title="OTURUM">
          <SettingsRow label="Hesap" value={auth.user?.email ?? '—'} />
          <SettingsRow label="Çıkış Yap" onPress={() => void auth.signOut()} />
          <SettingsRow
            label="Hesabımı Sil"
            danger
            busy={busy === 'delete'}
            onPress={confirmDelete}
          />
        </CollapsibleCard>
        </ScreenScaffold>
      </KeyboardAwareView>
    </ThemedView>
  );
}

/**
 * faz8.13/7: Profil açılır bölüm grupları — uzun kaydırma yerine başlığa
 * dokununca açılan kısa kartlar. Minimal ölçek kilitli; iPhone SE taşmasız.
 */
function CollapsibleCard({
  title,
  children,
  initiallyOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  initiallyOpen?: boolean;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <ThemedView
      type="backgroundElement"
      style={[styles.card, { borderColor: theme.border }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={title}
        accessibilityHint={open ? 'Bölümü kapat' : 'Bölümü aç'}
        onPress={() => setOpen((value) => !value)}
        style={({ pressed }) => [styles.collapsibleHeader, pressed && { opacity: 0.75 }]}>
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
          {title}
        </ThemedText>
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.chevron}>
          {open ? '▾' : '▸'}
        </ThemedText>
      </Pressable>
      {open ? <View style={styles.collapsibleBody}>{children}</View> : null}
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

function SettingsRow({
  label,
  value,
  onPress,
  busy = false,
  danger = false,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
  busy?: boolean;
  danger?: boolean;
}) {
  const theme = useTheme();
  const clickable = !!onPress;
  return (
    <Pressable
      accessibilityRole={clickable ? 'button' : 'text'}
      disabled={!clickable || busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.settingsRow,
        { borderBottomColor: theme.border, opacity: pressed && clickable ? 0.75 : 1 },
      ]}>
      <ThemedText
        type="smallBold"
        style={[styles.rowLabel, danger ? { color: theme.danger } : null]}
        numberOfLines={1}>
        {label}
      </ThemedText>
      {busy ? (
        <ActivityIndicator color={theme.tint} />
      ) : (
        <View style={styles.rowTrailing}>
          {value ? (
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.rowValue}>
              {value}
            </ThemedText>
          ) : null}
          {clickable ? (
            <ThemedText type="smallBold" themeColor={danger ? 'danger' : 'textSecondary'}>
              ›
            </ThemedText>
          ) : null}
        </View>
      )}
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
  scaffoldTight: {
    gap: Spacing.two,
    paddingTop: Spacing.one,
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 44,
  },
  langSheet: { flex: 1, minWidth: 0 },
  settingsRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: { flexShrink: 1 },
  rowTrailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    flexShrink: 1,
    maxWidth: '55%',
  },
  rowValue: { flexShrink: 1, textAlign: 'right' },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontSize: 16,
    lineHeight: 20,
  },
  profileMeta: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  nameGlyphRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  profileName: {
    fontSize: 16,
    lineHeight: 21,
    flexShrink: 1,
  },
  zodiacGlyph: {
    fontSize: 18,
    lineHeight: 22,
  },
  sectionLabel: {
    letterSpacing: 0.8,
    fontSize: 11,
  },
  collapsibleHeader: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  chevron: {
    fontSize: 13,
    lineHeight: 16,
  },
  collapsibleBody: {
    gap: Spacing.two,
  },
  card: {
    borderWidth: 1,
    borderRadius: Radii.medium,
    padding: Spacing.three,
    gap: Spacing.two,
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
  field: { gap: Spacing.one },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  toggleCopy: {
    flex: 1,
    gap: 2,
  },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  button: {
    minHeight: 44,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
});

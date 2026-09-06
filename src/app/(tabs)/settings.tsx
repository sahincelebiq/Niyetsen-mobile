import { useEffect, useMemo, useState, type ComponentProps } from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
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
import {
  getZodiacIconName,
  zodiacDisplayName,
  zodiacFromBirthDate,
} from '@/constants/zodiac';
import { useTheme } from '@/hooks/use-theme';
import { regionById } from '@/i18n/regions';
import type { RegionId } from '@/i18n/types';
import { deleteAccount, GENDER_OPTIONS, type GenderOption, updateProfile } from '@/lib/api';
import { mysticHref } from '@/lib/mystic-routes';
import { LEGAL_APP_ROUTES } from '@/lib/legal-links';
import { LEGAL_MIN_AGE } from '@/constants/legal';
import {
  birthDateDisplayFromIso,
  birthDateIsoFromDisplay,
  isAtLeastYearsOld,
} from '@/lib/birth-date';
import { presentCustomerCenter } from '@/lib/customer-center';
import {
  disablePushNotifications,
  enablePushNotifications,
  getPushStatus,
  type PushStatus,
} from '@/lib/push-notifications';
import { hasStoreEntitlement, restorePurchases } from '@/lib/purchases';
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
          setPushError(value instanceof Error ? value.message : t.settings.pushStatusFailed);
        }
      });
    return () => {
      active = false;
    };
  }, [auth.user?.id, t.settings.pushStatusFailed]);

  const previewZodiac = useMemo(() => {
    const iso = birthDateIsoFromDisplay(birthDate);
    return zodiacFromBirthDate(iso) ?? profile?.zodiac_sign ?? null;
  }, [birthDate, profile?.zodiac_sign]);
  const zodiacIcon = getZodiacIconName(previewZodiac);

  async function save() {
    if (!profile) return;
    setBusy('save');
    setError(null);
    setMessage(null);
    try {
      const isoBirthDate = birthDateIsoFromDisplay(birthDate);
      if (!isoBirthDate) {
        setError(t.settings.birthInvalid);
        setBusy(null);
        return;
      }
      if (!isAtLeastYearsOld(isoBirthDate, LEGAL_MIN_AGE)) {
        setError(t.onboarding.under18);
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
        setError(value instanceof Error ? value.message : t.settings.deleteFailed);
      } finally {
        setBusy(null);
      }
    };
    if (Platform.OS === 'web') {
      if (globalThis.confirm?.(t.settings.deleteConfirmBody)) {
        void perform();
      }
      return;
    }
    Alert.alert(
      t.settings.deleteConfirmTitle,
      t.settings.deleteConfirmBody,
      [
        { text: t.common.cancel, style: 'cancel' },
        { text: t.settings.deleteConfirmAction, style: 'destructive', onPress: () => void perform() },
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
      setConsentError(value instanceof Error ? value.message : t.settings.consentSaveFailed);
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
      setPushError(value instanceof Error ? value.message : t.settings.notifPrefFailed);
      setPushStatus(await getPushStatus(auth.user.id));
    } finally {
      setPushBusy(false);
    }
  }

  return (
    <ThemedView style={styles.flex}>
      <KeyboardAwareView>
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
                {(name.trim()[0] || t.settings.you).toUpperCase()}
              </ThemedText>
            </View>
            <View style={styles.profileMeta}>
              <View style={styles.nameGlyphRow}>
                <ThemedText type="smallBold" style={styles.profileName} numberOfLines={1}>
                  {name.trim() || t.settings.you}
                </ThemedText>
                {zodiacIcon ? (
                  <MaterialCommunityIcons
                    name={zodiacIcon}
                    size={18}
                    color={theme.tint}
                    accessibilityLabel={zodiacDisplayName(previewZodiac, t.zodiac)}
                  />
                ) : null}
              </View>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                {previewZodiac
                  ? zodiacDisplayName(previewZodiac, t.zodiac)
                  : subscriptionStatus?.status === 'active'
                    ? t.settings.subActive
                    : t.settings.subTrial(subscriptionStatus?.trial_days_remaining ?? 0)}
              </ThemedText>
            </View>
          </View>
        </SurfaceCard>

        {/* faz8.13/7: mistik girişi ayarlardan kalktı — yeni evi Bugün sekmesi (2a). */}
        <ThemedView
          type="backgroundElement"
          style={[styles.card, { borderColor: theme.border }]}>
          <SettingsRow
            icon="account-group-outline"
            label={t.settings.friends}
            value={t.settings.leagueHint}
            onPress={() => router.push('/arkadaslar' as Href)}
          />
          <SettingsRow
            icon="weather-night"
            label={t.settings.mysticChat}
            value={t.settings.mysticGuide}
            onPress={() => router.push(mysticHref.chat)}
          />
          <SettingsRow
            icon="chart-box-outline"
            label={t.settings.reportPanel}
            value={t.settings.reportHint}
            onPress={() => router.push('/rapor' as Href)}
          />
        </ThemedView>

        <CollapsibleCard title={t.settings.account} initiallyOpen>
          <Field label={t.settings.name} value={name} onChangeText={setName} />
          <View style={styles.field}>
            <ThemedText type="smallBold">{t.settings.birthDate}</ThemedText>
            <BirthDateField value={birthDate} onChangeText={setBirthDate} />
            {previewZodiac ? (
              <ThemedText type="small" themeColor="textSecondary">
                {t.settings.zodiacPrefix}: {zodiacDisplayName(previewZodiac, t.zodiac)}
              </ThemedText>
            ) : null}
          </View>
          <View style={styles.field}>
            <ThemedText type="smallBold">{t.settings.gender}</ThemedText>
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
            label={t.settings.notifTime}
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

        <CollapsibleCard title={t.settings.preferences}>
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
              <ThemedText type="smallBold">{t.profile.notifications}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {t.profile.notificationsHint}
              </ThemedText>
            </View>
            <Switch
              accessibilityLabel={t.profile.notifications}
              value={pushStatus?.enabled ?? false}
              disabled={pushBusy || pushStatus?.supported === false}
              onValueChange={(value) => void changePushPreference(value)}
              trackColor={{ false: theme.border, true: theme.tint }}
              thumbColor={theme.background}
            />
          </View>
          {!pushStatus && !pushError && <ActivityIndicator color={theme.tint} />}
          {pushStatus?.enabled ? (
            <ThemedText type="small" themeColor="textSecondary">
              {t.profile.notificationsWhen}
            </ThemedText>
          ) : null}
          {pushStatus?.message ? (
            <ThemedText type="small" themeColor="textSecondary">
              {pushStatus.message}
            </ThemedText>
          ) : null}
          {pushError ? <ThemedText themeColor="danger">{pushError}</ThemedText> : null}
          <View style={styles.toggleRow}>
            <View style={styles.toggleCopy}>
              <ThemedText type="smallBold">{t.profile.willpowerMode}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {t.profile.willpowerHint}
              </ThemedText>
            </View>
            <Switch
              accessibilityLabel={t.profile.willpowerMode}
              value={iradeMode}
              disabled={busy === 'irade'}
              onValueChange={(value) => void changeIradeMode(value)}
              trackColor={{ false: theme.border, true: theme.tint }}
              thumbColor={theme.background}
            />
          </View>
          {busy === 'irade' ? <ActivityIndicator color={theme.tint} /> : null}
        </CollapsibleCard>

        <CollapsibleCard title={t.settings.subscription}>
          <SettingsRow
            label={t.settings.subStatus}
            value={
              subscriptionStatus?.status === 'active'
                ? t.settings.premium
                : subscriptionStatus?.status === 'trial'
                  ? t.settings.subTrial(subscriptionStatus.trial_days_remaining)
                  : subscriptionStatus?.show_paywall
                    ? t.settings.subEnded
                    : '…'
            }
          />
          {subscriptionStatus?.show_paywall
            || (subscriptionStatus
              && subscriptionStatus.status !== 'trial'
              && subscriptionStatus.status !== 'active') ? (
            <SettingsRow
              label={t.settings.goPro}
              onPress={() => router.push('/paywall' as Href)}
            />
          ) : null}
          <SettingsRow
            label={t.settings.manageSub}
            busy={busy === 'customer-center'}
            onPress={() => {
              void (async () => {
                setBusy('customer-center');
                setError(null);
                setMessage(null);
                // Mağaza entitlement yoksa RC Customer Center "Abonelik bulunamadı"
                // gösterir — İlkbahar paywall (fiyat + geri yükle) doğru kapı.
                const storeEntitled = await hasStoreEntitlement();
                if (!storeEntitled) {
                  setBusy(null);
                  router.push('/paywall' as Href);
                  return;
                }
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
                setMessage(t.settings.customerCenterClosed);
              })();
            }}
          />
          <SettingsRow
            label={t.settings.restorePurchases}
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
                setMessage(t.settings.restoreSuccess);
              })();
            }}
          />
        </CollapsibleCard>

        <CollapsibleCard title={t.settings.privacy}>
          <ConsentSwitch
            label={t.settings.consentAi}
            detail={t.settings.consentAiHint}
            value={consentStatus.ai_chat_processing.accepted}
            disabled={consentBusy}
            onValueChange={(value) => void changeConsent('ai', value)}
          />
          <ConsentSwitch
            label={t.settings.consentPhoto}
            detail={t.settings.consentPhotoHint}
            value={consentStatus.proof_photo_processing.accepted}
            disabled={consentBusy}
            onValueChange={(value) => void changeConsent('proofPhoto', value)}
          />
          <ConsentSwitch
            label={t.settings.consentMarketing}
            detail={t.settings.consentMarketingHint}
            value={consentStatus.marketing_communications.accepted}
            disabled={consentBusy}
            onValueChange={(value) => void changeConsent('marketing', value)}
          />
          {consentError && <ThemedText themeColor="danger">{consentError}</ThemedText>}
          <SettingsRow
            label={t.auth.legalPrivacy}
            onPress={() => router.push(LEGAL_APP_ROUTES.privacy as Href)}
          />
          <SettingsRow
            label={t.auth.legalKvkk}
            onPress={() => router.push(LEGAL_APP_ROUTES.kvkk as Href)}
          />
          <SettingsRow
            label={t.auth.legalConsent}
            onPress={() => router.push(LEGAL_APP_ROUTES.consent as Href)}
          />
          <SettingsRow
            label={t.auth.legalTerms}
            onPress={() => router.push(LEGAL_APP_ROUTES.terms as Href)}
          />
        </CollapsibleCard>

        <CollapsibleCard title={t.settings.session}>
          <SettingsRow label={t.settings.accountEmail} value={auth.user?.email ?? '—'} />
          <SettingsRow label={t.settings.signOut} onPress={() => void auth.signOut()} />
          <SettingsRow
            label={t.settings.deleteAccount}
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
  const { t } = useI18n();
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <ThemedView
      type="backgroundElement"
      style={[styles.card, { borderColor: theme.border }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={title}
        accessibilityHint={open ? t.settings.sectionClose : t.settings.sectionOpen}
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
  icon,
  label,
  value,
  onPress,
  busy = false,
  danger = false,
}: {
  icon?: ComponentProps<typeof MaterialCommunityIcons>['name'];
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
      <View style={styles.rowLeading}>
        {icon ? (
          <MaterialCommunityIcons
            name={icon}
            size={20}
            color={danger ? theme.danger : theme.textSecondary}
          />
        ) : null}
        <ThemedText
          type="smallBold"
          style={[styles.rowLabel, danger ? { color: theme.danger } : null]}
          numberOfLines={1}>
          {label}
        </ThemedText>
      </View>
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
  rowLeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flex: 1,
    minWidth: 0,
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

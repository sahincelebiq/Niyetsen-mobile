import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ErrorBanner } from '@/components/error-banner';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  BottomTabInset,
  MaxContentWidth,
  Radii,
  Shadows,
  Spacing,
  Texture,
} from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  ApiError,
  completeBonus,
  generateMessageId,
  getTodayBonus,
  offerBonus,
  type BonusOffer,
} from '@/lib/api';
import { useI18n } from '@/providers/locale-provider';

const BONUS_POINTS = 10;
const BONUS_WAIT_SEC = 45;

function completionKey(offerId: string): string {
  return `bonus-completion:${offerId}`;
}

export default function BonusScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useI18n();
  const [offer, setOffer] = useState<BonusOffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<'offer' | 'complete' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [attested, setAttested] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const today = await getTodayBonus();
      setOffer(today);
      setCompleted(today?.status === 'completed');
      setAttested(false);
    } catch (value) {
      setError(value instanceof ApiError ? value.message : t.bonus.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function requestOffer() {
    if (offer?.status === 'completed' || completed) return;
    setBusy('offer');
    setError(null);
    try {
      const next = await offerBonus();
      setOffer(next);
      setCompleted(next.status === 'completed');
      setAttested(false);
    } catch (value) {
      setError(value instanceof Error ? value.message : t.bonus.offerFailed);
    } finally {
      setBusy(null);
    }
  }

  const offeredAtMs = useMemo(() => {
    if (!offer?.offered_at) return Date.now();
    const parsed = Date.parse(offer.offered_at);
    return Number.isFinite(parsed) ? parsed : Date.now();
  }, [offer?.id, offer?.offered_at]);

  useEffect(() => {
    if (!offer || offer.status === 'completed' || completed) return;
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [offer, completed]);

  const remainingSec = Math.max(
    0,
    BONUS_WAIT_SEC - Math.floor((nowMs - offeredAtMs) / 1000),
  );
  const canComplete = remainingSec === 0 && attested;

  async function markComplete() {
    if (!offer || busy || !canComplete) return;
    setBusy('complete');
    setError(null);
    const key = completionKey(offer.id);
    try {
      let completionId = await AsyncStorage.getItem(key);
      if (!completionId) {
        completionId = generateMessageId();
        await AsyncStorage.setItem(key, completionId);
      }
      const result = await completeBonus(offer.id, completionId);
      if (typeof result.awarded !== 'number' || result.awarded < 0) {
        throw new Error(t.bonus.unexpected);
      }
      setCompleted(true);
      setOffer({ ...offer, status: 'completed' });
    } catch (value) {
      const hadCompletionAttempt = (await AsyncStorage.getItem(key)) !== null;
      if (value instanceof ApiError && value.status === 409 && hadCompletionAttempt) {
        setCompleted(true);
        setOffer({ ...offer, status: 'completed' });
      } else {
        setError(value instanceof Error ? value.message : t.bonus.completeFailed);
      }
    } finally {
      setBusy(null);
    }
  }

  const alreadyDone = completed || offer?.status === 'completed';

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.content}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.common.back}
            hitSlop={12}
            onPress={() => router.back()}
            style={styles.back}>
            <ThemedText type="smallBold" themeColor="tint">
              ‹ {t.common.back}
            </ThemedText>
          </Pressable>

          <View style={styles.header}>
            <ThemedText type="screenTitle">{t.bonus.title}</ThemedText>
            <ThemedText themeColor="textSecondary">
              {t.bonus.subtitle}
            </ThemedText>
          </View>

          {error && <ErrorBanner message={error} onRetry={() => void load()} />}
          {loading && <ActivityIndicator color={theme.tint} size="large" />}

          {!loading && !offer && (
            <ThemedView
              type="backgroundElement"
              style={[styles.empty, { borderColor: theme.border }]}>
              <ThemedText type="subtitle">{t.bonus.sparkTitle}</ThemedText>
              <ThemedText themeColor="textSecondary">
                {t.bonus.sparkBody}
              </ThemedText>
              <BonusButton
                label={t.bonus.takeCta}
                busy={busy === 'offer'}
                onPress={() => void requestOffer()}
              />
            </ThemedView>
          )}

          {offer && !loading && (
            <ThemedView
              type="backgroundElement"
              style={[styles.offerCard, { borderColor: theme.border }]}>
              <View style={styles.offerMeta}>
                <ThemedView type="backgroundSelected" style={styles.pill}>
                  <ThemedText type="smallBold">{offer.category}</ThemedText>
                </ThemedView>
                <ThemedText type="smallBold" themeColor="accentWarm">
                  {t.bonus.points(BONUS_POINTS)}
                </ThemedText>
              </View>
              <ThemedText type="subtitle">{offer.title}</ThemedText>
              <ThemedText themeColor="textSecondary">{offer.tiny_instruction}</ThemedText>

              {alreadyDone ? (
                <ThemedView type="backgroundSelected" style={styles.success}>
                  <ThemedText type="smallBold" themeColor="success">
                    {t.bonus.doneTitle(BONUS_POINTS)}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {t.bonus.doneBody}
                  </ThemedText>
                </ThemedView>
              ) : (
                <>
                  <ThemedText type="small" themeColor="textSecondary">
                    {remainingSec > 0
                      ? t.bonus.wait(remainingSec)
                      : t.bonus.attestHint}
                  </ThemedText>
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: attested }}
                    onPress={() => setAttested((value) => !value)}
                    style={styles.attestRow}>
                    <View
                      style={[
                        styles.checkbox,
                        {
                          borderColor: theme.border,
                          backgroundColor: attested ? theme.tint : 'transparent',
                        },
                      ]}
                    />
                    <ThemedText type="small">{t.bonus.attest}</ThemedText>
                  </Pressable>
                  <BonusButton
                    label={t.bonus.didIt}
                    busy={busy === 'complete'}
                    disabled={!canComplete}
                    onPress={() => void markComplete()}
                  />
                </>
              )}
            </ThemedView>
          )}

          <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
            {t.bonus.note}
          </ThemedText>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function BonusButton({
  label,
  busy,
  onPress,
  disabled = false,
}: {
  label: string;
  busy: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  const locked = busy || disabled;
  return (
    <Pressable
      disabled={locked}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: theme.accentWarm, opacity: pressed || locked ? 0.45 : 1 },
      ]}>
      {busy ? (
        <ActivityIndicator color={theme.onAccent} />
      ) : (
        <ThemedText type="smallBold" style={{ color: theme.onAccent }}>
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
    paddingBottom: BottomTabInset + Spacing.five,
    gap: Spacing.three,
  },
  back: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  header: { gap: Spacing.one, paddingVertical: Spacing.two },
  empty: {
    borderWidth: Texture.cardBorderWidth,
    borderRadius: Radii.large,
    padding: Spacing.four,
    gap: Spacing.three,
    ...(Shadows.subtle ?? {}),
  },
  offerCard: {
    borderWidth: Texture.cardBorderWidth,
    borderRadius: Radii.large,
    padding: Spacing.four,
    gap: Spacing.three,
    ...(Shadows.soft ?? {}),
  },
  offerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  pill: {
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  button: {
    minHeight: 48,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  success: {
    borderRadius: Radii.medium,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  note: { textAlign: 'center' },
  attestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 44,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
  },
});

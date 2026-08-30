import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
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
  getActiveBonus,
  offerBonus,
  type BonusOffer,
} from '@/lib/api';

const BONUS_POINTS = 10;
const BONUS_WAIT_SEC = 45;

function completionKey(offerId: string): string {
  return `bonus-completion:${offerId}`;
}

export default function BonusScreen() {
  const theme = useTheme();
  const [offer, setOffer] = useState<BonusOffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<'offer' | 'complete' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [attested, setAttested] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const active = await getActiveBonus();
      setOffer(active);
      setCompleted(false);
      setAttested(false);
    } catch (value) {
      setError(value instanceof ApiError ? value.message : 'Bonus görev yüklenemedi.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function requestOffer() {
    setBusy('offer');
    setError(null);
    try {
      setOffer(await offerBonus());
      setCompleted(false);
      setAttested(false);
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Bonus görev alınamadı.');
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
      // Backend başarı döndürdüyse tamamlandı say — puan miktarını sunucu
      // belirler. (Eski katı `awarded !== 10` kontrolü, sunucu puanı değişirse
      // görevi tamamlanmış olmasına rağmen hata gösteriyordu.)
      if (typeof result.awarded !== 'number' || result.awarded < 0) {
        throw new Error('Beklenmeyen bonus yanıtı; rütbe durumunu yenile.');
      }
      setCompleted(true);
      setOffer({ ...offer, status: 'completed' });
    } catch (value) {
      const hadCompletionAttempt = (await AsyncStorage.getItem(key)) !== null;
      if (value instanceof ApiError && value.status === 409 && hadCompletionAttempt) {
        setCompleted(true);
        setOffer({ ...offer, status: 'completed' });
      } else {
        setError(value instanceof Error ? value.message : 'Bonus görev tamamlanamadı.');
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />
          }
          contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <ThemedText type="title">Bonus Görev</ThemedText>
            <ThemedText themeColor="textSecondary">
              Ana planından ayrı, fotoğraf istemeyen küçük bir hareket.
            </ThemedText>
          </View>

          {error && <ErrorBanner message={error} onRetry={() => void load()} />}
          {loading && <ActivityIndicator color={theme.tint} size="large" />}

          {!loading && !offer && (
            <ThemedView
              type="backgroundElement"
              style={[styles.empty, { borderColor: theme.border }]}>
              <ThemedText type="subtitle">Bugünün küçük kıvılcımı</ThemedText>
              <ThemedText themeColor="textSecondary">
                Hazır olduğunda bugüne özel tek bir bonus görev al.
              </ThemedText>
              <BonusButton
                label="Bonus Görev Al"
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
                  +{BONUS_POINTS} puan
                </ThemedText>
              </View>
              <ThemedText type="subtitle">{offer.title}</ThemedText>
              <ThemedText themeColor="textSecondary">{offer.tiny_instruction}</ThemedText>

              {completed || offer.status === 'completed' ? (
                <ThemedView type="backgroundSelected" style={styles.success}>
                  <ThemedText type="smallBold" themeColor="success">
                    Tamamlandı · +{BONUS_POINTS} puan
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Aynı onay tekrar gönderilse bile ikinci kez puan yazılmaz.
                  </ThemedText>
                </ThemedView>
              ) : (
                <>
                  <ThemedText type="small" themeColor="textSecondary">
                    {remainingSec > 0
                      ? `Görevi yap. Onay ${remainingSec} sn sonra açılır.`
                      : 'Hareketi yaptıysan aşağıyı işaretle, sonra onayla.'}
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
                    <ThemedText type="small">Gerçekten yaptım</ThemedText>
                  </Pressable>
                  <BonusButton
                    label="Yaptım"
                    busy={busy === 'complete'}
                    disabled={!canComplete}
                    onPress={() => void markComplete()}
                  />
                </>
              )}
            </ThemedView>
          )}

          <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
            Bonus görev ana 7/365 planını, zincirini veya fotoğraf kanıtı görevlerini değiştirmez.
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

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
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

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const active = await getActiveBonus();
      setOffer(active);
      setCompleted(false);
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
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Bonus görev alınamadı.');
    } finally {
      setBusy(null);
    }
  }

  async function markComplete() {
    if (!offer || busy) return;
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
      if (result.awarded !== BONUS_POINTS) {
        throw new Error('Beklenmeyen bonus puanı döndü; rütbe durumunu yenile.');
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
                <BonusButton
                  label="Yaptım"
                  busy={busy === 'complete'}
                  onPress={() => void markComplete()}
                />
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
}: {
  label: string;
  busy: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: theme.tint, opacity: pressed || busy ? 0.7 : 1 },
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
});

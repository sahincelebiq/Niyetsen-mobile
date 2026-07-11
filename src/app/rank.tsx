import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
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
import { ApiError, CATEGORIES, getState, type StateResponse } from '@/lib/api';

export default function RankScreen() {
  const theme = useTheme();
  const [state, setState] = useState<StateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      setState(await getState());
    } catch (value) {
      setError(value instanceof ApiError ? value.message : 'Rütbe bilgisi yüklenemedi.');
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

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />
          }
          contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <ThemedText type="title">Rütbem</ThemedText>
            <ThemedText themeColor="textSecondary">
              Her tamamlanan halka, kimliğinin bir yönünü güçlendirir.
            </ThemedText>
          </View>

          {error && <ErrorBanner message={error} onRetry={() => void load()} />}
          {loading && <ActivityIndicator color={theme.tint} size="large" />}

          {state && !loading && (
            <>
              <ThemedView
                type="backgroundElement"
                style={[styles.hero, { borderColor: theme.border }]}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  GENEL RÜTBE
                </ThemedText>
                <ThemedText type="title" style={styles.centerText}>
                  {state.overall_rank}
                </ThemedText>
                <View style={styles.streakRow}>
                  <Metric value={`${state.streak_len}`} label="gün zincir" />
                  <Metric value={`${state.best_streak}`} label="en iyi" />
                  <Metric value={`${state.freeze_tokens}`} label="koruma jetonu" />
                </View>
              </ThemedView>

              <View style={styles.sectionHeader}>
                <ThemedText type="subtitle">Altı yönün</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Puan tabanı sıfırdır.
                </ThemedText>
              </View>
              <View style={styles.grid}>
                {CATEGORIES.map((category) => (
                  <ThemedView
                    key={category}
                    type="backgroundElement"
                    style={[styles.categoryCard, { borderColor: theme.border }]}>
                    <ThemedText type="subtitle">{category}</ThemedText>
                    <ThemedText type="smallBold" themeColor="accentWarm">
                      {state.ranks[category]}
                    </ThemedText>
                    <ThemedText type="title">{state.points[category]}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      puan
                    </ThemedText>
                  </ThemedView>
                ))}
              </View>

              <ThemedView
                type="backgroundElement"
                style={[styles.note, { borderColor: theme.border }]}>
                <ThemedText type="smallBold">Oyun durumu</ThemedText>
                <ThemedText themeColor="textSecondary">
                  {state.excuse_count} mazeret · {state.silent_miss_streak} ardışık sessiz kaçırma
                </ThemedText>
              </ThemedView>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.metric}>
      <ThemedText type="subtitle">{value}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
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
  hero: {
    borderWidth: Texture.cardBorderWidth,
    borderRadius: Radii.large,
    padding: Spacing.four,
    alignItems: 'center',
    gap: Spacing.two,
    ...(Shadows.soft ?? {}),
  },
  centerText: { textAlign: 'center' },
  streakRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  metric: { flex: 1, alignItems: 'center' },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  categoryCard: {
    flexGrow: 1,
    flexBasis: 220,
    borderWidth: Texture.cardBorderWidth,
    borderRadius: Radii.large,
    padding: Spacing.four,
    gap: Spacing.one,
    ...(Shadows.subtle ?? {}),
  },
  note: {
    borderWidth: Texture.cardBorderWidth,
    borderRadius: Radii.medium,
    padding: Spacing.three,
    gap: Spacing.one,
  },
});

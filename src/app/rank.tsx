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

import { Copy } from '@/constants/copy';
import { ErrorBanner } from '@/components/error-banner';
import { StreakPill } from '@/components/streak-pill';
import { CategoryBadge } from '@/components/ui/category-badge';
import { ProgressBar } from '@/components/ui/progress-bar';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SurfaceCard } from '@/components/ui/surface-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  BottomTabInset,
  MaxContentWidth,
  Radii,
  Shadows,
  Spacing,
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
          <ScreenHeader
            title={Copy.chain.title}
            subtitle={Copy.chain.subtitle}
            trailing={
              state && !loading ? <StreakPill streakDays={state.streak_len} /> : undefined
            }
          />

          {error && <ErrorBanner message={error} onRetry={() => void load()} />}
          {loading && <ActivityIndicator color={theme.accentWarm} size="large" />}

          {state && !loading && (
            <>
              <View style={[styles.hero, { backgroundColor: theme.accentWarm }, Shadows.soft ?? {}]}>
                <ThemedText type="smallBold" style={{ color: theme.onAccent, opacity: 0.85 }}>
                  {Copy.chain.heroLabel.toUpperCase()}
                </ThemedText>
                <View style={styles.heroNumbers}>
                  <ThemedText type="title" style={{ color: theme.onAccent, fontSize: 62, lineHeight: 56 }}>
                    {state.streak_len}
                  </ThemedText>
                  <ThemedText style={{ color: theme.onAccent, fontSize: 22, opacity: 0.9 }}>
                    gün
                  </ThemedText>
                </View>
                <ThemedText style={{ color: theme.onAccent, opacity: 0.85, lineHeight: 20 }}>
                  {Copy.chain.heroHint}
                </ThemedText>
              </View>

              <SurfaceCard>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  {Copy.chain.overallRank}
                </ThemedText>
                <ThemedText type="title" style={styles.centerText}>
                  {state.overall_rank}
                </ThemedText>
                <View style={styles.streakRow}>
                  <Metric value={`${state.best_streak}`} label="en iyi" />
                  <Metric value={`${state.freeze_tokens}`} label="koruma jetonu" />
                </View>
              </SurfaceCard>

              <View style={styles.sectionHeader}>
                <ThemedText type="subtitle">{Copy.chain.categories}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {Copy.chain.pointsFloor}
                </ThemedText>
              </View>
              <SurfaceCard style={styles.categoryList}>
                {CATEGORIES.map((category) => (
                  <View key={category} style={styles.categoryRow}>
                    <View style={styles.categoryTop}>
                      <ThemedText>{category}</ThemedText>
                      <CategoryBadge label={state.ranks[category]} />
                    </View>
                    <ProgressBar progress={Math.min(state.points[category] / 1000, 1)} />
                    <ThemedText type="small" themeColor="textSecondary">
                      {state.points[category]} puan
                    </ThemedText>
                  </View>
                ))}
              </SurfaceCard>

              <SurfaceCard style={styles.totalRow}>
                <ThemedText>{Copy.chain.totalPoints}</ThemedText>
                <ThemedText type="title" style={{ color: theme.accentWarm }}>
                  {CATEGORIES.reduce((sum, cat) => sum + state.points[cat], 0).toLocaleString('tr-TR')}
                </ThemedText>
              </SurfaceCard>

              <SurfaceCard>
                <ThemedText type="smallBold">{Copy.chain.gameState}</ThemedText>
                <ThemedText themeColor="textSecondary">
                  {state.excuse_count} mazeret · {state.silent_miss_streak} ardışık sessiz kaçırma
                </ThemedText>
              </SurfaceCard>
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
    borderRadius: Radii.large,
    padding: Spacing.four,
    gap: Spacing.two,
    overflow: 'hidden',
  },
  heroNumbers: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.two,
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
  categoryList: {
    gap: Spacing.four,
  },
  categoryRow: {
    gap: Spacing.one,
  },
  categoryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});

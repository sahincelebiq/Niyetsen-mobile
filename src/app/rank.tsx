import { type Href, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';

import { Copy } from '@/constants/copy';
import { ErrorBanner } from '@/components/error-banner';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { sproutGlyph, StreakPill } from '@/components/streak-pill';
import { CategoryBadge } from '@/components/ui/category-badge';
import { ProgressBar } from '@/components/ui/progress-bar';
import { ScreenHeader } from '@/components/ui/screen-header';
import { CountUpText } from '@/components/count-up-text';
import { SurfaceCard } from '@/components/ui/surface-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  Fonts,
  Radii,
  Shadows,
  Spacing,
} from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  ApiError,
  CATEGORIES,
  getRecap,
  getState,
  type StateResponse,
} from '@/lib/api';

function isSproutMilestone(days: number): boolean {
  return days === 3 || days === 7 || days === 30 || (days > 30 && days % 30 === 0);
}

export default function RankScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [state, setState] = useState<StateResponse | null>(null);
  const [recapReady, setRecapReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [nextState, recap] = await Promise.all([
        getState(),
        getRecap('14d').catch(() => null),
      ]);
      setState(nextState);
      setRecapReady(!!recap && recap.days_in >= 14);
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

  const milestoneGlow =
    !!state &&
    (isSproutMilestone(state.streak_len) ||
      (state.streak_len > 0 && state.streak_len === state.best_streak));

  return (
    <ThemedView style={styles.flex}>
      <ScreenScaffold
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />
        }>
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
            {recapReady && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Niyetsen raporunu aç"
                onPress={() => router.push('/rapor' as Href)}
                style={[
                  styles.recapBanner,
                  {
                    backgroundColor: theme.backgroundSelected,
                    borderColor: theme.tint,
                  },
                ]}>
                <View style={styles.recapBannerCopy}>
                  <ThemedText type="smallBold" style={{ color: theme.tint }}>
                    Raporun hazır ✨
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Son günlerinin hikâyesini story olarak gör
                  </ThemedText>
                </View>
                <ThemedText type="smallBold" style={{ color: theme.tint }}>
                  Aç →
                </ThemedText>
              </Pressable>
            )}
            <View
              style={[
                styles.hero,
                { backgroundColor: theme.tint },
                milestoneGlow ? Shadows.clay ?? {} : Shadows.soft ?? {},
              ]}>
              <ThemedText type="smallBold" style={[styles.heroLabel, { color: theme.onAccent }]}>
                {Copy.chain.heroLabel.toUpperCase()}
              </ThemedText>
              <View style={styles.heroRow}>
                <View style={[styles.sproutRing, { borderColor: theme.onAccent }]}>
                  <ThemedText style={styles.sproutEmoji}>
                    {sproutGlyph(state.streak_len)}
                  </ThemedText>
                </View>
                <View style={styles.heroNumbers}>
                  <CountUpText
                    value={state.streak_len}
                    style={[styles.heroCount, { color: theme.onAccent }]}
                  />
                  <ThemedText style={[styles.heroUnit, { color: theme.onAccent }]}>
                    gün
                  </ThemedText>
                </View>
              </View>
              <ThemedText style={[styles.heroHint, { color: theme.onAccent }]}>
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
            <SurfaceCard style={styles.categoryList} elevated>
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

            <SurfaceCard style={styles.totalRow} elevated hero={milestoneGlow}>
              <ThemedText>{Copy.chain.totalPoints}</ThemedText>
              <CountUpText
                grouped
                value={CATEGORIES.reduce((sum, cat) => sum + state.points[cat], 0)}
                style={[styles.totalValue, { color: theme.tint }]}
              />
            </SurfaceCard>

            <SurfaceCard>
              <ThemedText type="smallBold">{Copy.chain.gameState}</ThemedText>
              <ThemedText themeColor="textSecondary">
                {state.excuse_count} mazeret · {state.silent_miss_streak} ardışık sessiz kaçırma
              </ThemedText>
            </SurfaceCard>
          </>
        )}
      </ScreenScaffold>
    </ThemedView>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.metric}>
      <ThemedText type="default" style={styles.metricValue}>
        {value}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  recapBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    borderRadius: Radii.large,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  recapBannerCopy: {
    flex: 1,
    gap: 2,
  },
  hero: {
    borderRadius: Radii.large,
    padding: Spacing.four,
    gap: Spacing.two,
    overflow: 'hidden',
    minHeight: 132,
  },
  heroLabel: {
    letterSpacing: 0.8,
    opacity: 0.88,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginTop: Spacing.one,
  },
  sproutRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sproutEmoji: {
    fontSize: 30,
    lineHeight: 36,
  },
  heroNumbers: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
  },
  heroCount: {
    fontSize: 44,
    lineHeight: 48,
    fontFamily: Fonts.serif,
  },
  heroUnit: {
    fontSize: 18,
    lineHeight: 28,
    opacity: 0.92,
    paddingBottom: 4,
  },
  heroHint: {
    opacity: 0.88,
    lineHeight: 20,
    marginTop: Spacing.one,
  },
  centerText: { textAlign: 'center' },
  streakRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  metric: { flex: 1, alignItems: 'center', gap: 2 },
  metricValue: {
    fontSize: 20,
    lineHeight: 24,
    fontFamily: Fonts.serif,
  },
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
  totalValue: {
    fontSize: 44,
    lineHeight: 48,
    fontFamily: Fonts.serif,
    letterSpacing: -0.8,
  },
});

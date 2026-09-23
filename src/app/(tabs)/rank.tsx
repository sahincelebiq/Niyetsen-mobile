import { type Href, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';

import { ChainAnimalPicker } from '@/components/chain-animal-picker';
import { ChainCompanion, ChainCompanionCaption } from '@/components/chain-companion';
import { ErrorBanner } from '@/components/error-banner';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { StreakPill } from '@/components/streak-pill';
import { ProgressBar } from '@/components/ui/progress-bar';
import { ScreenHeader } from '@/components/ui/screen-header';
import { CountUpText } from '@/components/count-up-text';
import { SurfaceCard } from '@/components/ui/surface-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  CHAIN_CYCLE_DAYS,
  COMPANION_STAGE_MARKS,
  chainEvolution,
  companionStageIndex,
  type CompanionStageKey,
} from '@/constants/chain-animals';
import { nextMilestone } from '@/constants/scoring';
import {
  Fonts,
  Radii,
  Spacing,
} from '@/constants/theme';
import type { Messages } from '@/i18n/types';
import { usePremiumAccess } from '@/hooks/use-premium-access';
import { useCompanionAnimal } from '@/hooks/use-companion-animal';
import { useTheme } from '@/hooks/use-theme';
import { useWarmFocusReload } from '@/hooks/use-warm-focus-reload';
import { useLocale } from '@/providers/locale-provider';
import {
  ApiError,
  CATEGORIES,
  getCurrentPlan,
  getState,
  type StateResponse,
} from '@/lib/api';
import { recordServerState } from '@/lib/gamification';
import { CacheKeys } from '@/lib/query-cache';
import { scoreTier, scoreTierProgress, type ScoreTierId } from '@/lib/score-tier';
import { settleStreak } from '@/lib/streak';
import { bugunIso, parseIsoDate, planGunu } from '@/lib/zaman';

function isSproutMilestone(days: number): boolean {
  return days === 3 || days === 7 || days === 30 || (days > 30 && days % 30 === 0);
}

function tierText(id: ScoreTierId, chain: Messages['chain']): string {
  switch (id) {
    case 'foundation':
      return chain.tierFoundation;
    case 'progressing':
      return chain.tierProgressing;
    case 'proficient':
      return chain.tierProficient;
    case 'consistent':
      return chain.tierConsistent;
    case 'master':
      return chain.tierMaster;
  }
}

function stageText(key: CompanionStageKey, companion: Messages['companion']): string {
  switch (key) {
    case 'bebek':
      return companion.stageBaby;
    case 'cirak':
      return companion.stageApprentice;
    case 'olgun':
      return companion.stageMature;
    case 'bilge':
      return companion.stageWise;
  }
}

function formatJourneyDate(iso: string, locale: string): string {
  return parseIsoDate(iso).toLocaleDateString(locale, { day: 'numeric', month: 'long' });
}

export default function RankScreen() {
  const theme = useTheme();
  const { t, locale } = useLocale();
  const router = useRouter();
  const { hasPaidAccess } = usePremiumAccess();
  const { companionId, investedFor, selectCompanion, syncStreak } = useCompanionAnimal();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [state, setState] = useState<StateResponse | null>(null);
  const [journeyDay, setJourneyDay] = useState(0);
  const [journeyStart, setJourneyStart] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [nextState, plan] = await Promise.all([
        getState(),
        getCurrentPlan().catch(() => null),
      ]);
      setState(nextState);
      recordServerState(nextState);
      if (plan?.start_date) {
        setJourneyDay(Math.max(1, planGunu(plan.start_date)));
        setJourneyStart(plan.start_date);
      } else {
        setJourneyDay(Math.max(0, nextState.streak_len));
        setJourneyStart(null);
      }
    } catch (value) {
      setError(value instanceof ApiError ? value.message : t.chain.loadFailed);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  // gorevTamamlandi → ['zincir'] / ['puan','ozet'] bayatlar → hero + puanlar sessiz yenilenir.
  useWarmFocusReload(load, state != null, undefined, [CacheKeys.zincir(), CacheKeys.puanOzet()]);

  useEffect(() => {
    if (state) syncStreak(state.streak_len);
  }, [state, syncStreak]);

  const milestoneGlow = isSproutMilestone(journeyDay);
  const evolution = chainEvolution(journeyDay);
  const upcoming = state ? nextMilestone(journeyDay) : null;
  const stageIndex = companionStageIndex(journeyDay);
  const totalPoints = state
    ? CATEGORIES.reduce((sum, category) => sum + state.points[category], 0)
    : 0;
  const overallTier = scoreTier(totalPoints / Math.max(1, CATEGORIES.length));
  const unbroken = state
    ? state.last_active_day
      ? settleStreak(
          {
            streakLen: state.streak_len,
            bestStreak: state.best_streak,
            lastActiveDay: state.last_active_day,
          },
          bugunIso(),
        ).state.streakLen
      : state.streak_len
    : 0;

  return (
    <ThemedView style={styles.flex}>
      <ScreenScaffold
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />
        }>
        <ScreenHeader
          title={t.chain.title}
          subtitle={t.chain.subtitle}
          trailing={
            state && !loading ? <StreakPill streakDays={journeyDay} /> : undefined
          }
        />

        {error && <ErrorBanner message={error} onRetry={() => void load()} />}
        {loading && <ActivityIndicator color={theme.accentWarm} size="large" />}
        {!loading && !error && !state ? (
          <SurfaceCard elevated>
            <ThemedText themeColor="textSecondary">{t.chain.emptyBody}</ThemedText>
            <Pressable
              accessibilityRole="button"
              onPress={() => void load()}
              style={({ pressed }) => [
                styles.emptyRetry,
                { borderColor: theme.tint, opacity: pressed ? 0.8 : 1 },
              ]}>
              <ThemedText type="smallBold" themeColor="tint">
                {t.common.retry}
              </ThemedText>
            </Pressable>
          </SurfaceCard>
        ) : null}

        {state && !loading && (
          <>
            <SurfaceCard
              elevated
              hero={milestoneGlow}
              style={styles.hero}>
              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.heroLabel}>
                {t.chain.journeyLabel.toUpperCase()}
              </ThemedText>
              <View style={styles.heroRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t.chain.pickCompanion}
                  onPress={() => setPickerOpen(true)}
                  hitSlop={12}
                  style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
                  <ChainCompanion
                    streakDays={journeyDay}
                    color={theme.tint}
                    companionId={companionId}
                    investedDays={journeyDay}
                  />
                </Pressable>
                <View style={styles.heroNumbers}>
                  <CountUpText
                    value={journeyDay}
                    style={[styles.heroCount, { color: theme.tint }]}
                  />
                  <ThemedText style={[styles.heroUnit, { color: theme.text }]}>
                    {t.chain.daysUnit}
                  </ThemedText>
                </View>
              </View>
              <ChainCompanionCaption
                streakDays={journeyDay}
                color={theme.textSecondary}
                companionId={companionId}
                investedDays={journeyDay}
              />
              <Pressable
                accessibilityRole="button"
                onPress={() => setPickerOpen(true)}
                style={styles.pickHint}
                hitSlop={8}>
                <ThemedText type="smallBold" themeColor="tint">
                  {t.chain.changeCompanion}
                </ThemedText>
              </Pressable>
              {journeyStart ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {t.chain.journeySince(formatJourneyDate(journeyStart, locale))}
                </ThemedText>
              ) : null}
              <ThemedText type="small" themeColor="textSecondary" style={styles.heroHint}>
                {upcoming ? t.chain.nextMilestone(upcoming.remaining, upcoming.day) : t.chain.heroHint}
              </ThemedText>
            </SurfaceCard>

            <SurfaceCard elevated>
              <View style={styles.evolutionTop}>
                <View style={styles.evolutionCopy}>
                  <ThemedText type="smallBold">{evolution.animal.name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {stageText(
                      evolution.stage === 'bebek'
                        ? 'bebek'
                        : evolution.stage === 'genc'
                          ? 'cirak'
                          : 'olgun',
                      t.companion,
                    )}
                  </ThemedText>
                </View>
                <ThemedText type="smallBold" themeColor="tint">
                  {evolution.dayInCycle}/{CHAIN_CYCLE_DAYS}
                </ThemedText>
              </View>
              <ProgressBar progress={evolution.cycleProgress} />
              <ThemedText type="small" themeColor="textSecondary">
                {evolution.nextLabel}
              </ThemedText>
            </SurfaceCard>

            <View style={styles.sectionHeader}>
              <ThemedText type="subtitle">{t.chain.milestones}</ThemedText>
            </View>
            <View style={styles.milestoneRow}>
              {COMPANION_STAGE_MARKS.map((mark, index) => {
                const active = stageIndex === index;
                return (
                  <View
                    key={mark.key}
                    style={[
                      styles.milestone,
                      {
                        borderColor: active ? theme.tint : theme.border,
                        backgroundColor: active ? theme.backgroundSelected : theme.backgroundElement,
                      },
                    ]}>
                    <ThemedText type="smallBold" style={{ color: active ? theme.tint : theme.text }}>
                      {stageText(mark.key, t.companion)}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {mark.at}+
                    </ThemedText>
                  </View>
                );
              })}
            </View>

            <SurfaceCard>
              <ThemedText type="smallBold" themeColor="textSecondary">
                {t.chain.overallRank}
              </ThemedText>
              <ThemedText type="subtitle" style={styles.centerText}>
                {tierText(overallTier, t.chain)}
              </ThemedText>
              <View style={styles.streakRow}>
                <Metric value={`${unbroken}`} label={t.chain.unbroken} />
                <Metric value={`${state.best_streak}`} label={t.chain.bestStreak} />
                <Metric value={`${state.freeze_tokens}`} label={t.chain.freezeToken} />
              </View>
            </SurfaceCard>

            <View style={styles.sectionHeader}>
              <ThemedText type="subtitle">{t.chain.categories}</ThemedText>
            </View>
            <SurfaceCard style={styles.categoryList} elevated>
              {CATEGORIES.map((category) => (
                <View key={category} style={styles.categoryRow}>
                  <View style={styles.categoryTop}>
                    <ThemedText>{category}</ThemedText>
                    <ThemedText type="smallBold" themeColor="tint">
                      %{Math.round(scoreTierProgress(state.points[category]) * 100)}
                    </ThemedText>
                  </View>
                  <ProgressBar progress={scoreTierProgress(state.points[category])} />
                  <ThemedText type="small" themeColor="textSecondary">
                    {t.chain.points(state.points[category])}
                  </ThemedText>
                </View>
              ))}
            </SurfaceCard>

            <SurfaceCard style={styles.totalRow} elevated hero={milestoneGlow}>
              <ThemedText>{t.chain.totalPoints}</ThemedText>
              <CountUpText
                grouped
                value={totalPoints}
                style={[styles.totalValue, { color: theme.tint }]}
              />
            </SurfaceCard>

            <SurfaceCard>
              <ThemedText type="smallBold">{t.chain.gameState}</ThemedText>
              <ThemedText themeColor="textSecondary">
                {t.chain.gameStateDetail(state.excuse_count, state.silent_miss_streak)}
              </ThemedText>
            </SurfaceCard>

            <SurfaceCard elevated>
              <ThemedText type="subtitle">{t.chain.reportReady}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {hasPaidAccess ? t.chain.reportReadyHint : t.chain.reportProHint}
              </ThemedText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t.chain.reportOpen}
                onPress={() => router.push('/rapor' as Href)}
                style={({ pressed }) => [
                  styles.reportCta,
                  {
                    backgroundColor: hasPaidAccess ? theme.tint : theme.accentWarm,
                    opacity: pressed ? 0.88 : 1,
                  },
                ]}>
                <ThemedText type="smallBold" style={{ color: theme.onAccent }}>
                  {hasPaidAccess ? t.chain.reportOpen : t.common.proCta}
                </ThemedText>
              </Pressable>
            </SurfaceCard>

          </>
        )}
      </ScreenScaffold>
      <ChainAnimalPicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        selectedId={companionId}
        investedFor={investedFor}
        streakDays={journeyDay}
        onSelect={selectCompanion}
        hasPaidAccess={hasPaidAccess}
        onPaywall={() => router.push('/paywall' as Href)}
      />
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
  heroNumbers: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
  },
  heroCount: {
    fontSize: 32,
    lineHeight: 38,
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
  pickHint: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
  },
  evolutionTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  evolutionCopy: {
    flex: 1,
    gap: Spacing.half,
  },
  reportCta: {
    minHeight: 44,
    borderRadius: Radii.medium,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  emptyRetry: {
    alignSelf: 'flex-start',
    minHeight: 44,
    marginTop: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  milestoneRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  milestone: {
    flexGrow: 1,
    flexBasis: '22%',
    minHeight: 44,
    borderWidth: 1,
    borderRadius: Radii.medium,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    gap: 2,
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
    fontSize: 32,
    lineHeight: 38,
    fontFamily: Fonts.serif,
    letterSpacing: -0.5,
  },
});

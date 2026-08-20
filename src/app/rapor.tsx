/**
 * Niyetsen Raporu — panel önce (ayna + kazanım), hikâye isteyene.
 * Spotify Wrapped: tam ekran kartlar, üstte çubuklar, sağa/sola dokun.
 * İlkbahar teması — hex yok. Kaçırılan görev/ceza ASLA gösterilmez.
 */
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  ReduceMotion,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

import { CountUpText } from '@/components/count-up-text';
import { ProBadge } from '@/components/pro-badge';
import { sproutGlyph } from '@/components/streak-pill';
import { ThemedText } from '@/components/themed-text';
import { CategoryBadge } from '@/components/ui/category-badge';
import { ProgressBar } from '@/components/ui/progress-bar';
import { SurfaceCard } from '@/components/ui/surface-card';
import { Fonts, Motion, Radii, Spacing } from '@/constants/theme';
import { usePremiumAccess } from '@/hooks/use-premium-access';
import { useTheme } from '@/hooks/use-theme';
import {
  CATEGORIES,
  getRecap,
  getState,
  isPaywallError,
  type Recap,
  type RecapCard,
  type RecapDashboard,
  type StateResponse,
} from '@/lib/api';

const STORY_MS = 5200;
type RecapPeriod = '7d' | '30d';
type RecapMode = 'story' | 'panel';

function streakDaysFromHeadline(headline: string): number {
  const match = headline.match(/(\d+)/);
  return match ? Number(match[1]) : 0;
}

function journeyEndDay(headline: string): number {
  const match = headline.match(/Gün\s*(\d+)\s*$/i) || headline.match(/→\s*Gün\s*(\d+)/i);
  if (match) return Number(match[1]);
  const any = headline.match(/(\d+)/g);
  return any?.length ? Number(any[any.length - 1]) : 1;
}

function traitPeriodCount(subtitle: string): number | null {
  const match = subtitle.match(/Bu dönem\s+(\d+)\s+görev/i);
  return match ? Number(match[1]) : null;
}

function multiPlanCount(subtitle: string): number | null {
  const match = subtitle.match(/(\d+)\s+niyeti birden/i);
  return match ? Number(match[1]) : null;
}

function emptyDashboard(): RecapDashboard {
  const categoryCounts: Record<string, number> = {};
  for (const category of CATEGORIES) categoryCounts[category] = 0;
  return {
    total_tasks: 0,
    completed_tasks: 0,
    proofed_tasks: 0,
    completion_rate: 0,
    category_counts: categoryCounts,
    points: {},
    total_points: 0,
    streak_len: 0,
    best_streak: 0,
    days_in: 1,
    plans_count: 1,
    weekly_completed: [0, 0, 0, 0, 0, 0, 0, 0],
    mirror_line: null,
  };
}

function dashboardFromSources(
  recap: Recap | null,
  state: StateResponse | null,
): RecapDashboard | null {
  if (recap?.dashboard) return recap.dashboard;
  if (!recap && !state) return null;
  const points: Record<string, number> = { ...(state?.points ?? {}) };
  const categoryCounts: Record<string, number> = {};
  for (const category of CATEGORIES) {
    categoryCounts[category] = 0;
  }
  if (recap?.top_category) {
    categoryCounts[recap.top_category] = recap.completed_tasks;
  }
  return {
    total_tasks: recap?.completed_tasks ?? 0,
    completed_tasks: recap?.completed_tasks ?? 0,
    proofed_tasks: 0,
    completion_rate: recap?.completed_tasks ? 100 : 0,
    category_counts: categoryCounts,
    points,
    total_points: recap?.total_points ?? CATEGORIES.reduce((sum, cat) => sum + (points[cat] ?? 0), 0),
    streak_len: state?.streak_len ?? 0,
    best_streak: state?.best_streak ?? 0,
    days_in: recap?.days_in ?? 1,
    plans_count: 1,
    weekly_completed: [0, 0, 0, 0, 0, 0, 0, recap?.completed_tasks ?? 0],
    mirror_line: recap?.dashboard?.mirror_line ?? null,
  };
}

export default function RecapScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { hasPremium } = usePremiumAccess();
  const [period, setPeriod] = useState<RecapPeriod>('7d');
  const [mode, setMode] = useState<RecapMode>('panel');
  const [recap, setRecap] = useState<Recap | null>(null);
  const [state, setState] = useState<StateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [stateReady, setStateReady] = useState(false);
  const [recapLoading, setRecapLoading] = useState(true);
  const progress = useSharedValue(0);
  const advanceAtRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remainingMsRef = useRef(STORY_MS);
  const shotRef = useRef<ViewShot>(null);

  const load = useCallback(async (nextPeriod: RecapPeriod = period) => {
    setError(null);
    setRecapLoading(true);
    try {
      const next = await getRecap(nextPeriod);
      setRecap(next);
      setIndex(0);
    } catch (value) {
      if (isPaywallError(value)) {
        setRecap(null);
        return;
      }
      setError('Raporun şu an yüklenemedi. Birazdan tekrar dene.');
    } finally {
      setRecapLoading(false);
    }
  }, [period]);

  useEffect(() => {
    void getState()
      .then(setState)
      .catch(() => {
        setState(null);
      })
      .finally(() => setStateReady(true));
  }, []);

  useEffect(() => {
    void load(period);
  }, [load, period]);

  const selectPeriod = (next: RecapPeriod) => {
    if (next === period) return;
    setPeriod(next);
  };

  const openStory = () => {
    setIndex(0);
    setMode('story');
  };

  const closeStory = () => {
    setMode('panel');
    setIndex(0);
    setPaused(false);
  };

  useEffect(() => {
    const sub = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    return () => sub.remove();
  }, []);

  const cards = recap?.cards ?? [];
  const card = cards[index];
  const isClosing = card?.kind === 'closing';
  const dashboard = dashboardFromSources(recap, state)
    ?? (stateReady ? emptyDashboard() : null);
  const storyLocked = !hasPremium || cards.length === 0;

  const advance = useCallback(
    (dir: 1 | -1) => {
      const next = index + dir;
      if (next < 0) return;
      if (next >= cards.length) {
        setMode('panel');
        setIndex(0);
        setPaused(false);
        return;
      }
      setIndex(next);
    },
    [cards.length, index],
  );

  useEffect(() => {
    remainingMsRef.current = STORY_MS;
    progress.value = reduceMotion ? 1 : 0;
    setPaused(false);
  }, [index, progress, reduceMotion]);

  useEffect(() => {
    if (advanceAtRef.current) {
      clearTimeout(advanceAtRef.current);
      advanceAtRef.current = null;
    }
    if (!card || reduceMotion || mode !== 'story' || storyLocked) return;
    if (paused) {
      cancelAnimation(progress);
      return;
    }

    const duration = Math.max(remainingMsRef.current, 80);
    const started = Date.now();
    const from = 1 - duration / STORY_MS;
    progress.value = from;
    progress.value = withTiming(1, {
      duration,
      easing: Easing.linear,
    });
    advanceAtRef.current = setTimeout(() => advance(1), duration);

    return () => {
      if (advanceAtRef.current) {
        clearTimeout(advanceAtRef.current);
        advanceAtRef.current = null;
      }
      remainingMsRef.current = Math.max(0, duration - (Date.now() - started));
      cancelAnimation(progress);
    };
  }, [advance, card, index, paused, progress, reduceMotion, mode, storyLocked]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${Math.min(Math.max(progress.value, 0), 1) * 100}%`,
  }));

  const shareClosing = useCallback(async () => {
    if (Platform.OS === 'web' || sharing) return;
    setSharing(true);
    setPaused(true);
    try {
      const uri = await shotRef.current?.capture?.();
      if (!uri) return;
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Niyetsen Raporunu paylaş',
        });
      } else {
        await Share.share({
          url: uri,
          message: 'Niyetsen Raporum',
        });
      }
    } catch {
      // Paylaşım iptali / platform kısıtı — sessiz geç.
    } finally {
      setSharing(false);
      setPaused(false);
    }
  }, [sharing]);

  const goBack = () => {
    if (mode === 'story') {
      closeStory();
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace('/daily');
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Geri"
          onPress={goBack}
          hitSlop={12}
          style={styles.backHit}>
          <ThemedText type="smallBold" themeColor="tint">
            ‹ Geri
          </ThemedText>
        </Pressable>
        <View style={styles.titleBlock}>
          <ThemedText type="screenTitle" numberOfLines={1}>
            Raporun
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {period === '7d' ? 'Son 7 günün izi' : 'Son 30 günün izi'}
          </ThemedText>
        </View>
        {mode === 'panel' ? (
          <View
            style={[
              styles.periodSegment,
              { backgroundColor: theme.backgroundSelected, borderColor: theme.border },
            ]}>
            {([
              { id: '7d' as const, label: '7 gün' },
              { id: '30d' as const, label: '30 gün' },
            ]).map((option) => {
              const active = period === option.id;
              return (
                <Pressable
                  key={option.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => selectPeriod(option.id)}
                  style={[
                    styles.periodChip,
                    active && { backgroundColor: theme.tint },
                  ]}>
                  <ThemedText
                    type="smallBold"
                    style={{ color: active ? theme.onAccent : theme.textSecondary }}>
                    {option.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Panele dön"
            onPress={closeStory}
            hitSlop={8}
            style={styles.panelLink}>
            <ThemedText type="smallBold" themeColor="tint">
              Panel
            </ThemedText>
          </Pressable>
        )}
      </View>

      <View style={[styles.progressRow, mode !== 'story' && styles.hidden]}>
        {cards.map((item, i) => (
          <View
            key={`${item.kind}-${i}`}
            style={[styles.progressTrack, { backgroundColor: theme.progressTrack }]}>
            {i < index ? (
              <View style={[styles.progressFill, { backgroundColor: theme.tint, width: '100%' }]} />
            ) : i === index ? (
              reduceMotion ? (
                <View
                  style={[styles.progressFill, { backgroundColor: theme.tint, width: '100%' }]}
                />
              ) : (
                <Animated.View
                  style={[styles.progressFill, { backgroundColor: theme.tint }, fillStyle]}
                />
              )
            ) : null}
          </View>
        ))}
      </View>

      {mode === 'story' && storyLocked ? (
        <View style={styles.center}>
          <View
            style={[
              styles.lockCard,
              { backgroundColor: theme.backgroundElement, borderColor: theme.border },
            ]}>
            <ThemedText style={styles.lockGlyph}>🌱</ThemedText>
            <ThemedText type="subtitle" style={{ textAlign: 'center' }}>
              Yolculuğunun hikâyesi burada
            </ThemedText>
            <ThemedText
              type="small"
              themeColor="textSecondary"
              style={{ textAlign: 'center' }}>
              Paneldeki kazanımların açık. Haftalık ve aylık hikâye kartları
              PRO ile açılır — dışarı atılmazsın.
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/paywall')}
              style={({ pressed }) => [
                styles.lockCta,
                { backgroundColor: theme.tint, opacity: pressed ? 0.85 : 1 },
              ]}>
              <ThemedText type="smallBold" style={{ color: theme.onAccent }}>
                PRO ile aç
              </ThemedText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={closeStory}
              hitSlop={8}
              style={styles.panelLink}>
              <ThemedText type="small" themeColor="textSecondary">
                Panele dön
              </ThemedText>
            </Pressable>
          </View>
        </View>
      ) : null}

      {mode === 'story' && !storyLocked && recapLoading && !recap && !error ? (
        <ActivityIndicator color={theme.tint} style={styles.center} />
      ) : null}

      {mode === 'panel' && !dashboard && !error ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.tint} />
        </View>
      ) : null}

      {error ? (
        <View style={styles.center}>
          <ThemedText themeColor="danger">{error}</ThemedText>
          <Pressable onPress={() => void load(period)} style={styles.retry}>
            <ThemedText themeColor="tint">Tekrar dene</ThemedText>
          </Pressable>
        </View>
      ) : null}

      {mode === 'panel' && dashboard ? (
        <DashboardPanel
          dashboard={dashboard}
          locked={storyLocked}
          reduceMotion={reduceMotion}
          onOpenStory={openStory}
        />
      ) : null}

      {mode === 'story' && !storyLocked && card ? (
        <Animated.View
          key={`${card.kind}-${index}`}
          entering={
            reduceMotion
              ? undefined
              : FadeIn.duration(Motion.base)
                  .easing(Easing.out(Easing.cubic))
                  .reduceMotion(ReduceMotion.System)
          }
          style={styles.cardArea}>
          <ViewShot
            ref={shotRef}
            options={{ format: 'png', quality: 1, result: 'tmpfile' }}
            style={[styles.shot, { backgroundColor: theme.background }]}>
            <StoryCardBody card={card} />
          </ViewShot>
        </Animated.View>
      ) : null}

      {mode === 'story' && isClosing && Platform.OS !== 'web' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Raporu paylaş"
          onPress={() => void shareClosing()}
          disabled={sharing}
          style={[
            styles.shareBtn,
            {
              backgroundColor: theme.tint,
              opacity: sharing ? 0.7 : 1,
            },
          ]}>
          <ThemedText type="smallBold" style={{ color: theme.onAccent }}>
            {sharing ? 'Hazırlanıyor…' : 'Paylaş'}
          </ThemedText>
        </Pressable>
      ) : null}

      <View
        style={[styles.tapZones, mode !== 'story' && styles.hidden]}
        pointerEvents={mode === 'story' && !storyLocked ? 'box-none' : 'none'}>
        <Pressable
          style={styles.tapZone}
          onPress={() => advance(-1)}
          onLongPress={() => setPaused(true)}
          onPressOut={() => setPaused(false)}
          delayLongPress={180}
          accessibilityLabel="Önceki kart"
        />
        <Pressable
          style={styles.tapZone}
          onPress={() => advance(1)}
          onLongPress={() => setPaused(true)}
          onPressOut={() => setPaused(false)}
          delayLongPress={180}
          accessibilityLabel="Sonraki kart"
        />
      </View>
    </SafeAreaView>
  );
}

function DashboardPanel({
  dashboard,
  locked = false,
  reduceMotion = false,
  onOpenStory,
}: {
  dashboard: RecapDashboard;
  locked?: boolean;
  reduceMotion?: boolean;
  onOpenStory: () => void;
}) {
  const theme = useTheme();
  const maxWeekly = Math.max(...dashboard.weekly_completed, 1);
  const maxCategory = Math.max(...Object.values(dashboard.category_counts), 1);
  const emptyTrail = dashboard.completed_tasks === 0;
  const enter = (delay: number) =>
    reduceMotion
      ? undefined
      : FadeIn.duration(Motion.base)
          .delay(delay)
          .easing(Easing.out(Easing.cubic))
          .reduceMotion(ReduceMotion.System);

  return (
    <ScrollView
      style={styles.panelScroll}
      contentContainerStyle={styles.panelContent}
      showsVerticalScrollIndicator={false}>
      <Animated.View entering={enter(0)}>
        <SurfaceCard hero>
          <ThemedText type="smallBold" themeColor="tint">
            Niyetsen'de {Math.max(dashboard.days_in, 1)}. günün
          </ThemedText>
          <View style={styles.heroRow}>
            <CountUpText
              value={dashboard.completed_tasks}
              style={[styles.heroCount, { color: theme.tint }]}
            />
            <ThemedText type="small" themeColor="textSecondary" style={styles.heroUnit}>
              görev tamamlandı
            </ThemedText>
          </View>
          <ProgressBar progress={Math.min(dashboard.completion_rate / 100, 1)} />
          <ThemedText type="small" themeColor="textSecondary">
            %{dashboard.completion_rate} tamamlama
            {dashboard.proofed_tasks > 0
              ? ` · ${dashboard.proofed_tasks} fotoğraflı kanıt`
              : ''}
          </ThemedText>
          {emptyTrail ? (
            <ThemedText type="small" themeColor="textSecondary">
              İlk görevin tamamlanınca burası dolacak. Acele yok — iz birikir.
            </ThemedText>
          ) : null}
        </SurfaceCard>
      </Animated.View>

      {dashboard.mirror_line ? (
        <Animated.View entering={enter(Motion.stagger)}>
          <SurfaceCard
            elevated
            style={{ borderColor: theme.tint, borderWidth: StyleSheet.hairlineWidth }}>
            <ThemedText type="smallBold" themeColor="tint">
              Ayna
            </ThemedText>
            <ThemedText>{dashboard.mirror_line}</ThemedText>
          </SurfaceCard>
        </Animated.View>
      ) : null}

      <Animated.View entering={enter(Motion.stagger * 2)} style={styles.kpiGrid}>
        <KpiTile label="Şu anki zincir" value={`${dashboard.streak_len}`} suffix="gün" />
        <KpiTile label="En uzun zincir" value={`${dashboard.best_streak}`} suffix="gün" />
        <KpiTile label="Toplam puan" value={`${dashboard.total_points}`} />
      </Animated.View>

      <Animated.View entering={enter(Motion.stagger * 3)}>
        <SurfaceCard>
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.panelCardTitle}>
            Gelişim · son 8 hafta
          </ThemedText>
          <View style={styles.weeklyRow}>
            {dashboard.weekly_completed.map((count, i) => {
              const last = i === dashboard.weekly_completed.length - 1;
              return (
                <View key={i} style={styles.weeklyCol}>
                  <View style={[styles.weeklyTrack, { backgroundColor: theme.progressTrack }]}>
                    <View
                      style={[
                        styles.weeklyFill,
                        {
                          backgroundColor: last ? theme.accentWarm : theme.tint,
                          height: `${Math.max((count / maxWeekly) * 100, count > 0 ? 8 : 0)}%`,
                        },
                      ]}
                    />
                  </View>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.weeklyCount}>
                    {count}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.weeklyLabel}>
                    {last ? 'Bu hf' : ''}
                  </ThemedText>
                </View>
              );
            })}
          </View>
        </SurfaceCard>
      </Animated.View>

      <Animated.View entering={enter(Motion.stagger * 4)}>
        <SurfaceCard>
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.panelCardTitle}>
            Kazanılan yönler
          </ThemedText>
          {Object.entries(dashboard.category_counts).map(([category, count]) => (
            <View key={category} style={styles.categoryRow}>
              <View style={styles.categoryLabel}>
                <CategoryBadge label={category} />
              </View>
              <View style={[styles.categoryTrack, { backgroundColor: theme.progressTrack }]}>
                <View
                  style={[
                    styles.categoryFill,
                    {
                      backgroundColor: theme.tint,
                      width: `${Math.max((count / maxCategory) * 100, count > 0 ? 6 : 0)}%`,
                    },
                  ]}
                />
              </View>
              <ThemedText type="smallBold" themeColor="tint" style={styles.categoryCount}>
                {count}
              </ThemedText>
            </View>
          ))}
          {dashboard.plans_count > 1 ? (
            <ThemedText type="small" themeColor="textSecondary">
              {dashboard.plans_count} niyeti birden yürütüyorsun.
            </ThemedText>
          ) : null}
        </SurfaceCard>
      </Animated.View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={locked ? 'Hikâye raporu, PRO ile açılır' : 'Hikâye olarak gör'}
        onPress={onOpenStory}
        style={({ pressed }) => [
          styles.storyCta,
          {
            backgroundColor: locked ? theme.backgroundSelected : theme.tint,
            borderColor: theme.tint,
            opacity: pressed ? 0.88 : 1,
          },
        ]}>
        <View style={styles.storyCtaCopy}>
          <View style={styles.storyCtaTitle}>
            <ThemedText
              type="smallBold"
              style={{ color: locked ? theme.tint : theme.onAccent }}>
              Hikâye olarak gör
            </ThemedText>
            {locked ? <ProBadge /> : null}
          </View>
          <ThemedText
            type="small"
            style={{ color: locked ? theme.textSecondary : theme.onAccent }}>
            {locked
              ? 'Kartlar içeride kilitli — panelin açık kalır.'
              : 'Dokunarak ilerle, uzun basınca durur.'}
          </ThemedText>
        </View>
      </Pressable>
    </ScrollView>
  );
}

function KpiTile({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  suffix?: string;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.kpiTile,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
      ]}>
      <View style={styles.kpiValueRow}>
        <ThemedText type="subtitle" style={{ color: theme.tint }}>
          {value}
        </ThemedText>
        {suffix ? (
          <ThemedText type="small" themeColor="textSecondary">
            {suffix}
          </ThemedText>
        ) : null}
      </View>
      <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
        {label}
      </ThemedText>
    </View>
  );
}

function StoryCardBody({ card }: { card: RecapCard }) {
  const theme = useTheme();
  const streakDays = streakDaysFromHeadline(card.headline);
  const journeyDay = card.kind === 'journey' ? journeyEndDay(card.headline) : 1;
  const periodCount = card.kind === 'trait' ? traitPeriodCount(card.subtitle) : null;
  const planCount = card.kind === 'intro' ? multiPlanCount(card.subtitle) : null;

  return (
    <View style={styles.cardBody}>
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.cardTitle}>
        {card.title}
      </ThemedText>

      {card.kind === 'intro' && planCount && planCount > 1 ? (
        <View
          style={[
            styles.planBadge,
            { backgroundColor: theme.backgroundSelected, borderColor: theme.border },
          ]}>
          <ThemedText type="smallBold" themeColor="tint">
            {planCount} niyet
          </ThemedText>
        </View>
      ) : null}

      {card.kind === 'trait' ? (
        <View style={styles.traitRow}>
          <CategoryBadge label={card.headline} />
          {periodCount != null ? (
            <ThemedText type="small" themeColor="textSecondary">
              {periodCount} görev bu dönem
            </ThemedText>
          ) : null}
        </View>
      ) : null}

      {card.kind === 'journey' ? (
        <View style={styles.journeyTrack}>
          <View style={styles.journeyRow}>
            <View style={[styles.journeyDot, { backgroundColor: theme.tint }]} />
            <View style={[styles.journeyLine, { backgroundColor: theme.border }]} />
            <View style={[styles.journeyDot, { backgroundColor: theme.accentWarm }]} />
          </View>
          <View style={styles.journeyLabels}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Gün 1
            </ThemedText>
            <ThemedText type="smallBold" themeColor="tint">
              Gün {journeyDay}
            </ThemedText>
          </View>
        </View>
      ) : null}

      {card.kind === 'streak' ? (
        <ThemedText style={styles.sproutEmoji}>{sproutGlyph(streakDays)}</ThemedText>
      ) : null}

      <ThemedText type="title" style={{ color: theme.tint, textAlign: 'center' }}>
        {card.headline}
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.subtitle}>
        {card.subtitle}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topBar: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
    zIndex: 2,
  },
  backHit: {
    minHeight: 44,
    minWidth: 52,
    justifyContent: 'center',
  },
  titleBlock: {
    flex: 1,
    gap: 1,
  },
  panelLink: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: Spacing.one,
  },
  hidden: { display: 'none' },
  panelScroll: { flex: 1, zIndex: 1 },
  panelContent: {
    padding: Spacing.three,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  heroCount: {
    fontFamily: Fonts.serif,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  heroUnit: {
    paddingBottom: 4,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  kpiTile: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 96,
    borderWidth: 1,
    borderRadius: Radii.medium,
    padding: Spacing.three,
    gap: 2,
  },
  kpiValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.one,
  },
  panelCardTitle: {
    letterSpacing: 0.4,
  },
  weeklyRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    height: 108,
  },
  weeklyCol: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    height: '100%',
  },
  weeklyTrack: {
    flex: 1,
    width: '100%',
    borderRadius: Radii.small,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  weeklyFill: {
    width: '100%',
    borderRadius: Radii.small,
  },
  weeklyCount: { fontSize: 11, lineHeight: 14 },
  weeklyLabel: { fontSize: 10, lineHeight: 12, minHeight: 12 },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 32,
  },
  categoryLabel: { width: 92 },
  categoryTrack: {
    flex: 1,
    height: 8,
    borderRadius: Radii.pill,
    overflow: 'hidden',
  },
  categoryFill: {
    height: 8,
    borderRadius: Radii.pill,
  },
  categoryCount: { width: 28, textAlign: 'right' },
  storyCta: {
    borderWidth: 1,
    borderRadius: Radii.large,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    minHeight: 64,
    justifyContent: 'center',
  },
  storyCtaCopy: {
    gap: 2,
  },
  storyCtaTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  periodSegment: {
    flexDirection: 'row',
    borderRadius: Radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 2,
    gap: 2,
  },
  periodChip: {
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.one + 2,
    minHeight: 36,
    justifyContent: 'center',
  },
  progressRow: {
    flexDirection: 'row',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    zIndex: 2,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    borderRadius: Radii.pill,
    overflow: 'hidden',
  },
  progressFill: {
    height: 3,
    borderRadius: Radii.pill,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three },
  retry: { padding: Spacing.two, minHeight: 44, justifyContent: 'center' },
  lockCard: {
    marginHorizontal: Spacing.four,
    padding: Spacing.four,
    borderRadius: Radii.large,
    borderWidth: 1,
    alignItems: 'center',
    gap: Spacing.three,
    maxWidth: 420,
  },
  lockGlyph: { fontSize: 28, lineHeight: 34 },
  lockCta: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Radii.pill,
    minHeight: 44,
    justifyContent: 'center',
  },
  cardArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.five,
    gap: Spacing.four,
    zIndex: 1,
  },
  shot: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.five,
    borderRadius: Radii.large,
    width: '100%',
  },
  cardBody: {
    alignItems: 'center',
    gap: Spacing.three,
    width: '100%',
  },
  cardTitle: { textTransform: 'uppercase', letterSpacing: 1.2 },
  planBadge: {
    borderWidth: 1,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  traitRow: {
    alignItems: 'center',
    gap: Spacing.one,
    marginBottom: Spacing.one,
  },
  journeyTrack: {
    width: '88%',
    maxWidth: 280,
    gap: Spacing.two,
    marginBottom: Spacing.one,
  },
  journeyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  journeyLine: {
    flex: 1,
    height: 2,
    borderRadius: Radii.pill,
    marginHorizontal: Spacing.one,
  },
  journeyDot: {
    width: 12,
    height: 12,
    borderRadius: Radii.pill,
  },
  journeyLabels: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sproutEmoji: { fontSize: 32, lineHeight: 38, textAlign: 'center' },
  subtitle: { textAlign: 'center', fontSize: 16, lineHeight: 24 },
  shareBtn: {
    position: 'absolute',
    bottom: Spacing.six,
    alignSelf: 'center',
    zIndex: 3,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
    minHeight: 44,
    justifyContent: 'center',
  },
  tapZones: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', zIndex: 0 },
  tapZone: { flex: 1 },
});

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image } from 'expo-image';
import { type Href, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { ErrorBanner } from '@/components/error-banner';
import {
  isTaskEditable,
  PlanTaskEditor,
  type PlanTaskEditorTarget,
} from '@/components/plan-task-editor';
import { PlanEventsSection } from '@/components/plan-events-section';
import { PlanPickerSheet } from '@/components/project-sheets';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { CategoryBadge } from '@/components/ui/category-badge';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SurfaceCard } from '@/components/ui/surface-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts, ImageScrim, Radii, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePremiumAccess } from '@/hooks/use-premium-access';
import { useTheme } from '@/hooks/use-theme';
import { useWarmFocusReload } from '@/hooks/use-warm-focus-reload';
import {
  ApiError,
  ensureTodayPlan,
  getCurrentPlan,
  isPaywallError,
  Plan,
  PlanDay,
  Task,
} from '@/lib/api';
import {
  PLAN_HORIZON_DAYS,
  daysInWeek,
  planHorizon,
  progressTotal,
  visibleWeeks,
  weekBounds,
  weekIndex,
  weekNeedsHorizonUnlock,
  weekWasSkipped,
  type PlanWeek,
} from '@/lib/plan-weeks';
import { invalidateGunlukAkis } from '@/lib/gunluk-akis';
import { safeImageUri } from '@/lib/safe-image-uri';
import { addDaysIso } from '@/lib/plan-dates';
import { planGunu } from '@/lib/zaman';
import { showAlert } from '@/lib/web-alert';
import { useLocale } from '@/providers/locale-provider';
import { useSubscription } from '@/providers/subscription-provider';

function todayDayFrom(plan: Plan): number {
  return planGunu(plan.start_date);
}

export default function PlanScreen() {
  const { t } = useLocale();
  const { status: subscriptionStatus } = useSubscription();
  const { hasPaidAccess, loading: premiumLoading } = usePremiumAccess();
  const horizonKey = useRef<string | null>(null);
  const theme = useTheme();
  const router = useRouter();

  const [plan, setPlan] = useState<Plan | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusedDay, setFocusedDay] = useState<number | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [horizonDenied, setHorizonDenied] = useState(false);
  const [editTarget, setEditTarget] = useState<PlanTaskEditorTarget | null>(null);
  const [addDate, setAddDate] = useState<string | null>(null);
  const [extending, setExtending] = useState(false);
  // Etkinlik bölümü kendi verisini çeker; ekran yenilenince o da yenilensin.
  const [eventsReloadKey, setEventsReloadKey] = useState(0);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    if (isRefresh) setEventsReloadKey((key) => key + 1);
    try {
      let next = await getCurrentPlan();
      if (next) {
        const todayNo = planGunu(next.start_date);
        const withinBatch =
          todayNo > next.batch_generated_until &&
          next.batch_generated_until < next.duration_days;
        const pastHorizon =
          !premiumLoading &&
          hasPaidAccess &&
          todayNo > next.duration_days &&
          next.duration_days < PLAN_HORIZON_DAYS;
        if (withinBatch || pastHorizon) {
          const key = `${next.id}:${todayNo}`;
          if (pastHorizon && horizonKey.current === key) {
            // Bu oturumda süre uzatma denendi; çekerek yenileme tekrar dener.
          } else {
            if (pastHorizon) horizonKey.current = key;
            setExtending(true);
            try {
              next = await ensureTodayPlan();
              setHorizonDenied(false);
              invalidateGunlukAkis();
            } catch (extendError) {
              if (pastHorizon && isPaywallError(extendError)) {
                setHorizonDenied(true);
              } else {
                setError(
                  extendError instanceof ApiError
                    ? extendError.message
                    : t.plan.generateFailed,
                );
              }
            } finally {
              setExtending(false);
            }
          }
        }
      }
      setPlan(next);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t.plan.loadFailed);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [hasPaidAccess, premiumLoading, t]);

  useWarmFocusReload(load, plan != null);

  const horizonWatch = useRef('');
  useEffect(() => {
    if (!plan || premiumLoading || !hasPaidAccess) return;
    const todayNo = todayDayFrom(plan);
    if (todayNo <= plan.duration_days || plan.duration_days >= PLAN_HORIZON_DAYS) return;
    const stamp = `${plan.id}:${plan.duration_days}:${todayNo}`;
    if (horizonWatch.current === stamp) return;
    horizonWatch.current = stamp;
    void load(true);
  }, [hasPaidAccess, load, plan, premiumLoading]);

  const todayDay = plan ? todayDayFrom(plan) : 1;
  const horizon = plan ? planHorizon(plan.duration_days, todayDay) : 1;
  const weeks = useMemo(
    () => (plan ? visibleWeeks({ horizonDays: horizon, todayDay }) : []),
    [horizon, plan, todayDay],
  );
  const activeWeek = useMemo(() => {
    const wanted = selectedWeek ?? weekIndex(Math.min(Math.max(1, todayDay), horizon));
    return weeks.find((week) => week.week === wanted) ?? weekBounds(wanted, horizon) ?? weeks[0] ?? null;
  }, [horizon, selectedWeek, todayDay, weeks]);
  const weekDayNumbers = activeWeek ? daysInWeek(activeWeek) : [];
  const generatedDays = useMemo(() => plan?.days.map((day) => day.day) ?? [], [plan]);
  const dayByNumber = useMemo(() => {
    const map = new Map<number, PlanDay>();
    plan?.days.forEach((day) => map.set(day.day, day));
    return map;
  }, [plan]);
  const showHorizonLock = Boolean(
    plan &&
      activeWeek &&
      !premiumLoading &&
      (horizonDenied || !hasPaidAccess) &&
      weekNeedsHorizonUnlock(activeWeek, plan.duration_days, todayDay),
  );
  const skippedWeek = Boolean(
    activeWeek && !showHorizonLock && weekWasSkipped(activeWeek, generatedDays, todayDay),
  );
  const contentIntent =
    (focusedDay != null ? dayByNumber.get(focusedDay)?.theme : undefined) ||
    dayByNumber.get(todayDay)?.theme ||
    (activeWeek
      ? weekDayNumbers.map((day) => dayByNumber.get(day)?.theme).find(Boolean)
      : undefined) ||
    plan?.name ||
    t.plan.title;
  const activeDay = focusedDay ?? (weekDayNumbers.includes(todayDay) ? todayDay : -1);
  const visibleDays = useMemo(() => {
    if (!plan || showHorizonLock || skippedWeek) return [];
    const numbers = focusedDay == null ? weekDayNumbers : [focusedDay];
    return numbers
      .map((day) => dayByNumber.get(day))
      .filter((day): day is PlanDay => day != null);
  }, [dayByNumber, focusedDay, plan, showHorizonLock, skippedWeek, weekDayNumbers]);
  const focusedMissing = focusedDay != null && !showHorizonLock && !skippedWeek && !dayByNumber.has(focusedDay);
  const canExtend = Boolean(
    plan &&
      !showHorizonLock &&
      !skippedWeek &&
      ((todayDay > plan.batch_generated_until && plan.batch_generated_until < plan.duration_days) ||
        (hasPaidAccess && todayDay > plan.duration_days && plan.duration_days < PLAN_HORIZON_DAYS)),
  );

  return (
    <ThemedView style={styles.flex}>
      <ScreenScaffold
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              horizonWatch.current = '';
              horizonKey.current = null;
              void load(true);
            }}
          />
        }>
        <ScreenHeader
          title={t.plan.title}
          subtitle={t.plan.subtitle}
          trailing={
            <Pressable
              accessibilityRole="button"
              onPress={() => setPickerOpen(true)}
              style={({ pressed }) => [styles.switchPlan, pressed && styles.pressed]}>
              <ThemedText type="smallBold" themeColor="accentWarm">
                {t.plan.switchPlan}
              </ThemedText>
            </Pressable>
          }
        />

        {plan && !loading ? (
          <SurfaceCard elevated style={styles.intentHero}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.intentLabel}>
              {activeWeek
                ? t.plan.weekLabel(activeWeek.week, activeWeek.startDay, activeWeek.endDay)
                : t.plan.dayProgress(Math.max(1, todayDay), progressTotal(plan.duration_days, todayDay))}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {t.plan.dayProgress(
                Math.min(Math.max(1, todayDay), PLAN_HORIZON_DAYS),
                progressTotal(plan.duration_days, todayDay),
              )}
            </ThemedText>
            <ThemedText type="screenTitle" style={styles.intentText}>
              {contentIntent}
            </ThemedText>
          </SurfaceCard>
        ) : null}

        {plan && !loading ? (
          <>
            <WeekStrip
              weeks={weeks}
              activeWeek={activeWeek?.week ?? 1}
              onSelect={(week) => {
                setSelectedWeek(week);
                setFocusedDay(null);
              }}
            />
            <DayStrip
              days={weekDayNumbers}
              todayDay={todayDay}
              activeDay={activeDay}
              onSelect={(day) => setFocusedDay((prev) => (prev === day ? null : day))}
            />
            {extending ? (
              <ThemedText type="small" themeColor="textSecondary" style={{ paddingHorizontal: Spacing.three }}>
                {t.daily.extending}
              </ThemedText>
            ) : null}
            {showHorizonLock ? (
              <SurfaceCard style={styles.lockCard}>
                <ThemedText type="smallBold">{t.plan.horizonLockTitle}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {t.plan.horizonLockBody}
                </ThemedText>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push('/paywall')}
                  style={({ pressed }) => [
                    styles.ctaButton,
                    { backgroundColor: theme.accentWarm, opacity: pressed ? 0.85 : 1 },
                  ]}>
                  <ThemedText type="smallBold" style={{ color: theme.onAccent }}>
                    {t.common.proCta}
                  </ThemedText>
                </Pressable>
              </SurfaceCard>
            ) : null}
            {skippedWeek ? (
              <ThemedText type="small" themeColor="textSecondary" style={{ paddingHorizontal: Spacing.three }}>
                {t.plan.weekSkipped}
              </ThemedText>
            ) : null}
            {focusedMissing ? (
              <ThemedText type="small" themeColor="textSecondary" style={{ paddingHorizontal: Spacing.three }}>
                {t.plan.weekEmpty}
              </ThemedText>
            ) : null}
            {canExtend ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => void load(true)}
                style={({ pressed }) => [
                  styles.ctaButton,
                  { backgroundColor: theme.tint, opacity: pressed ? 0.85 : 1, marginHorizontal: Spacing.three },
                ]}>
                <ThemedText type="smallBold" style={{ color: theme.onAccent }}>
                  {t.plan.extendCta}
                </ThemedText>
              </Pressable>
            ) : null}
          </>
        ) : null}

        {loading && (
          <ThemedView style={styles.centerBlock}>
            <ActivityIndicator size="large" color={theme.accentWarm} />
          </ThemedView>
        )}

        {!loading && error && (
          <ErrorBanner message={error} onRetry={() => void load()} retrying={refreshing} />
        )}

        {!loading && !error && !plan && (
          <SurfaceCard elevated style={styles.emptyState}>
            <ThemedText style={styles.centerText} themeColor="textSecondary">
              {t.plan.emptyBody}
            </ThemedText>
            <Pressable
              onPress={() => router.push('/')}
              style={({ pressed }) => [
                styles.ctaButton,
                { backgroundColor: theme.accentWarm },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" style={{ color: theme.onAccent }}>
                {t.plan.startChat}
              </ThemedText>
            </Pressable>
          </SurfaceCard>
        )}

        {!loading && !error && plan && (
          <PlanEventsSection
            planId={plan.id}
            planName={plan.name ?? t.events.planNameFallback}
            reloadKey={eventsReloadKey}
            onChanged={() => invalidateGunlukAkis()}
          />
        )}

        {!loading && !error && plan && (
          <ThemedView style={styles.daysWrapper}>
            {visibleDays.map((day) => (
              <DaySection
                key={day.day}
                day={day}
                plan={plan}
                relation={
                  day.day < todayDay ? 'past' : day.day === todayDay ? 'today' : 'future'
                }
                onEditTask={(task) => {
                  setAddDate(null);
                  setEditTarget({
                    task,
                    planStartDate: plan.start_date,
                    planDurationDays: plan.duration_days,
                  });
                }}
                onAddTask={(date) => {
                  setEditTarget(null);
                  setAddDate(date);
                }}
                onOpenTask={(taskId) =>
                  router.push({ pathname: '/plan-gorev', params: { taskId } } as unknown as Href)
                }
              />
            ))}
          </ThemedView>
        )}
      </ScreenScaffold>
      <PlanPickerSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPlanChanged={() => {
          horizonWatch.current = '';
          horizonKey.current = null;
          setSelectedWeek(null);
          setFocusedDay(null);
          invalidateGunlukAkis();
          void load();
        }}
        subscriptionStatus={subscriptionStatus}
      />
      <PlanTaskEditor
        target={editTarget}
        addDate={addDate}
        onClose={() => {
          setEditTarget(null);
          setAddDate(null);
        }}
        onChanged={() => {
          invalidateGunlukAkis();
          void load(true);
        }}
      />
    </ThemedView>
  );
}

function WeekStrip({
  weeks,
  activeWeek,
  onSelect,
}: {
  weeks: PlanWeek[];
  activeWeek: number;
  onSelect: (week: number) => void;
}) {
  const { t } = useLocale();
  const theme = useTheme();
  const scroller = useRef<ScrollView>(null);
  useEffect(() => {
    const index = weeks.findIndex((week) => week.week === activeWeek);
    if (index <= 0) return;
    scroller.current?.scrollTo({ x: Math.max(0, index * 108 - 24), animated: false });
  }, [activeWeek, weeks]);
  return (
    <ScrollView
      ref={scroller}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.dayStrip}>
      {weeks.map((week) => {
        const selected = week.week === activeWeek;
        return (
          <Pressable
            key={week.week}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onSelect(week.week)}
            style={({ pressed }) => [
              styles.weekChip,
              {
                borderColor: selected ? theme.tint : theme.border,
                backgroundColor: selected ? theme.backgroundSelected : theme.backgroundElement,
                opacity: pressed ? 0.85 : 1,
              },
            ]}>
            <ThemedText type="smallBold" themeColor={selected ? 'tint' : 'text'}>
              {t.plan.weekChip(week.week)}
            </ThemedText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function DayStrip({
  days,
  todayDay,
  activeDay,
  onSelect,
}: {
  days: number[];
  todayDay: number;
  activeDay: number;
  onSelect: (day: number) => void;
}) {
  const theme = useTheme();
  const scroller = useRef<ScrollView>(null);
  useEffect(() => {
    const index = days.indexOf(todayDay);
    if (index <= 0) return;
    scroller.current?.scrollTo({ x: Math.max(0, index * (44 + Spacing.two) - Spacing.four), animated: false });
  }, [days, todayDay]);
  return (
    <ScrollView
      ref={scroller}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.dayStrip}>
      {days.map((day) => {
        const isToday = day === todayDay;
        const isActive = day === activeDay;
        const isPast = day < todayDay;
        return (
          <Pressable
            key={day}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            onPress={() => onSelect(day)}
            style={({ pressed }) => [
              styles.dayChip,
              {
                borderColor: isToday ? theme.tint : theme.border,
                backgroundColor: isToday
                  ? theme.tint
                  : isActive
                    ? theme.backgroundSelected
                    : theme.backgroundElement,
                opacity: isPast && !isActive ? 0.55 : pressed ? 0.85 : 1,
              },
              isToday ? styles.dayChipToday : null,
            ]}>
            <ThemedText
              type="smallBold"
              themeColor={isPast && !isToday ? 'textSecondary' : 'text'}
              style={isToday ? { color: theme.onAccent } : undefined}>
              {day}
            </ThemedText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function DaySection({
  day,
  plan,
  relation,
  onEditTask,
  onAddTask,
  onOpenTask,
}: {
  day: PlanDay;
  plan: Plan;
  relation: 'past' | 'today' | 'future';
  onEditTask: (task: Task) => void;
  onAddTask: (date: string) => void;
  onOpenTask: (taskId: string) => void;
}) {
  const theme = useTheme();
  const { t } = useLocale();
  const dayDate = addDaysIso(plan.start_date, day.day - 1);
  // faz8.13/8: geçmiş gün soldurması hafifletildi (0.72 → 0.9) — görseller soluk görünmesin.
  return (
    <ThemedView style={[styles.daySection, relation === 'past' ? { opacity: 0.9 } : null]}>
      <View style={styles.dayHeading}>
        <ThemedText type="smallBold" themeColor={relation === 'today' ? 'tint' : 'text'}>
          Gün {day.day}
          {day.theme ? ` — ${day.theme}` : ''}
        </ThemedText>
        {relation === 'today' ? (
          <View style={[styles.todayRing, { borderColor: theme.tint }]}>
            <ThemedText type="smallBold" themeColor="tint">
              Bugün
            </ThemedText>
          </View>
        ) : null}
      </View>
      <ThemedView style={styles.taskList}>
        {(day.tasks ?? []).map((task) => (
          <VisionTaskCard
            key={task.id}
            task={task}
            planStartDate={plan.start_date}
            onLongPressEdit={() => onEditTask(task)}
            onOpen={() => onOpenTask(task.id)}
          />
        ))}
      </ThemedView>
      {relation !== 'past' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.plan.addTask}
          onPress={() => onAddTask(dayDate)}
          style={({ pressed }) => [
            styles.addTaskButton,
            {
              borderColor: theme.border,
              backgroundColor: theme.surfaceMuted,
              opacity: pressed ? 0.8 : 1,
            },
          ]}>
          <ThemedText type="smallBold" themeColor="tint">
            + {t.plan.addTask}
          </ThemedText>
        </Pressable>
      ) : null}
    </ThemedView>
  );
}

function VisionTaskCard({
  task,
  planStartDate,
  onLongPressEdit,
  onOpen,
}: {
  task: Task;
  planStartDate: string;
  onLongPressEdit: () => void;
  onOpen: () => void;
}) {
  const theme = useTheme();
  const { t } = useLocale();
  const scheme = useColorScheme();
  const scrim = scheme === 'dark' ? ImageScrim.dark : ImageScrim.light;
  const editable = isTaskEditable(task, planStartDate);
  const coverUri = safeImageUri(task.image_url);
  const categories = task.categories ?? [];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t.plan.openSteps}
      accessibilityHint={editable ? t.common.longPressEdit : undefined}
      delayLongPress={380}
      onPress={onOpen}
      onLongPress={() => {
        if (!editable) {
          showAlert(t.plan.taskActionsTitle, t.plan.notEditable);
          return;
        }
        onLongPressEdit();
      }}>
      <SurfaceCard elevated style={styles.taskCard}>
        {coverUri ? (
          <ThemedView style={styles.imageWrapper}>
            <Image source={{ uri: coverUri }} style={styles.taskImage} contentFit="cover" />
            {/* faz8.13/8: yalnız alt başlık bandı — görselin geri kalanı canlı. */}
            <View
              pointerEvents="none"
              style={[styles.scrimBandBottom, { backgroundColor: scrim[1] }]}
            />
            <View style={styles.coverTitleWrap}>
              <ThemedText style={[styles.coverTitle, { color: theme.onAccent }]} numberOfLines={2}>
                {task.title}
              </ThemedText>
            </View>
            {!!task.image_attribution && (
              <Pressable
                accessibilityLabel={t.common.photoCredit}
                accessibilityHint={t.common.photoCreditHint}
                hitSlop={8}
                onLongPress={() => {
                  Alert.alert(
                    t.common.photoCredit,
                    task.image_attribution,
                    task.image_attribution_url
                      ? [
                          { text: t.common.cancel, style: 'cancel' },
                          {
                            text:
                              task.image_source === 'gemini_nano_banana'
                                ? t.common.openSource
                                : t.common.openUnsplash,
                            onPress: () => void Linking.openURL(task.image_attribution_url),
                          },
                        ]
                      : [{ text: t.common.cancel, style: 'cancel' }],
                  );
                }}
                style={styles.attributionBadge}>
                <ThemedText type="smallBold" style={[styles.attributionIcon, { color: theme.onAccent }]}>
                  ⓘ
                </ThemedText>
              </Pressable>
            )}
          </ThemedView>
        ) : null}
        <ThemedView style={styles.taskInfo}>
          {!coverUri ? (
            <ThemedText type="default" style={styles.coverTitlePlain}>
              {task.title}
            </ThemedText>
          ) : null}
          {!!task.tiny_version && (
            <ThemedText type="small" themeColor="textSecondary">
              {t.daily.tinyPrefix}: {task.tiny_version}
            </ThemedText>
          )}
          <ThemedView style={styles.tagRow}>
            {categories.map((c) => (
              <CategoryBadge key={c} label={c} />
            ))}
          </ThemedView>
        </ThemedView>
      </SurfaceCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  intentHero: {
    gap: Spacing.two,
  },
  intentLabel: {
    letterSpacing: 0.8,
  },
  intentText: {
    fontFamily: Fonts.serif,
  },
  switchPlan: {
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
  },
  dayStrip: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  dayChip: {
    minWidth: 44,
    minHeight: 44,
    borderRadius: Radii.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
  },
  dayChipToday: {
    borderRadius: Radii.small,
    borderWidth: 0,
  },
  weekChip: {
    minHeight: 44,
    borderRadius: Radii.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  lockCard: {
    gap: Spacing.two,
  },
  dayHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  todayRing: {
    borderWidth: 1.5,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  centerText: {
    textAlign: 'center',
  },
  centerBlock: {
    paddingVertical: Spacing.six,
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    gap: Spacing.four,
    paddingVertical: Spacing.five,
  },
  ctaButton: {
    borderRadius: Radii.pill,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.five,
    ...(Shadows.soft ?? {}),
  },
  pressed: {
    opacity: 0.8,
  },
  daysWrapper: {
    gap: Spacing.five,
    paddingBottom: Spacing.five,
  },
  daySection: {
    gap: Spacing.three,
  },
  taskList: {
    gap: Spacing.three,
  },
  addTaskButton: {
    minHeight: 44,
    borderRadius: Radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  taskCard: {
    padding: 0,
    overflow: 'hidden',
  },
  taskImage: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  imageWrapper: {
    position: 'relative',
  },
  scrimBandBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '34%',
  },
  coverTitleWrap: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    bottom: Spacing.three,
  },
  coverTitle: {
    fontFamily: Fonts.serif,
    fontSize: 20,
    lineHeight: 26,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  coverTitlePlain: {
    fontFamily: Fonts.serif,
    fontSize: 18,
    lineHeight: 24,
  },
  attributionBadge: {
    position: 'absolute',
    right: Spacing.two,
    bottom: Spacing.two,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  attributionIcon: {
    fontSize: 14,
    lineHeight: 16,
  },
  taskInfo: {
    padding: Spacing.three,
    gap: Spacing.one,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
    marginTop: Spacing.one,
  },
});

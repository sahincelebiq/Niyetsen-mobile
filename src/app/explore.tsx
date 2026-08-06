import { useCallback, useMemo, useState } from 'react';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
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
import { PlanPickerSheet } from '@/components/project-sheets';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { CategoryBadge } from '@/components/ui/category-badge';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SurfaceCard } from '@/components/ui/surface-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts, ImageScrim, Radii, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError, getCurrentPlan, Plan, PlanDay, Task } from '@/lib/api';
import { addDaysIso } from '@/lib/plan-dates';
import { showAlert } from '@/lib/web-alert';
import { useLocale } from '@/providers/locale-provider';
import { useSubscription } from '@/providers/subscription-provider';

function calendarDayNumber(startDate: string): number {
  const start = new Date(`${startDate}T12:00:00`);
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Math.floor((today.getTime() - start.getTime()) / 86_400_000) + 1;
}

export default function PlanScreen() {
  const { t } = useLocale();
  const { status: subscriptionStatus } = useSubscription();
  const theme = useTheme();
  const router = useRouter();

  const [plan, setPlan] = useState<Plan | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusedDay, setFocusedDay] = useState<number | null>(null);
  const [editTarget, setEditTarget] = useState<PlanTaskEditorTarget | null>(null);
  const [addDate, setAddDate] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      setPlan(await getCurrentPlan());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Plan yüklenemedi.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const contentIntent = plan?.days[0]?.theme || plan?.name || 'Planım';
  const todayDay = plan ? calendarDayNumber(plan.start_date) : 1;
  const activeDay = focusedDay ?? Math.max(1, Math.min(todayDay, plan?.days.length ?? 1));
  const visibleDays = useMemo(() => {
    if (!plan) return [];
    if (focusedDay === null) return plan.days;
    return plan.days.filter((d) => d.day === focusedDay);
  }, [focusedDay, plan]);

  return (
    <ThemedView style={styles.flex}>
      <ScreenScaffold
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />
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
          <View style={[styles.intentHero, { backgroundColor: theme.tint }]}>
            <ThemedText
              type="smallBold"
              style={[styles.intentLabel, { color: theme.onAccent, opacity: 0.8 }]}>
              BU AYIN BÜYÜK NİYETİ
            </ThemedText>
            <ThemedText style={[styles.intentText, { color: theme.onAccent }]}>
              {contentIntent}
            </ThemedText>
          </View>
        ) : null}

        {plan && !loading ? (
          <DayStrip
            days={plan.days}
            todayDay={todayDay}
            activeDay={activeDay}
            onSelect={(day) => setFocusedDay((prev) => (prev === day ? null : day))}
          />
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
              />
            ))}
          </ThemedView>
        )}
      </ScreenScaffold>
      <PlanPickerSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPlanChanged={() => void load()}
        subscriptionStatus={subscriptionStatus}
      />
      <PlanTaskEditor
        target={editTarget}
        addDate={addDate}
        onClose={() => {
          setEditTarget(null);
          setAddDate(null);
        }}
        onChanged={() => void load(true)}
      />
    </ThemedView>
  );
}

function DayStrip({
  days,
  todayDay,
  activeDay,
  onSelect,
}: {
  days: PlanDay[];
  todayDay: number;
  activeDay: number;
  onSelect: (day: number) => void;
}) {
  const theme = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.dayStrip}>
      {days.map((day) => {
        const isToday = day.day === todayDay;
        const isActive = day.day === activeDay;
        const isPast = day.day < todayDay;
        return (
          <Pressable
            key={day.day}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            onPress={() => onSelect(day.day)}
            style={({ pressed }) => [
              styles.dayChip,
              {
                borderColor: isToday ? theme.tint : theme.border,
                backgroundColor: isActive ? theme.backgroundSelected : theme.backgroundElement,
                opacity: isPast && !isActive ? 0.55 : pressed ? 0.85 : 1,
              },
              isToday ? styles.dayChipToday : null,
            ]}>
            <ThemedText
              type="smallBold"
              themeColor={isToday ? 'tint' : isPast ? 'textSecondary' : 'text'}>
              {day.day}
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
}: {
  day: PlanDay;
  plan: Plan;
  relation: 'past' | 'today' | 'future';
  onEditTask: (task: Task) => void;
  onAddTask: (date: string) => void;
}) {
  const theme = useTheme();
  const { t } = useLocale();
  const dayDate = addDaysIso(plan.start_date, day.day - 1);
  return (
    <ThemedView style={[styles.daySection, relation === 'past' ? { opacity: 0.72 } : null]}>
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
        {day.tasks.map((task) => (
          <VisionTaskCard
            key={task.id}
            task={task}
            planStartDate={plan.start_date}
            onLongPressEdit={() => onEditTask(task)}
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
}: {
  task: Task;
  planStartDate: string;
  onLongPressEdit: () => void;
}) {
  const theme = useTheme();
  const { t } = useLocale();
  const scheme = useColorScheme();
  const scrim = scheme === 'dark' ? ImageScrim.dark : ImageScrim.light;
  const editable = isTaskEditable(task, planStartDate);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={editable ? 'Uzun basarak taşı, düzenle veya sil' : undefined}
      delayLongPress={380}
      onLongPress={() => {
        if (!editable) {
          showAlert(t.plan.taskActionsTitle, t.plan.notEditable);
          return;
        }
        onLongPressEdit();
      }}>
      <SurfaceCard elevated style={styles.taskCard}>
        {!!task.image_url && (
          <ThemedView style={styles.imageWrapper}>
            <Image source={{ uri: task.image_url }} style={styles.taskImage} contentFit="cover" />
            <View pointerEvents="none" style={[styles.scrimBand, { backgroundColor: scrim[0] }]} />
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
                accessibilityLabel="Fotoğraf atfı"
                accessibilityHint="Uzun basarak fotoğrafçı bilgisini gör"
                hitSlop={8}
                onLongPress={() => {
                  Alert.alert(
                    'Fotoğraf atfı',
                    task.image_attribution,
                    task.image_attribution_url
                      ? [
                          { text: 'Kapat', style: 'cancel' },
                          {
                            text:
                              task.image_source === 'gemini_nano_banana'
                                ? 'Kaynağı aç'
                                : 'Unsplash’ta aç',
                            onPress: () => void Linking.openURL(task.image_attribution_url),
                          },
                        ]
                      : [{ text: 'Kapat', style: 'cancel' }],
                  );
                }}
                style={styles.attributionBadge}>
                <ThemedText type="smallBold" style={styles.attributionIcon}>
                  ⓘ
                </ThemedText>
              </Pressable>
            )}
          </ThemedView>
        )}
        <ThemedView style={styles.taskInfo}>
          {!task.image_url ? (
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
            {task.categories.map((c) => (
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
    borderRadius: Radii.large,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  intentLabel: {
    letterSpacing: 1.1,
  },
  intentText: {
    fontSize: 22,
    lineHeight: 30,
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
    borderWidth: 2,
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
  scrimBand: {
    ...StyleSheet.absoluteFillObject,
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
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  attributionIcon: {
    color: '#fff',
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

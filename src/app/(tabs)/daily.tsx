import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import { type Href, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
  type ListRenderItem,
} from 'react-native';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLocale } from '@/providers/locale-provider';
import { CountUpText } from '@/components/count-up-text';
import { ErrorBanner } from '@/components/error-banner';
import { CompletionMark } from '@/components/gunluk/completion-mark';
import { DailySkeleton } from '@/components/gunluk/daily-skeleton';
import { EventsTimeline } from '@/components/gunluk/events-timeline';
import {
  DayCompleteCard,
  DayReviewCard,
  NextStepCard,
  type NextStep,
} from '@/components/gunluk/next-step-card';
import { PlanAgentSheet } from '@/components/plan-agent-sheet';
import { ProgressRing } from '@/components/gunluk/progress-ring';
import { LeafConfetti } from '@/components/leaf-confetti';
import {
  isTaskEditable,
  PlanTaskEditor,
  type PlanTaskEditorTarget,
} from '@/components/plan-task-editor';
import { CategoryBadge } from '@/components/ui/category-badge';
import { SurfaceCard } from '@/components/ui/surface-card';
import { useConsentPreferences } from '@/components/consent-gate';
import { MysticPanel, useMysticPanel } from '@/components/mystic-panel';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  ImageScrim,
  MaxContentWidth,
  Motion,
  Radii,
  Spacing,
} from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useDayChange, useNowMinutes } from '@/hooks/use-day-change';
import { useGunlukAkis } from '@/hooks/use-gunluk-akis';
import { useScreenInsets } from '@/hooks/use-screen-insets';
import { useWarmFocusReload } from '@/hooks/use-warm-focus-reload';
import { useCompanionAnimal } from '@/hooks/use-companion-animal';
import { useTheme } from '@/hooks/use-theme';
import { trackEvent } from '@/lib/analytics';
import { safeImageUri } from '@/lib/safe-image-uri';
import {
  ApiError,
  type DailyEventItem,
  ensureTodayPlan,
  excuseTask,
  getCurrentPlan,
  getState,
  getTaskSteps,
  isPaywallError,
  type ProofResult,
  saveTaskSteps,
  type Task,
  type TaskStep,
  uploadTaskProof,
} from '@/lib/api';
import { dailyEmptyMode, resolveAgentPlanId } from '@/lib/daily-feed';
import {
  completeEventOptimistic,
  getGunlukAkis,
  invalidateGunlukAkis,
  refreshGunlukAkis,
  rolloverGunlukAkisIfNeeded,
} from '@/lib/gunluk-akis';
import { shouldShowDailySkeleton } from '@/lib/gunluk-akis-cache';
import { DailyEventCard } from '@/components/plan-event-card';
import {
  awardedPointsFromMessage,
  pointsForCompletion,
  ScoringRules,
} from '@/constants/scoring';
import { emitGorevTamamlandi, recordServerState } from '@/lib/gamification';
import { getPushStatus } from '@/lib/push-notifications';
import { CacheKeys } from '@/lib/query-cache';
import { useAuth } from '@/providers/auth-provider';
import {
  addTaskToCalendar,
  scheduleTaskNotification,
  supportsWillpowerReminder,
} from '@/lib/task-reminders';
import { showAlert } from '@/lib/web-alert';
import { hhmmToMinutes } from '@/lib/zaman';
import { useProfile } from '@/providers/profile-provider';

type Outcome = { tone: 'success' | 'danger'; message: string };

type DailyTask = Task & {
  plan_name: string;
  plan_id: string;
  steps?: TaskStep[];
};

export default function DailyTasksScreen() {
  const { t } = useLocale();
  const theme = useTheme();
  const router = useRouter();
  const { profile } = useProfile();
  const { user } = useAuth();
  const { syncStreak } = useCompanionAnimal();
  const { status: consentStatus } = useConsentPreferences();
  const cameraRef = useRef<CameraView>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  // Tek doğruluk kaynağı: gün servisi (önbellek + retry + optimistic burada).
  const akis = useGunlukAkis();
  const nowMinutes = useNowMinutes();
  const [yesterdayMisses, setYesterdayMisses] = useState(0);
  const [showPushHint, setShowPushHint] = useState(false);
  const autoExtendRef = useRef(false);
  const [cameraTask, setCameraTask] = useState<DailyTask | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [extending, setExtending] = useState(false);
  const [extensionError, setExtensionError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [outcomes, setOutcomes] = useState<Record<string, Outcome>>({});
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<PlanTaskEditorTarget | null>(null);
  const [agentOpen, setAgentOpen] = useState(false);
  const [agentSeed, setAgentSeed] = useState<string | null>(null);
  const [agentPlanId, setAgentPlanId] = useState<string | null>(null);
  const [stepMap, setStepMap] = useState<Record<string, TaskStep[]>>({});
  // faz8.13/2a: mistiğin yeni evi — Bugün başlığındaki ☾ rozeti bu paneli açar.
  const mysticPanel = useMysticPanel();
  const screenInsets = useScreenInsets();

  const tasks = useMemo<DailyTask[]>(
    () =>
      (akis.data?.items ?? []).map((item) => ({
        ...item.task,
        plan_name: item.plan_name,
        plan_id: item.plan_id,
        steps: item.steps,
      })),
    [akis.data],
  );
  const taskStepKey = tasks.map((task) => `${task.id}:${task.steps ? 'y' : 'n'}`).join('|');

  useEffect(() => {
    let cancelled = false;
    const known: Record<string, TaskStep[]> = {};
    const missing: DailyTask[] = [];
    for (const task of tasks) {
      if (task.steps) known[task.id] = task.steps;
      else missing.push(task);
    }
    if (Object.keys(known).length > 0) {
      setStepMap((current) => ({ ...current, ...known }));
    }
    if (missing.length === 0) return;
    void Promise.all(
      missing.map(async (task) => {
        try {
          const response = await getTaskSteps(task.id);
          return [task.id, response.steps] as const;
        } catch {
          return [task.id, [] as TaskStep[]] as const;
        }
      }),
    ).then((rows) => {
      if (cancelled) return;
      setStepMap((current) => {
        const next = { ...current };
        for (const [id, steps] of rows) next[id] = steps;
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
    // taskStepKey görev kimliğini ve adımın gömülü olup olmadığını taşır.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskStepKey]);
  const events = useMemo<DailyEventItem[]>(() => akis.data?.events ?? [], [akis.data]);

  const load = useCallback(
    async (refresh = false) => {
      if (refresh) autoExtendRef.current = false;
      setExtensionError(null);
      await refreshGunlukAkis(getGunlukAkis().data ? 'silent' : 'full');
      const { data: current, error: flowError } = getGunlukAkis();

      // Gemini uzatması (90 sn) tam ekran spinner'da tutmasın: ilk cevap
      // zaten ekranda; uzatma sessizce arkada döner. Akış hatalıysa (örn.
      // çevrimdışı) uzatma denenmez — önbellekteki bayat bayrakla istek atmaz.
      if (!flowError && current?.needs_extension && !autoExtendRef.current) {
        autoExtendRef.current = true;
        setExtending(true);
        try {
          await ensureTodayPlan();
          await refreshGunlukAkis('silent');
        } catch (value) {
          // Otomatik deneme ekranı paywall'a atmaz (kapı içeride). Mesaj banner'da
          // kalır; kullanıcı "haftayı yükle"ye basınca paywall açılır.
          setExtensionError(
            value instanceof ApiError ? value.message : t.daily.generateFailed,
          );
        } finally {
          setExtending(false);
        }
      }
      // Zincir özeti + bildirim ipucu kendi başına izole: biri düşse bile
      // ana akış etkilenmez (madde C — bölümsel hata).
      try {
        const state = await getState();
        setYesterdayMisses(state.yesterday_silent_misses ?? 0);
        syncStreak(state.streak_len);
        recordServerState(state);
      } catch {
        setYesterdayMisses(0);
      }
      if (user?.id) {
        try {
          const push = await getPushStatus(user.id);
          setShowPushHint(push.supported && !push.enabled);
        } catch {
          setShowPushHint(false);
        }
      }
    },
    [router, syncStreak, user?.id, t],
  );

  async function handleExtendPlan() {
    if (extending) return;
    setExtending(true);
    setExtensionError(null);
    try {
      await ensureTodayPlan();
      await refreshGunlukAkis('silent');
    } catch (value) {
      if (isPaywallError(value)) {
        router.push('/paywall' as Href);
        return;
      }
      setExtensionError(
        value instanceof ApiError ? value.message : t.daily.generateFailed,
      );
    } finally {
      setExtending(false);
    }
  }

  useWarmFocusReload(load, akis.data !== null);

  // Gece yarısı geçişi (madde B): gün kayınca store sıfırlanır + yeni gün
  // çekilir; ardından load uzatma/zincir orkestrasyonunu yeni güne uygular.
  useDayChange(() => {
    rolloverGunlukAkisIfNeeded();
    void load(true);
  });
  const setOutcome = useCallback((taskId: string, outcome: Outcome) => {
    setOutcomes((current) => ({ ...current, [taskId]: outcome }));
  }, []);

  const completeEvent = useCallback(
    async (event: DailyEventItem) => {
      const key = `event:${event.occurrence_id}`;
      setBusy(key);
      try {
        // Optimistic: kart anında "Tamamlandı"ya döner; red gelirse store geri alır.
        const response = await completeEventOptimistic(event.occurrence_id);
        if (typeof response.streak_len === 'number') syncStreak(response.streak_len);
        // Puan sunucudan ("+N" mesajı); yoksa kural tablosu. Metin kullanıcı dilinde.
        const puan = awardedPointsFromMessage(response.message, pointsForCompletion('plan_etkinlik'));
        const sonuc = await emitGorevTamamlandi({
          olayId: `occurrence:${event.occurrence_id}`,
          kaynak: 'plan_etkinlik',
          planId: event.plan_id,
          // 04 sözleşmesi: DailyEventItem `plan_adimi_id` taşımaya başlayınca buraya bağlanır.
          planAdimiId: null,
          hedefId: event.event_id,
          kategoriler: event.categories,
          tamamlandiAt: new Date().toISOString(),
          puan,
          zincir: response.streak_len ?? null,
        });
        setOutcome(key, {
          tone: 'success',
          message: sonuc.milestone
            ? `${t.events.completed(puan)} ${t.daily.milestoneReached(sonuc.milestone)}`
            : t.events.completed(puan),
        });
        void trackEvent('plan_event_completed', { plan_id: event.plan_id, recurrence: event.recurrence });
      } catch (value) {
        const status = value instanceof ApiError ? value.status : 0;
        setOutcome(key, {
          tone: status === 409 ? 'success' : 'danger',
          message:
            status === 409
              ? t.events.alreadyDone
              : status === 400
                ? t.events.notYet
                : value instanceof ApiError
                  ? value.message
                  : t.common.errorGeneric,
        });
        if (status === 400) invalidateGunlukAkis();
      } finally {
        setBusy(null);
      }
    },
    [setOutcome, syncStreak, t],
  );

  async function openAgent(seed: string) {
    const known = resolveAgentPlanId({
      activePlanId: akis.data?.active_plan_id,
      taskPlanId: tasks[0]?.plan_id,
      eventPlanId: events[0]?.plan_id,
    });
    let planId = known;
    if (!planId) {
      try {
        planId = (await getCurrentPlan())?.id ?? null;
      } catch {
        planId = null;
      }
    }
    if (!planId) {
      router.push('/(tabs)' as Href);
      return;
    }
    setAgentPlanId(planId);
    setAgentSeed(seed);
    setAgentOpen(true);
  }

  async function toggleStep(task: DailyTask, stepId: string) {
    const current = stepMap[task.id] ?? task.steps ?? [];
    const next = current.map((step) =>
      step.id === stepId ? { ...step, done: !step.done } : step,
    );
    const key = `step:${task.id}:${stepId}`;
    setStepMap((map) => ({ ...map, [task.id]: next }));
    setBusy(key);
    try {
      const saved = await saveTaskSteps(task.id, next);
      setStepMap((map) => ({ ...map, [task.id]: saved.steps }));
    } catch (value) {
      setStepMap((map) => ({ ...map, [task.id]: current }));
      setOutcome(task.id, {
        tone: 'danger',
        message: value instanceof Error ? value.message : t.common.errorGeneric,
      });
    } finally {
      setBusy(null);
    }
  }

  async function openCamera(task: DailyTask) {
    if (!consentStatus.proof_photo_processing.accepted) {
      setOutcome(task.id, {
        tone: 'danger',
        message: t.daily.consentPhotoOff,
      });
      router.push('/settings');
      return;
    }
    if (Platform.OS === 'web') {
      setOutcome(task.id, {
        tone: 'danger',
        message: t.daily.cameraWeb,
      });
      return;
    }
    const permission = cameraPermission?.granted
      ? cameraPermission
      : await requestCameraPermission();
    if (!permission?.granted) {
      setOutcome(task.id, {
        tone: 'danger',
        message: permission?.canAskAgain === false
          ? t.daily.cameraDenied
          : t.daily.cameraRequired,
      });
      return;
    }
    setCameraError(null);
    setCameraReady(false);
    setCameraTask(task);
    // Not: önceden burada İrade Modu aktifken kamera açılırken sessizce bildirim
    // kuruluyordu — kameradan bağımsız, kafa karıştıran bir yan etkiydi. Hatırlatıcı
    // kurma işlemi artık yalnız kartın "Hatırlat" aksiyonundan yapılır.
  }

  async function captureAndUpload() {
    if (!cameraTask || !cameraRef.current || !cameraReady) return;
    const task = cameraTask;
    setBusy(`proof:${task.id}`);
    try {
      const picture = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        imageType: 'jpg',
        skipProcessing: false,
      });
      if (!picture?.uri) throw new Error(t.daily.photoFailed);
      setCameraTask(null);
      const result = await uploadTaskProof(task.id, picture.uri);
      void trackEvent('proof_uploaded', {
        task_id: task.id,
        approved: result.approved,
        confidence: result.confidence,
        attempt_no: result.attempt_no,
      });
      if (result.approved) {
        void trackEvent('task_completed', { task_id: task.id, via: 'proof' });
        const puan = awardedPointsFromMessage(result.reason, pointsForCompletion('plan_gorev'));
        const sonuc = await emitGorevTamamlandi({
          olayId: `proof:${result.proof_id ?? task.id}`,
          kaynak: 'plan_gorev',
          planId: task.plan_id,
          planAdimiId: null,
          hedefId: task.id,
          kategoriler: task.categories,
          tamamlandiAt: new Date().toISOString(),
          puan,
        });
        showProofOutcome(task, result, puan, sonuc.milestone);
        // Olay ['gun'] anahtarını bayatlattı → useWarmFocusReload zaten sessiz yeniledi.
        if (!sonuc.applied) await load(true);
      } else {
        showProofOutcome(task, result, 0, null);
        await load(true);
      }
    } catch (value) {
      setCameraTask(null);
      let message =
        value instanceof ApiError
          ? value.message
          : value instanceof Error
            ? value.message
            : t.daily.proofFailed;
      if (value instanceof ApiError && value.status === 409) {
        message = t.daily.proofBusy;
      }
      setOutcome(task.id, {
        tone: 'danger',
        message,
      });
    } finally {
      setBusy(null);
    }
  }

  function showProofOutcome(
    task: Task,
    result: ProofResult,
    puan: number,
    milestone: number | null,
  ) {
    const declaration = result.accepted_by_declaration ? t.daily.declarationAccepted : '';
    const celebration = milestone ? ` ${t.daily.milestoneReached(milestone)}` : '';
    setOutcome(task.id, {
      tone: result.approved ? 'success' : 'danger',
      message: result.approved
        ? `${t.daily.proofApproved(puan, result.confidence)}${declaration}${celebration}`
        : `${result.reason} Güven ${result.confidence}/100 · deneme ${result.attempt_no}/3. Yeni bir kare deneyebilirsin.`,
    });
  }

  async function performExcuse(task: Task) {
    setBusy(`excuse:${task.id}`);
    try {
      const response = await excuseTask(task.id);
      setOutcome(task.id, { tone: 'success', message: response.message });
      await load(true);
    } catch (value) {
      setOutcome(task.id, {
        tone: 'danger',
        message: value instanceof Error ? value.message : t.common.errorGeneric,
      });
    } finally {
      setBusy(null);
    }
  }

  function confirmExcuse(task: Task) {
    const message = t.daily.excuseBody(Math.abs(ScoringRules.mazeret));
    if (Platform.OS === 'web') {
      if (globalThis.confirm?.(message)) void performExcuse(task);
      return;
    }
    Alert.alert(t.daily.excuse, message, [
      { text: t.common.cancel, style: 'cancel' },
      { text: t.daily.excuse, onPress: () => void performExcuse(task) },
    ]);
  }

  async function runDeviceAction(task: Task, action: 'notification' | 'calendar') {
    setBusy(`${action}:${task.id}`);
    try {
      const result =
        action === 'notification'
          ? await scheduleTaskNotification(task, profile?.notif_hour ?? 8, profile?.notif_minute ?? 0)
          : await addTaskToCalendar(task, profile?.notif_hour ?? 8, profile?.notif_minute ?? 0);
      setOutcome(task.id, { tone: result.ok ? 'success' : 'danger', message: result.message });
    } catch (value) {
      setOutcome(task.id, {
        tone: 'danger',
        message: value instanceof Error ? value.message : t.daily.deviceFailed,
      });
    } finally {
      setBusy(null);
    }
  }

  const openProofForTask = useCallback(
    (taskId: string) => {
      const task = tasks.find((item) => item.id === taskId);
      if (task) void openCamera(task);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tasks, consentStatus, cameraPermission],
  );

  const renderTask = useCallback<ListRenderItem<DailyTask>>(
    ({ item: task, index }) => {
      const firstPendingId = tasks.find((item) => item.status === 'pending')?.id;
      const emphasis: 'hero' | 'lifted' | 'muted' =
        task.status === 'done' ||
        task.status === 'missed_silent' ||
        task.status === 'missed_excused'
          ? 'muted'
          : task.id === firstPendingId
            ? 'hero'
            : 'lifted';
      return (
        <Animated.View
          entering={FadeInDown.delay(Math.min(index, 5) * Motion.stagger)
            .duration(Motion.base)
            .reduceMotion(ReduceMotion.System)}>
          <TaskCard
            task={task}
            steps={stepMap[task.id] ?? task.steps ?? []}
            outcome={outcomes[task.id]}
            busy={busy}
            emphasis={emphasis}
            iradeActive={!!profile?.irade_modu_active}
            onOpenCamera={() => void openCamera(task)}
            onToggleStep={(stepId) => void toggleStep(task, stepId)}
            onExcuse={() => confirmExcuse(task)}
            onDeviceAction={(action) => void runDeviceAction(task, action)}
            onOpenSteps={() =>
              router.push({ pathname: '/plan-gorev', params: { taskId: task.id } } as unknown as Href)
            }
            onLongPressEdit={() => {
              if (!isTaskEditable(task)) {
                showAlert(t.plan.taskActionsTitle, t.plan.notEditable);
                return;
              }
              setEditTarget({ task });
            }}
          />
        </Animated.View>
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [busy, outcomes, profile?.irade_modu_active, consentStatus, cameraPermission, tasks, stepMap, t],
  );

  const doneTasks = tasks.filter((task) => task.status === 'done').length;
  const doneEvents = events.filter((event) => event.status === 'done').length;
  const totalCount = tasks.length + events.length;
  const doneCount = doneTasks + doneEvents;
  const dayProgress = totalCount === 0 ? 0 : doneCount / totalCount;
  const dayComplete = totalCount > 0 && doneCount === totalCount;

  // Sıradaki adım (E.2): saati gelen/geçen etkinlik önce, yoksa en yakın
  // gelecek etkinlik (geri sayımlı); etkinlik yoksa ilk bekleyen görev.
  const nextStep = useMemo<NextStep | null>(() => {
    if (dayComplete) return null;
    const pending = events
      .filter((event) => event.status === 'pending')
      .map((event) => ({ event, mins: hhmmToMinutes(event.scheduled_time) ?? 0 }))
      .sort((a, b) => a.mins - b.mins);
    if (pending.length > 0) {
      const passed = pending.filter((item) => item.mins <= nowMinutes);
      const chosen = passed.length > 0 ? passed[passed.length - 1] : pending[0];
      return {
        kind: 'event',
        event: chosen.event,
        minutesUntil: chosen.mins - nowMinutes,
      };
    }
    const firstTask = tasks.find((task) => task.status === 'pending');
    if (firstTask) {
      return {
        kind: 'task',
        id: firstTask.id,
        title: firstTask.title,
        durationMin: firstTask.duration_min,
        planName: firstTask.plan_name,
      };
    }
    return null;
  }, [dayComplete, events, nowMinutes, tasks]);

  const showSkeleton = shouldShowDailySkeleton(akis);
  const hasActivePlan = akis.data?.has_active_plan ?? true;
  const needsExtension = !!akis.data?.needs_extension;
  const emptyMode = dailyEmptyMode({
    showSkeleton,
    totalCount,
    needsExtension,
    hasActivePlan,
  });
  const agentPlanName = akis.data?.active_plan_name || tasks[0]?.plan_name || events[0]?.plan_name || '';

  const listHeader = (
    <View style={styles.headerBlock}>
        <View style={styles.todayHead}>
          <View style={styles.todayTitles}>
            <View style={styles.todayTitleRow}>
              <ThemedText type="screenTitle">{t.daily.title}</ThemedText>
              {akis.data?.plan_day ? (
                <View style={[styles.dayBadge, { backgroundColor: theme.backgroundSelected }]}>
                  <ThemedText type="smallBold" themeColor="tint">
                    {akis.data.plan_day}
                  </ThemedText>
                </View>
              ) : null}
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              {t.daily.subtitle}
            </ThemedText>
          </View>
          <View style={styles.headerLinks}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.recap.title}
              onPress={() => router.push('/rapor' as Href)}
              style={({ pressed }) => [
                styles.headerChip,
                { backgroundColor: theme.surfaceMuted, opacity: pressed ? 0.7 : 1 },
              ]}>
              <ThemedText type="smallBold" themeColor="tint">
                {t.recap.panel}
              </ThemedText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.bonus.title}
              onPress={() => router.push('/bonus' as Href)}
              style={({ pressed }) => [
                styles.headerChip,
                { backgroundColor: theme.surfaceMuted, opacity: pressed ? 0.7 : 1 },
              ]}>
              <ThemedText type="smallBold" themeColor="accentWarm">
                {t.chat.attachSheet.bonus}
              </ThemedText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.daily.mysticOpen}
              onPress={mysticPanel.open}
              style={({ pressed }) => [
                styles.mysticLink,
                { backgroundColor: theme.surfaceMuted, opacity: pressed ? 0.7 : 1 },
              ]}>
              <ThemedText type="smallBold" style={{ color: theme.tint }}>
                ☾
              </ThemedText>
            </Pressable>
          </View>
        </View>
        {!showSkeleton && totalCount > 0 ? (
          <SurfaceCard elevated style={styles.progressCard}>
            <View style={styles.progressBlock}>
              <ProgressRing
                progress={dayProgress}
                complete={dayComplete}
                accessibilityLabel={t.daily.progressLabel(doneCount, totalCount)}
              />
              <View style={styles.progressCopy}>
                <ThemedText type="smallBold" themeColor="tint">
                  %{Math.round(dayProgress * 100)}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {t.daily.progressLabel(doneCount, totalCount)}
                </ThemedText>
              </View>
            </View>
          </SurfaceCard>
        ) : null}
      {/* Bölümsel hata (madde C): veri varken hata = ince banner; veri yokken
          de ekran komple karta düşmez — başlık + kart + tekrar dene. */}
      {akis.error && akis.data ? (
        <View
          style={[
            styles.staleBanner,
            { backgroundColor: theme.backgroundSelected, borderColor: theme.border },
          ]}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.staleText}>
            {akis.error.status === 0 ? t.daily.staleOffline : akis.error.message}
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.common.retry}
            hitSlop={8}
            onPress={() => void load(true)}
            style={({ pressed }) => [
              styles.staleRetry,
              { borderColor: theme.tint, opacity: pressed ? 0.7 : 1 },
            ]}>
            <ThemedText type="smallBold" themeColor="tint">
              {t.common.retry}
            </ThemedText>
          </Pressable>
        </View>
      ) : null}
      {akis.error && !akis.data && !showSkeleton ? (
        <ErrorBanner message={akis.error.message} onRetry={() => void load()} />
      ) : null}
      {extensionError ? (
        <ErrorBanner
          message={extensionError}
          onRetry={() => void handleExtendPlan()}
          retrying={extending}
        />
      ) : null}
      {yesterdayMisses > 0 ? (
        <SurfaceCard elevated style={{ marginBottom: Spacing.two }}>
          <ThemedText type="small">{t.daily.missYesterday(yesterdayMisses)}</ThemedText>
        </SurfaceCard>
      ) : null}
      {showPushHint ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.daily.pushHint}
          onPress={() => router.push('/settings' as Href)}
          style={({ pressed }) => [
            styles.staleBanner,
            {
              backgroundColor: theme.backgroundSelected,
              borderColor: theme.border,
              opacity: pressed ? 0.85 : 1,
            },
          ]}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.staleText}>
            {t.daily.pushHint}
          </ThemedText>
        </Pressable>
      ) : null}
      {extending ? (
        <ThemedText type="small" themeColor="textSecondary" style={{ marginBottom: Spacing.two }}>
          {t.daily.extending}
        </ThemedText>
      ) : null}
      {showSkeleton ? <DailySkeleton /> : null}
      {!showSkeleton && dayComplete ? (
        <View style={styles.completeStack}>
          <DayCompleteCard done={doneCount} total={totalCount} />
          <DayReviewCard onOpen={() => void openAgent(t.daily.agentSeedReview)} />
        </View>
      ) : null}
      {!showSkeleton && nextStep ? (
        <NextStepCard
          step={nextStep}
          busy={
            nextStep.kind === 'event'
              ? busy === `event:${nextStep.event.occurrence_id}`
              : busy === `proof:${nextStep.id}`
          }
          onCompleteEvent={(event) => void completeEvent(event)}
          onProofTask={openProofForTask}
        />
      ) : null}
      {emptyMode !== 'hidden' && !akis.error ? (
        <SurfaceCard elevated>
          <ThemedText type="subtitle">{t.daily.emptyTitle}</ThemedText>
          <ThemedText themeColor="textSecondary">
            {hasActivePlan ? t.daily.emptyBody : t.plan.emptyBody}
          </ThemedText>
          {emptyMode === 'extend' ? (
            <Pressable
              accessibilityRole="button"
              disabled={extending}
              onPress={() => void handleExtendPlan()}
              style={({ pressed }) => [
                styles.emptyCta,
                { backgroundColor: theme.tint, opacity: pressed || extending ? 0.85 : 1 },
              ]}>
              {extending ? (
                <ActivityIndicator color={theme.onAccent} />
              ) : (
                <ThemedText type="smallBold" style={{ color: theme.onAccent }}>
                  {t.daily.extendCta}
                </ThemedText>
              )}
            </Pressable>
          ) : (
            <View style={styles.emptyActions}>
              <ThemedText type="small" themeColor="textSecondary">
                {t.daily.microStepHint}
              </ThemedText>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  if (emptyMode === 'chat') {
                    router.push('/(tabs)' as Href);
                    return;
                  }
                  void openAgent(t.daily.agentSeedStep);
                }}
                style={({ pressed }) => [
                  styles.emptyCta,
                  { backgroundColor: theme.tint, opacity: pressed ? 0.85 : 1 },
                ]}>
                <ThemedText type="smallBold" style={{ color: theme.onAccent }}>
                  {emptyMode === 'chat' ? t.daily.openChatCta : t.daily.emptyAction}
                </ThemedText>
              </Pressable>
            </View>
          )}
        </SurfaceCard>
      ) : null}
    </View>
  );

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <FlatList
          data={showSkeleton ? [] : tasks}
          keyExtractor={(task) => task.id}
          renderItem={renderTask}
          ListHeaderComponent={listHeader}
          ListFooterComponent={
            !showSkeleton && (events.length > 0 || (totalCount > 0 && hasActivePlan && !dayComplete)) ? (
              <View style={styles.eventsBlock}>
                {totalCount > 0 && hasActivePlan && !dayComplete ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t.daily.emptyAction}
                    onPress={() => void openAgent(t.daily.agentSeedStep)}
                    style={({ pressed }) => [
                      styles.microStep,
                      { borderColor: theme.border, opacity: pressed ? 0.8 : 1 },
                    ]}>
                    <ThemedText type="smallBold" themeColor="tint">
                      {t.daily.emptyAction}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {t.daily.microStepHint}
                    </ThemedText>
                  </Pressable>
                ) : null}
                {events.length > 0 ? (
                  <>
                    <ThemedText type="subtitle">{t.events.sectionTitle}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {t.events.sectionHint(ScoringRules.planEtkinlik)}
                    </ThemedText>
                    <EventsTimeline
                      events={events}
                      nowMinutes={nowMinutes}
                      busyKey={busy}
                      outcomes={outcomes}
                      onComplete={(event) => void completeEvent(event)}
                    />
                  </>
                ) : null}
              </View>
            ) : null
          }
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: screenInsets.bottom },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={akis.refreshing && akis.data !== null}
              onRefresh={() => void load(true)}
            />
          }
          keyboardShouldPersistTaps="handled"
          removeClippedSubviews={Platform.OS === 'android'}
          maxToRenderPerBatch={6}
          windowSize={7}
        />
      </SafeAreaView>

      <Modal
        animationType="slide"
        visible={cameraTask !== null}
        presentationStyle="fullScreen"
        onRequestClose={() => setCameraTask(null)}>
        <View style={styles.cameraShell}>
          {cameraTask ? (
            <CameraView
              ref={cameraRef}
              style={StyleSheet.absoluteFillObject}
              facing="back"
              active={cameraTask !== null}
              onCameraReady={() => setCameraReady(true)}
              onMountError={() => {
                setCameraError(t.daily.cameraFailed);
                if (cameraTask) {
                  setOutcome(cameraTask.id, {
                    tone: 'danger',
                    message: t.daily.cameraFailed,
                  });
                }
                setCameraTask(null);
              }}
            />
          ) : null}
          <SafeAreaView style={styles.cameraOverlay} pointerEvents="box-none">
            <View style={styles.cameraTop}>
              <Pressable
                onPress={() => setCameraTask(null)}
                style={styles.cameraTextButton}>
                <ThemedText type="smallBold" style={styles.cameraText}>
                  {t.daily.closeCamera}
                </ThemedText>
              </Pressable>
              <ThemedText type="smallBold" style={styles.cameraText}>
                {cameraReady ? t.daily.photoOnlyNow : t.daily.cameraPreparing}
              </ThemedText>
            </View>
            {cameraError ? (
              <ThemedText type="smallBold" style={styles.cameraText}>
                {cameraError}
              </ThemedText>
            ) : null}
            <Pressable
              accessibilityLabel={t.daily.captureProof}
              disabled={!cameraReady || busy !== null}
              onPress={() => void captureAndUpload()}
              style={({ pressed }) => [
                styles.shutter,
                { backgroundColor: theme.backgroundElement },
                (!cameraReady || pressed) && styles.dimmed,
              ]}>
              {busy?.startsWith('proof:') ? (
                <ActivityIndicator color={theme.text} />
              ) : null}
            </Pressable>
          </SafeAreaView>
        </View>
      </Modal>

      <PlanTaskEditor
        target={editTarget}
        onClose={() => setEditTarget(null)}
        onChanged={() => invalidateGunlukAkis()}
      />

      {/* faz8.13/2a: mistik panel — Bugün ile senkron bottom sheet. */}
      <PlanAgentSheet
        visible={agentOpen}
        planId={agentPlanId}
        planName={agentPlanName}
        seed={agentSeed}
        onClose={() => setAgentOpen(false)}
        onEventsChanged={() => invalidateGunlukAkis()}
      />

      <MysticPanel visible={mysticPanel.visible} onClose={mysticPanel.close} />
    </ThemedView>
  );
}

const TaskCard = memo(function TaskCard({
  task,
  steps,
  outcome,
  busy,
  emphasis,
  iradeActive,
  onOpenCamera,
  onToggleStep,
  onExcuse,
  onDeviceAction,
  onLongPressEdit,
  onOpenSteps,
}: {
  task: DailyTask;
  steps: TaskStep[];
  outcome?: Outcome;
  busy: string | null;
  emphasis: 'hero' | 'lifted' | 'muted';
  iradeActive: boolean;
  onOpenCamera: () => void;
  onToggleStep: (stepId: string) => void;
  onExcuse: () => void;
  onDeviceAction: (action: 'notification' | 'calendar') => void;
  onLongPressEdit: () => void;
  onOpenSteps: () => void;
}) {
  const theme = useTheme();
  const { t } = useLocale();
  const scheme = useColorScheme();
  const scrimColor = (scheme === 'dark' ? ImageScrim.dark : ImageScrim.light)[1];
  const pending = task.status === 'pending';
  const missed = task.status === 'missed_silent' || task.status === 'missed_excused';
  const markState = task.status === 'done' ? 'done' : missed ? 'missed' : 'pending';
  const willpowerTask = supportsWillpowerReminder(task);
  const coverUri = safeImageUri(task.image_url);
  const categories = task.categories ?? [];
  const celebrate = outcome?.tone === 'success' || task.status === 'done';
  const awardedPoints =
    outcome?.tone === 'success' ? awardedPointsFromMessage(outcome.message, 0) : 0;

  return (
    <View style={styles.cardShell}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.plan.openSteps}
        accessibilityHint={pending ? t.common.longPressEdit : undefined}
        delayLongPress={380}
        onPress={onOpenSteps}
        onLongPress={onLongPressEdit}>
        <SurfaceCard
          style={{
            ...styles.cardGap,
            ...(emphasis === 'muted' ? { backgroundColor: theme.surfaceMuted } : null),
          }}
          elevated={emphasis === 'lifted'}
          hero={emphasis === 'hero'}>
          {coverUri ? (
            <ThemedView style={styles.imageWrapper}>
              <Image source={{ uri: coverUri }} style={styles.taskImage} contentFit="cover" />
              {/* faz8.13/8: tek alt bant — görsel canlı kalır, yalnız alt kenar koyulaşır. */}
              <View
                pointerEvents="none"
                style={[styles.scrim, styles.scrimBottom, { backgroundColor: scrimColor }]}
              />
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
                            { text: t.daily.closeCamera, style: 'cancel' },
                            {
                              text:
                                task.image_source === 'gemini_nano_banana'
                                  ? t.common.openSource
                                  : t.common.openUnsplash,
                              onPress: () => void Linking.openURL(task.image_attribution_url),
                            },
                          ]
                        : [{ text: t.daily.closeCamera, style: 'cancel' }],
                    );
                  }}
                  style={styles.attributionBadge}>
                  <ThemedText type="smallBold" style={styles.attributionIcon}>
                    ⓘ
                  </ThemedText>
                </Pressable>
              )}
            </ThemedView>
          ) : null}
          <ThemedView
            style={[
              styles.cardBody,
              emphasis === 'muted' ? { backgroundColor: theme.surfaceMuted } : null,
            ]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitle}>
                <View style={styles.badgeRow}>
                  <CategoryBadge label={categories[0] ?? 'İstikrar'} />
                  <CategoryBadge label={task.plan_name} variant="points" />
                </View>
                <ThemedText type="subtitle" style={styles.taskTitle}>
                  {task.title}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {task.duration_min} dk
                  {categories.length > 1 ? ` · ${categories.slice(1).join(' · ')}` : ''}
                </ThemedText>
              </View>
              <CompletionMark
                state={markState}
                busy={busy === `proof:${task.id}`}
                label={
                  task.status === 'done'
                    ? `${t.daily.statusDone}: ${task.title}`
                    : missed
                      ? `${t.daily.statusMissed}: ${task.title}`
                      : `${t.daily.addProof}: ${task.title}`
                }
                onPress={pending ? onOpenCamera : undefined}
              />
            </View>
            {!!task.tiny_version && (
              <ThemedText themeColor="textSecondary">
                {t.daily.tinyPrefix}: {task.tiny_version}
              </ThemedText>
            )}
            {steps.length > 0 ? (
              <View style={styles.steps}>
                {steps.map((step) => (
                  <Pressable
                    key={step.id}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: step.done }}
                    accessibilityLabel={step.title}
                    disabled={busy === `step:${task.id}:${step.id}`}
                    onPress={() => onToggleStep(step.id)}
                    style={styles.stepRow}>
                    <CompletionMark
                      decorative
                      state={step.done ? 'done' : 'pending'}
                      busy={busy === `step:${task.id}:${step.id}`}
                      label={step.title}
                    />
                    <ThemedText
                      type="small"
                      themeColor={step.done ? 'textSecondary' : 'text'}
                      style={step.done ? styles.stepDone : undefined}>
                      {step.title}
                    </ThemedText>
                  </Pressable>
                ))}
                <ThemedText type="small" themeColor="textSecondary">
                  {t.daily.stepsHint}
                </ThemedText>
              </View>
            ) : null}
            {outcome ? (
              <View style={styles.outcomeRow}>
                <ThemedText themeColor={outcome.tone}>{outcome.message}</ThemedText>
                {awardedPoints > 0 ? (
                  <ThemedText type="smallBold" themeColor="tint">
                    +<CountUpText value={awardedPoints} />
                  </ThemedText>
                ) : null}
              </View>
            ) : null}
            {pending ? (
              <View style={styles.actions}>
                <TaskButton
                  label={outcome?.tone === 'danger' ? t.daily.retryPhoto : t.daily.addProof}
                  primary
                  busy={busy === `proof:${task.id}`}
                  onPress={onOpenCamera}
                />
                <TaskButton
                  label={t.daily.excuse}
                  busy={busy === `excuse:${task.id}`}
                  onPress={onExcuse}
                />
                {willpowerTask && iradeActive ? (
                  <TaskButton
                    label={t.daily.remind}
                    busy={busy === `notification:${task.id}`}
                    onPress={() => onDeviceAction('notification')}
                  />
                ) : null}
                {willpowerTask ? (
                  <TaskButton
                    label={t.daily.addToCalendar}
                    busy={busy === `calendar:${task.id}`}
                    onPress={() => onDeviceAction('calendar')}
                  />
                ) : null}
              </View>
            ) : null}
          </ThemedView>
        </SurfaceCard>
      </Pressable>
      <LeafConfetti active={celebrate && outcome?.tone === 'success'} />
    </View>
  );
});

function TaskButton({
  label,
  onPress,
  busy,
  primary,
}: {
  label: string;
  onPress: () => void;
  busy: boolean;
  primary?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: primary ? theme.tint : theme.surfaceMuted,
          opacity: pressed || busy ? 0.65 : 1,
        },
      ]}>
      {busy ? (
        <ActivityIndicator color={primary ? theme.onAccent : theme.text} />
      ) : (
        <ThemedText
          type="smallBold"
          style={primary ? { color: theme.onAccent } : { color: theme.text }}>
          {label}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  eventsBlock: {
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  flex: { flex: 1 },
  listContent: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    gap: Spacing.three,
  },
  headerBlock: {
    gap: Spacing.three,
  },
  todayHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    minHeight: 44,
  },
  todayTitles: {
    flex: 1,
    gap: Spacing.half,
  },
  todayTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  dayBadge: {
    minWidth: 28,
    minHeight: 28,
    paddingHorizontal: Spacing.two,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerChip: {
    minHeight: 36,
    paddingHorizontal: Spacing.two,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressCard: {
    paddingVertical: Spacing.three,
  },
  progressBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  progressCopy: {
    flex: 1,
    gap: Spacing.half,
  },
  staleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radii.medium,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    minHeight: 44,
  },
  staleText: { flex: 1 },
  staleRetry: {
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: Spacing.two,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radii.pill,
  },
  emptyCta: {
    alignSelf: 'flex-start',
    minHeight: 44,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyActions: {
    gap: Spacing.two,
  },
  completeStack: {
    gap: Spacing.two,
  },
  microStep: {
    minHeight: 44,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radii.medium,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.half,
    justifyContent: 'center',
  },
  steps: {
    gap: Spacing.one,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    minHeight: 44,
  },
  stepDone: {
    textDecorationLine: 'line-through',
  },
  headerLinks: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  mysticLink: {
    minHeight: 44,
    minWidth: 44,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardShell: {
    position: 'relative',
  },
  cardGap: {
    gap: Spacing.three,
    overflow: 'hidden',
    padding: 0,
  },
  cardBody: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  outcomeRow: {
    gap: Spacing.one,
  },
  imageWrapper: {
    position: 'relative',
  },
  taskImage: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  // faz8.13/8: görseli yıkayan üç katman kaldırıldı — yalnız alt bant kaldı
  // (görsel canlı, atıf rozeti okunur). Renk ImageScrim token'ından.
  scrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  scrimBottom: { height: '22%' },
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
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  taskTitle: {
    marginTop: Spacing.one,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  cardTitle: { flex: 1, gap: Spacing.one },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  button: {
    minHeight: 44,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
    flexBasis: '45%',
  },
  cameraShell: { flex: 1, backgroundColor: '#000' },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.four,
  },
  cameraTop: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  cameraTextButton: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  cameraText: { color: '#fff' },
  shutter: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 7,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dimmed: { opacity: 0.55 },
});

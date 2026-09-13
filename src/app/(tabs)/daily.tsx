import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import { type Href, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState, memo } from 'react';
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
import { DailySkeleton } from '@/components/gunluk/daily-skeleton';
import { EventsTimeline } from '@/components/gunluk/events-timeline';
import {
  DayCompleteCard,
  NextStepCard,
  type NextStep,
} from '@/components/gunluk/next-step-card';
import { ProgressRing } from '@/components/gunluk/progress-ring';
import { LeafConfetti } from '@/components/leaf-confetti';
import {
  isTaskEditable,
  PlanTaskEditor,
  type PlanTaskEditorTarget,
} from '@/components/plan-task-editor';
import { CategoryBadge } from '@/components/ui/category-badge';
import { ScreenHeader } from '@/components/ui/screen-header';
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
import {
  ApiError,
  type DailyEventItem,
  ensureTodayPlan,
  excuseTask,
  getState,
  isPaywallError,
  type ProofResult,
  type Task,
  uploadTaskProof,
} from '@/lib/api';
import {
  completeEventOptimistic,
  getGunlukAkis,
  invalidateGunlukAkis,
  refreshGunlukAkis,
  rolloverGunlukAkisIfNeeded,
} from '@/lib/gunluk-akis';
import { getPushStatus } from '@/lib/push-notifications';
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

type DailyTask = Task & { plan_name: string };

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
  const [cameraTask, setCameraTask] = useState<Task | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [extending, setExtending] = useState(false);
  const [extensionError, setExtensionError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [outcomes, setOutcomes] = useState<Record<string, Outcome>>({});
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<PlanTaskEditorTarget | null>(null);
  // faz8.13/2a: mistiğin yeni evi — Bugün başlığındaki ☾ rozeti bu paneli açar.
  const mysticPanel = useMysticPanel();
  const screenInsets = useScreenInsets();

  const tasks = useMemo<DailyTask[]>(
    () =>
      (akis.data?.items ?? []).map((item) => ({
        ...item.task,
        plan_name: item.plan_name,
      })),
    [akis.data],
  );
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
          if (isPaywallError(value)) {
            router.push('/paywall' as Href);
          } else {
            // Bölümsel hata: uzatma başarısızsa ekran düşmez, ince banner.
            setExtensionError(
              value instanceof ApiError ? value.message : t.daily.generateFailed,
            );
          }
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
        // Sunucu mesajı Türkçe sabit; kullanıcı dilinde yerel metin gösterilir (+50 kilitli).
        setOutcome(key, { tone: 'success', message: t.events.completed(50) });
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

  async function openCamera(task: Task) {
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
      }
      showProofOutcome(task, result);
      await load(true);
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

  function showProofOutcome(task: Task, result: ProofResult) {
    const declaration = result.accepted_by_declaration ? t.daily.declarationAccepted : '';
    setOutcome(task.id, {
      tone: result.approved ? 'success' : 'danger',
      message: result.approved
        ? `Halka tamamlandı · güven ${result.confidence}/100.${declaration}`
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
    const message = t.daily.excuseBody;
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
            outcome={outcomes[task.id]}
            busy={busy}
            emphasis={emphasis}
            iradeActive={!!profile?.irade_modu_active}
            onOpenCamera={() => void openCamera(task)}
            onExcuse={() => confirmExcuse(task)}
            onDeviceAction={(action) => void runDeviceAction(task, action)}
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
    [busy, outcomes, profile?.irade_modu_active, consentStatus, cameraPermission, tasks, t],
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

  const showSkeleton = !akis.data && (akis.loading || !akis.hydrated);
  const hasActivePlan = akis.data?.has_active_plan ?? true;
  const needsExtension = !!akis.data?.needs_extension;

  const listHeader = (
    <View style={styles.headerBlock}>
      <ScreenHeader
        title={t.daily.title}
        subtitle={t.daily.subtitle}
        trailing={
          <View style={styles.headerLinks}>
            {/* faz8.13/2a: mistiğin yeni evi Bugün — ☾ panel buradan açılır. */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.daily.mysticOpen}
              onPress={mysticPanel.open}
              style={({ pressed }) => [
                styles.bonusLink,
                { backgroundColor: theme.surfaceMuted, opacity: pressed ? 0.7 : 1 },
              ]}>
              <ThemedText type="smallBold" style={{ color: theme.tint }}>
                ☾
              </ThemedText>
            </Pressable>
            {/* faz8.13/3: rapor girişi Bugün'den de görünür (kapı-içeride). */}
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={t.daily.reportShort}
              onPress={() => router.push('/rapor' as Href)}
              style={({ pressed }) => [
                styles.bonusLink,
                { backgroundColor: theme.surfaceMuted, opacity: pressed ? 0.7 : 1 },
              ]}>
              <ThemedText type="smallBold" style={{ color: theme.tint }}>
                {t.daily.reportShort}
              </ThemedText>
            </Pressable>
            <Pressable
              accessibilityRole="link"
              onPress={() => router.push('/bonus' as Href)}
              style={({ pressed }) => [
                styles.bonusLink,
                { backgroundColor: theme.surfaceMuted, opacity: pressed ? 0.7 : 1 },
              ]}>
              <ThemedText type="smallBold" style={{ color: theme.accentWarm }}>
                {t.daily.bonusShort}
              </ThemedText>
            </Pressable>
          </View>
        }
      />
      {!showSkeleton && totalCount > 0 ? (
        <View style={styles.progressBlock}>
          <ProgressRing
            progress={dayProgress}
            complete={dayComplete}
            accessibilityLabel={t.daily.progressLabel(doneCount, totalCount)}
          />
          <View style={styles.progressMeta}>
            <ThemedText type="small" themeColor="textSecondary">
              {t.daily.dayProgress}
            </ThemedText>
            <ThemedText type="smallBold" themeColor="tint">
              <CountUpText value={doneCount} />/{totalCount}
            </ThemedText>
          </View>
        </View>
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
          onPress={() => router.push('/settings' as Href)}
          style={{ marginBottom: Spacing.two }}>
          <ThemedText type="small" themeColor="tint">
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
        <DayCompleteCard done={doneCount} total={totalCount} />
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
      {!akis.error && !showSkeleton && totalCount === 0 ? (
        <SurfaceCard elevated>
          <ThemedText type="subtitle">{t.daily.emptyTitle}</ThemedText>
          <ThemedText themeColor="textSecondary">
            {hasActivePlan ? t.daily.emptyBody : t.plan.emptyBody}
          </ThemedText>
          {needsExtension ? (
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
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/explore' as Href)}
              style={({ pressed }) => [
                styles.emptyCta,
                { backgroundColor: theme.tint, opacity: pressed ? 0.85 : 1 },
              ]}>
              <ThemedText type="smallBold" style={{ color: theme.onAccent }}>
                {t.daily.emptyAction}
              </ThemedText>
            </Pressable>
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
            !showSkeleton && events.length > 0 ? (
              <View style={styles.eventsBlock}>
                <ThemedText type="subtitle">{t.events.sectionTitle}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {t.events.sectionHint}
                </ThemedText>
                <EventsTimeline
                  events={events}
                  nowMinutes={nowMinutes}
                  busyKey={busy}
                  outcomes={outcomes}
                  onComplete={(event) => void completeEvent(event)}
                />
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
              onMountError={(event) => {
                const message = event.message || t.daily.cameraFailed;
                setCameraError(message);
                if (cameraTask) {
                  setOutcome(cameraTask.id, {
                    tone: 'danger',
                    message: t.daily.cameraOpenFailed(message),
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
      <MysticPanel visible={mysticPanel.visible} onClose={mysticPanel.close} />
    </ThemedView>
  );
}

const TaskCard = memo(function TaskCard({
  task,
  outcome,
  busy,
  emphasis,
  iradeActive,
  onOpenCamera,
  onExcuse,
  onDeviceAction,
  onLongPressEdit,
}: {
  task: DailyTask;
  outcome?: Outcome;
  busy: string | null;
  emphasis: 'hero' | 'lifted' | 'muted';
  iradeActive: boolean;
  onOpenCamera: () => void;
  onExcuse: () => void;
  onDeviceAction: (action: 'notification' | 'calendar') => void;
  onLongPressEdit: () => void;
}) {
  const theme = useTheme();
  const { t } = useLocale();
  const scheme = useColorScheme();
  const scrimColor = (scheme === 'dark' ? ImageScrim.dark : ImageScrim.light)[1];
  const pending = task.status === 'pending';
  const willpowerTask = supportsWillpowerReminder(task);
  const celebrate = outcome?.tone === 'success' || task.status === 'done';
  const pointsMatch = outcome?.message.match(/\+(\d+)/);
  const awardedPoints = pointsMatch ? Number(pointsMatch[1]) : 0;

  return (
    <View style={styles.cardShell}>
      <Pressable
        accessibilityRole="button"
        accessibilityHint={pending ? t.common.longPressEdit : undefined}
        delayLongPress={380}
        onLongPress={onLongPressEdit}>
        <SurfaceCard
          style={{
            ...styles.cardGap,
            ...(emphasis === 'muted' ? { backgroundColor: theme.surfaceMuted } : null),
          }}
          elevated={emphasis === 'lifted'}
          hero={emphasis === 'hero'}>
          {!!task.image_url && (
            <ThemedView style={styles.imageWrapper}>
              <Image source={{ uri: task.image_url }} style={styles.taskImage} contentFit="cover" />
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
          )}
          <ThemedView
            style={[
              styles.cardBody,
              emphasis === 'muted' ? { backgroundColor: theme.surfaceMuted } : null,
            ]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitle}>
                <View style={styles.badgeRow}>
                  <CategoryBadge label={task.categories[0] ?? 'İstikrar'} />
                  <CategoryBadge label={task.plan_name} variant="points" />
                </View>
                <ThemedText type="subtitle" style={styles.taskTitle}>
                  {task.title}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {task.duration_min} dk
                  {task.categories.length > 1 ? ` · ${task.categories.slice(1).join(' · ')}` : ''}
                </ThemedText>
              </View>
              <StatusPill status={task.status} />
            </View>
            {!!task.tiny_version && (
              <ThemedText themeColor="textSecondary">
                {t.daily.tinyPrefix}: {task.tiny_version}
              </ThemedText>
            )}
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

function StatusPill({ status }: { status: Task['status'] }) {
  const { t } = useLocale();
  const labels: Record<Task['status'], string> = {
    pending: t.daily.statusPending,
    done: t.daily.statusDone,
    missed_silent: t.daily.statusMissed,
    missed_excused: t.daily.statusExcused,
  };
  return (
    <ThemedView type="backgroundSelected" style={styles.pill}>
      <ThemedText type="smallBold">{labels[status]}</ThemedText>
    </ThemedView>
  );
}

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
          backgroundColor: primary ? theme.accentWarm : theme.surfaceMuted,
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
  progressBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  progressMeta: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  headerLinks: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  bonusLink: {
    minHeight: 40,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.three,
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
  pill: {
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
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

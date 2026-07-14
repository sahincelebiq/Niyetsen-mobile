import { CameraView, useCameraPermissions } from 'expo-camera';
import { type Href, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState, memo } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
  type ListRenderItem,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Copy } from '@/constants/copy';
import { ErrorBanner } from '@/components/error-banner';
import { CategoryBadge } from '@/components/ui/category-badge';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SurfaceCard } from '@/components/ui/surface-card';
import { useConsentPreferences } from '@/components/consent-gate';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  MaxContentWidth,
  Radii,
  Spacing,
} from '@/constants/theme';
import { useScreenInsets } from '@/hooks/use-screen-insets';
import { useTheme } from '@/hooks/use-theme';
import { trackEvent } from '@/lib/analytics';
import {
  ApiError,
  excuseTask,
  getDailyTasks,
  type ProofResult,
  type Task,
  uploadTaskProof,
} from '@/lib/api';
import {
  addTaskToCalendar,
  scheduleTaskNotification,
  supportsWillpowerReminder,
} from '@/lib/task-reminders';
import { useProfile } from '@/providers/profile-provider';

type Outcome = { tone: 'success' | 'danger'; message: string };

type DailyTask = Task & { plan_name: string };

export default function DailyTasksScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { profile } = useProfile();
  const { status: consentStatus } = useConsentPreferences();
  const cameraRef = useRef<CameraView>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [cameraTask, setCameraTask] = useState<Task | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [outcomes, setOutcomes] = useState<Record<string, Outcome>>({});
  const [cameraError, setCameraError] = useState<string | null>(null);
  const screenInsets = useScreenInsets();

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const items = await getDailyTasks();
      setTasks(items.map((item) => ({ ...item.task, plan_name: item.plan_name })));
    } catch (value) {
      setError(value instanceof ApiError ? value.message : 'Günlük görevler yüklenemedi.');
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

  const setOutcome = useCallback((taskId: string, outcome: Outcome) => {
    setOutcomes((current) => ({ ...current, [taskId]: outcome }));
  }, []);

  async function openCamera(task: Task) {
    if (!consentStatus.proof_photo_processing.accepted) {
      setOutcome(task.id, {
        tone: 'danger',
        message:
          'Kanıt fotoğrafı rızan kapalı. Ayarlar > Gizlilik ve rıza tercihlerinden açabilirsin.',
      });
      router.push('/settings');
      return;
    }
    if (Platform.OS === 'web') {
      setOutcome(task.id, {
        tone: 'danger',
        message: 'Kanıt kamerası web sürümünde desteklenmiyor. iOS veya Android uygulamasını kullan.',
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
          ? 'Kamera izni kapalı. Cihaz ayarlarından Niyetsen için kamerayı açabilirsin.'
          : 'Kamera izni olmadan kanıt çekilemez. Görev ve mazeret seçenekleri kullanılabilir.',
      });
      return;
    }
    setCameraError(null);
    setCameraReady(false);
    setCameraTask(task);

    if (profile?.irade_modu_active && supportsWillpowerReminder(task)) {
      void scheduleTaskNotification(task, profile.notif_hour ?? 8).then((result) => {
        if (result.ok) {
          setOutcome(task.id, { tone: 'success', message: result.message });
        }
      });
    }
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
      if (!picture?.uri) throw new Error('Fotoğraf oluşturulamadı.');
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
      setOutcome(task.id, {
        tone: 'danger',
        message:
          value instanceof ApiError
            ? value.message
            : value instanceof Error
              ? value.message
              : 'Kanıt yüklenemedi.',
      });
    } finally {
      setBusy(null);
    }
  }

  function showProofOutcome(task: Task, result: ProofResult) {
    const declaration = result.accepted_by_declaration ? ' Beyanınla kabul edildi.' : '';
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
        message: value instanceof Error ? value.message : 'Mazeret kaydedilemedi.',
      });
    } finally {
      setBusy(null);
    }
  }

  function confirmExcuse(task: Task) {
    const message = 'Mazeret puanı sabit −25 olur ve sessiz kaçırma sayacı sıfırlanır.';
    if (Platform.OS === 'web') {
      if (globalThis.confirm?.(message)) void performExcuse(task);
      return;
    }
    Alert.alert('Mazeret kullan', message, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Mazeret kullan', onPress: () => void performExcuse(task) },
    ]);
  }

  async function runDeviceAction(task: Task, action: 'notification' | 'calendar') {
    setBusy(`${action}:${task.id}`);
    try {
      const result =
        action === 'notification'
          ? await scheduleTaskNotification(task, profile?.notif_hour ?? 8)
          : await addTaskToCalendar(task, profile?.notif_hour ?? 8);
      setOutcome(task.id, { tone: result.ok ? 'success' : 'danger', message: result.message });
    } catch (value) {
      setOutcome(task.id, {
        tone: 'danger',
        message: value instanceof Error ? value.message : 'Cihaz işlemi tamamlanamadı.',
      });
    } finally {
      setBusy(null);
    }
  }

  const renderTask = useCallback<ListRenderItem<DailyTask>>(
    ({ item: task }) => (
      <TaskCard
        task={task}
        outcome={outcomes[task.id]}
        busy={busy}
        iradeActive={!!profile?.irade_modu_active}
        onOpenCamera={() => void openCamera(task)}
        onExcuse={() => confirmExcuse(task)}
        onDeviceAction={(action) => void runDeviceAction(task, action)}
      />
    ),
    [busy, outcomes, profile?.irade_modu_active],
  );

  const listHeader = (
    <View style={styles.headerBlock}>
      <ScreenHeader
        title={Copy.daily.title}
        subtitle={Copy.daily.subtitle}
        trailing={
          <Pressable
            accessibilityRole="link"
            onPress={() => router.push('/bonus' as Href)}
            style={({ pressed }) => [
              styles.bonusLink,
              { backgroundColor: theme.surfaceMuted, opacity: pressed ? 0.7 : 1 },
            ]}>
            <ThemedText type="smallBold" style={{ color: theme.accentWarm }}>
              Bonus
            </ThemedText>
          </Pressable>
        }
      />
      {error ? <ErrorBanner message={error} onRetry={() => void load()} /> : null}
      {loading ? <ActivityIndicator color={theme.tint} size="large" /> : null}
      {!loading && !error && tasks.length === 0 ? (
        <SurfaceCard>
          <ThemedText type="subtitle">{Copy.daily.emptyTitle}</ThemedText>
          <ThemedText themeColor="textSecondary">{Copy.daily.emptyBody}</ThemedText>
        </SurfaceCard>
      ) : null}
    </View>
  );

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <FlatList
          data={tasks}
          keyExtractor={(task) => task.id}
          renderItem={renderTask}
          ListHeaderComponent={listHeader}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: screenInsets.bottom },
          ]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />
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
                const message = event.message || 'Kamera başlatılamadı.';
                setCameraError(message);
                if (cameraTask) {
                  setOutcome(cameraTask.id, {
                    tone: 'danger',
                    message: `Kamera açılamadı: ${message}`,
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
                  Kapat
                </ThemedText>
              </Pressable>
              <ThemedText type="smallBold" style={styles.cameraText}>
                {cameraReady ? 'Fotoğraf yalnız şimdi çekilir' : 'Kamera hazırlanıyor…'}
              </ThemedText>
            </View>
            {cameraError ? (
              <ThemedText type="smallBold" style={styles.cameraText}>
                {cameraError}
              </ThemedText>
            ) : null}
            <Pressable
              accessibilityLabel="Kanıt fotoğrafı çek"
              disabled={!cameraReady || busy !== null}
              onPress={() => void captureAndUpload()}
              style={({ pressed }) => [
                styles.shutter,
                (!cameraReady || pressed) && styles.dimmed,
              ]}>
              {busy?.startsWith('proof:') ? (
                <ActivityIndicator color="#3B3327" />
              ) : null}
            </Pressable>
          </SafeAreaView>
        </View>
      </Modal>
    </ThemedView>
  );
}

const TaskCard = memo(function TaskCard({
  task,
  outcome,
  busy,
  iradeActive,
  onOpenCamera,
  onExcuse,
  onDeviceAction,
}: {
  task: DailyTask;
  outcome?: Outcome;
  busy: string | null;
  iradeActive: boolean;
  onOpenCamera: () => void;
  onExcuse: () => void;
  onDeviceAction: (action: 'notification' | 'calendar') => void;
}) {
  const pending = task.status === 'pending';
  const willpowerTask = supportsWillpowerReminder(task);

  return (
    <SurfaceCard style={styles.cardGap}>
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
          {Copy.daily.tinyPrefix}: {task.tiny_version}
        </ThemedText>
      )}
      {outcome ? <ThemedText themeColor={outcome.tone}>{outcome.message}</ThemedText> : null}
      {pending ? (
        <View style={styles.actions}>
          <TaskButton
            label={outcome?.tone === 'danger' ? 'Yeni Kare Dene' : Copy.daily.addProof}
            primary
            busy={busy === `proof:${task.id}`}
            onPress={onOpenCamera}
          />
          <TaskButton
            label="Mazeret"
            busy={busy === `excuse:${task.id}`}
            onPress={onExcuse}
          />
          {willpowerTask && iradeActive ? (
            <TaskButton
              label="Hatırlat"
              busy={busy === `notification:${task.id}`}
              onPress={() => onDeviceAction('notification')}
            />
          ) : null}
          {willpowerTask ? (
            <TaskButton
              label="Takvime Ekle"
              busy={busy === `calendar:${task.id}`}
              onPress={() => onDeviceAction('calendar')}
            />
          ) : null}
        </View>
      ) : null}
    </SurfaceCard>
  );
});

function StatusPill({ status }: { status: Task['status'] }) {
  const labels: Record<Task['status'], string> = {
    pending: 'Bekliyor',
    done: 'Tamamlandı',
    missed_silent: 'Kaçırıldı',
    missed_excused: 'Mazeretli',
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
  bonusLink: {
    minHeight: 40,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardGap: {
    gap: Spacing.three,
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
    backgroundColor: '#FBF7EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dimmed: { opacity: 0.55 },
});

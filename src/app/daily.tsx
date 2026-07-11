import { CameraView, useCameraPermissions } from 'expo-camera';
import { type Href, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ErrorBanner } from '@/components/error-banner';
import { useConsentPreferences } from '@/components/consent-gate';
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
import {
  ApiError,
  excuseTask,
  getCurrentPlan,
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

function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function DailyTasksScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { profile } = useProfile();
  const { status: consentStatus } = useConsentPreferences();
  const cameraRef = useRef<CameraView>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [cameraTask, setCameraTask] = useState<Task | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [outcomes, setOutcomes] = useState<Record<string, Outcome>>({});

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const plan = await getCurrentPlan();
      const today = localDateKey();
      setTasks(plan?.days.flatMap((day) => day.tasks).filter((task) => task.date === today) ?? []);
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
    if (!permission.granted) {
      setOutcome(task.id, {
        tone: 'danger',
        message: 'Kamera izni olmadan kanıt çekilemez. Görev ve mazeret seçenekleri kullanılabilir.',
      });
      return;
    }
    setCameraReady(false);
    setCameraTask(task);
  }

  async function captureAndUpload() {
    if (!cameraTask || !cameraRef.current || !cameraReady) return;
    const task = cameraTask;
    setBusy(`proof:${task.id}`);
    try {
      const picture = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      if (!picture?.uri) throw new Error('Fotoğraf oluşturulamadı.');
      setCameraTask(null);
      const result = await uploadTaskProof(task.id, picture.uri);
      showProofOutcome(task, result);
      await load(true);
    } catch (value) {
      setCameraTask(null);
      setOutcome(task.id, {
        tone: 'danger',
        message: value instanceof Error ? value.message : 'Kanıt yüklenemedi.',
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

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />
          }
          contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <ThemedText type="title">Bugün</ThemedText>
              <Pressable
                accessibilityRole="link"
                onPress={() => router.push('/bonus' as Href)}
                style={({ pressed }) => [
                  styles.bonusLink,
                  { backgroundColor: theme.backgroundSelected, opacity: pressed ? 0.7 : 1 },
                ]}>
                <ThemedText type="smallBold" themeColor="tint">
                  Bonus Görev
                </ThemedText>
              </Pressable>
            </View>
            <ThemedText themeColor="textSecondary">
              Bir görev, bugünün halkasını kapatmaya yeter.
            </ThemedText>
          </View>

          {error && <ErrorBanner message={error} onRetry={() => void load()} />}
          {loading && <ActivityIndicator color={theme.tint} size="large" />}
          {!loading && !error && tasks.length === 0 && (
            <ThemedView
              type="backgroundElement"
              style={[styles.empty, { borderColor: theme.border }]}>
              <ThemedText type="subtitle">Bugün sakin bir gün</ThemedText>
              <ThemedText themeColor="textSecondary">
                Bugüne atanmış görev görünmüyor. Planım sekmesinden gelecek halkalarına göz
                atabilirsin.
              </ThemedText>
            </ThemedView>
          )}

          {tasks.map((task) => {
            const outcome = outcomes[task.id];
            const pending = task.status === 'pending';
            const willpowerTask = supportsWillpowerReminder(task);
            return (
              <ThemedView
                key={task.id}
                type="backgroundElement"
                style={[styles.card, { borderColor: theme.border }]}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitle}>
                    <ThemedText type="subtitle">{task.title}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {task.duration_min} dk · {task.categories.join(' · ')}
                    </ThemedText>
                  </View>
                  <StatusPill status={task.status} />
                </View>
                {!!task.tiny_version && (
                  <ThemedText themeColor="textSecondary">
                    En küçük halka: {task.tiny_version}
                  </ThemedText>
                )}
                {outcome && (
                  <ThemedText themeColor={outcome.tone}>{outcome.message}</ThemedText>
                )}
                {pending && (
                  <View style={styles.actions}>
                    <TaskButton
                      label={outcome?.tone === 'danger' ? 'Yeni Kare Dene' : 'Kanıt Çek'}
                      primary
                      busy={busy === `proof:${task.id}`}
                      onPress={() => void openCamera(task)}
                    />
                    <TaskButton
                      label="Mazeret"
                      busy={busy === `excuse:${task.id}`}
                      onPress={() => confirmExcuse(task)}
                    />
                    {willpowerTask && profile?.irade_modu_active && (
                      <TaskButton
                        label="Hatırlat"
                        busy={busy === `notification:${task.id}`}
                        onPress={() => void runDeviceAction(task, 'notification')}
                      />
                    )}
                    {willpowerTask && (
                      <TaskButton
                        label="Takvime Ekle"
                        busy={busy === `calendar:${task.id}`}
                        onPress={() => void runDeviceAction(task, 'calendar')}
                      />
                    )}
                  </View>
                )}
              </ThemedView>
            );
          })}
        </ScrollView>
      </SafeAreaView>

      <Modal
        animationType="slide"
        visible={cameraTask !== null}
        onRequestClose={() => setCameraTask(null)}>
        <View style={styles.cameraShell}>
          {cameraTask && (
            <CameraView
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              facing="back"
              onCameraReady={() => setCameraReady(true)}
            />
          )}
          <SafeAreaView style={styles.cameraControls}>
            <View style={styles.cameraTop}>
              <Pressable onPress={() => setCameraTask(null)} style={styles.cameraTextButton}>
                <ThemedText type="smallBold" style={styles.cameraText}>
                  Kapat
                </ThemedText>
              </Pressable>
              <ThemedText type="smallBold" style={styles.cameraText}>
                Fotoğraf yalnız şimdi çekilir
              </ThemedText>
            </View>
            <Pressable
              accessibilityLabel="Kanıt fotoğrafı çek"
              disabled={!cameraReady || busy !== null}
              onPress={() => void captureAndUpload()}
              style={({ pressed }) => [
                styles.shutter,
                (!cameraReady || pressed) && styles.dimmed,
              ]}>
              {busy?.startsWith('proof:') && <ActivityIndicator color="#3B3327" />}
            </Pressable>
          </SafeAreaView>
        </View>
      </Modal>
    </ThemedView>
  );
}

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
          backgroundColor: primary ? theme.tint : theme.backgroundSelected,
          opacity: pressed || busy ? 0.65 : 1,
        },
      ]}>
      {busy ? (
        <ActivityIndicator color={primary ? theme.background : theme.text} />
      ) : (
        <ThemedText
          type="smallBold"
          style={primary ? { color: theme.background } : undefined}>
          {label}
        </ThemedText>
      )}
    </Pressable>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  bonusLink: {
    minHeight: 40,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    borderWidth: Texture.cardBorderWidth,
    borderRadius: Radii.large,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  card: {
    borderWidth: Texture.cardBorderWidth,
    borderRadius: Radii.large,
    padding: Spacing.four,
    gap: Spacing.three,
    ...(Shadows.subtle ?? {}),
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
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraShell: { flex: 1, backgroundColor: '#000' },
  cameraControls: {
    flex: 1,
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

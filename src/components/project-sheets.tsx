import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInLeft, SlideOutLeft } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Fonts, MaxContentWidth, Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  activateProject,
  ApiError,
  isPaywallError,
  listProjects,
  PlanSummary,
  renameProject,
  startNewProject,
  type SubscriptionInfo,
} from '@/lib/api';
import { needsPaidPlanForSecondProject } from '@/lib/project-access';

const DRAWER_WIDTH = Math.min(Dimensions.get('window').width * 0.86, 340);

type ChatHistorySheetProps = {
  visible: boolean;
  onClose: () => void;
  onProjectChanged: () => void;
  subscriptionStatus?: SubscriptionInfo | null;
};

export function ChatHistorySheet({
  visible,
  onClose,
  onProjectChanged,
  subscriptionStatus,
}: ChatHistorySheetProps) {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [projects, setProjects] = useState<PlanSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setProjects(await listProjects());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Projeler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) void load();
  }, [visible, load]);

  async function handleActivate(planId: string) {
    setBusyId(planId);
    setError(null);
    try {
      await activateProject(planId);
      onProjectChanged();
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Proje değiştirilemedi.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleNewProject() {
    if (needsPaidPlanForSecondProject(projects, subscriptionStatus)) {
      onClose();
      Alert.alert(
        'İkinci plan için abonelik',
        'İlk planın hazır. Deneme süresinde bile yalnızca 1 plan açılır; yeni niyet için mağaza aboneliği gerekir (CANLI YA DEVAM APP sonrası).',
        [
          { text: 'Vazgeç', style: 'cancel' },
          { text: 'Aboneliğe git', onPress: () => router.push('/paywall') },
        ],
      );
      return;
    }
    setBusyId('new');
    setError(null);
    try {
      await startNewProject();
      onProjectChanged();
      onClose();
    } catch (e) {
      if (isPaywallError(e)) {
        onClose();
        router.push('/paywall');
        return;
      }
      setError(
        e instanceof ApiError
          ? e.message
          : 'Yeni niyet başlatılamadı. Birazdan tekrar dener misin?',
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={onClose}>
      <View style={styles.overlayRoot}>
        <Animated.View
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(160)}
          style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Paneli kapat" />
        </Animated.View>

        <Animated.View
          entering={SlideInLeft.duration(260)}
          exiting={SlideOutLeft.duration(220)}
          style={[
            styles.drawer,
            {
              width: DRAWER_WIDTH,
              backgroundColor: theme.backgroundElement,
              borderColor: theme.border,
              paddingTop: insets.top + Spacing.three,
              paddingBottom: insets.bottom + Spacing.three,
            },
          ]}>
          <View style={styles.drawerHeader}>
            <ThemedText type="subtitle">Niyetlerim</ThemedText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Paneli kapat"
              onPress={onClose}
              hitSlop={12}
              style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                ✕
              </ThemedText>
            </Pressable>
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            Geçmiş sohbetlerine dön veya yeni bir niyet başlat.
          </ThemedText>

          {loading ? (
            <ActivityIndicator color={theme.tint} style={styles.loader} />
          ) : (
            <ScrollView
              style={styles.listScroll}
              contentContainerStyle={styles.list}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              {projects.map((project) => (
                <Pressable
                  key={project.id}
                  disabled={busyId !== null}
                  onPress={() => void handleActivate(project.id)}
                  style={({ pressed }) => [
                    styles.row,
                    {
                      borderColor: theme.border,
                      backgroundColor: project.is_active
                        ? theme.backgroundSelected
                        : theme.background,
                      opacity: pressed ? 0.82 : 1,
                    },
                  ]}>
                  <View style={styles.rowText}>
                    <ThemedText type="smallBold">{project.name}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {project.has_content ? 'Plan hazır' : 'Sohbet devam ediyor'}
                      {project.is_active ? ' · Aktif' : ''}
                    </ThemedText>
                  </View>
                  {busyId === project.id ? <ActivityIndicator color={theme.tint} /> : null}
                </Pressable>
              ))}
            </ScrollView>
          )}

          {error ? (
            <ThemedText type="small" themeColor="danger">
              {error}
            </ThemedText>
          ) : null}

          <Pressable
            disabled={busyId !== null}
            onPress={() => {
              void handleNewProject();
            }}
            accessibilityRole="button"
            accessibilityLabel="Yeni niyet başlat"
            style={({ pressed }) => [
              styles.newButton,
              { backgroundColor: theme.accentWarm, opacity: pressed ? 0.85 : 1 },
            ]}>
            {busyId === 'new' ? (
              <ActivityIndicator color={theme.onAccent} />
            ) : (
              <ThemedText type="smallBold" style={{ color: theme.onAccent }}>
                Yeni Niyet Başlat
              </ThemedText>
            )}
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

type PlanPickerSheetProps = {
  visible: boolean;
  onClose: () => void;
  onPlanChanged: () => void;
  subscriptionStatus?: SubscriptionInfo | null;
};

export function PlanPickerSheet({
  visible,
  onClose,
  onPlanChanged,
  subscriptionStatus,
}: PlanPickerSheetProps) {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [projects, setProjects] = useState<PlanSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setProjects(await listProjects());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Planlar yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) void load();
  }, [visible, load]);

  async function handleActivate(planId: string) {
    setBusyId(planId);
    try {
      await activateProject(planId);
      onPlanChanged();
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Plan değiştirilemedi.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleRename(planId: string) {
    const name = draftName.trim();
    if (!name) return;
    setBusyId(planId);
    try {
      await renameProject(planId, name);
      setEditingId(null);
      await load();
      onPlanChanged();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'İsim kaydedilemedi.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleNewPlan() {
    if (needsPaidPlanForSecondProject(projects, subscriptionStatus)) {
      // ChatHistorySheet ile tutarlı: kullanıcıyı habersiz paywall'a atmak yerine
      // önce kısa bir açıklama gösterilir.
      onClose();
      Alert.alert(
        'İkinci plan için abonelik',
        'Yeni bir niyet başlatmak için abonelik gerekiyor. Aboneliğe göz atmak ister misin?',
        [
          { text: 'Vazgeç', style: 'cancel' },
          { text: 'Aboneliğe git', onPress: () => router.push('/paywall') },
        ],
      );
      return;
    }
    setBusyId('new');
    setError(null);
    try {
      await startNewProject();
      onPlanChanged();
      onClose();
      router.push('/');
    } catch (e) {
      if (isPaywallError(e)) {
        onClose();
        router.push('/paywall');
        return;
      }
      setError(
        e instanceof ApiError
          ? e.message
          : 'Yeni plan başlatılamadı. Birazdan tekrar dener misin?',
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.sheetRoot}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={styles.sheetBackdrop} onPress={onClose} accessibilityLabel="Paneli kapat" />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.backgroundElement,
              paddingBottom: insets.bottom + Spacing.three,
            },
          ]}>
          <ThemedText type="subtitle">Planlarım</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Planlarını görüntüle, isimlendir veya yeni bir niyet başlat.
          </ThemedText>
          {loading ? (
            <ActivityIndicator color={theme.tint} style={styles.loader} />
          ) : (
            <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
              {projects
                .filter((project) => project.has_content)
                .map((project) => (
                  <View
                    key={project.id}
                    style={[styles.row, { borderColor: theme.border, backgroundColor: theme.background }]}>
                    {editingId === project.id ? (
                      <TextInput
                        value={draftName}
                        onChangeText={setDraftName}
                        autoFocus
                        returnKeyType="done"
                        onSubmitEditing={() => void handleRename(project.id)}
                        style={[
                          styles.renameInput,
                          {
                            color: theme.text,
                            borderColor: theme.border,
                            fontFamily: Fonts.sansMedium,
                          },
                        ]}
                      />
                    ) : (
                      <Pressable
                        style={styles.rowText}
                        onPress={() => void handleActivate(project.id)}
                        disabled={busyId !== null}>
                        <ThemedText type="smallBold">
                          {project.name}
                          {project.is_active ? ' · Aktif' : ''}
                        </ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          Plan {project.slot_no}
                        </ThemedText>
                      </Pressable>
                    )}
                    {editingId === project.id ? (
                      <Pressable
                        onPress={() => setEditingId(null)}
                        disabled={busyId !== null}
                        hitSlop={8}>
                        <ThemedText type="smallBold" themeColor="textSecondary">
                          Vazgeç
                        </ThemedText>
                      </Pressable>
                    ) : null}
                    <Pressable
                      onPress={() => {
                        if (editingId === project.id) {
                          void handleRename(project.id);
                          return;
                        }
                        setEditingId(project.id);
                        setDraftName(project.name);
                      }}
                      disabled={busyId !== null}
                      hitSlop={8}>
                      <ThemedText type="smallBold" themeColor="tint">
                        {editingId === project.id ? 'Kaydet' : 'İsimlendir'}
                      </ThemedText>
                    </Pressable>
                  </View>
                ))}
            </ScrollView>
          )}
          {error ? (
            <ThemedText type="small" themeColor="danger">
              {error}
            </ThemedText>
          ) : null}
          <Pressable
            disabled={busyId !== null}
            onPress={() => void handleNewPlan()}
            style={({ pressed }) => [
              styles.newButton,
              { backgroundColor: theme.accentWarm, opacity: pressed ? 0.85 : 1 },
            ]}>
            {busyId === 'new' ? (
              <ActivityIndicator color={theme.onAccent} />
            ) : (
              <ThemedText type="smallBold" style={{ color: theme.onAccent }}>
                Yeni Plan Ekle
              </ThemedText>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlayRoot: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(44, 36, 28, 0.42)',
  },
  drawer: {
    borderRightWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    shadowColor: '#2C241C',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(44, 36, 28, 0.42)',
  },
  sheet: {
    borderTopLeftRadius: Radii.large,
    borderTopRightRadius: Radii.large,
    padding: Spacing.four,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
    maxHeight: '70%',
  },
  loader: {
    marginVertical: Spacing.four,
  },
  listScroll: {
    flex: 1,
  },
  list: {
    gap: Spacing.two,
    paddingBottom: Spacing.two,
  },
  row: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radii.large,
    padding: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  rowText: {
    flex: 1,
    gap: Spacing.half,
  },
  renameInput: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 15,
  },
  newButton: {
    borderRadius: Radii.pill,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});

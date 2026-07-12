import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
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
} from '@/lib/api';

type ChatHistorySheetProps = {
  visible: boolean;
  onClose: () => void;
  onProjectChanged: () => void;
};

export function ChatHistorySheet({
  visible,
  onClose,
  onProjectChanged,
}: ChatHistorySheetProps) {
  const theme = useTheme();
  const router = useRouter();
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
    setBusyId('new');
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
      setError(e instanceof ApiError ? e.message : 'Yeni niyet başlatılamadı.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: theme.background }]} onPress={() => {}}>
          <ThemedText type="subtitle">Niyetlerim</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Geçmiş sohbetlerine dön veya yeni bir niyet başlat.
          </ThemedText>
          {loading ? (
            <ActivityIndicator color={theme.tint} style={styles.loader} />
          ) : (
            <ScrollView contentContainerStyle={styles.list}>
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
                        : theme.backgroundElement,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}>
                  <View style={styles.rowText}>
                    <ThemedText type="smallBold">{project.name}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {project.has_content ? 'Plan hazır' : 'Sohbet devam ediyor'}
                      {project.is_active ? ' · Aktif' : ''}
                    </ThemedText>
                  </View>
                  {busyId === project.id && <ActivityIndicator color={theme.tint} />}
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
            onPress={() => void handleNewProject()}
            style={({ pressed }) => [
              styles.newButton,
              { backgroundColor: theme.tint, opacity: pressed ? 0.85 : 1 },
            ]}>
            {busyId === 'new' ? (
              <ActivityIndicator color={theme.background} />
            ) : (
              <ThemedText type="smallBold" style={{ color: theme.background }}>
                Yeni Niyet Başlat
              </ThemedText>
            )}
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

type PlanPickerSheetProps = {
  visible: boolean;
  onClose: () => void;
  onPlanChanged: () => void;
};

export function PlanPickerSheet({ visible, onClose, onPlanChanged }: PlanPickerSheetProps) {
  const theme = useTheme();
  const router = useRouter();
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
    setBusyId('new');
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
      setError(e instanceof ApiError ? e.message : 'Yeni plan başlatılamadı.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: theme.background }]} onPress={() => {}}>
          <ThemedText type="subtitle">Planlarım</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Planlarını görüntüle, isimlendir veya yeni bir niyet başlat.
          </ThemedText>
          {loading ? (
            <ActivityIndicator color={theme.tint} style={styles.loader} />
          ) : (
            <ScrollView contentContainerStyle={styles.list}>
              {projects
                .filter((project) => project.has_content)
                .map((project) => (
                  <ThemedView
                    key={project.id}
                    style={[styles.row, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
                    {editingId === project.id ? (
                      <TextInput
                        value={draftName}
                        onChangeText={setDraftName}
                        autoFocus
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
                    <Pressable
                      onPress={() => {
                        if (editingId === project.id) {
                          void handleRename(project.id);
                          return;
                        }
                        setEditingId(project.id);
                        setDraftName(project.name);
                      }}
                      disabled={busyId !== null}>
                      <ThemedText type="smallBold" themeColor="tint">
                        {editingId === project.id ? 'Kaydet' : 'İsimlendir'}
                      </ThemedText>
                    </Pressable>
                  </ThemedView>
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
              <ActivityIndicator color={theme.background} />
            ) : (
              <ThemedText type="smallBold" style={{ color: theme.background }}>
                Yeni Plan Ekle
              </ThemedText>
            )}
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
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
  list: {
    gap: Spacing.two,
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
});

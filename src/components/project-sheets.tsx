import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { type Href, useRouter } from 'expo-router';

import { ProBadge } from '@/components/pro-badge';
import { CategoryBadge } from '@/components/ui/category-badge';
import { ThemedText } from '@/components/themed-text';
import { Fonts, MaxContentWidth, Radii, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { canUseProModules } from '@/hooks/use-premium-access';
import { useTheme } from '@/hooks/use-theme';
import {
  activateChatThread,
  activateProject,
  ApiError,
  type ChatThread,
  isPaywallError,
  listChatThreads,
  listProjects,
  PlanSummary,
  renameProject,
  resetChat,
  startNewProject,
  type SubscriptionInfo,
} from '@/lib/api';
import { needsPaidPlanForSecondProject } from '@/lib/project-access';
import { showConfirm } from '@/lib/web-alert';

const DRAWER_WIDTH = Math.min(Dimensions.get('window').width * 0.86, 340);
const HIT_SLOP_44 = { top: 12, bottom: 12, left: 12, right: 12 } as const;

/**
 * faz8.13/5: Modal kapanırken yapılan navigasyon Android'de yarış nedeniyle
 * yutulabiliyordu ("plan değiştir → sohbete düşmüyor"). Kapanış animasyonu
 * bittikten sonra yönlendiririz — akış her cihazda sohbete iner.
 */
function navigateAfterModalClose(router: ReturnType<typeof useRouter>, href: Href) {
  setTimeout(() => router.replace(href), 320);
}

/** Oturum zamanı: bugünse saat, bu yılsa gün+ay, değilse tam tarih. */
function formatThreadTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const sameDay =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();
  if (sameDay) {
    return `Bugün ${date.getHours().toString().padStart(2, '0')}:${date
      .getMinutes()
      .toString()
      .padStart(2, '0')}`;
  }
  const months = [
    'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
    'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara',
  ];
  const dayMonth = `${date.getDate()} ${months[date.getMonth()]}`;
  return date.getFullYear() === now.getFullYear()
    ? dayMonth
    : `${dayMonth} ${date.getFullYear()}`;
}

function planSubtitle(project: PlanSummary): string {
  if (project.has_content) return 'Plan hazır · günlük görevlerin seni bekliyor';
  return 'Sohbet devam ediyor · niyet henüz plana dönmedi';
}

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
  const scheme = useColorScheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [projects, setProjects] = useState<PlanSummary[]>([]);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Sohbet oturumları + planlar paralel yüklenir (FAZ 7.6).
      // Threads API düşse bile panel açılır (catch → []).
      const [projectList, threadList] = await Promise.all([
        listProjects(),
        listChatThreads().catch(() => [] as ChatThread[]),
      ]);
      setProjects(projectList);
      setThreads(threadList);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : 'Bağlam yüklenemedi. Bağlantını kontrol edip tekrar dener misin?',
      );
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
      setError(e instanceof ApiError ? e.message : 'Niyet değiştirilemedi.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleActivateThread(threadId: string) {
    setBusyId(threadId);
    setError(null);
    try {
      await activateChatThread(threadId);
      onProjectChanged(); // sohbet ekranı seçilen oturumla yeniden yüklenir
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Sohbete dönülemedi.');
    } finally {
      setBusyId(null);
    }
  }

  async function performChatReset() {
    setBusyId('reset');
    setError(null);
    try {
      await resetChat();
      onProjectChanged(); // sohbet ekranı taze karşılamayla yeniden yüklenir
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Yeni sohbet başlatılamadı.');
    } finally {
      setBusyId(null);
    }
  }

  function handleNewChat() {
    // FAZ 7.6: yeni sohbet ESKİYİ SİLMEZ — geçmiş oturum bu panelde
    // başlığıyla saklanır. Onay diyaloğuna gerek kalmadı.
    void performChatReset();
  }

  async function handleNewProject() {
    if (needsPaidPlanForSecondProject(projects, subscriptionStatus)) {
      onClose();
      showConfirm(
        'İkinci plan için abonelik',
        'İlk planın hazır. Deneme süresinde bile yalnızca 1 plan açılır; yeni niyet için mağaza aboneliği gerekir.',
        {
          confirmLabel: 'Aboneliğe git',
          onConfirm: () => router.push('/paywall'),
        },
      );
      return;
    }
    setBusyId('new');
    setError(null);
    try {
      await startNewProject();
      // Backend yeni sohbet thread açar; odak yenilemesi taze karşılama yükler.
      onProjectChanged();
      onClose();
      // Tab'lar arası: push yerine replace — Planım'da kalma.
      navigateAfterModalClose(router, '/' as Href);
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

  const overlayOpacity = scheme === 'dark' ? 0.55 : 0.32;

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={onClose}>
      <View style={styles.overlayRoot}>
        <Animated.View
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(160)}
          style={styles.backdrop}>
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: theme.text, opacity: overlayOpacity },
            ]}
          />
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Bağlam panelini kapat"
          />
        </Animated.View>

        <Animated.View
          entering={SlideInLeft.duration(260)}
          exiting={SlideOutLeft.duration(220)}
          style={[
            styles.drawer,
            Shadows.lifted,
            {
              width: DRAWER_WIDTH,
              backgroundColor: theme.backgroundElement,
              borderColor: theme.border,
              paddingTop: insets.top + Spacing.three,
              paddingBottom: insets.bottom + Spacing.three,
              shadowOffset: { width: 4, height: 0 },
            },
          ]}>
          <View style={styles.drawerHeader}>
            <View style={styles.headerTitles}>
              <ThemedText type="subtitle">Bağlam</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Sohbetlerin ve niyetlerin burada — dilediğine dön.
              </ThemedText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Paneli kapat"
              onPress={onClose}
              hitSlop={HIT_SLOP_44}
              style={({ pressed }) => [
                styles.closeButton,
                { backgroundColor: theme.surfaceMuted },
                pressed && styles.pressed,
              ]}>
              <MaterialCommunityIcons name="close" size={20} color={theme.textSecondary} />
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.stateBlock} accessibilityLabel="Bağlam yükleniyor">
              <ActivityIndicator color={theme.tint} />
              <ThemedText type="small" themeColor="textSecondary" style={styles.stateCopy}>
                Sohbetlerin ve niyetlerin yükleniyor…
              </ThemedText>
            </View>
          ) : (
            <ScrollView
              style={styles.listScroll}
              contentContainerStyle={styles.list}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="chat-outline" size={16} color={theme.textSecondary} />
                <ThemedText type="smallBold" themeColor="textSecondary">
                  Sohbetler
                </ThemedText>
              </View>

              {threads.length === 0 ? (
                <View
                  style={[
                    styles.emptyCard,
                    { backgroundColor: theme.surfaceMuted, borderColor: theme.border },
                  ]}>
                  <ThemedText type="smallBold">Henüz saklı sohbet yok</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Yeni sohbet başlattığında buraya düşer — eskiler silinmez.
                  </ThemedText>
                </View>
              ) : (
                threads.map((thread) => {
                  const active = thread.is_active;
                  return (
                    <Pressable
                      key={thread.id}
                      disabled={busyId !== null}
                      onPress={() => void handleActivateThread(thread.id)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active, busy: busyId === thread.id }}
                      accessibilityLabel={`${thread.title || 'Yeni sohbet'}${active ? ', aktif sohbet' : ''}`}
                      style={({ pressed }) => [
                        styles.row,
                        {
                          borderColor: active ? theme.tint : theme.border,
                          backgroundColor: active
                            ? theme.backgroundSelected
                            : theme.background,
                          opacity: pressed ? 0.82 : 1,
                        },
                      ]}>
                      {active ? (
                        <View style={[styles.activeRail, { backgroundColor: theme.tint }]} />
                      ) : null}
                      <View style={styles.rowText}>
                        <View style={styles.rowTitleLine}>
                          <ThemedText
                            type="smallBold"
                            numberOfLines={1}
                            style={styles.rowTitle}>
                            {thread.title || 'Yeni sohbet'}
                          </ThemedText>
                          {active ? <CategoryBadge label="Aktif" variant="done" /> : null}
                        </View>
                        <ThemedText type="small" themeColor="textSecondary">
                          {formatThreadTime(thread.updated_at) || 'Az önce'}
                        </ThemedText>
                      </View>
                      {busyId === thread.id ? (
                        <ActivityIndicator color={theme.tint} />
                      ) : null}
                    </Pressable>
                  );
                })
              )}

              <View style={[styles.sectionHeader, styles.sectionGap]}>
                <MaterialCommunityIcons name="sprout" size={16} color={theme.textSecondary} />
                <ThemedText type="smallBold" themeColor="textSecondary">
                  Niyetlerim
                </ThemedText>
              </View>

              {projects.length === 0 ? (
                <View
                  style={[
                    styles.emptyCard,
                    { backgroundColor: theme.surfaceMuted, borderColor: theme.border },
                  ]}>
                  <ThemedText type="smallBold">Henüz niyet yok</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    İlk niyetini sohbetle çıkar; planın burada görünecek.
                  </ThemedText>
                </View>
              ) : (
                projects.map((project) => {
                  const active = project.is_active;
                  const subtitle = planSubtitle(project);
                  return (
                    <Pressable
                      key={project.id}
                      disabled={busyId !== null}
                      onPress={() => void handleActivate(project.id)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active, busy: busyId === project.id }}
                      accessibilityLabel={`${project.name}${active ? ', aktif niyet' : ''}`}
                      style={({ pressed }) => [
                        styles.row,
                        {
                          borderColor: active ? theme.accentWarm : theme.border,
                          backgroundColor: active
                            ? theme.backgroundSelected
                            : theme.background,
                          opacity: pressed ? 0.82 : 1,
                        },
                      ]}>
                      {active ? (
                        <View
                          style={[styles.activeRail, { backgroundColor: theme.accentWarm }]}
                        />
                      ) : null}
                      <View style={styles.rowText}>
                        <View style={styles.rowTitleLine}>
                          <ThemedText
                            type="smallBold"
                            numberOfLines={1}
                            style={styles.rowTitle}>
                            {project.name}
                          </ThemedText>
                          {active ? <CategoryBadge label="Aktif" variant="points" /> : null}
                        </View>
                        <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
                          {subtitle}
                        </ThemedText>
                      </View>
                      {busyId === project.id ? (
                        <ActivityIndicator color={theme.tint} />
                      ) : null}
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          )}

          {error ? (
            <View
              style={[
                styles.errorCard,
                { backgroundColor: theme.surfaceMuted, borderColor: theme.danger },
              ]}>
              <ThemedText type="small" themeColor="danger">
                {error}
              </ThemedText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Tekrar dene"
                onPress={() => void load()}
                hitSlop={HIT_SLOP_44}
                style={({ pressed }) => [styles.retryLink, pressed && styles.pressed]}>
                <ThemedText type="smallBold" themeColor="tint">
                  Tekrar dene
                </ThemedText>
              </Pressable>
            </View>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Felsefe yolları"
            accessibilityHint={
              canUseProModules(subscriptionStatus)
                ? undefined
                : 'Önizleme açık; PRO ile tam içerik'
            }
            onPress={() => {
              onClose();
              // FAZ 8.10 kapı içeride — paywall'a atma; yollar ekranı kilit kartı gösterir.
              router.push('/yollar');
            }}
            style={({ pressed }) => [
              styles.pathsLink,
              {
                borderColor: theme.border,
                backgroundColor: theme.backgroundSelected,
                opacity: pressed ? 0.7 : 1,
              },
            ]}>
            <View style={styles.pathsTitleRow}>
              <ThemedText type="smallBold" themeColor="tint">
                ✿ Felsefe Yolları
              </ThemedText>
              {!canUseProModules(subscriptionStatus) ? <ProBadge /> : null}
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              {canUseProModules(subscriptionStatus)
                ? 'İlkbahar tonlarında ilham → yola çevir'
                : 'Önizle — PRO ile yolları aç'}
            </ThemedText>
          </Pressable>

          <Pressable
            disabled={busyId !== null}
            onPress={handleNewChat}
            accessibilityRole="button"
            accessibilityLabel="Yeni sohbet başlat"
            accessibilityHint="Eski sohbetler silinmez"
            hitSlop={HIT_SLOP_44}
            style={({ pressed }) => [
              styles.newButton,
              styles.secondaryButton,
              {
                borderColor: theme.accentWarm,
                opacity: pressed ? 0.85 : 1,
              },
            ]}>
            {busyId === 'reset' ? (
              <ActivityIndicator color={theme.accentWarm} />
            ) : (
              <ThemedText type="smallBold" style={{ color: theme.accentWarm }}>
                Yeni Sohbet Başlat
              </ThemedText>
            )}
          </Pressable>

          <Pressable
            disabled={busyId !== null}
            onPress={() => {
              void handleNewProject();
            }}
            accessibilityRole="button"
            accessibilityLabel="Yeni niyet başlat"
            hitSlop={HIT_SLOP_44}
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
  const scheme = useColorScheme();
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
      setError(
        e instanceof ApiError
          ? e.message
          : 'Planlar yüklenemedi. Birazdan tekrar dener misin?',
      );
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
      onClose();
      showConfirm(
        'İkinci plan için abonelik',
        'Yeni bir niyet başlatmak için abonelik gerekiyor. Aboneliğe göz atmak ister misin?',
        {
          confirmLabel: 'Aboneliğe git',
          onConfirm: () => router.push('/paywall'),
        },
      );
      return;
    }
    setBusyId('new');
    setError(null);
    try {
      await startNewProject();
      onPlanChanged();
      onClose();
      navigateAfterModalClose(router, '/' as Href);
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

  const contentPlans = projects.filter((project) => project.has_content);
  const overlayOpacity = scheme === 'dark' ? 0.55 : 0.32;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.sheetRoot}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.sheetBackdrop}>
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: theme.text, opacity: overlayOpacity },
            ]}
          />
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Paneli kapat"
          />
        </View>
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
            <View style={styles.stateBlock}>
              <ActivityIndicator color={theme.tint} />
              <ThemedText type="small" themeColor="textSecondary" style={styles.stateCopy}>
                Planların yükleniyor…
              </ThemedText>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
              {contentPlans.length === 0 ? (
                <View
                  style={[
                    styles.emptyCard,
                    { backgroundColor: theme.surfaceMuted, borderColor: theme.border },
                  ]}>
                  <ThemedText type="smallBold">Hazır plan yok</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Sohbetten bir niyet çıkarınca planın burada listelenir.
                  </ThemedText>
                </View>
              ) : (
                contentPlans.map((project) => (
                  <View
                    key={project.id}
                    style={[
                      styles.row,
                      {
                        borderColor: project.is_active ? theme.accentWarm : theme.border,
                        backgroundColor: project.is_active
                          ? theme.backgroundSelected
                          : theme.background,
                      },
                    ]}>
                    {project.is_active ? (
                      <View
                        style={[styles.activeRail, { backgroundColor: theme.accentWarm }]}
                      />
                    ) : null}
                    {editingId === project.id ? (
                      <TextInput
                        value={draftName}
                        onChangeText={setDraftName}
                        autoFocus
                        returnKeyType="done"
                        onSubmitEditing={() => void handleRename(project.id)}
                        accessibilityLabel="Plan adı"
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
                        disabled={busyId !== null}
                        accessibilityRole="button"
                        accessibilityState={{ selected: project.is_active }}
                        accessibilityLabel={`${project.name}${project.is_active ? ', aktif plan' : ''}`}>
                        <View style={styles.rowTitleLine}>
                          <ThemedText type="smallBold" style={styles.rowTitle} numberOfLines={1}>
                            {project.name}
                          </ThemedText>
                          {project.is_active ? (
                            <CategoryBadge label="Aktif" variant="points" />
                          ) : null}
                        </View>
                        <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
                          {planSubtitle(project)}
                        </ThemedText>
                      </Pressable>
                    )}
                    {editingId === project.id ? (
                      <Pressable
                        onPress={() => setEditingId(null)}
                        disabled={busyId !== null}
                        hitSlop={HIT_SLOP_44}
                        accessibilityRole="button"
                        accessibilityLabel="İsimlendirmeyi vazgeç">
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
                      hitSlop={HIT_SLOP_44}
                      accessibilityRole="button"
                      accessibilityLabel={
                        editingId === project.id ? 'İsmi kaydet' : 'Planı isimlendir'
                      }>
                      <ThemedText type="smallBold" themeColor="tint">
                        {editingId === project.id ? 'Kaydet' : 'İsimlendir'}
                      </ThemedText>
                    </Pressable>
                  </View>
                ))
              )}
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
            accessibilityRole="button"
            accessibilityLabel="Yeni plan ekle"
            hitSlop={HIT_SLOP_44}
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
  },
  drawer: {
    borderRightWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  headerTitles: {
    flex: 1,
    gap: Spacing.half,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
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
  stateBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.five,
  },
  stateCopy: {
    textAlign: 'center',
    paddingHorizontal: Spacing.three,
  },
  listScroll: {
    flex: 1,
  },
  list: {
    gap: Spacing.two,
    paddingBottom: Spacing.two,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    marginBottom: Spacing.half,
  },
  sectionGap: {
    marginTop: Spacing.three,
  },
  emptyCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radii.large,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  errorCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radii.medium,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  retryLink: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
  },
  row: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radii.large,
    padding: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    overflow: 'hidden',
    position: 'relative',
  },
  activeRail: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  rowText: {
    flex: 1,
    gap: Spacing.half,
  },
  rowTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  rowTitle: {
    flexShrink: 1,
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
  secondaryButton: {
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  pathsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  pathsLink: {
    gap: 2,
    borderWidth: 1,
    borderRadius: Radii.medium,
    padding: Spacing.three,
    minHeight: 44,
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});

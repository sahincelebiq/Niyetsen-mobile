import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import Animated, { FadeIn, FadeOut, SlideInDown, SlideInLeft, SlideOutDown, SlideOutLeft } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { type Href, useRouter } from 'expo-router';

import { CategoryBadge } from '@/components/ui/category-badge';
import { ThemedText } from '@/components/themed-text';
import { Fonts, MaxContentWidth, Motion, Radii, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import {
  activateChatThread,
  activateProject,
  ApiError,
  type ChatThread,
  deleteChatThread,
  isPaywallError,
  listChatThreads,
  listProjects,
  PlanSummary,
  renameChatThread,
  resetChat,
  startNewProject,
  type SubscriptionInfo,
} from '@/lib/api';
import { needsPaidPlanForSecondProject } from '@/lib/project-access';
import { loadPinnedThreads, togglePinnedThread } from '@/lib/thread-prefs';
import { showConfirm } from '@/lib/web-alert';
import { useLocale } from '@/providers/locale-provider';

const DRAWER_WIDTH = Math.min(Dimensions.get('window').width * 0.86, 340);
const HIT_SLOP_44 = { top: 12, bottom: 12, left: 12, right: 12 } as const;
/** Bu kadar ve üzeri sohbette liste üstünde arama alanı görünür. */
const SEARCH_THRESHOLD = 10;

/**
 * faz8.13/5: Modal kapanırken yapılan navigasyon Android'de yarış nedeniyle
 * yutulabiliyordu ("plan değiştir → sohbete düşmüyor"). Kapanış animasyonu
 * bittikten sonra yönlendiririz — akış her cihazda sohbete iner.
 */
function navigateAfterModalClose(router: ReturnType<typeof useRouter>, href: Href) {
  setTimeout(() => router.replace(href), 320);
}

type ThreadGroupKey = 'today' | 'week' | 'earlier';

function threadGroupKey(iso: string): ThreadGroupKey {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'earlier';
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round(
    (startOfToday.getTime() - startOfDate.getTime()) / 86_400_000,
  );
  if (diffDays <= 0) return 'today';
  if (diffDays < 7) return 'week';
  return 'earlier';
}

type ChatHistorySheetProps = {
  visible: boolean;
  onClose: () => void;
  onProjectChanged: () => void;
  subscriptionStatus?: SubscriptionInfo | null;
};

/**
 * BAĞLAM paneli (ss-09 yeniden yazımı): üstte sabit başlık, ortada
 * kaydırılabilir liste (tarih gruplu + aranabilir + satır aksiyonlu),
 * altta sabit aksiyon bloğu. Liste alt bloğun altına girmez; Felsefe
 * Yolları kartı buradan kalktı (composer yanındaki ✿ ikonuna taşındı).
 */
export function ChatHistorySheet({
  visible,
  onClose,
  onProjectChanged,
  subscriptionStatus,
}: ChatHistorySheetProps) {
  const theme = useTheme();
  const scheme = useColorScheme();
  const { t, locale } = useLocale();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [projects, setProjects] = useState<PlanSummary[]>([]);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [pins, setPins] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionThread, setActionThread] = useState<ChatThread | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');

  const copy = t.chat.history;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Sohbet oturumları + planlar + pin tercihleri paralel yüklenir.
      // Threads API düşse bile panel açılır (catch → []).
      const [projectList, threadList, pinList] = await Promise.all([
        listProjects(),
        listChatThreads().catch(() => [] as ChatThread[]),
        loadPinnedThreads(),
      ]);
      setProjects(projectList);
      setThreads(threadList);
      setPins(pinList);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : copy.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [copy.loadFailed]);

  useEffect(() => {
    if (visible) {
      setSearch('');
      setActionThread(null);
      setEditingId(null);
      void load();
    }
  }, [visible, load]);

  const formatThreadTime = useCallback(
    (iso: string): string => {
      const date = new Date(iso);
      if (Number.isNaN(date.getTime())) return '';
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const diffDays = Math.round(
        (startOfToday.getTime() - startOfDate.getTime()) / 86_400_000,
      );
      const time = `${date.getHours().toString().padStart(2, '0')}:${date
        .getMinutes()
        .toString()
        .padStart(2, '0')}`;
      if (diffDays <= 0) {
        return now.getTime() - date.getTime() < 60_000
          ? copy.timeNow
          : copy.timeTodayAt(time);
      }
      if (diffDays === 1) return copy.timeYesterday;
      if (diffDays < 7) return copy.timeDaysAgo(diffDays);
      try {
        return new Intl.DateTimeFormat(locale, {
          day: 'numeric',
          month: 'short',
          year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric',
        }).format(date);
      } catch {
        return iso.slice(0, 10);
      }
    },
    [copy, locale],
  );

  const threadSections = useMemo(() => {
    const query = search.trim().toLocaleLowerCase(locale);
    const visibleThreads = query
      ? threads.filter((thread) =>
          (thread.title || copy.newChatFallback).toLocaleLowerCase(locale).includes(query),
        )
      : threads;
    const pinned = visibleThreads.filter((thread) => pins.includes(thread.id));
    const rest = visibleThreads.filter((thread) => !pins.includes(thread.id));
    const groups: { key: ThreadGroupKey; label: string; items: ChatThread[] }[] = (
      [
        ['today', copy.groupToday],
        ['week', copy.groupWeek],
        ['earlier', copy.groupEarlier],
      ] as const
    )
      .map(([key, label]) => ({
        key,
        label,
        items: rest.filter((thread) => threadGroupKey(thread.updated_at) === key),
      }))
      .filter((group) => group.items.length > 0);
    return { pinned, groups };
  }, [threads, pins, search, locale, copy]);

  async function handleActivate(planId: string) {
    setBusyId(planId);
    setError(null);
    try {
      await activateProject(planId);
      onProjectChanged();
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : copy.intentFailed);
    } finally {
      setBusyId(null);
    }
  }

  async function handleActivateThread(threadId: string) {
    if (editingId) return;
    setBusyId(threadId);
    setError(null);
    try {
      await activateChatThread(threadId);
      onProjectChanged(); // sohbet ekranı seçilen oturumla yeniden yüklenir
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : copy.activateFailed);
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
      setError(e instanceof ApiError ? e.message : copy.newChatFailed);
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
      showConfirm(copy.secondPlanTitle, copy.secondPlanBody, {
        confirmLabel: copy.goSubscription,
        onConfirm: () => router.push('/paywall'),
      });
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
      setError(e instanceof ApiError ? e.message : copy.newIntentFailed);
    } finally {
      setBusyId(null);
    }
  }

  function startRename(thread: ChatThread) {
    setActionThread(null);
    setEditingId(thread.id);
    setDraftName(thread.title || '');
  }

  async function handleRename(threadId: string) {
    const title = draftName.trim();
    if (!title) return;
    setBusyId(threadId);
    setError(null);
    try {
      await renameChatThread(threadId, title);
      setEditingId(null);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : copy.renameFailed);
    } finally {
      setBusyId(null);
    }
  }

  async function handleTogglePin(thread: ChatThread) {
    setActionThread(null);
    setPins(await togglePinnedThread(pins, thread.id));
  }

  function handleDelete(thread: ChatThread) {
    setActionThread(null);
    showConfirm(copy.deleteTitle, copy.deleteBody, {
      confirmLabel: copy.remove,
      onConfirm: () => {
        void (async () => {
          setBusyId(thread.id);
          setError(null);
          try {
            await deleteChatThread(thread.id);
            if (thread.is_active) {
              // Aktif oturum silindi: sohbet ekranı taze oturumla yüklensin.
              onProjectChanged();
              onClose();
              return;
            }
            await load();
          } catch (e) {
            setError(e instanceof ApiError ? e.message : copy.deleteFailed);
          } finally {
            setBusyId(null);
          }
        })();
      },
    });
  }

  function renderThreadRow(thread: ChatThread) {
    const active = thread.is_active;
    const title = thread.title || copy.newChatFallback;
    const pinned = pins.includes(thread.id);
    return (
      <View
        key={thread.id}
        style={[
          styles.row,
          {
            borderColor: active ? theme.tint : theme.border,
            backgroundColor: active ? theme.backgroundSelected : theme.background,
          },
        ]}>
        {active ? (
          <View style={[styles.activeRail, { backgroundColor: theme.tint }]} />
        ) : null}
        {editingId === thread.id ? (
          <TextInput
            value={draftName}
            onChangeText={setDraftName}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={() => void handleRename(thread.id)}
            accessibilityLabel={copy.renameLabel}
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
            disabled={busyId !== null}
            onPress={() => void handleActivateThread(thread.id)}
            onLongPress={() => setActionThread(thread)}
            accessibilityRole="button"
            accessibilityState={{ selected: active, busy: busyId === thread.id }}
            accessibilityLabel={`${title}${active ? `, ${copy.activeBadge}` : ''}`}>
            <View style={styles.rowTitleLine}>
              {pinned ? (
                <MaterialCommunityIcons
                  name="pin"
                  size={13}
                  color={theme.textSecondary}
                />
              ) : null}
              <ThemedText type="smallBold" numberOfLines={1} style={styles.rowTitle}>
                {title}
              </ThemedText>
              {active ? <CategoryBadge label={copy.activeBadge} variant="done" /> : null}
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              {formatThreadTime(thread.updated_at) || copy.timeNow}
            </ThemedText>
          </Pressable>
        )}
        {editingId === thread.id ? (
          <View style={styles.editActions}>
            <Pressable
              onPress={() => setEditingId(null)}
              disabled={busyId !== null}
              hitSlop={HIT_SLOP_44}
              accessibilityRole="button"
              accessibilityLabel={t.common.cancel}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                {t.common.cancel}
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => void handleRename(thread.id)}
              disabled={busyId !== null || !draftName.trim()}
              hitSlop={HIT_SLOP_44}
              accessibilityRole="button"
              accessibilityLabel={t.common.save}>
              <ThemedText
                type="smallBold"
                themeColor={draftName.trim() ? 'tint' : 'textSecondary'}>
                {t.common.save}
              </ThemedText>
            </Pressable>
          </View>
        ) : (
          <View style={styles.rowTail}>
            {busyId === thread.id ? (
              <ActivityIndicator color={theme.tint} />
            ) : null}
            <Pressable
              onPress={() => setActionThread(thread)}
              disabled={busyId !== null}
              hitSlop={HIT_SLOP_44}
              accessibilityRole="button"
              accessibilityLabel={copy.rowActions(title)}
              style={({ pressed }) => [styles.moreButton, pressed && styles.pressed]}>
              <MaterialCommunityIcons
                name="dots-vertical"
                size={20}
                color={theme.textSecondary}
              />
            </Pressable>
          </View>
        )}
      </View>
    );
  }

  const overlayOpacity = scheme === 'dark' ? 0.55 : 0.32;
  const showSearch = threads.length >= SEARCH_THRESHOLD;

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
            accessibilityLabel={copy.close}
          />
        </Animated.View>

        <Animated.View
          entering={SlideInLeft.duration(Motion.base)}
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
          <KeyboardAvoidingView
            style={styles.drawerFlex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.drawerHeader}>
              <View style={styles.headerTitles}>
                <ThemedText type="subtitle">{copy.title}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {copy.subtitle}
                </ThemedText>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={copy.close}
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

            {showSearch ? (
              <View
                style={[
                  styles.searchShell,
                  { backgroundColor: theme.surfaceMuted, borderColor: theme.border },
                ]}>
                <MaterialCommunityIcons
                  name="magnify"
                  size={18}
                  color={theme.textSecondary}
                />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder={copy.searchPlaceholder}
                  placeholderTextColor={theme.textSecondary}
                  accessibilityLabel={copy.searchPlaceholder}
                  style={[
                    styles.searchInput,
                    { color: theme.text, fontFamily: Fonts.sansMedium },
                  ]}
                />
              </View>
            ) : null}

            {loading ? (
              <View style={styles.stateBlock} accessibilityLabel={copy.loading}>
                <ActivityIndicator color={theme.tint} />
                <ThemedText type="small" themeColor="textSecondary" style={styles.stateCopy}>
                  {copy.loading}
                </ThemedText>
              </View>
            ) : (
              <ScrollView
                style={styles.listScroll}
                contentContainerStyle={styles.list}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}>
                <View style={styles.sectionHeader}>
                  <MaterialCommunityIcons
                    name="chat-outline"
                    size={16}
                    color={theme.textSecondary}
                  />
                  <ThemedText type="smallBold" themeColor="textSecondary">
                    {copy.chatsSection}
                  </ThemedText>
                </View>

                {threads.length === 0 ? (
                  <View
                    style={[
                      styles.emptyCard,
                      { backgroundColor: theme.surfaceMuted, borderColor: theme.border },
                    ]}>
                    <ThemedText type="smallBold">{copy.emptyTitle}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {copy.emptyBody}
                    </ThemedText>
                  </View>
                ) : (
                  <>
                    {threadSections.pinned.length > 0 ? (
                      <View style={styles.groupBlock}>
                        <ThemedText
                          type="small"
                          themeColor="textSecondary"
                          style={styles.groupLabel}>
                          {copy.pinnedSection}
                        </ThemedText>
                        {threadSections.pinned.map(renderThreadRow)}
                      </View>
                    ) : null}
                    {threadSections.groups.map((group) => (
                      <View key={group.key} style={styles.groupBlock}>
                        <ThemedText
                          type="small"
                          themeColor="textSecondary"
                          style={styles.groupLabel}>
                          {group.label}
                        </ThemedText>
                        {group.items.map(renderThreadRow)}
                      </View>
                    ))}
                    {threadSections.pinned.length === 0 &&
                    threadSections.groups.length === 0 ? (
                      <ThemedText type="small" themeColor="textSecondary">
                        {copy.emptyTitle}
                      </ThemedText>
                    ) : null}
                  </>
                )}

                <View style={[styles.sectionHeader, styles.sectionGap]}>
                  <MaterialCommunityIcons
                    name="sprout"
                    size={16}
                    color={theme.textSecondary}
                  />
                  <ThemedText type="smallBold" themeColor="textSecondary">
                    {copy.intentsSection}
                  </ThemedText>
                </View>

                {projects.length === 0 ? (
                  <View
                    style={[
                      styles.emptyCard,
                      { backgroundColor: theme.surfaceMuted, borderColor: theme.border },
                    ]}>
                    <ThemedText type="smallBold">{copy.noIntentTitle}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {copy.noIntentBody}
                    </ThemedText>
                  </View>
                ) : (
                  projects.map((project) => {
                    const active = project.is_active;
                    return (
                      <Pressable
                        key={project.id}
                        disabled={busyId !== null}
                        onPress={() => void handleActivate(project.id)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active, busy: busyId === project.id }}
                        accessibilityLabel={`${project.name}${active ? `, ${copy.activeBadge}` : ''}`}
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
                            {active ? (
                              <CategoryBadge label={copy.activeBadge} variant="points" />
                            ) : null}
                          </View>
                          <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
                            {project.has_content ? copy.planReady : copy.planPending}
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
                  accessibilityLabel={t.common.retry}
                  onPress={() => void load()}
                  hitSlop={HIT_SLOP_44}
                  style={({ pressed }) => [styles.retryLink, pressed && styles.pressed]}>
                  <ThemedText type="smallBold" themeColor="tint">
                    {t.common.retry}
                  </ThemedText>
                </Pressable>
              </View>
            ) : null}

            <View style={styles.footerBlock}>
              <Pressable
                disabled={busyId !== null}
                onPress={handleNewChat}
                accessibilityRole="button"
                accessibilityLabel={copy.newChat}
                accessibilityHint={copy.newChatHint}
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
                    {copy.newChat}
                  </ThemedText>
                )}
              </Pressable>

              <Pressable
                disabled={busyId !== null}
                onPress={() => {
                  void handleNewProject();
                }}
                accessibilityRole="button"
                accessibilityLabel={copy.newIntent}
                hitSlop={HIT_SLOP_44}
                style={({ pressed }) => [
                  styles.newButton,
                  { backgroundColor: theme.accentWarm, opacity: pressed ? 0.85 : 1 },
                ]}>
                {busyId === 'new' ? (
                  <ActivityIndicator color={theme.onAccent} />
                ) : (
                  <ThemedText type="smallBold" style={{ color: theme.onAccent }}>
                    {copy.newIntent}
                  </ThemedText>
                )}
              </Pressable>
            </View>
          </KeyboardAvoidingView>

          {actionThread ? (
            <View style={styles.actionOverlay} pointerEvents="box-none">
              <Animated.View
                entering={FadeIn.duration(Motion.fast)}
                exiting={FadeOut.duration(Motion.fast)}
                style={styles.actionBackdrop}>
                <Pressable
                  style={StyleSheet.absoluteFill}
                  onPress={() => setActionThread(null)}
                  accessibilityRole="button"
                  accessibilityLabel={t.common.cancel}
                />
              </Animated.View>
              <Animated.View
                entering={SlideInDown.duration(Motion.base)}
                exiting={SlideOutDown.duration(Motion.base)}
                style={[
                  styles.actionSheet,
                  { backgroundColor: theme.background, borderColor: theme.border },
                ]}>
                <ThemedText
                  type="small"
                  themeColor="textSecondary"
                  numberOfLines={1}
                  style={styles.actionTitle}>
                  {actionThread.title || copy.newChatFallback}
                </ThemedText>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={copy.rename}
                  onPress={() => startRename(actionThread)}
                  style={({ pressed }) => [
                    styles.actionRow,
                    pressed && { backgroundColor: theme.backgroundSelected },
                  ]}>
                  <MaterialCommunityIcons
                    name="pencil-outline"
                    size={18}
                    color={theme.text}
                  />
                  <ThemedText type="smallBold">{copy.rename}</ThemedText>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    pins.includes(actionThread.id) ? copy.unpin : copy.pin
                  }
                  onPress={() => void handleTogglePin(actionThread)}
                  style={({ pressed }) => [
                    styles.actionRow,
                    pressed && { backgroundColor: theme.backgroundSelected },
                  ]}>
                  <MaterialCommunityIcons
                    name={pins.includes(actionThread.id) ? 'pin-off-outline' : 'pin-outline'}
                    size={18}
                    color={theme.text}
                  />
                  <ThemedText type="smallBold">
                    {pins.includes(actionThread.id) ? copy.unpin : copy.pin}
                  </ThemedText>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={copy.remove}
                  onPress={() => handleDelete(actionThread)}
                  style={({ pressed }) => [
                    styles.actionRow,
                    pressed && { backgroundColor: theme.backgroundSelected },
                  ]}>
                  <MaterialCommunityIcons
                    name="trash-can-outline"
                    size={18}
                    color={theme.danger}
                  />
                  <ThemedText type="smallBold" themeColor="danger">
                    {copy.remove}
                  </ThemedText>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t.common.cancel}
                  onPress={() => setActionThread(null)}
                  style={({ pressed }) => [
                    styles.actionRow,
                    pressed && { backgroundColor: theme.backgroundSelected },
                  ]}>
                  <MaterialCommunityIcons
                    name="close"
                    size={18}
                    color={theme.textSecondary}
                  />
                  <ThemedText type="smallBold" themeColor="textSecondary">
                    {t.common.cancel}
                  </ThemedText>
                </Pressable>
              </Animated.View>
            </View>
          ) : null}
        </Animated.View>
      </View>
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
    maxWidth: MaxContentWidth,
  },
  drawerFlex: {
    flex: 1,
    gap: Spacing.three,
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
  searchShell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.three,
    minHeight: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    paddingVertical: Spacing.two,
    includeFontPadding: false,
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
    minHeight: 0,
  },
  list: {
    gap: Spacing.two,
    // Alt sabit bloğa yapışmadan nefes alır; son satır kesilmez.
    paddingBottom: Spacing.three,
  },
  groupBlock: {
    gap: Spacing.two,
  },
  groupLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: Spacing.one,
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
    marginTop: Spacing.two,
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
  rowTail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  moreButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editActions: {
    alignItems: 'flex-end',
    gap: Spacing.one,
  },
  renameInput: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 15,
  },
  footerBlock: {
    gap: Spacing.two,
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
  actionOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  actionBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  actionSheet: {
    margin: Spacing.two,
    marginBottom: Spacing.three,
    borderRadius: Radii.large,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.two,
    gap: Spacing.half,
  },
  actionTitle: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 48,
    borderRadius: Radii.medium,
    paddingHorizontal: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
});

import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { type Href, useRouter } from 'expo-router';

import { AboveTabsLayer, useSheetBottomPadding } from '@/components/above-tabs-layer';
import { KeyboardAwareView } from '@/components/keyboard-aware-view';
import { CategoryBadge } from '@/components/ui/category-badge';
import { ThemedText } from '@/components/themed-text';
import { Fonts, MaxContentWidth, OverlayScrim, Radii, Shadows, Spacing } from '@/constants/theme';
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
import { showConfirm } from '@/lib/web-alert';

const HIT_SLOP_44 = { top: 12, bottom: 12, left: 12, right: 12 } as const;

/**
 * faz8.13/5: Modal kapanırken yapılan navigasyon Android'de yarış nedeniyle
 * yutulabiliyordu ("plan değiştir → sohbete düşmüyor"). Kapanış animasyonu
 * bittikten sonra yönlendiririz — akış her cihazda sohbete iner.
 */
function navigateAfterModalClose(router: ReturnType<typeof useRouter>, href: Href) {
  setTimeout(() => router.replace(href), 320);
}

function planSubtitle(project: PlanSummary): string {
  if (project.has_content) return 'Plan hazır · günlük görevlerin seni bekliyor';
  return 'Sohbet devam ediyor · niyet henüz plana dönmedi';
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
  const { height: windowHeight } = useWindowDimensions();
  const bottomPadding = useSheetBottomPadding();
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
  const listMaxHeight = Math.round(windowHeight * 0.46);

  return (
    <AboveTabsLayer visible={visible} onRequestClose={onClose}>
      <View style={styles.sheetRoot}>
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: OverlayScrim }]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Paneli kapat"
        />
        <KeyboardAwareView
          fill={false}
          style={[
            styles.sheet,
            Shadows.lifted,
            {
              backgroundColor: theme.backgroundElement,
              borderColor: theme.border,
              paddingBottom: bottomPadding,
              maxHeight: Math.round(windowHeight * 0.78),
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
            <ScrollView
              style={{ maxHeight: listMaxHeight }}
              contentContainerStyle={styles.list}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
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
        </KeyboardAwareView>
      </View>
    </AboveTabsLayer>
  );
}

const styles = StyleSheet.create({
  sheetRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: Radii.sheet,
    borderTopRightRadius: Radii.sheet,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.four,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
    zIndex: 2,
    elevation: 16,
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
  list: {
    gap: Spacing.two,
    paddingBottom: Spacing.two,
  },
  emptyCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radii.large,
    padding: Spacing.three,
    gap: Spacing.one,
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
  pressed: {
    opacity: 0.7,
  },
});

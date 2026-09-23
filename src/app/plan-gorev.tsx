import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorBanner } from '@/components/error-banner';
import { KeyboardAwareView } from '@/components/keyboard-aware-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CategoryBadge } from '@/components/ui/category-badge';
import { SurfaceCard } from '@/components/ui/surface-card';
import { Fonts, ImageScrim, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import {
  ApiError,
  getCurrentPlan,
  getTaskSteps,
  saveTaskSteps,
  type Task,
  type TaskStep,
} from '@/lib/api';
import { safeImageUri } from '@/lib/safe-image-uri';
import { useLocale } from '@/providers/locale-provider';

const MAX_STEPS = 12;

export default function PlanGorevScreen() {
  const { t } = useLocale();
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const scrim = scheme === 'dark' ? ImageScrim.dark : ImageScrim.light;
  const params = useLocalSearchParams<{ taskId?: string }>();
  const taskId = typeof params.taskId === 'string' ? params.taskId : '';

  const [task, setTask] = useState<Task | null>(null);
  const [steps, setSteps] = useState<TaskStep[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!taskId) {
      setError(t.plan.loadFailed);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [plan, listed] = await Promise.all([getCurrentPlan(), getTaskSteps(taskId)]);
      const found = plan?.days?.flatMap((day) => day.tasks ?? []).find((item) => item.id === taskId) ?? null;
      if (!found) {
        setTask(null);
        setError(t.plan.loadFailed);
        return;
      }
      setTask(found);
      setSteps(listed.steps ?? []);
    } catch (value) {
      setError(value instanceof ApiError ? value.message : t.plan.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [t, taskId]);

  useEffect(() => {
    void load();
  }, [load]);

  const doneCount = useMemo(() => steps.filter((step) => step.done).length, [steps]);

  const persist = useCallback(
    async (next: TaskStep[]) => {
      if (!taskId) return;
      setSaving(true);
      setError(null);
      try {
        const saved = await saveTaskSteps(
          taskId,
          next.map((step, index) => ({
            id: step.id,
            title: step.title,
            done: step.done,
            order: index,
          })),
        );
        setSteps(saved.steps);
      } catch (value) {
        setError(value instanceof ApiError ? value.message : t.common.errorGeneric);
        await load();
      } finally {
        setSaving(false);
      }
    },
    [load, t, taskId],
  );

  const coverUri = safeImageUri(task?.image_url);
  const categories = task?.categories ?? [];

  const addStep = useCallback(() => {
    const title = draft.trim();
    if (!title || steps.length >= MAX_STEPS || saving) return;
    setDraft('');
    void persist([
      ...steps,
      { id: '', title, done: false, order: steps.length },
    ]);
  }, [draft, persist, saving, steps]);

  return (
    <ThemedView style={styles.flex}>
      <KeyboardAwareView style={styles.flex}>
        <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
          <ScrollView
            contentContainerStyle={[styles.content, { paddingBottom: Spacing.six + insets.bottom }]}
            keyboardShouldPersistTaps="handled">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.common.back}
              onPress={() => router.back()}
              style={styles.back}>
              <ThemedText type="smallBold" themeColor="tint">
                {t.common.back}
              </ThemedText>
            </Pressable>

            {loading ? (
              <ActivityIndicator color={theme.accentWarm} style={styles.spinner} />
            ) : null}

            {error ? <ErrorBanner message={error} onRetry={() => void load()} /> : null}

            {task ? (
              <SurfaceCard elevated style={styles.card}>
                {coverUri ? (
                  <View style={styles.imageWrap}>
                    <Image source={{ uri: coverUri }} style={styles.image} contentFit="cover" />
                    <View pointerEvents="none" style={[styles.scrim, { backgroundColor: scrim[1] }]} />
                    <ThemedText style={[styles.cover, { color: theme.onAccent }]}>
                      {task.title}
                    </ThemedText>
                  </View>
                ) : null}
                <View style={styles.body}>
                  {!coverUri ? (
                    <ThemedText type="screenTitle" style={styles.plainTitle}>
                      {task.title}
                    </ThemedText>
                  ) : null}
                  {!!task.tiny_version && (
                    <ThemedText type="small" themeColor="textSecondary">
                      {t.daily.tinyPrefix}: {task.tiny_version}
                    </ThemedText>
                  )}
                  <View style={styles.tags}>
                    {categories.map((category) => (
                      <CategoryBadge key={category} label={category} />
                    ))}
                  </View>
                </View>
              </SurfaceCard>
            ) : null}

            {task ? (
              <View style={styles.steps}>
                <ThemedText type="subtitle">{t.plan.stepsTitle}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {t.plan.stepsHint}
                </ThemedText>
                {steps.length > 0 ? (
                  <ThemedText type="smallBold" themeColor="tint">
                    {t.plan.stepsProgress(doneCount, steps.length)}
                  </ThemedText>
                ) : (
                  <ThemedText type="small" themeColor="textSecondary">
                    {t.plan.stepsEmpty}
                  </ThemedText>
                )}
                {steps.map((step) => (
                  <View key={step.id || step.title} style={styles.stepRow}>
                    <Pressable
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: step.done }}
                      onPress={() =>
                        void persist(steps.map((item) => (
                          item.id === step.id ? { ...item, done: !item.done } : item
                        )))
                      }
                      style={({ pressed }) => [
                        styles.check,
                        {
                          borderColor: step.done ? theme.tint : theme.border,
                          backgroundColor: step.done ? theme.backgroundSelected : theme.backgroundElement,
                          opacity: pressed ? 0.8 : 1,
                        },
                      ]}>
                      <ThemedText type="smallBold" themeColor="tint">
                        {step.done ? '✓' : ''}
                      </ThemedText>
                    </Pressable>
                    <ThemedText
                      style={[styles.stepTitle, step.done ? styles.stepDone : null]}>
                      {step.title}
                    </ThemedText>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t.plan.stepsDelete}
                      onPress={() => void persist(steps.filter((item) => item.id !== step.id))}
                      style={styles.delete}>
                      <ThemedText type="smallBold" themeColor="danger">
                        {t.plan.stepsDelete}
                      </ThemedText>
                    </Pressable>
                  </View>
                ))}
                <View style={styles.addRow}>
                  <TextInput
                    value={draft}
                    onChangeText={setDraft}
                    placeholder={t.plan.stepsPlaceholder}
                    placeholderTextColor={theme.textSecondary}
                    maxLength={80}
                    onSubmitEditing={addStep}
                    style={[
                      styles.input,
                      {
                        color: theme.text,
                        borderColor: theme.border,
                        backgroundColor: theme.backgroundElement,
                      },
                    ]}
                  />
                  <Pressable
                    accessibilityRole="button"
                    onPress={addStep}
                    disabled={!draft.trim() || steps.length >= MAX_STEPS || saving}
                    style={({ pressed }) => [
                      styles.add,
                      {
                        backgroundColor: theme.tint,
                        opacity: !draft.trim() || saving ? 0.45 : pressed ? 0.85 : 1,
                      },
                    ]}>
                    <ThemedText type="smallBold" style={{ color: theme.onAccent }}>
                      {saving ? t.common.saving : t.plan.stepsAdd}
                    </ThemedText>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </ScrollView>
        </SafeAreaView>
      </KeyboardAwareView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
  back: {
    minHeight: 44,
    justifyContent: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.two,
  },
  spinner: {
    marginVertical: Spacing.four,
  },
  card: {
    padding: 0,
    overflow: 'hidden',
  },
  imageWrap: {
    position: 'relative',
  },
  image: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  scrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '34%',
  },
  cover: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    bottom: Spacing.three,
    fontFamily: Fonts.serif,
    fontSize: 20,
    lineHeight: 26,
  },
  body: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  plainTitle: {
    fontFamily: Fonts.serif,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  steps: {
    gap: Spacing.two,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 44,
  },
  check: {
    width: 44,
    height: 44,
    borderRadius: Radii.small,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTitle: {
    flex: 1,
  },
  stepDone: {
    opacity: 0.55,
  },
  delete: {
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
  },
  addRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: Radii.medium,
    paddingHorizontal: Spacing.three,
    fontFamily: Fonts.sans,
    fontSize: 16,
  },
  add: {
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

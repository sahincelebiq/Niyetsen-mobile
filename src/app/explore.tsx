import { useCallback, useState } from 'react';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorBanner } from '@/components/error-banner';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError, getCurrentPlan, Plan, PlanDay } from '@/lib/api';

export default function PlanScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const insets = {
    ...safeAreaInsets,
    bottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three,
  };
  const theme = useTheme();
  const router = useRouter();

  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const result = await getCurrentPlan();
      setPlan(result);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Plan yüklenemedi.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const contentPlatformStyle = Platform.select({
    android: {
      paddingTop: insets.top,
      paddingLeft: insets.left,
      paddingRight: insets.right,
      paddingBottom: insets.bottom,
    },
    web: {
      paddingTop: Spacing.six,
      paddingBottom: Spacing.four,
    },
  });

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.background }]}
      contentInset={insets}
      contentContainerStyle={[styles.contentContainer, contentPlatformStyle]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />
      }>
      <ThemedView style={styles.container}>
        <ThemedView style={styles.titleContainer}>
          <ThemedText type="subtitle">Planım</ThemedText>
        </ThemedView>

        {loading && (
          <ThemedView style={styles.centerBlock}>
            <ActivityIndicator size="large" color={theme.textSecondary} />
          </ThemedView>
        )}

        {!loading && error && (
          <ThemedView style={styles.bannerWrapper}>
            <ErrorBanner message={error} onRetry={() => void load()} retrying={refreshing} />
          </ThemedView>
        )}

        {!loading && !error && !plan && (
          <ThemedView style={styles.emptyState}>
            <ThemedText style={styles.centerText} themeColor="textSecondary">
              Henüz bir planın yok. Sohbete başlayıp bu yılki niyetini anlat, sana özel görselli
              planını birlikte çıkaralım. 🌙
            </ThemedText>
            <Pressable
              onPress={() => router.push('/')}
              style={({ pressed }) => [
                styles.ctaButton,
                { backgroundColor: theme.tint },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" style={{ color: theme.background }}>
                Sohbete Başla
              </ThemedText>
            </Pressable>
          </ThemedView>
        )}

        {!loading && !error && plan && (
          <ThemedView style={styles.daysWrapper}>
            {plan.days.map((day) => (
              <DaySection key={day.day} day={day} />
            ))}
          </ThemedView>
        )}
      </ThemedView>
    </ScrollView>
  );
}

function DaySection({ day }: { day: PlanDay }) {
  return (
    <ThemedView style={styles.daySection}>
      <ThemedText type="smallBold">
        Gün {day.day}
        {day.theme ? ` — ${day.theme}` : ''}
      </ThemedText>
      <ThemedView style={styles.taskList}>
        {day.tasks.map((task) => (
          <ThemedView key={task.id} type="backgroundElement" style={styles.taskCard}>
            {!!task.image_url && (
              <Image source={{ uri: task.image_url }} style={styles.taskImage} contentFit="cover" />
            )}
            <ThemedView style={styles.taskInfo}>
              <ThemedText type="default">{task.title}</ThemedText>
              {!!task.tiny_version && (
                <ThemedText type="small" themeColor="textSecondary">
                  En küçük halka: {task.tiny_version}
                </ThemedText>
              )}
              <ThemedView style={styles.tagRow}>
                {task.categories.map((c) => (
                  <ThemedView key={c} type="backgroundSelected" style={styles.tag}>
                    <ThemedText type="small" themeColor="accentWarm">
                      {c}
                    </ThemedText>
                  </ThemedView>
                ))}
              </ThemedView>
            </ThemedView>
          </ThemedView>
        ))}
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  container: {
    maxWidth: MaxContentWidth,
    flexGrow: 1,
    width: '100%',
  },
  titleContainer: {
    gap: Spacing.three,
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
  },
  centerText: {
    textAlign: 'center',
  },
  centerBlock: {
    paddingVertical: Spacing.six,
    alignItems: 'center',
  },
  bannerWrapper: {
    paddingHorizontal: Spacing.four,
  },
  emptyState: {
    gap: Spacing.four,
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.five,
  },
  ctaButton: {
    borderRadius: Spacing.four,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.five,
    shadowColor: '#3B3327',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 2,
  },
  pressed: {
    opacity: 0.8,
  },
  daysWrapper: {
    gap: Spacing.five,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.five,
  },
  daySection: {
    gap: Spacing.three,
  },
  taskList: {
    gap: Spacing.three,
  },
  taskCard: {
    borderRadius: Spacing.three,
    overflow: 'hidden',
    shadowColor: '#3B3327',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 1,
  },
  taskImage: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  taskInfo: {
    padding: Spacing.three,
    gap: Spacing.one,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
    marginTop: Spacing.one,
  },
  tag: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
});

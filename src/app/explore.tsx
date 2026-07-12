import { useCallback, useState } from 'react';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorBanner } from '@/components/error-banner';
import { PlanPickerSheet } from '@/components/project-sheets';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  BottomTabInset, MaxContentWidth, Radii, Shadows, Spacing, Texture,
} from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError, getCurrentPlan, listProjects, Plan, PlanDay } from '@/lib/api';
import { useSubscription } from '@/providers/subscription-provider';

export default function PlanScreen() {
  const { status: subscriptionStatus } = useSubscription();
  const safeAreaInsets = useSafeAreaInsets();
  const insets = {
    ...safeAreaInsets,
    bottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three,
  };
  const theme = useTheme();
  const router = useRouter();

  const [plan, setPlan] = useState<Plan | null>(null);
  const [planTitle, setPlanTitle] = useState('Planım');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [result, projects] = await Promise.all([getCurrentPlan(), listProjects()]);
      setPlan(result);
      const active = projects.find((item) => item.is_active);
      setPlanTitle(active?.name ?? result?.name ?? 'Planım');
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
    <ThemedView style={styles.scrollView}>
      <Image
        source={require('@/assets/images/chat-mystic-bg.png')}
        style={styles.backgroundImage}
        contentFit="cover"
        pointerEvents="none"
      />
      <ScrollView
        style={styles.scrollView}
        contentInset={insets}
        contentContainerStyle={[styles.contentContainer, contentPlatformStyle]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />
        }>
        <ThemedView style={styles.container}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setPickerOpen(true)}
          style={({ pressed }) => [styles.titleContainer, pressed && styles.pressed]}>
          <ThemedText type="subtitle">{planTitle}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Plan değiştir
          </ThemedText>
        </Pressable>

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
      <PlanPickerSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPlanChanged={() => void load()}
        subscriptionStatus={subscriptionStatus}
      />
    </ThemedView>
  );
}

function DaySection({ day }: { day: PlanDay }) {
  const theme = useTheme();
  return (
    <ThemedView style={styles.daySection}>
      <ThemedText type="smallBold">
        Gün {day.day}
        {day.theme ? ` — ${day.theme}` : ''}
      </ThemedText>
      <ThemedView style={styles.taskList}>
        {day.tasks.map((task) => (
          <ThemedView
            key={task.id}
            type="backgroundElement"
            style={[styles.taskCard, { borderColor: theme.border }]}>
            {!!task.image_url && (
              <ThemedView style={styles.imageWrapper}>
                <Image source={{ uri: task.image_url }} style={styles.taskImage} contentFit="cover" />
                {!!task.image_attribution && (
                  <Pressable
                    accessibilityLabel="Fotoğraf atfı"
                    accessibilityHint="Uzun basarak fotoğrafçı bilgisini gör"
                    hitSlop={8}
                    onLongPress={() => {
                      Alert.alert(
                        'Fotoğraf atfı',
                        task.image_attribution,
                        task.image_attribution_url
                          ? [
                              { text: 'Kapat', style: 'cancel' },
                              {
                                text: 'Unsplash’ta aç',
                                onPress: () => void Linking.openURL(task.image_attribution_url),
                              },
                            ]
                          : [{ text: 'Kapat', style: 'cancel' }],
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
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: Texture.backgroundOpacity * 0.7,
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
    borderRadius: Radii.pill,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.five,
    ...(Shadows.soft ?? {}),
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
    borderRadius: Radii.large,
    borderWidth: Texture.cardBorderWidth,
    overflow: 'hidden',
    ...(Shadows.subtle ?? {}),
  },
  taskImage: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  imageWrapper: {
    position: 'relative',
  },
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

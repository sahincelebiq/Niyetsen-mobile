import { useCallback, useState } from 'react';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';

import { Copy } from '@/constants/copy';
import { ErrorBanner } from '@/components/error-banner';
import { PlanPickerSheet } from '@/components/project-sheets';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { CategoryBadge } from '@/components/ui/category-badge';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SurfaceCard } from '@/components/ui/surface-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radii, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError, getCurrentPlan, Plan, PlanDay } from '@/lib/api';
import { useSubscription } from '@/providers/subscription-provider';

export default function PlanScreen() {
  const { status: subscriptionStatus } = useSubscription();
  const theme = useTheme();
  const router = useRouter();

  const [plan, setPlan] = useState<Plan | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      // Not: eskiden burada sonucu kullanılmayan bir listProjects() çağrısı vardı;
      // gereksiz ağ isteği kaldırıldı, ekran daha hızlı yükleniyor.
      setPlan(await getCurrentPlan());
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

  // Önceden tema yoksa uydurma bir niyet cümlesi gösteriliyordu; artık gerçek
  // plan adına düşer — kullanıcıya yanlış bilgi verilmez.
  const contentIntent = plan?.days[0]?.theme || plan?.name || 'Planım';

  return (
    <ThemedView style={styles.flex}>
      <ScreenScaffold
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />
        }>
        <ScreenHeader
          title={Copy.plan.title}
          subtitle={Copy.plan.subtitle}
          trailing={
            <Pressable
              accessibilityRole="button"
              onPress={() => setPickerOpen(true)}
              style={({ pressed }) => [styles.switchPlan, pressed && styles.pressed]}>
              <ThemedText type="smallBold" themeColor="accentWarm">
                {Copy.plan.switchPlan}
              </ThemedText>
            </Pressable>
          }
        />

        {plan && !loading ? (
          <View style={[styles.intentHero, { backgroundColor: theme.tint }]}>
            <ThemedText type="smallBold" style={styles.intentLabel}>
              BU AYIN BÜYÜK NİYETİ
            </ThemedText>
            <ThemedText style={styles.intentText}>{contentIntent}</ThemedText>
          </View>
        ) : null}

        {loading && (
          <ThemedView style={styles.centerBlock}>
            <ActivityIndicator size="large" color={theme.accentWarm} />
          </ThemedView>
        )}

        {!loading && error && <ErrorBanner message={error} onRetry={() => void load()} retrying={refreshing} />}

        {!loading && !error && !plan && (
          <SurfaceCard elevated style={styles.emptyState}>
            <ThemedText style={styles.centerText} themeColor="textSecondary">
              {Copy.plan.emptyBody}
            </ThemedText>
            <Pressable
              onPress={() => router.push('/')}
              style={({ pressed }) => [
                styles.ctaButton,
                { backgroundColor: theme.accentWarm },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" style={{ color: theme.onAccent }}>
                {Copy.plan.startChat}
              </ThemedText>
            </Pressable>
          </SurfaceCard>
        )}

        {!loading && !error && plan && (
          <ThemedView style={styles.daysWrapper}>
            {plan.days.map((day) => (
              <DaySection key={day.day} day={day} />
            ))}
          </ThemedView>
        )}
      </ScreenScaffold>
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
  return (
    <ThemedView style={styles.daySection}>
      <ThemedText type="smallBold">
        Gün {day.day}
        {day.theme ? ` — ${day.theme}` : ''}
      </ThemedText>
      <ThemedView style={styles.taskList}>
        {day.tasks.map((task) => (
          <SurfaceCard key={task.id} elevated style={styles.taskCard}>
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
                  {Copy.daily.tinyPrefix}: {task.tiny_version}
                </ThemedText>
              )}
              <ThemedView style={styles.tagRow}>
                {task.categories.map((c) => (
                  <CategoryBadge key={c} label={c} />
                ))}
              </ThemedView>
            </ThemedView>
          </SurfaceCard>
        ))}
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  intentHero: {
    borderRadius: Radii.large,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  intentLabel: {
    color: 'rgba(252, 244, 234, 0.8)',
    letterSpacing: 1.1,
  },
  intentText: {
    color: '#FCF4EA',
    fontSize: 22,
    lineHeight: 30,
    fontFamily: 'Fraunces_600SemiBold',
  },
  switchPlan: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
  },
  centerText: {
    textAlign: 'center',
  },
  centerBlock: {
    paddingVertical: Spacing.six,
    alignItems: 'center',
  },
  bannerWrapper: {
    paddingBottom: Spacing.three,
  },
  emptyState: {
    alignItems: 'center',
    gap: Spacing.four,
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
    paddingBottom: Spacing.five,
  },
  daySection: {
    gap: Spacing.three,
  },
  taskList: {
    gap: Spacing.three,
  },
  taskCard: {
    padding: 0,
    overflow: 'hidden',
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
});

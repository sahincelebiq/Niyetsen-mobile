import { useEffect } from 'react';
import { AccessibilityInfo, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type SkeletonBlockProps = {
  height: number;
  width?: number | `${number}%`;
  style?: ViewStyle;
};

/**
 * İlkbahar yüzeyinde yumuşak iskelet — tek başına spinner yerine.
 * ReduceMotion açıksa nabız yok, düz blok kalır.
 */
export function SkeletonBlock({ height, width = '100%', style }: SkeletonBlockProps) {
  const theme = useTheme();
  const pulse = useSharedValue(0.55);

  useEffect(() => {
    let cancelled = false;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled || reduce) return;
      pulse.value = withRepeat(
        withTiming(1, {
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          reduceMotion: ReduceMotion.System,
        }),
        -1,
        true,
        undefined,
        ReduceMotion.System,
      );
    });
    return () => {
      cancelled = true;
    };
  }, [pulse]);

  const animated = useAnimatedStyle(() => ({
    opacity: pulse.value,
  }));

  return (
    <Animated.View
      style={[
        styles.block,
        { height, width, backgroundColor: theme.surfaceMuted },
        animated,
        style,
      ]}
    />
  );
}

export function DailyTaskSkeleton() {
  return (
    <View style={styles.card} accessibilityRole="progressbar" accessibilityLabel="Yükleniyor">
      <SkeletonBlock height={148} />
      <View style={styles.body}>
        <SkeletonBlock height={14} width="38%" />
        <SkeletonBlock height={20} width="78%" />
        <SkeletonBlock height={14} width="52%" />
        <View style={styles.actions}>
          <SkeletonBlock height={44} width="46%" style={styles.pill} />
          <SkeletonBlock height={44} width="46%" style={styles.pill} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    borderRadius: Radii.medium,
  },
  card: {
    borderRadius: Radii.large,
    overflow: 'hidden',
    gap: Spacing.two,
  },
  body: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.one,
    paddingBottom: Spacing.two,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.one,
  },
  pill: {
    borderRadius: Radii.pill,
  },
});

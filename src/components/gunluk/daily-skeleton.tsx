/**
 * Skeleton yükleme (03-Bugün, E.7) — spinner yerine gerçek kart iskeletleri;
 * algılanan hız artar, layout shift olmaz. Nabız animasyonu reduce-motion'da
 * kendiliğinden kapanır (ReduceMotion.System).
 */
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { SurfaceCard } from '@/components/ui/surface-card';
import { Motion, Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

function usePulse() {
  const opacity = useSharedValue(0.55);
  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: Motion.slow * 2, reduceMotion: ReduceMotion.System }),
      -1,
      true,
    );
  }, [opacity]);
  return useAnimatedStyle(() => ({ opacity: opacity.value }));
}

export function DailySkeleton() {
  const theme = useTheme();
  const pulse = usePulse();
  const bone = { backgroundColor: theme.surfaceMuted };

  return (
    <Animated.View style={[styles.wrap, pulse]}>
      <SurfaceCard style={styles.focusCard}>
        <View style={[styles.line, styles.lineShort, bone]} />
        <View style={[styles.line, styles.lineTitle, bone]} />
        <View style={[styles.pillCta, bone]} />
      </SurfaceCard>
      {[0, 1].map((key) => (
        <SurfaceCard key={key} style={styles.taskCard}>
          <View style={[styles.imageBand, bone]} />
          <View style={styles.taskBody}>
            <View style={[styles.line, styles.lineShort, bone]} />
            <View style={[styles.line, styles.lineTitle, bone]} />
            <View style={[styles.line, bone]} />
          </View>
        </SurfaceCard>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.three,
  },
  focusCard: {
    gap: Spacing.three,
  },
  taskCard: {
    padding: 0,
    overflow: 'hidden',
  },
  imageBand: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  taskBody: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  line: {
    height: 14,
    borderRadius: Radii.small,
    width: '70%',
  },
  lineShort: {
    width: '38%',
  },
  lineTitle: {
    width: '82%',
    height: 18,
  },
  pillCta: {
    height: 44,
    borderRadius: Radii.pill,
    width: '55%',
  },
});

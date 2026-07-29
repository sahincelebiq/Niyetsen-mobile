import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Motion, Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ProgressBarProps = {
  progress: number;
};

/** Gün ilerlemesi — progressTrack üstüne tint dolgu, ≤300ms. */
export function ProgressBar({ progress }: ProgressBarProps) {
  const theme = useTheme();
  const clamped = Math.max(0, Math.min(1, progress));
  const width = useSharedValue(clamped);

  useEffect(() => {
    width.value = withTiming(clamped, {
      duration: Math.min(Motion.slow, 300),
      reduceMotion: ReduceMotion.System,
    });
  }, [clamped, width]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${width.value * 100}%`,
  }));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={[styles.track, { backgroundColor: theme.progressTrack }]}>
      <Animated.View
        style={[styles.fill, { backgroundColor: theme.tint }, fillStyle]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 7,
    borderRadius: Radii.pill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radii.pill,
  },
});

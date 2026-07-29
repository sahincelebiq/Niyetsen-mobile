import { useEffect, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/hooks/use-theme';

type LeafConfettiProps = {
  /** true olunca bir kez 600ms patlar. */
  active: boolean;
};

const PARTICLE_COUNT = 7;
const DURATION = 600;

/**
 * Görev tamamlanınca 6–8 yaprak parçacığı (tint / accentWarm / success).
 * Reduce-motion açıksa parçacık atlanır — çağıran taraf renk geçişiyle kutlar.
 */
export function LeafConfetti({ active }: LeafConfettiProps) {
  const theme = useTheme();
  const [reduceMotion, setReduceMotion] = useState(false);
  const [burstKey, setBurstKey] = useState(0);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotion)
      .catch(() => setReduceMotion(false));
  }, []);

  useEffect(() => {
    if (active && !reduceMotion) setBurstKey((k) => k + 1);
  }, [active, reduceMotion]);

  if (!active || reduceMotion || burstKey === 0) return null;

  const colors = [theme.tint, theme.accentWarm, theme.success];

  return (
    <View pointerEvents="none" style={styles.stage}>
      {Array.from({ length: PARTICLE_COUNT }, (_, i) => (
        <LeafParticle
          key={`${burstKey}-${i}`}
          color={colors[i % colors.length]}
          index={i}
        />
      ))}
    </View>
  );
}

function LeafParticle({ color, index }: { color: string; index: number }) {
  const progress = useSharedValue(0);
  const angle = -50 + index * 16;
  const distance = 28 + (index % 3) * 14;

  useEffect(() => {
    progress.value = withDelay(
      index * 28,
      withTiming(1, {
        duration: DURATION,
        easing: Easing.out(Easing.cubic),
        reduceMotion: ReduceMotion.System,
      }),
    );
  }, [index, progress]);

  const style = useAnimatedStyle(() => {
    const t = progress.value;
    const rad = (angle * Math.PI) / 180;
    return {
      opacity: 1 - t,
      transform: [
        { translateX: Math.cos(rad) * distance * t },
        { translateY: Math.sin(rad) * distance * t - 10 * t },
        { scale: 1 - t * 0.35 },
        { rotate: `${angle + t * 40}deg` },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.leaf,
        { backgroundColor: color },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  stage: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 4,
  },
  leaf: {
    position: 'absolute',
    width: 10,
    height: 14,
    borderRadius: 8,
  },
});

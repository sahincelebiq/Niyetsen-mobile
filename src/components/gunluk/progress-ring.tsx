/**
 * Günlük ilerleme halkası (03-Bugün, E.3) — başlık hizasında küçük, sessiz
 * halka. Yüzde değil oran; dolgu `tint`. SVG bağımlılığı yok: iki yarım
 * maske + dönen yay tekniği. Süre Motion token'ından, reduce-motion'a saygılı.
 */
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Motion } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ProgressRingProps = {
  progress: number;
  size?: number;
  thickness?: number;
  /** Gün kapanınca accentWarm'a döner. */
  complete?: boolean;
  accessibilityLabel?: string;
};

export function ProgressRing({
  progress,
  size = 40,
  thickness = 4,
  complete = false,
  accessibilityLabel,
}: ProgressRingProps) {
  const theme = useTheme();
  const clamped = Math.max(0, Math.min(1, progress));
  const value = useSharedValue(clamped);

  useEffect(() => {
    value.value = withTiming(clamped, {
      duration: Motion.base,
      reduceMotion: ReduceMotion.System,
    });
  }, [clamped, value]);

  const fill = complete ? theme.accentWarm : theme.tint;

  // Sağ yarı 0→%50, sol yarı %50→%100 dolar; -180° başlangıç = yay gizli.
  const rightStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-180 + Math.min(value.value, 0.5) * 360}deg` }],
  }));
  const leftStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-180 + Math.max(0, value.value - 0.5) * 360}deg` }],
  }));

  const half = size / 2;
  const circle = {
    position: 'absolute' as const,
    top: 0,
    width: size,
    height: size,
    borderRadius: half,
    borderWidth: thickness,
    borderColor: 'transparent',
  };

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={{ width: size, height: size }}>
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: half,
            borderWidth: thickness,
            borderColor: theme.progressTrack,
          },
        ]}
      />
      <View style={[styles.mask, { right: 0, width: half, height: size }]}>
        <Animated.View
          style={[
            circle,
            { right: 0, borderTopColor: fill, borderRightColor: fill },
            rightStyle,
          ]}
        />
      </View>
      <View style={[styles.mask, { left: 0, width: half, height: size }]}>
        <Animated.View
          style={[
            circle,
            { left: 0, borderTopColor: fill, borderLeftColor: fill },
            leftStyle,
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mask: {
    position: 'absolute',
    top: 0,
    overflow: 'hidden',
  },
});

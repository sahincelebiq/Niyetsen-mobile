import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { companionVisual, type CompanionId } from '@/constants/chain-animals';
import { Motion, Radii, Spacing } from '@/constants/theme';

type ChainCompanionProps = {
  streakDays: number;
  color: string;
  size?: number;
  companionId?: CompanionId | null;
  investedDays?: number;
};

export function ChainCompanion({
  streakDays,
  color,
  size = 64,
  companionId = null,
  investedDays = 0,
}: ChainCompanionProps) {
  const visual = companionVisual(companionId, investedDays, streakDays, Math.round(size * 0.5));
  const scale = useSharedValue(1);
  const stageKey = `${visual.name}-${visual.stageLabel}`;
  const previousKey = useRef(stageKey);

  useEffect(() => {
    if (previousKey.current !== stageKey) {
      previousKey.current = stageKey;
      scale.value = withSequence(
        withTiming(0.4, {
          duration: Motion.fast,
          easing: Easing.in(Easing.cubic),
          reduceMotion: ReduceMotion.System,
        }),
        withSpring(1, {
          damping: 9,
          stiffness: 160,
          reduceMotion: ReduceMotion.System,
        }),
      );
    }
  }, [stageKey, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View
      style={[
        styles.ring,
        { width: size, height: size, borderRadius: size / 2, borderColor: color },
      ]}>
      <Animated.View style={animatedStyle}>
        <MaterialCommunityIcons name={visual.icon} size={visual.iconSize} color={color} />
      </Animated.View>
    </View>
  );
}

export function ChainCompanionCaption({
  streakDays,
  color,
  companionId = null,
  investedDays = 0,
}: {
  streakDays: number;
  color: string;
  companionId?: CompanionId | null;
  investedDays?: number;
}) {
  const visual = companionVisual(companionId, investedDays, streakDays);
  return (
    <View style={styles.caption}>
      <View style={[styles.stagePill, { borderColor: color }]}>
        <ThemedText type="smallBold" style={{ color }}>
          {visual.stageLabel} {visual.name}
        </ThemedText>
      </View>
      <ThemedText type="small" style={[styles.captionText, { color }]}>
        {visual.motto}
      </ThemedText>
      <ThemedText type="small" style={[styles.captionText, { color, opacity: 0.85 }]}>
        Sonra: {visual.nextLabel}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caption: {
    gap: Spacing.one,
    alignItems: 'flex-start',
  },
  stagePill: {
    borderWidth: 1,
    borderRadius: Radii.pill,
    paddingVertical: 4,
    paddingHorizontal: Spacing.two,
  },
  captionText: {
    lineHeight: 18,
  },
});

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
import {
  chainEvolution,
  STAGE_LABELS,
  stageIconSize,
} from '@/constants/chain-animals';
import { Motion, Radii, Spacing } from '@/constants/theme';

/**
 * faz8.13/6 — Zincir yoldaşı: 12 hayvanlı evrim görseli.
 * Aşama/hayvan değişiminde spring "doğum" animasyonu (Reanimated,
 * reduce-motion saygılı). rank.tsx hero'su ve StreakPill ile senkron —
 * tek gerçek kaynak chainEvolution().
 */

type ChainCompanionProps = {
  streakDays: number;
  /** Halka + ikon rengi (hero'da theme.onAccent). */
  color: string;
  /** Halka çapı. */
  size?: number;
  /** Kullanıcının seçtiği hayvan (null = zincirle otomatik). */
  animalIndex?: number | null;
};

export function ChainCompanion({
  streakDays,
  color,
  size = 64,
  animalIndex = null,
}: ChainCompanionProps) {
  const { animal, stage } = chainEvolution(streakDays, animalIndex);
  const scale = useSharedValue(1);
  const stageKey = `${animal.index}-${stage}`;
  const previousKey = useRef(stageKey);

  useEffect(() => {
    if (previousKey.current !== stageKey) {
      previousKey.current = stageKey;
      // Aşama geçişi: küçül → spring ile doğ (yeni aşamanın "doğumu").
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

  const iconSize = stageIconSize(stage, Math.round(size * 0.5));

  return (
    <View
      style={[
        styles.ring,
        { width: size, height: size, borderRadius: size / 2, borderColor: color },
      ]}>
      <Animated.View style={animatedStyle}>
        <MaterialCommunityIcons name={animal.icon} size={iconSize} color={color} />
      </Animated.View>
    </View>
  );
}

/** Hayvan + aşama etiketi ("Genç Serçe · 4. gün") — hero altı satırı. */
export function ChainCompanionCaption({
  streakDays,
  color,
  animalIndex = null,
}: {
  streakDays: number;
  color: string;
  animalIndex?: number | null;
}) {
  const evolution = chainEvolution(streakDays, animalIndex);
  return (
    <View style={styles.caption}>
      <View style={[styles.stagePill, { borderColor: color }]}>
        <ThemedText type="smallBold" style={{ color }}>
          {STAGE_LABELS[evolution.stage]} {evolution.animal.name}
        </ThemedText>
      </View>
      <ThemedText type="small" style={[styles.captionText, { color }]}>
        {evolution.animal.motto}
      </ThemedText>
      <ThemedText type="small" style={[styles.captionText, { color, opacity: 0.85 }]}>
        {evolution.daysToNext} gün sonra: {evolution.nextLabel}
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

import { useEffect, useState } from 'react';
import { Easing, type TextStyle } from 'react-native';
import {
  ReduceMotion,
  runOnJS,
  useAnimatedReaction,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Motion } from '@/constants/theme';

type CountUpTextProps = {
  value: number;
  style?: TextStyle | TextStyle[];
  /** Binlik ayraç (puan toplamı gibi büyük sayılarda). */
  grouped?: boolean;
  suffix?: string;
};

/**
 * Sayı akışı (UI cilası v2): değer 0'dan hedefe yumuşakça sayılır.
 * Zincir ve puan gibi "kazanılmış" sayılarda ilerleme hissini görünür kılar.
 * Sistem "hareketi azalt" modunda animasyon atlanır, sayı doğrudan görünür.
 */
export function CountUpText({ value, style, grouped = false, suffix = '' }: CountUpTextProps) {
  const progress = useSharedValue(0);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(value, {
      duration: Math.min(Motion.slow + value * 8, 1100),
      easing: Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    });
  }, [value, progress]);

  useAnimatedReaction(
    () => Math.round(progress.value),
    (current, previous) => {
      if (current !== previous) {
        runOnJS(setDisplay)(current);
      }
    },
    [value],
  );

  const text = grouped ? display.toLocaleString('tr-TR') : String(display);
  return <ThemedText style={style}>{`${text}${suffix}`}</ThemedText>;
}

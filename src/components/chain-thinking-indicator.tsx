import { useEffect } from 'react';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * "Düşünüyor…" göstergesi (cilalı sürüm).
 * - Logo tek `progress` ekseninde nefes alır (scale+opacity, ±3° salınım —
 *   önceki ±6° dalgalı görünüyordu).
 * - Üç nokta mesajlaşma uygulamalarındaki gibi SIRALI yanıp söner (160ms faz
 *   farkı) — "canlı yazıyor" algısının standardı.
 * - Gelen mesaj balonu görünümünde: rehber cevabının geleceği yerde belirir.
 * - Erişilebilirlik: canlı bölge + etiket; sistemde "hareketi azalt" açıksa
 *   animasyonlar otomatik sakinleşir (ReduceMotion.System).
 */
export function ChainThinkingIndicator() {
  const theme = useTheme();
  const progress = useSharedValue(0);
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, {
        duration: 1200,
        easing: Easing.inOut(Easing.sin),
        reduceMotion: ReduceMotion.System,
      }),
      -1,
      true,
    );
    const blink = (delayMs: number) =>
      withDelay(
        delayMs,
        withRepeat(
          withTiming(1, {
            duration: 480,
            easing: Easing.inOut(Easing.quad),
            reduceMotion: ReduceMotion.System,
          }),
          -1,
          true,
        ),
      );
    dot1.value = blink(0);
    dot2.value = blink(160);
    dot3.value = blink(320);
  }, [progress, dot1, dot2, dot3]);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.65, 1]),
    transform: [
      { scale: interpolate(progress.value, [0, 1], [0.92, 1.04]) },
      { rotate: `${interpolate(progress.value, [0, 1], [-3, 3])}deg` },
    ],
  }));

  const dot1Style = useAnimatedStyle(() => ({
    opacity: interpolate(dot1.value, [0, 1], [0.25, 1]),
    transform: [{ translateY: interpolate(dot1.value, [0, 1], [1.5, -1.5]) }],
  }));
  const dot2Style = useAnimatedStyle(() => ({
    opacity: interpolate(dot2.value, [0, 1], [0.25, 1]),
    transform: [{ translateY: interpolate(dot2.value, [0, 1], [1.5, -1.5]) }],
  }));
  const dot3Style = useAnimatedStyle(() => ({
    opacity: interpolate(dot3.value, [0, 1], [0.25, 1]),
    transform: [{ translateY: interpolate(dot3.value, [0, 1], [1.5, -1.5]) }],
  }));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Rehber düşünüyor"
      accessibilityLiveRegion="polite"
      style={[
        styles.bubble,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
      ]}>
      <Animated.View style={[styles.logoWrap, logoStyle]}>
        <Image
          source={require('@/assets/images/niyetsen-logo.png')}
          style={styles.logo}
          contentFit="contain"
        />
      </Animated.View>
      <ThemedText type="small" themeColor="textSecondary">
        düşünüyor
      </ThemedText>
      <View style={styles.dots}>
        <Animated.View style={[styles.dot, { backgroundColor: theme.textSecondary }, dot1Style]} />
        <Animated.View style={[styles.dot, { backgroundColor: theme.textSecondary }, dot2Style]} />
        <Animated.View style={[styles.dot, { backgroundColor: theme.textSecondary }, dot3Style]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    alignSelf: 'flex-start',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radii.large,
    borderWidth: StyleSheet.hairlineWidth,
  },
  logoWrap: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 22,
    height: 22,
    borderRadius: 6,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingBottom: 1,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
});

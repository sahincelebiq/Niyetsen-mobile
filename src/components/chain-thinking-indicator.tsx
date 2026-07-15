import { useEffect } from 'react';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

/**
 * "Düşünüyor…" göstergesi — tek logo, tek zaman ekseni.
 * Üç ayrı zincir yerine yeni sonsuzluk logosu tek `progress` değeriyle
 * nefes alır (scale + opacity) ve hafifçe salınır (rotate); tüm kanallar
 * aynı paylaşılan değerden türediği için animasyon tam senkron çalışır.
 */
export function ChainThinkingIndicator() {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [progress]);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.55, 1]),
    transform: [
      { scale: interpolate(progress.value, [0, 1], [0.88, 1.06]) },
      { rotate: `${interpolate(progress.value, [0, 1], [-6, 6])}deg` },
    ],
  }));

  const dotsStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.4, 1]),
  }));

  return (
    <View style={styles.row}>
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
      <Animated.View style={dotsStyle}>
        <ThemedText type="small" themeColor="textSecondary">
          …
        </ThemedText>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    alignSelf: 'flex-start',
    paddingVertical: Spacing.one,
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
});

import { useEffect } from 'react';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

export function ChainThinkingIndicator() {
  const linkA = useSharedValue(1);
  const linkB = useSharedValue(0.45);
  const linkC = useSharedValue(0.45);

  useEffect(() => {
    const pulse = (duration: number) =>
      withRepeat(
        withSequence(
          withTiming(1, { duration, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.35, { duration, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
    linkA.value = pulse(700);
    const t1 = setTimeout(() => {
      linkB.value = pulse(700);
    }, 180);
    const t2 = setTimeout(() => {
      linkC.value = pulse(700);
    }, 360);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [linkA, linkB, linkC]);

  const styleA = useAnimatedStyle(() => ({ opacity: linkA.value, transform: [{ scale: 0.9 + linkA.value * 0.1 }] }));
  const styleB = useAnimatedStyle(() => ({ opacity: linkB.value, transform: [{ scale: 0.9 + linkB.value * 0.1 }] }));
  const styleC = useAnimatedStyle(() => ({ opacity: linkC.value, transform: [{ scale: 0.9 + linkC.value * 0.1 }] }));

  return (
    <View style={styles.row}>
      <View style={styles.chainRow}>
        <Animated.View style={styleA}>
          <Image source={require('@/assets/images/niyetsen-chain.png')} style={styles.link} contentFit="contain" />
        </Animated.View>
        <Animated.View style={styleB}>
          <Image source={require('@/assets/images/niyetsen-chain.png')} style={styles.link} contentFit="contain" />
        </Animated.View>
        <Animated.View style={styleC}>
          <Image source={require('@/assets/images/niyetsen-chain.png')} style={styles.link} contentFit="contain" />
        </Animated.View>
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        düşünüyor…
      </ThemedText>
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
  chainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  link: {
    width: 16,
    height: 16,
  },
});

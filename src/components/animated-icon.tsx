import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Fonts, Spacing } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';

const DURATION = 900;

export function AnimatedSplashOverlay() {
  const [visible, setVisible] = useState(true);
  const leftX = useSharedValue(-34);
  const rightX = useSharedValue(34);
  const linkOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleY = useSharedValue(10);

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => undefined);
    leftX.value = withSequence(
      withTiming(-8, { duration: 420, easing: Easing.out(Easing.cubic) }),
      withTiming(0, { duration: 180, easing: Easing.inOut(Easing.quad) }),
    );
    rightX.value = withSequence(
      withTiming(8, { duration: 420, easing: Easing.out(Easing.cubic) }),
      withTiming(0, { duration: 180, easing: Easing.inOut(Easing.quad) }),
    );
    linkOpacity.value = withDelay(260, withTiming(1, { duration: 280 }));
    titleOpacity.value = withDelay(620, withTiming(1, { duration: 360 }));
    titleY.value = withDelay(620, withTiming(0, { duration: 360 }));
    const timer = setTimeout(() => setVisible(false), DURATION + 500);
    return () => clearTimeout(timer);
  }, [leftX, linkOpacity, rightX, titleOpacity, titleY]);

  const leftStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: leftX.value }, { rotate: '-18deg' }],
    opacity: linkOpacity.value,
  }));
  const rightStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: rightX.value }, { rotate: '18deg' }],
    opacity: linkOpacity.value,
  }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleY.value }],
  }));

  if (!visible) return null;

  return (
    <Animated.View exiting={FadeOut.duration(280)} style={styles.splashOverlay}>
      <View style={styles.chainStage}>
        <Animated.View style={[styles.halfLink, styles.leftLink, leftStyle]}>
          <View style={[styles.linkArc, styles.linkArcLeft]} />
        </Animated.View>
        <Animated.View style={[styles.halfLink, styles.rightLink, rightStyle]}>
          <View style={[styles.linkArc, styles.linkArcRight]} />
        </Animated.View>
        <Animated.View entering={FadeIn.delay(520).duration(260)} style={styles.logoWrap}>
          <Image
            style={styles.logo}
            source={require('@/assets/images/niyetsen-chain.png')}
            contentFit="contain"
          />
        </Animated.View>
      </View>
      <Animated.View style={[styles.titleWrap, titleStyle]}>
        <ThemedText style={styles.brandTitle}>Niyetsen</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          niyetini yaşa
        </ThemedText>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  splashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FBF7EF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    gap: Spacing.four,
  },
  chainStage: {
    width: 120,
    height: 92,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halfLink: {
    position: 'absolute',
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftLink: {
    left: 4,
    top: 18,
  },
  rightLink: {
    right: 4,
    top: 18,
  },
  linkArc: {
    width: 34,
    height: 34,
    borderRadius: 18,
    borderWidth: 5,
    borderColor: '#B4623C',
  },
  linkArcLeft: {
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    transform: [{ rotate: '35deg' }],
  },
  linkArcRight: {
    borderLeftColor: 'transparent',
    borderTopColor: 'transparent',
    transform: [{ rotate: '35deg' }],
  },
  logoWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 72,
    height: 72,
  },
  titleWrap: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  brandTitle: {
    fontFamily: Fonts.serif,
    fontSize: 34,
    lineHeight: 38,
    color: '#2C241C',
    letterSpacing: -0.4,
  },
});

// Eski AnimatedIcon bileşeni — onboarding vb. için korunuyor.
import { Dimensions } from 'react-native';
import { Keyframe } from 'react-native-reanimated';

const INITIAL_SCALE_FACTOR = Dimensions.get('screen').height / 90;
const ICON_DURATION = 600;

const keyframe = new Keyframe({
  0: { transform: [{ scale: INITIAL_SCALE_FACTOR }] },
  100: {
    transform: [{ scale: 1 }],
    easing: Easing.elastic(0.7),
  },
});

const logoKeyframe = new Keyframe({
  0: { transform: [{ scale: 1.3 }], opacity: 0 },
  40: { transform: [{ scale: 1.3 }], opacity: 0, easing: Easing.elastic(0.7) },
  100: { opacity: 1, transform: [{ scale: 1 }], easing: Easing.elastic(0.7) },
});

const glowKeyframe = new Keyframe({
  0: { transform: [{ rotateZ: '0deg' }] },
  100: { transform: [{ rotateZ: '7200deg' }] },
});

export function AnimatedIcon() {
  return (
    <View style={iconStyles.iconContainer}>
      <Animated.View entering={glowKeyframe.duration(60 * 1000 * 4)} style={iconStyles.glow}>
        <Image style={iconStyles.glow} source={require('@/assets/images/logo-glow.png')} />
      </Animated.View>
      <Animated.View entering={keyframe.duration(ICON_DURATION)} style={iconStyles.background} />
      <Animated.View style={iconStyles.imageContainer} entering={logoKeyframe.duration(ICON_DURATION)}>
        <Image
          style={iconStyles.image}
          source={require('@/assets/images/niyetsen-chain.png')}
          contentFit="contain"
        />
      </Animated.View>
    </View>
  );
}

const iconStyles = StyleSheet.create({
  imageContainer: { justifyContent: 'center', alignItems: 'center' },
  glow: { width: 201, height: 201, position: 'absolute' },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 128,
    height: 128,
    zIndex: 100,
  },
  image: { width: 92, height: 92 },
  background: {
    borderRadius: 40,
    backgroundColor: '#F0E9D8',
    width: 128,
    height: 128,
    position: 'absolute',
  },
});

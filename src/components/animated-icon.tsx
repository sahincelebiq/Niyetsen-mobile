import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeOut,
  Keyframe,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Fonts, Spacing } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

const DURATION = 720;
const SPLASH_SEEN_KEY = 'niyetsen.boot.splash.v2';

/**
 * Açılış animasyonu — zincir bağlanma metaforu korunur.
 * İlk soğuk açılışta bir kez oynar; sonraki açılışlarda atlanır (hız).
 */
export function AnimatedSplashOverlay() {
  const theme = useTheme();
  const [visible, setVisible] = useState(true);
  const leftX = useSharedValue(-34);
  const rightX = useSharedValue(34);
  const linkOpacity = useSharedValue(0);
  const logoProgress = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleY = useSharedValue(10);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const play = () => {
      leftX.value = withSequence(
        withTiming(-8, { duration: 280, easing: Easing.out(Easing.cubic) }),
        withTiming(0, { duration: 140, easing: Easing.inOut(Easing.quad) }),
      );
      rightX.value = withSequence(
        withTiming(8, { duration: 280, easing: Easing.out(Easing.cubic) }),
        withTiming(0, { duration: 140, easing: Easing.inOut(Easing.quad) }),
      );
      linkOpacity.value = withSequence(
        withDelay(80, withTiming(1, { duration: 180 })),
        withDelay(160, withTiming(0, { duration: 160 })),
      );
      logoProgress.value = withDelay(
        360,
        withTiming(1, { duration: 260, easing: Easing.out(Easing.back(1.4)) }),
      );
      titleOpacity.value = withDelay(480, withTiming(1, { duration: 220 }));
      titleY.value = withDelay(480, withTiming(0, { duration: 220 }));
      timer = setTimeout(() => {
        if (!cancelled) setVisible(false);
      }, DURATION);
    };

    void (async () => {
      const [reduceMotion, seen] = await Promise.all([
        AccessibilityInfo.isReduceMotionEnabled(),
        AsyncStorage.getItem(SPLASH_SEEN_KEY),
      ]);
      if (cancelled) return;
      if (reduceMotion || seen) {
        setVisible(false);
        return;
      }
      void AsyncStorage.setItem(SPLASH_SEEN_KEY, '1');
      play();
    })();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [leftX, linkOpacity, logoProgress, rightX, titleOpacity, titleY]);

  const leftStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: leftX.value }, { rotate: '-18deg' }],
    opacity: linkOpacity.value,
  }));
  const rightStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: rightX.value }, { rotate: '18deg' }],
    opacity: linkOpacity.value,
  }));
  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoProgress.value,
    transform: [{ scale: interpolate(logoProgress.value, [0, 1], [0.6, 1]) }],
  }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleY.value }],
  }));

  if (!visible) return null;

  return (
    <Animated.View
      exiting={FadeOut.duration(280)}
      style={[styles.splashOverlay, { backgroundColor: theme.background }]}>
      <View style={styles.chainStage}>
        <Animated.View style={[styles.halfLink, styles.leftLink, leftStyle]}>
          <View
            style={[
              styles.linkArc,
              styles.linkArcLeft,
              { borderColor: theme.accentWarm },
            ]}
          />
        </Animated.View>
        <Animated.View style={[styles.halfLink, styles.rightLink, rightStyle]}>
          <View
            style={[
              styles.linkArc,
              styles.linkArcRight,
              { borderColor: theme.accentWarm },
            ]}
          />
        </Animated.View>
        <Animated.View style={[styles.logoWrap, logoStyle]}>
          <Image
            style={styles.logo}
            source={require('@/assets/images/niyetsen-logo.png')}
            contentFit="contain"
          />
        </Animated.View>
      </View>
      <Animated.View style={[styles.titleWrap, titleStyle]}>
        <ThemedText style={[styles.brandTitle, { color: theme.text }]}>Niyetsen</ThemedText>
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
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    gap: Spacing.four,
  },
  chainStage: {
    width: 130,
    height: 100,
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
    left: 8,
    top: 22,
  },
  rightLink: {
    right: 8,
    top: 22,
  },
  linkArc: {
    width: 34,
    height: 34,
    borderRadius: 18,
    borderWidth: 5,
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
    width: 84,
    height: 84,
    borderRadius: 22,
  },
  titleWrap: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  brandTitle: {
    fontFamily: Fonts.serif,
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -0.4,
  },
});

// Eski AnimatedIcon bileşeni — onboarding vb. için korunuyor.
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
  const theme = useTheme();
  return (
    <View style={iconStyles.iconContainer}>
      <Animated.View entering={glowKeyframe.duration(60 * 1000 * 4)} style={iconStyles.glow}>
        <Image style={iconStyles.glow} source={require('@/assets/images/logo-glow.png')} />
      </Animated.View>
      <Animated.View
        entering={keyframe.duration(ICON_DURATION)}
        style={[iconStyles.background, { backgroundColor: theme.surfaceMuted }]}
      />
      <Animated.View style={iconStyles.imageContainer} entering={logoKeyframe.duration(ICON_DURATION)}>
        <Image
          style={iconStyles.image}
          source={require('@/assets/images/niyetsen-logo.png')}
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
  image: { width: 92, height: 92, borderRadius: 24 },
  background: {
    borderRadius: 40,
    width: 128,
    height: 128,
    position: 'absolute',
  },
});

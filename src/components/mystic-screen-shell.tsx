import { Image } from 'expo-image';
import { type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import {
  BottomTabInset,
  MaxContentWidth,
  Motion,
  MysticColors,
  Radii,
  Shadows,
  Spacing,
  SurfaceEdge,
} from '@/constants/theme';
import { getZodiacGlyph, zodiacLabel } from '@/constants/zodiac';
import { useAppearance } from '@/providers/appearance-provider';

type MysticScreenShellProps = {
  symbol: string;
  title: string;
  subtitle?: string;
  /** profile.zodiac_sign — varsa başlıkta glyph + etiket */
  zodiacSign?: string | null;
  children: ReactNode;
  footer?: ReactNode;
};

/** Ortak mistik kabuk: soft dark (AppearanceProvider), FadeIn, burç başlığı. */
export function MysticScreenShell({
  symbol,
  title,
  subtitle,
  zodiacSign,
  children,
  footer,
}: MysticScreenShellProps) {
  const { isDark } = useAppearance();
  const colors = MysticColors[isDark ? 'dark' : 'light'];
  const edge = isDark ? SurfaceEdge.dark : SurfaceEdge.light;
  const glyph = getZodiacGlyph(zodiacSign);
  const label = zodiacLabel(zodiacSign);

  return (
    <Animated.View
      entering={FadeIn.duration(Motion.base).reduceMotion(ReduceMotion.System)}
      style={[styles.flex, { backgroundColor: colors.background }]}>
      <Image
        source={require('@/assets/images/chat-mystic-bg.png')}
        style={styles.background}
        contentFit="cover"
        pointerEvents="none"
      />
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: BottomTabInset + Spacing.four },
          ]}>
          <Animated.View
            entering={FadeIn.delay(Motion.stagger).duration(Motion.base).reduceMotion(ReduceMotion.System)}
            style={[
              styles.card,
              Shadows.lifted ?? {},
              {
                backgroundColor: colors.backgroundElement,
                borderColor: colors.border,
                borderTopColor: edge,
              },
            ]}>
            <ThemedText style={[styles.symbol, { color: colors.tint }]}>
              {symbol}
            </ThemedText>
            <ThemedText type="title" style={[styles.center, { color: colors.text }]}>
              {title}
              {glyph ? ` ${glyph}` : ''}
            </ThemedText>
            {label ? (
              <View style={[styles.badge, { backgroundColor: colors.backgroundSelected }]}>
                <ThemedText type="smallBold" style={{ color: colors.tint }}>
                  {label}
                </ThemedText>
              </View>
            ) : null}
            {subtitle ? (
              <ThemedText type="small" style={[styles.center, { color: colors.textSecondary }]}>
                {subtitle}
              </ThemedText>
            ) : null}
            {children}
            {footer}
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </Animated.View>
  );
}

export function useMysticColors() {
  const { isDark } = useAppearance();
  return {
    isDark,
    colors: MysticColors[isDark ? 'dark' : 'light'],
    edge: isDark ? SurfaceEdge.dark : SurfaceEdge.light,
  };
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  background: { ...StyleSheet.absoluteFillObject, opacity: 0.2 },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: Math.min(MaxContentWidth, 620),
    alignSelf: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  card: {
    alignItems: 'stretch',
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Radii.large,
    padding: Spacing.five,
    ...(Shadows.soft ?? {}),
  },
  symbol: { fontSize: 32, lineHeight: 38, textAlign: 'center' },
  center: { textAlign: 'center' },
  badge: {
    alignSelf: 'center',
    borderRadius: Radii.pill,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
});

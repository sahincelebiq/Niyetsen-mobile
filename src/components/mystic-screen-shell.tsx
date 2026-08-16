import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
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
import { mysticHref } from '@/lib/mystic-routes';
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
  const router = useRouter();
  const { isDark } = useAppearance();
  const colors = MysticColors[isDark ? 'dark' : 'light'];
  const edge = isDark ? SurfaceEdge.dark : SurfaceEdge.light;
  const glyph = getZodiacGlyph(zodiacSign);
  const label = zodiacLabel(zodiacSign);

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace(mysticHref.today);
  }

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
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Geri"
            onPress={goBack}
            hitSlop={12}
            style={({ pressed }) => [styles.backHit, pressed && { opacity: 0.6 }]}>
            <ThemedText type="smallBold" style={{ color: colors.tint }}>
              ‹ Geri
            </ThemedText>
          </Pressable>
        </View>
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
            <ThemedText type="screenTitle" style={[styles.center, { color: colors.text }]}>
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

type MysticGrantButtonProps = {
  label: string;
  hint?: string;
  granting: boolean;
  onGrant: () => void;
};

/** AI / fotoğraf rızası — fal ücretsiz ama KVKK onayı olmadan 403 olur. */
export function MysticGrantButton({
  label,
  hint,
  granting,
  onGrant,
}: MysticGrantButtonProps) {
  const { colors } = useMysticColors();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={granting}
      onPress={onGrant}
      style={({ pressed }) => [
        styles.grantButton,
        {
          backgroundColor: colors.tint,
          opacity: pressed || granting ? 0.75 : 1,
        },
      ]}>
      <ThemedText type="smallBold" style={{ color: colors.background, textAlign: 'center' }}>
        {granting ? 'Kaydediliyor…' : label}
      </ThemedText>
      {hint ? (
        <ThemedText type="small" style={{ color: colors.background, textAlign: 'center', opacity: 0.85 }}>
          {hint}
        </ThemedText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  background: { ...StyleSheet.absoluteFillObject, opacity: 0.2 },
  topBar: {
    paddingHorizontal: Spacing.three,
    minHeight: 44,
    justifyContent: 'center',
  },
  backHit: {
    minHeight: 44,
    minWidth: 56,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: Math.min(MaxContentWidth, 620),
    alignSelf: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
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
  grantButton: {
    minHeight: 48,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    gap: 4,
  },
});

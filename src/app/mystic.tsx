import { Image } from 'expo-image';
import { Href, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProBadge } from '@/components/pro-badge';
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
import { usePremiumAccess } from '@/hooks/use-premium-access';
import { useAppearance } from '@/providers/appearance-provider';
import { useProfile } from '@/providers/profile-provider';

const MODULES: {
  title: string;
  symbol: string;
  description: string;
  href: Href;
}[] = [
  {
    title: 'Astroloji',
    symbol: '✦',
    description: 'Doğum haritan ve günlük gökyüzü rehberin.',
    href: '/astroloji',
  },
  {
    title: 'Tarot',
    symbol: '◈',
    description: 'Niyetine eşlik edecek sembolik kart yorumları.',
    href: '/tarot',
  },
  {
    title: 'Fal',
    symbol: '☾',
    description: 'Kahve ve el falı için eğlence odaklı yorum alanı.',
    href: '/fal',
  },
];

export default function MysticHubScreen() {
  const router = useRouter();
  const { isDark } = useAppearance();
  const colors = MysticColors[isDark ? 'dark' : 'light'];
  const edge = isDark ? SurfaceEdge.dark : SurfaceEdge.light;
  const { profile } = useProfile();
  const { hasPremium, loading: premiumLoading } = usePremiumAccess();
  const zodiac = profile?.zodiac_sign;
  const glyph = getZodiacGlyph(zodiac);
  const label = zodiacLabel(zodiac);

  function openModule(href: Href) {
    if (!premiumLoading && !hasPremium) {
      router.push('/paywall' as Href);
      return;
    }
    router.push(href);
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
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: BottomTabInset + Spacing.four },
          ]}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <ThemedText type="title" style={{ color: colors.text }}>
                Mistik Keşif
                {glyph ? ` ${glyph}` : ''}
              </ThemedText>
              {!premiumLoading && !hasPremium ? <ProBadge tone="mystic" /> : null}
            </View>
            {label ? (
              <View style={[styles.zodiacBadge, { backgroundColor: colors.backgroundSelected }]}>
                <ThemedText type="smallBold" style={{ color: colors.tint }}>
                  {label}
                </ThemedText>
              </View>
            ) : null}
            <ThemedText style={[styles.center, { color: colors.textSecondary }]}>
              Gizli kapıyı buldun ☾ Yaşam planın merkezde kalırken, sembolik
              rehberlik alanları burada seni bekliyor.
            </ThemedText>
          </View>

          <View style={styles.grid}>
            {MODULES.map((module, index) => (
              <Animated.View
                key={module.title}
                entering={FadeIn.delay(index * Motion.stagger)
                  .duration(Motion.base)
                  .reduceMotion(ReduceMotion.System)}
                style={styles.cardWrap}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityHint={
                    hasPremium ? undefined : 'PRO abonelik gerekir; paywall açılır'
                  }
                  onPress={() => openModule(module.href)}
                  style={({ pressed }) => [
                    styles.card,
                    Shadows.lifted ?? {},
                    {
                      backgroundColor: colors.backgroundElement,
                      borderColor: colors.border,
                      borderTopColor: edge,
                      opacity: pressed ? 0.75 : 1,
                      transform: [{ scale: pressed ? 0.97 : 1 }],
                    },
                  ]}>
                  <View style={styles.cardTop}>
                    <ThemedText style={[styles.symbol, { color: colors.tint }]}>
                      {module.symbol}
                    </ThemedText>
                    {!premiumLoading && !hasPremium ? <ProBadge tone="mystic" /> : null}
                  </View>
                  <ThemedText type="subtitle" style={{ color: colors.text }}>
                    {module.title}
                  </ThemedText>
                  <ThemedText type="small" style={{ color: colors.textSecondary }}>
                    {module.description}
                  </ThemedText>
                  <ThemedText type="smallBold" style={{ color: colors.tint }}>
                    {hasPremium ? 'Keşfet' : 'PRO ile aç'}
                  </ThemedText>
                </Pressable>
              </Animated.View>
            ))}
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => openModule('/fal-gecmisi' as Href)}
            style={({ pressed }) => [
              styles.historyLink,
              { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
            ]}>
            <View style={styles.historyTitle}>
              <ThemedText type="smallBold" style={{ color: colors.tint }}>
                ☾ Fal Geçmişin
              </ThemedText>
              {!premiumLoading && !hasPremium ? <ProBadge tone="mystic" /> : null}
            </View>
            <ThemedText type="small" style={{ color: colors.textSecondary }}>
              Önceki çekimlerine ve yorumlarına dön
            </ThemedText>
          </Pressable>

          <ThemedText type="small" style={[styles.disclaimer, { color: colors.textSecondary }]}>
            Bu içerik eğlence amaçlıdır; tıbbi, hukuki veya finansal tavsiye değildir.
          </ThemedText>

          <Pressable
            accessibilityRole="button"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/' as Href))}
            style={({ pressed }) => [
              styles.backButton,
              {
                backgroundColor: colors.tint,
                opacity: pressed ? 0.75 : 1,
              },
            ]}>
            <ThemedText type="smallBold" style={{ color: colors.background }}>
              Uygulamaya Dön
            </ThemedText>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  background: { ...StyleSheet.absoluteFillObject, opacity: 0.18 },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.four,
    gap: Spacing.four,
  },
  header: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.three },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  historyTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  zodiacBadge: {
    borderRadius: Radii.pill,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  center: { textAlign: 'center', maxWidth: 560 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  cardWrap: { flexGrow: 1, flexBasis: 220 },
  card: {
    flexGrow: 1,
    minHeight: 210,
    borderWidth: 1,
    borderRadius: Radii.large,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  symbol: { fontSize: 38, lineHeight: 46 },
  disclaimer: { textAlign: 'center', paddingHorizontal: Spacing.three },
  historyLink: {
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: Radii.large,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    minHeight: 44,
  },
  backButton: {
    alignSelf: 'center',
    minHeight: 48,
    minWidth: 200,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
});

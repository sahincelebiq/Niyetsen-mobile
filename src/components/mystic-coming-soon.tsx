import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, MysticColors, Radii, Shadows, Spacing } from '@/constants/theme';
import { useAppearance } from '@/providers/appearance-provider';

const DISCLAIMER =
  'Bu içerik eğlence amaçlıdır; tıbbi, hukuki veya finansal tavsiye değildir.';

export function MysticComingSoon({
  title,
  symbol,
  description,
}: {
  title: string;
  symbol: string;
  description: string;
}) {
  const router = useRouter();
  const { isDark } = useAppearance();
  const colors = MysticColors[isDark ? 'dark' : 'light'];

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <Image
        source={require('@/assets/images/chat-mystic-bg.png')}
        style={styles.background}
        contentFit="cover"
        pointerEvents="none"
      />
      <SafeAreaView style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content}>
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.backgroundElement,
                borderColor: colors.border,
              },
            ]}>
            <ThemedText style={[styles.symbol, { color: colors.tint }]}>
              {symbol}
            </ThemedText>
            <ThemedText type="title" style={{ color: colors.text }}>
              {title}
            </ThemedText>
            <View style={[styles.badge, { backgroundColor: colors.backgroundSelected }]}>
              <ThemedText type="smallBold" style={{ color: colors.tint }}>
                YAKINDA · V2
              </ThemedText>
            </View>
            <ThemedText style={[styles.center, { color: colors.textSecondary }]}>
              {description}
            </ThemedText>
            <ThemedText type="small" style={[styles.disclaimer, { color: colors.textSecondary }]}>
              {DISCLAIMER}
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.replace('/mystic')}
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: colors.tint, opacity: pressed ? 0.75 : 1 },
              ]}>
              <ThemedText type="smallBold" style={{ color: colors.background }}>
                Mistik Keşfe Dön
              </ThemedText>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
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
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Radii.large,
    padding: Spacing.five,
    ...(Shadows.soft ?? {}),
  },
  symbol: { fontSize: 54, lineHeight: 64 },
  badge: { borderRadius: Radii.pill, paddingVertical: 6, paddingHorizontal: 12 },
  center: { textAlign: 'center' },
  disclaimer: {
    textAlign: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.three,
  },
  button: {
    minHeight: 48,
    minWidth: 180,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
});

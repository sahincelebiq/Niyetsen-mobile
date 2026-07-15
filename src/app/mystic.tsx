import { Image } from 'expo-image';
import { Href, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import {
  BottomTabInset, MaxContentWidth, MysticColors, Radii, Shadows, Spacing,
} from '@/constants/theme';

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
  const scheme = useColorScheme();
  const colors = MysticColors[scheme === 'dark' ? 'dark' : 'light'];
  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
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
            <ThemedText type="title" style={{ color: colors.text }}>
              Mistik Keşif
            </ThemedText>
            <ThemedText style={[styles.center, { color: colors.textSecondary }]}>
              Gizli kapıyı buldun ☾ Yaşam planın merkezde kalırken, sembolik
              rehberlik alanları burada seni bekliyor.
            </ThemedText>
          </View>

          <View style={styles.grid}>
            {MODULES.map((module) => (
              <Pressable
                key={module.title}
                accessibilityRole="button"
                onPress={() => router.push(module.href)}
                style={({ pressed }) => [
                  styles.card,
                  {
                    backgroundColor: colors.backgroundElement,
                    borderColor: colors.border,
                    opacity: pressed ? 0.75 : 1,
                  },
                ]}>
                <ThemedText style={[styles.symbol, { color: colors.tint }]}>
                  {module.symbol}
                </ThemedText>
                <ThemedText type="subtitle" style={{ color: colors.text }}>
                  {module.title}
                </ThemedText>
                <ThemedText type="small" style={{ color: colors.textSecondary }}>
                  {module.description}
                </ThemedText>
                <ThemedText type="smallBold" style={{ color: colors.tint }}>
                  Yakında
                </ThemedText>
              </Pressable>
            ))}
          </View>

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
    </View>
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
  center: { textAlign: 'center', maxWidth: 560 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  card: {
    flexGrow: 1,
    flexBasis: 220,
    minHeight: 210,
    borderWidth: 1,
    borderRadius: Radii.large,
    padding: Spacing.four,
    gap: Spacing.two,
    ...(Shadows.subtle ?? {}),
  },
  symbol: { fontSize: 38, lineHeight: 46 },
  disclaimer: { textAlign: 'center', paddingHorizontal: Spacing.three },
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

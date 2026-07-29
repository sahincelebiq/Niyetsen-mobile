/**
 * FAZ 8.8 — Niyetsen Raporu ("Wrapped") story ekranı İSKELETİ.
 * Spotify Wrapped mantığı: tam ekran kartlar, üstte ilerleme çubukları,
 * sağa dokun = ileri, sola dokun = geri. İlkbahar teması.
 *
 * Cursor detayları (docs/FAZ8_LANSMAN.md 8.8):
 * - Kart girişine animasyon (Reanimated — Easing YALNIZ reanimated'dan),
 *   kind'a göre görsel şablon zenginleştirme, paylaş butonu (react-native-view-shot),
 *   rank ekranına giriş banner'ı, push deep link (/rapor).
 */
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getRecap, type Recap } from '@/lib/api';

export default function RecapScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [recap, setRecap] = useState<Recap | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);

  const load = useCallback(async () => {
    setError(null);
    try {
      setRecap(await getRecap('14d'));
    } catch {
      setError('Raporun şu an yüklenemedi. Birazdan tekrar dene.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const cards = recap?.cards ?? [];
  const card = cards[index];

  const advance = (dir: 1 | -1) => {
    const next = index + dir;
    if (next < 0) return;
    if (next >= cards.length) {
      router.back();
      return;
    }
    setIndex(next);
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
      <View style={styles.progressRow}>
        {cards.map((c, i) => (
          <View
            key={c.kind}
            style={[
              styles.progressSegment,
              {
                backgroundColor: i <= index ? theme.tint : theme.progressTrack,
              },
            ]}
          />
        ))}
      </View>

      {!recap && !error && <ActivityIndicator color={theme.tint} style={styles.center} />}
      {error && (
        <View style={styles.center}>
          <ThemedText themeColor="danger">{error}</ThemedText>
          <Pressable onPress={() => void load()} style={styles.retry}>
            <ThemedText themeColor="tint">Tekrar dene</ThemedText>
          </Pressable>
        </View>
      )}

      {card && (
        <View style={styles.cardArea}>
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.cardTitle}>
            {card.title}
          </ThemedText>
          <ThemedText style={[styles.headline, { color: theme.tint }]}>
            {card.headline}
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.subtitle}>
            {card.subtitle}
          </ThemedText>
        </View>
      )}

      <View style={styles.tapZones} pointerEvents="box-none">
        <Pressable
          style={styles.tapZone}
          onPress={() => advance(-1)}
          accessibilityLabel="Önceki kart"
        />
        <Pressable
          style={styles.tapZone}
          onPress={() => advance(1)}
          accessibilityLabel="Sonraki kart"
        />
      </View>

      <Pressable onPress={() => router.back()} style={styles.close} accessibilityLabel="Kapat">
        <ThemedText themeColor="textSecondary">Kapat ✕</ThemedText>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  progressRow: {
    flexDirection: 'row',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
  },
  progressSegment: { flex: 1, height: 3, borderRadius: Radii.pill },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three },
  retry: { padding: Spacing.two },
  cardArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.five,
    gap: Spacing.three,
  },
  cardTitle: { textTransform: 'uppercase', letterSpacing: 1.2 },
  headline: { fontSize: 44, lineHeight: 52, fontWeight: '700', textAlign: 'center' },
  subtitle: { textAlign: 'center', fontSize: 16, lineHeight: 24 },
  tapZones: { ...StyleSheet.absoluteFillObject, flexDirection: 'row' },
  tapZone: { flex: 1 },
  close: { position: 'absolute', top: Spacing.five, right: Spacing.three, padding: Spacing.two },
});

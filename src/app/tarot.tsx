import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  useColorScheme,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, FlipInEasyY } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import {
  BottomTabInset, MaxContentWidth, MysticColors, Radii, Shadows, Spacing, SurfaceEdge,
} from '@/constants/theme';
import { trackEvent } from '@/lib/analytics';
import { ApiError, drawTarot, getFortuneRights, type TarotDraw } from '@/lib/api';

export default function TarotScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = MysticColors[scheme === 'dark' ? 'dark' : 'light'];
  const edge = scheme === 'dark' ? SurfaceEdge.dark : SurfaceEdge.light;
  const [busy, setBusy] = useState(false);
  const [draw, setDraw] = useState<TarotDraw | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    // Bugün zaten çekilmişse kayıtlı sonucu göster (backend idempotent).
    void getFortuneRights()
      .then((rights) => {
        if (mounted && rights.rights.tarot.used > 0) return drawTarot();
        return null;
      })
      .then((existing) => {
        if (mounted && existing) setDraw(existing);
      })
      .catch(() => {
        /* hak sorgusu başarısızsa kullanıcı yine de çekebilir */
      });
    return () => {
      mounted = false;
    };
  }, []);

  async function handleDraw() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await drawTarot();
      setDraw(result);
      void trackEvent('mystic_secret_entry', { module: 'tarot' });
    } catch (value) {
      if (value instanceof ApiError && value.status === 403) {
        setError('Tarot için Ayarlar > Gizlilik bölümünden AI işleme onayı gerekli.');
      } else {
        setError(value instanceof Error ? value.message : 'Kartlara şu an ulaşılamıyor.');
      }
    } finally {
      setBusy(false);
    }
  }

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
              Shadows.lifted ?? {},
              {
                backgroundColor: colors.backgroundElement,
                borderColor: colors.border,
                borderTopColor: edge,
              },
            ]}>
            <ThemedText style={[styles.symbol, { color: colors.tint }]}>◈</ThemedText>
            <ThemedText type="title" style={[styles.center, { color: colors.text }]}>
              Günlük Tarot
            </ThemedText>
            <ThemedText type="small" style={[styles.center, { color: colors.textSecondary }]}>
              Her gün tek çekim: geçmiş · şimdi · niyetinin yönü. Kart bir kader değil, bir ayna.
            </ThemedText>

            {draw === null ? (
              <>
                {/* Deste: yüzü kapalı üç kart — çekim öncesi sahne */}
                <View style={styles.deckRow}>
                  {[0, 1, 2].map((index) => (
                    <Animated.View
                      key={index}
                      entering={FadeInDown.delay(index * 120).duration(400)}
                      style={[
                        styles.deckCard,
                        {
                          backgroundColor: colors.backgroundSelected,
                          borderColor: colors.tint,
                        },
                      ]}>
                      <ThemedText style={[styles.deckSymbol, { color: colors.tint }]}>
                        ◈
                      </ThemedText>
                    </Animated.View>
                  ))}
                </View>
                <Pressable
                  accessibilityRole="button"
                  disabled={busy}
                  onPress={() => void handleDraw()}
                  style={({ pressed }) => [
                    styles.button,
                    { backgroundColor: colors.tint, opacity: pressed || busy ? 0.75 : 1 },
                  ]}>
                  {busy ? (
                    <ActivityIndicator color={colors.background} />
                  ) : (
                    <ThemedText type="smallBold" style={{ color: colors.background }}>
                      Günün Kartlarını Çek
                    </ThemedText>
                  )}
                </Pressable>
              </>
            ) : (
              <>
                {draw.already_drawn_today ? (
                  <View style={[styles.badge, { backgroundColor: colors.backgroundSelected }]}>
                    <ThemedText type="smallBold" style={{ color: colors.tint }}>
                      BUGÜNKÜ ÇEKİMİN
                    </ThemedText>
                  </View>
                ) : null}
                {/* Kartlar sırayla çevrilir; yorum en sonda belirir */}
                {draw.cards.map((card, index) => (
                  <Animated.View
                    key={`${card.position}-${card.name}`}
                    entering={FlipInEasyY.delay(index * 450).duration(600)}
                    style={[
                      styles.cardRow,
                      { borderColor: colors.tint, backgroundColor: colors.background },
                    ]}>
                    <View style={styles.cardTopRow}>
                      <ThemedText type="smallBold" style={{ color: colors.accentWarm }}>
                        {card.position.toUpperCase()}
                      </ThemedText>
                      <ThemedText style={[styles.cardGlyph, { color: colors.tint }]}>
                        {card.reversed ? '▽' : '△'}
                      </ThemedText>
                    </View>
                    <ThemedText type="subtitle" style={{ color: colors.text }}>
                      {card.name}
                      {card.reversed ? ' (ters)' : ''}
                    </ThemedText>
                    {card.meaning ? (
                      <ThemedText type="small" style={{ color: colors.textSecondary }}>
                        {card.meaning}
                      </ThemedText>
                    ) : null}
                  </Animated.View>
                ))}
                <Animated.View entering={FadeIn.delay(draw.cards.length * 450 + 300).duration(600)}>
                  <ThemedText style={{ color: colors.text }}>{draw.interpretation}</ThemedText>
                  <ThemedText
                    type="small"
                    style={[styles.disclaimer, { color: colors.textSecondary }]}>
                    {draw.disclaimer}
                  </ThemedText>
                </Animated.View>
              </>
            )}

            {error ? (
              <ThemedText type="small" style={[styles.center, { color: colors.accentWarm }]}>
                {error}
              </ThemedText>
            ) : null}

            <Pressable
              accessibilityRole="button"
              onPress={() => router.replace('/mystic')}
              style={({ pressed }) => [styles.linkButton, { opacity: pressed ? 0.6 : 1 }]}>
              <ThemedText type="smallBold" style={{ color: colors.tint }}>
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
    paddingBottom: BottomTabInset + Spacing.four, // tab bar altında kalmasın
  },
  card: {
    alignItems: 'stretch',
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Radii.large,
    padding: Spacing.five,
    ...(Shadows.soft ?? {}),
  },
  cardRow: {
    gap: 4,
    borderWidth: 1.5,
    borderRadius: Radii.medium,
    padding: Spacing.three,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardGlyph: { fontSize: 16, lineHeight: 20 },
  deckRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
  },
  deckCard: {
    width: 72,
    height: 108,
    borderWidth: 1.5,
    borderRadius: Radii.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deckSymbol: { fontSize: 30, lineHeight: 36 },
  symbol: { fontSize: 54, lineHeight: 64, textAlign: 'center' },
  badge: {
    alignSelf: 'center',
    borderRadius: Radii.pill,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  center: { textAlign: 'center' },
  disclaimer: {
    textAlign: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.three,
  },
  button: {
    minHeight: 48,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  linkButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44, // erişilebilir dokunma hedefi
    paddingVertical: Spacing.two,
  },
});

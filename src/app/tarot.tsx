import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';

import { MysticScreenShell, useMysticColors } from '@/components/mystic-screen-shell';
import { ThemedText } from '@/components/themed-text';
import { Motion, Radii, Spacing } from '@/constants/theme';
import { useRequirePremium } from '@/hooks/use-premium-access';
import { trackEvent } from '@/lib/analytics';
import { ApiError, drawTarot, getFortuneRights, type TarotDraw } from '@/lib/api';
import { useProfile } from '@/providers/profile-provider';

export default function TarotScreen() {
  const router = useRouter();
  const { colors } = useMysticColors();
  const { profile } = useProfile();
  useRequirePremium();
  const [busy, setBusy] = useState(false);
  const [draw, setDraw] = useState<TarotDraw | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
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
    <MysticScreenShell
      symbol="◈"
      title="Günlük Tarot"
      subtitle="Her gün tek çekim: geçmiş · şimdi · niyetinin yönü. Kart bir kader değil, bir ayna."
      zodiacSign={profile?.zodiac_sign}>
      {draw === null ? (
        <>
          <View style={styles.deckRow}>
            {[0, 1, 2].map((index) => (
              <Animated.View
                key={index}
                entering={FadeIn.delay(index * Motion.stagger)
                  .duration(Motion.base)
                  .reduceMotion(ReduceMotion.System)}
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
          {draw.cards.map((card, index) => (
            <Animated.View
              key={`${card.position}-${card.name}`}
              entering={FadeIn.delay(index * Motion.stagger)
                .duration(Motion.base)
                .reduceMotion(ReduceMotion.System)}
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
          <Animated.View
            entering={FadeIn.delay(draw.cards.length * Motion.stagger + Motion.base)
              .duration(Motion.slow)
              .reduceMotion(ReduceMotion.System)}>
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
    </MysticScreenShell>
  );
}

const styles = StyleSheet.create({
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
    minHeight: 44,
    paddingVertical: Spacing.two,
  },
});

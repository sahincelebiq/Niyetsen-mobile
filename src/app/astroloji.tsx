import { Image } from 'expo-image';
import { type Href, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import {
  BottomTabInset, MaxContentWidth, MysticColors, Radii, Shadows, Spacing, SurfaceEdge,
} from '@/constants/theme';
import { getZodiacGlyph } from '@/constants/zodiac';
import { trackEvent } from '@/lib/analytics';
import { ApiError, getDailyHoroscope, type Horoscope } from '@/lib/api';

export default function AstrologyScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = MysticColors[scheme === 'dark' ? 'dark' : 'light'];
  const edge = scheme === 'dark' ? SurfaceEdge.dark : SurfaceEdge.light;
  const [loading, setLoading] = useState(true);
  const [horoscope, setHoroscope] = useState<Horoscope | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsProfile, setNeedsProfile] = useState(false);
  const [period, setPeriod] = useState<'daily' | 'weekly'>('daily');

  const load = useCallback(async (target: 'daily' | 'weekly' = 'daily') => {
    setLoading(true);
    setError(null);
    setNeedsProfile(false);
    try {
      const result = await getDailyHoroscope(target);
      setHoroscope(result);
      void trackEvent('mystic_secret_entry', { module: 'astroloji' });
    } catch (value) {
      if (value instanceof ApiError && value.status === 400) {
        setNeedsProfile(true);
      } else if (value instanceof ApiError && value.status === 403) {
        setError('Günlük burç için Ayarlar > Gizlilik bölümünden AI işleme onayı gerekli.');
      } else {
        setError(value instanceof Error ? value.message : 'Gökyüzüne şu an ulaşılamıyor.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(period);
  }, [load, period]);

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
            <ThemedText style={[styles.symbol, { color: colors.tint }]}>✦</ThemedText>
            <ThemedText type="title" style={[styles.center, { color: colors.text }]}>
              {period === 'weekly' ? 'Haftalık Burç' : 'Günlük Burç'}
            </ThemedText>

            <View style={styles.periodRow}>
              {(['daily', 'weekly'] as const).map((target) => (
                <Pressable
                  key={target}
                  accessibilityRole="button"
                  disabled={loading}
                  onPress={() => setPeriod(target)}
                  style={[
                    styles.periodButton,
                    {
                      borderColor: colors.tint,
                      backgroundColor:
                        period === target ? colors.tint : 'transparent',
                    },
                  ]}>
                  <ThemedText
                    type="smallBold"
                    style={{ color: period === target ? colors.background : colors.tint }}>
                    {target === 'daily' ? 'Bugün' : 'Bu Hafta'}
                  </ThemedText>
                </Pressable>
              ))}
            </View>

            {loading ? (
              <ActivityIndicator color={colors.tint} />
            ) : horoscope ? (
              <>
                <View style={[styles.badge, { backgroundColor: colors.backgroundSelected }]}>
                  <ThemedText type="smallBold" style={{ color: colors.tint }}>
                    {getZodiacGlyph(horoscope.sign)} {horoscope.sign.toUpperCase()} · {horoscope.day}
                  </ThemedText>
                </View>
                <ThemedText style={{ color: colors.text }}>
                  {horoscope.interpretation}
                </ThemedText>
                <ThemedText type="small" style={[styles.disclaimer, { color: colors.textSecondary }]}>
                  {horoscope.disclaimer}
                </ThemedText>
              </>
            ) : needsProfile ? (
              <>
                <ThemedText type="small" style={[styles.center, { color: colors.textSecondary }]}>
                  Burcunu bilmem için doğum tarihine ihtiyacım var.
                </ThemedText>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push('/settings' as Href)}
                  style={({ pressed }) => [
                    styles.button,
                    { backgroundColor: colors.tint, opacity: pressed ? 0.75 : 1 },
                  ]}>
                  <ThemedText type="smallBold" style={{ color: colors.background }}>
                    Profili Tamamla
                  </ThemedText>
                </Pressable>
              </>
            ) : (
              <>
                <ThemedText type="small" style={[styles.center, { color: colors.accentWarm }]}>
                  {error}
                </ThemedText>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void load(period)}
                  style={({ pressed }) => [
                    styles.button,
                    { backgroundColor: colors.tint, opacity: pressed ? 0.75 : 1 },
                  ]}>
                  <ThemedText type="smallBold" style={{ color: colors.background }}>
                    Tekrar Dene
                  </ThemedText>
                </Pressable>
              </>
            )}

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
  symbol: { fontSize: 54, lineHeight: 64, textAlign: 'center' },
  periodRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  periodButton: {
    minHeight: 44,
    minWidth: 110,
    borderWidth: 1.5,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
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

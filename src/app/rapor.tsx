/**
 * FAZ 8.8 — Niyetsen Raporu ("Wrapped") story ekranı.
 * Spotify Wrapped mantığı: tam ekran kartlar, üstte ilerleme çubukları,
 * sağa dokun = ileri, sola dokun = geri, uzun basınca duraklat.
 * Closing kartında Paylaş (view-shot → native share).
 * İlkbahar teması — hex yok. Kaçırılan görev/ceza ASLA gösterilmez.
 */
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  ReduceMotion,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import ViewShot, { type ViewShotRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

import { sproutGlyph } from '@/components/streak-pill';
import { ThemedText } from '@/components/themed-text';
import { CategoryBadge } from '@/components/ui/category-badge';
import { Motion, Radii, Spacing } from '@/constants/theme';
import { useRequirePremium } from '@/hooks/use-premium-access';
import { useTheme } from '@/hooks/use-theme';
import { getRecap, type Recap, type RecapCard } from '@/lib/api';

const STORY_MS = 5200;
type RecapPeriod = '7d' | '30d';

function streakDaysFromHeadline(headline: string): number {
  const match = headline.match(/(\d+)/);
  return match ? Number(match[1]) : 0;
}

export default function RecapScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { hasPremium, loading: premiumLoading } = useRequirePremium();
  const [period, setPeriod] = useState<RecapPeriod>('7d');
  const [recap, setRecap] = useState<Recap | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [sharing, setSharing] = useState(false);
  const progress = useSharedValue(0);
  const advanceAtRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remainingMsRef = useRef(STORY_MS);
  const shotRef = useRef<ViewShotRef>(null);

  const load = useCallback(async (nextPeriod: RecapPeriod = period) => {
    setError(null);
    try {
      const next = await getRecap(nextPeriod);
      setRecap(next);
      setIndex(0);
    } catch {
      setError('Raporun şu an yüklenemedi. Birazdan tekrar dene.');
    }
  }, [period]);

  useEffect(() => {
    if (premiumLoading || !hasPremium) return;
    void load(period);
  }, [load, period, hasPremium, premiumLoading]);

  const selectPeriod = (next: RecapPeriod) => {
    if (next === period) return;
    setPeriod(next);
  };
  useEffect(() => {
    const sub = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    return () => sub.remove();
  }, []);

  const cards = recap?.cards ?? [];
  const card = cards[index];
  const isClosing = card?.kind === 'closing';

  const advance = useCallback(
    (dir: 1 | -1) => {
      const next = index + dir;
      if (next < 0) return;
      if (next >= cards.length) {
        router.back();
        return;
      }
      setIndex(next);
    },
    [cards.length, index, router],
  );

  useEffect(() => {
    remainingMsRef.current = STORY_MS;
    progress.value = reduceMotion ? 1 : 0;
    setPaused(false);
  }, [index, progress, reduceMotion]);

  useEffect(() => {
    if (advanceAtRef.current) {
      clearTimeout(advanceAtRef.current);
      advanceAtRef.current = null;
    }
    if (!card || reduceMotion) return;
    if (paused) {
      cancelAnimation(progress);
      return;
    }

    const duration = Math.max(remainingMsRef.current, 80);
    const started = Date.now();
    const from = 1 - duration / STORY_MS;
    progress.value = from;
    progress.value = withTiming(1, {
      duration,
      easing: Easing.linear,
    });
    advanceAtRef.current = setTimeout(() => advance(1), duration);

    return () => {
      if (advanceAtRef.current) {
        clearTimeout(advanceAtRef.current);
        advanceAtRef.current = null;
      }
      remainingMsRef.current = Math.max(0, duration - (Date.now() - started));
      cancelAnimation(progress);
    };
  }, [advance, card, index, paused, progress, reduceMotion]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${Math.min(Math.max(progress.value, 0), 1) * 100}%`,
  }));

  const shareClosing = useCallback(async () => {
    if (Platform.OS === 'web' || sharing) return;
    setSharing(true);
    setPaused(true);
    try {
      const uri = await shotRef.current?.capture?.();
      if (!uri) return;
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Niyetsen Raporunu paylaş',
        });
      } else {
        await Share.share({
          url: uri,
          message: 'Niyetsen Raporum ✨',
        });
      }
    } catch {
      // Paylaşım iptali / platform kısıtı — sessiz geç.
    } finally {
      setSharing(false);
      setPaused(false);
    }
  }, [sharing]);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
      <View style={styles.topBar}>
        <View
          style={[
            styles.periodSegment,
            { backgroundColor: theme.backgroundSelected, borderColor: theme.border },
          ]}>
          {([
            { id: '7d' as const, label: 'Haftalık' },
            { id: '30d' as const, label: 'Aylık' },
          ]).map((option) => {
            const active = period === option.id;
            return (
              <Pressable
                key={option.id}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => selectPeriod(option.id)}
                style={[
                  styles.periodChip,
                  active && { backgroundColor: theme.tint },
                ]}>
                <ThemedText
                  type="smallBold"
                  style={{ color: active ? theme.onAccent : theme.textSecondary }}>
                  {option.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.progressRow}>
        {cards.map((c, i) => (
          <View
            key={`${c.kind}-${i}`}
            style={[styles.progressTrack, { backgroundColor: theme.progressTrack }]}>
            {i < index ? (
              <View style={[styles.progressFill, { backgroundColor: theme.tint, width: '100%' }]} />
            ) : i === index ? (
              reduceMotion ? (
                <View
                  style={[styles.progressFill, { backgroundColor: theme.tint, width: '100%' }]}
                />
              ) : (
                <Animated.View
                  style={[styles.progressFill, { backgroundColor: theme.tint }, fillStyle]}
                />
              )
            ) : null}
          </View>
        ))}
      </View>

      {!recap && !error && <ActivityIndicator color={theme.tint} style={styles.center} />}
      {error && (
        <View style={styles.center}>
          <ThemedText themeColor="danger">{error}</ThemedText>
          <Pressable onPress={() => void load(period)} style={styles.retry}>
            <ThemedText themeColor="tint">Tekrar dene</ThemedText>
          </Pressable>
        </View>
      )}

      {card && (
        <Animated.View
          key={`${card.kind}-${index}`}
          entering={
            reduceMotion
              ? undefined
              : FadeIn.duration(Motion.base)
                  .easing(Easing.out(Easing.cubic))
                  .reduceMotion(ReduceMotion.System)
          }
          style={styles.cardArea}>
          <ViewShot
            ref={shotRef}
            options={{ format: 'png', quality: 1, result: 'tmpfile' }}
            style={[styles.shot, { backgroundColor: theme.background }]}>
            <StoryCardBody card={card} />
          </ViewShot>
        </Animated.View>
      )}

      {isClosing && Platform.OS !== 'web' && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Raporu paylaş"
          onPress={() => void shareClosing()}
          disabled={sharing}
          style={[
            styles.shareBtn,
            {
              backgroundColor: theme.tint,
              opacity: sharing ? 0.7 : 1,
            },
          ]}>
          <ThemedText type="smallBold" style={{ color: theme.onAccent }}>
            {sharing ? 'Hazırlanıyor…' : 'Paylaş'}
          </ThemedText>
        </Pressable>
      )}

      <View style={styles.tapZones} pointerEvents="box-none">
        <Pressable
          style={styles.tapZone}
          onPress={() => advance(-1)}
          onLongPress={() => setPaused(true)}
          onPressOut={() => setPaused(false)}
          delayLongPress={180}
          accessibilityLabel="Önceki kart"
        />
        <Pressable
          style={styles.tapZone}
          onPress={() => advance(1)}
          onLongPress={() => setPaused(true)}
          onPressOut={() => setPaused(false)}
          delayLongPress={180}
          accessibilityLabel="Sonraki kart"
        />
      </View>

      <Pressable onPress={() => router.back()} style={styles.close} accessibilityLabel="Kapat">
        <ThemedText themeColor="textSecondary">Kapat ✕</ThemedText>
      </Pressable>
    </SafeAreaView>
  );
}

function StoryCardBody({ card }: { card: RecapCard }) {
  const theme = useTheme();
  const streakDays = streakDaysFromHeadline(card.headline);

  return (
    <View style={styles.cardBody}>
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.cardTitle}>
        {card.title}
      </ThemedText>

      {card.kind === 'trait' && (
        <View style={styles.traitBadge}>
          <CategoryBadge label={card.headline} />
        </View>
      )}

      {card.kind === 'streak' && (
        <ThemedText style={styles.sproutEmoji}>{sproutGlyph(streakDays)}</ThemedText>
      )}

      <ThemedText style={[styles.headline, { color: theme.tint }]}>
        {card.headline}
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.subtitle}>
        {card.subtitle}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topBar: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    alignItems: 'center',
    zIndex: 2,
  },
  periodSegment: {
    flexDirection: 'row',
    borderRadius: Radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 2,
    gap: 2,
  },
  periodChip: {
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
  },
  progressRow: {
    flexDirection: 'row',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    zIndex: 2,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    borderRadius: Radii.pill,
    overflow: 'hidden',
  },
  progressFill: {
    height: 3,
    borderRadius: Radii.pill,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three },
  retry: { padding: Spacing.two },
  cardArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.five,
    gap: Spacing.four,
    zIndex: 1,
  },
  shot: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.five,
    borderRadius: Radii.large,
    width: '100%',
  },
  cardBody: {
    alignItems: 'center',
    gap: Spacing.three,
    width: '100%',
  },
  cardTitle: { textTransform: 'uppercase', letterSpacing: 1.2 },
  traitBadge: { marginBottom: Spacing.one },
  sproutEmoji: { fontSize: 56, lineHeight: 64, textAlign: 'center' },
  headline: { fontSize: 44, lineHeight: 52, fontWeight: '700', textAlign: 'center' },
  subtitle: { textAlign: 'center', fontSize: 16, lineHeight: 24 },
  shareBtn: {
    position: 'absolute',
    bottom: Spacing.six,
    alignSelf: 'center',
    zIndex: 3,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
  },
  tapZones: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', zIndex: 0 },
  tapZone: { flex: 1 },
  close: {
    position: 'absolute',
    top: Spacing.five,
    right: Spacing.three,
    padding: Spacing.two,
    zIndex: 2,
  },
});

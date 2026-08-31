import { type Href, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProBadge } from '@/components/pro-badge';
import { sproutGlyph } from '@/components/streak-pill';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SurfaceCard } from '@/components/ui/surface-card';
import {
  BottomTabInset,
  Fonts,
  MaxContentWidth,
  Motion,
  Radii,
  Spacing,
  SurfaceEdge,
} from '@/constants/theme';
import { usePremiumAccess } from '@/hooks/use-premium-access';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { trackEvent } from '@/lib/analytics';
import {
  activatePhilosophyPath,
  ApiError,
  getPhilosophyPaths,
  isPaywallError,
  type PhilosophyPath,
} from '@/lib/api';
import { setPendingChatMessage } from '@/lib/pending-chat';
import { useLocale } from '@/providers/locale-provider';

/**
 * Felsefe Yolları (İdol Modu) — İlkbahar paleti.
 * FAZ 8.10 KAPI İÇERİDE: ücretsiz kullanıcı ekranı görür; paywall'a atılmaz.
 */
export default function PhilosophyPathsScreen() {
  const theme = useTheme();
  const { t } = useLocale();
  const scheme = useColorScheme();
  const edge = scheme === 'dark' ? SurfaceEdge.dark : SurfaceEdge.light;
  const router = useRouter();
  const { hasPaidAccess, loading: premiumLoading } = usePremiumAccess();
  const [paths, setPaths] = useState<PhilosophyPath[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    getPhilosophyPaths()
      .then((result) => {
        if (mounted) setPaths(result);
      })
      .catch((value) => {
        if (!mounted) return;
        setPaths([]);
        setError(
          value instanceof ApiError ? value.message : t.paths.loadFailed,
        );
      });
    return () => {
      mounted = false;
    };
  }, []);

  function openDetail(path: PhilosophyPath) {
    const key = path.slug?.trim() || path.name;
    router.push(`/yol-detay?slug=${encodeURIComponent(key)}` as Href);
  }

  async function startWithPath(path: PhilosophyPath) {
    void trackEvent('mystic_secret_entry', { module: 'felsefe_yolu', path: path.name });
    if (!hasPaidAccess) {
      router.push('/paywall' as Href);
      return;
    }
    try {
      await activatePhilosophyPath(path.slug?.trim() || path.name);
    } catch (value) {
      if (isPaywallError(value)) {
        router.push('/paywall' as Href);
        return;
      }
    }
    setPendingChatMessage(t.paths.startChat(path.name, path.tagline), true);
    router.replace('/' as Href);
  }

  const activateLocked = !premiumLoading && !hasPaidAccess;

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.content}>
          <Animated.View
            entering={FadeIn.duration(Motion.base).reduceMotion(ReduceMotion.System)}
            style={styles.hero}>
            <View
              style={[
                styles.sproutBadge,
                { backgroundColor: theme.backgroundSelected, borderColor: theme.border },
              ]}>
              <ThemedText style={styles.sproutEmoji}>{sproutGlyph(3)}</ThemedText>
              <ThemedText type="smallBold" style={{ color: theme.tint }}>
                {t.paths.badge}
              </ThemedText>
            </View>
            <View style={styles.titleRow}>
              <ThemedText type="screenTitle" style={[styles.title, { fontFamily: Fonts.serif }]}>
                {t.paths.title}
              </ThemedText>
              {activateLocked ? <ProBadge /> : null}
            </View>
            <ThemedText themeColor="textSecondary" style={styles.subtitle}>
              {t.paths.subtitle}
            </ThemedText>
          </Animated.View>

          {activateLocked ? (
            <View
              style={[
                styles.lockCard,
                { backgroundColor: theme.backgroundElement, borderColor: theme.border },
              ]}>
              <ThemedText type="smallBold" style={{ color: theme.tint, textAlign: 'center' }}>
                {t.paths.lockTitle}
              </ThemedText>
              <ThemedText
                type="small"
                themeColor="textSecondary"
                style={{ textAlign: 'center' }}>
                {t.paths.lockBody}
              </ThemedText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t.paths.startPro}
                onPress={() => router.push('/paywall' as Href)}
                style={({ pressed }) => [
                  styles.lockCta,
                  { backgroundColor: theme.tint, opacity: pressed ? 0.85 : 1 },
                ]}>
                <ThemedText type="smallBold" style={{ color: theme.onAccent }}>
                  {t.paths.startPro}
                </ThemedText>
              </Pressable>
            </View>
          ) : null}

          {paths === null ? (
            <ActivityIndicator color={theme.tint} style={styles.loader} />
          ) : null}

          {paths && paths.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
              {error ?? t.paths.empty}
            </ThemedText>
          ) : null}

          {paths
            ? paths.map((path, index) => {
                const isOpen = expanded === path.name;
                return (
                  <Animated.View
                    key={path.slug || path.name}
                    entering={FadeIn.delay(index * Motion.stagger)
                      .duration(Motion.base)
                      .reduceMotion(ReduceMotion.System)}>
                    <SurfaceCard
                      elevated
                      style={{
                        ...styles.card,
                        borderTopColor: edge,
                      }}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${path.name}: ${path.tagline}`}
                        accessibilityState={{ expanded: isOpen }}
                        onPress={() => setExpanded(isOpen ? null : path.name)}
                        style={styles.cardHeader}>
                        <View style={styles.cardTitle}>
                          <View style={styles.pathNameRow}>
                            <View
                              style={[styles.pathDot, { backgroundColor: theme.tint }]}
                            />
                            <ThemedText
                              type="subtitle"
                              style={{ fontFamily: Fonts.serifMedium }}>
                              {path.name}
                            </ThemedText>
                          </View>
                          <ThemedText type="small" themeColor="textSecondary">
                            {path.tagline}
                          </ThemedText>
                        </View>
                        <View
                          style={[
                            styles.expandChip,
                            {
                              backgroundColor: isOpen
                                ? theme.backgroundSelected
                                : theme.surfaceMuted,
                              borderColor: theme.border,
                            },
                          ]}>
                          <ThemedText type="smallBold" style={{ color: theme.tint }}>
                            {isOpen ? '−' : '+'}
                          </ThemedText>
                        </View>
                      </Pressable>

                      <View style={styles.openBody}>
                        {isOpen ? (
                          <ThemedText type="small" themeColor="textSecondary">
                            {path.philosophy}
                          </ThemedText>
                        ) : null}
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`${path.name} detayını aç`}
                          onPress={() => openDetail(path)}
                          style={({ pressed }) => [
                            styles.secondaryButton,
                            {
                              borderColor: theme.border,
                              opacity: pressed ? 0.88 : 1,
                            },
                          ]}>
                          <ThemedText type="smallBold" themeColor="tint">
                            {t.paths.inspect}
                          </ThemedText>
                        </Pressable>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`${path.name} ile sohbete başla`}
                          onPress={() => startWithPath(path)}
                          style={({ pressed }) => [
                            styles.startButton,
                            {
                              backgroundColor: theme.accentWarm,
                              opacity: pressed ? 0.88 : 1,
                            },
                          ]}>
                          <ThemedText type="smallBold" style={{ color: theme.onAccent }}>
                            {activateLocked ? t.paths.startPro : t.paths.start}
                          </ThemedText>
                        </Pressable>
                      </View>
                    </SurfaceCard>
                  </Animated.View>
                );
              })
            : null}

          <ThemedText type="small" themeColor="textSecondary" style={styles.disclaimer}>
            {t.paths.disclaimer}
          </ThemedText>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  hero: {
    gap: Spacing.two,
    paddingBottom: Spacing.two,
  },
  sproutBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radii.pill,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  sproutEmoji: { fontSize: 16, lineHeight: 20 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  title: { flexShrink: 1 },
  subtitle: { maxWidth: 560 },
  loader: { marginTop: Spacing.six },
  center: { textAlign: 'center' },
  lockCard: {
    padding: Spacing.four,
    borderRadius: Radii.large,
    borderWidth: 1,
    alignItems: 'center',
    gap: Spacing.three,
  },
  lockGlyph: { fontSize: 28, lineHeight: 34 },
  lockCta: {
    minHeight: 44,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Radii.pill,
    justifyContent: 'center',
  },
  card: {
    gap: Spacing.two,
    padding: Spacing.four,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    minHeight: 44,
  },
  cardTitle: { flex: 1, gap: 4 },
  pathNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  pathDot: {
    width: 8,
    height: 8,
    borderRadius: Radii.pill,
  },
  expandChip: {
    minWidth: 36,
    minHeight: 36,
    borderRadius: Radii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  openBody: {
    gap: Spacing.three,
    paddingTop: Spacing.two,
  },
  secondaryButton: {
    minHeight: 44,
    borderRadius: Radii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  startButton: {
    minHeight: 48,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  disclaimer: {
    textAlign: 'center',
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});

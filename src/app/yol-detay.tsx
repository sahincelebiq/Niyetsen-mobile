import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ErrorBanner } from '@/components/error-banner';
import { ProBadge } from '@/components/pro-badge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SurfaceCard } from '@/components/ui/surface-card';
import {
  BottomTabInset,
  Fonts,
  MaxContentWidth,
  Radii,
  Spacing,
} from '@/constants/theme';
import { usePremiumAccess } from '@/hooks/use-premium-access';
import { useTheme } from '@/hooks/use-theme';
import { trackEvent } from '@/lib/analytics';
import {
  activatePhilosophyPath,
  ApiError,
  getPathDetail,
  isPaywallError,
  type PathDetail,
  type PathDetailSection,
} from '@/lib/api';
import { setPendingChatMessage } from '@/lib/pending-chat';
import { useLocale } from '@/providers/locale-provider';

const SECTION_KEYS = [
  'core_beliefs',
  'mindset',
  'habits',
  'daily_routine',
  'decision_style',
  'failure_and_recovery',
  'lessons_for_users',
  'books',
] as const;

function SectionBody({ value }: { value: string | string[] }) {
  if (Array.isArray(value)) {
    return (
      <View style={styles.bullets}>
        {value.map((item) => (
          <ThemedText key={item} type="small" themeColor="textSecondary">
            • {item}
          </ThemedText>
        ))}
      </View>
    );
  }
  return (
    <ThemedText type="small" themeColor="textSecondary">
      {value}
    </ThemedText>
  );
}

/**
 * FAZ 8.9 — İdol / Felsefe Yolu detay.
 * Kapı içeride: ücretsiz kullanıcı kilit önizlemesi görür, dışarı atılmaz.
 * source_note her zaman görünür (yasal).
 */
export default function PathDetailScreen() {
  const theme = useTheme();
  const { t } = useLocale();
  const router = useRouter();
  const { hasPaidAccess, loading: premiumLoading } = usePremiumAccess();
  const params = useLocalSearchParams<{ slug?: string }>();
  const slug = useMemo(() => {
    const raw = params.slug;
    const value = Array.isArray(raw) ? raw[0] : raw;
    return (value ?? '').trim();
  }, [params.slug]);

  const [detail, setDetail] = useState<PathDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    try {
      setDetail(await getPathDetail(slug));
    } catch (value) {
      setError(value instanceof ApiError ? value.message : t.paths.detailLoadFailed);
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [slug, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function applyToPlan() {
    if (!detail) return;
    void trackEvent('mystic_secret_entry', {
      module: 'felsefe_yolu_uygula',
      path: detail.name,
    });
    if (!hasPaidAccess) {
      router.push('/paywall' as Href);
      return;
    }
    try {
      await activatePhilosophyPath(detail.slug || slug);
    } catch (value) {
      if (isPaywallError(value)) {
        router.push('/paywall' as Href);
        return;
      }
    }
    setPendingChatMessage(t.paths.startChat(detail.name, detail.tagline), true);
    router.replace('/' as Href);
  }

  const activateLocked = !premiumLoading && !hasPaidAccess;
  const sourceNote =
    detail?.source_note || t.paths.sourceFallback;

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.content}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.common.back}
            hitSlop={12}
            onPress={() => router.back()}
            style={styles.back}>
            <ThemedText type="smallBold" themeColor="tint">
              {t.paths.back}
            </ThemedText>
          </Pressable>

          <View style={styles.titleRow}>
            <ThemedText type="screenTitle" style={{ fontFamily: Fonts.serif, flex: 1 }}>
              {detail?.name ?? t.paths.fallbackTitle}
            </ThemedText>
            {activateLocked ? <ProBadge /> : null}
          </View>
          {detail?.tagline ? (
            <ThemedText type="small" themeColor="textSecondary">
              {detail.tagline}
            </ThemedText>
          ) : null}

          {activateLocked ? (
            <View
              style={[
                styles.lockCard,
                { backgroundColor: theme.backgroundElement, borderColor: theme.border },
              ]}>
              <ThemedText type="smallBold" style={{ color: theme.tint, textAlign: 'center' }}>
                {t.paths.detailLockTitle}
              </ThemedText>
              <ThemedText
                type="small"
                themeColor="textSecondary"
                style={{ textAlign: 'center' }}>
                {t.paths.detailLockBody}
              </ThemedText>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/paywall' as Href)}
                style={({ pressed }) => [
                  styles.lockCta,
                  { backgroundColor: theme.tint, opacity: pressed ? 0.85 : 1 },
                ]}>
                <ThemedText type="smallBold" style={{ color: theme.onAccent }}>
                  {t.paths.applyPro}
                </ThemedText>
              </Pressable>
            </View>
          ) : null}

          {(premiumLoading || loading) && !detail ? (
            <ActivityIndicator color={theme.tint} style={{ marginTop: Spacing.four }} />
          ) : null}

          {error ? <ErrorBanner message={error} onRetry={() => void load()} /> : null}

          {detail ? (
            <>
              {detail.philosophy ? (
                <SurfaceCard style={styles.card}>
                  <ThemedText type="smallBold" themeColor="textSecondary">
                    {t.paths.philosophy}
                  </ThemedText>
                  <ThemedText type="small">{detail.philosophy}</ThemedText>
                </SurfaceCard>
              ) : null}

              {detail.sections.map((section: PathDetailSection) => (
                <SurfaceCard key={section.key} style={styles.card}>
                  <ThemedText type="subtitle" style={{ fontFamily: Fonts.serifMedium }}>
                    {SECTION_KEYS.includes(section.key as (typeof SECTION_KEYS)[number])
                      ? t.paths[section.key as (typeof SECTION_KEYS)[number]]
                      : section.key.split('_').join(' ')}
                  </ThemedText>
                  <SectionBody value={section.value} />
                </SurfaceCard>
              ))}

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t.paths.apply}
                onPress={applyToPlan}
                style={({ pressed }) => [
                  styles.applyCta,
                  { backgroundColor: theme.accentWarm, opacity: pressed ? 0.88 : 1 },
                ]}>
                <ThemedText type="smallBold" style={{ color: theme.onAccent }}>
                  {activateLocked ? t.paths.applyPro : t.paths.apply}
                </ThemedText>
              </Pressable>
            </>
          ) : null}

          <ThemedText type="small" themeColor="textSecondary" style={styles.sourceNote}>
            {sourceNote}
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
  back: { minHeight: 44, justifyContent: 'center' },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  lockCard: {
    padding: Spacing.four,
    borderRadius: Radii.large,
    borderWidth: 1,
    alignItems: 'center',
    gap: Spacing.three,
  },
  lockGlyph: { fontSize: 26, lineHeight: 32 },
  lockCta: {
    minHeight: 44,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Radii.pill,
    justifyContent: 'center',
  },
  card: { gap: Spacing.two, padding: Spacing.four },
  bullets: { gap: Spacing.one },
  applyCta: {
    minHeight: 48,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  sourceNote: {
    textAlign: 'center',
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});

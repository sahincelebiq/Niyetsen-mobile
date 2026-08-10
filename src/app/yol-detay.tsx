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

import { ProBadge } from '@/components/pro-badge';
import { sproutGlyph } from '@/components/streak-pill';
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
  ApiError,
  getPathDetail,
  isPaywallError,
  type PathDetail,
  type PathDetailSection,
} from '@/lib/api';
import { setPendingChatMessage } from '@/lib/pending-chat';

const SECTION_TITLES: Record<string, string> = {
  core_beliefs: 'Temel inançlar',
  mindset: 'Zihin yapısı',
  habits: 'Alışkanlıklar',
  daily_routine: 'Günlük rutin',
  decision_style: 'Karar stili',
  failure_and_recovery: 'Düşüş ve toparlanma',
  lessons_for_users: 'Sana dersler',
  books: 'Kitaplar / kaynaklar',
};

function sectionTitle(key: string): string {
  return SECTION_TITLES[key] ?? key.split('_').join(' ');
}

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
  const router = useRouter();
  const { hasPremium, loading: premiumLoading } = usePremiumAccess();
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
    if (!slug || !hasPremium) return;
    setLoading(true);
    setError(null);
    try {
      setDetail(await getPathDetail(slug));
    } catch (value) {
      if (isPaywallError(value)) {
        setDetail(null);
        setError(null);
        return;
      }
      setError(value instanceof ApiError ? value.message : 'Yol detayı yüklenemedi.');
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [hasPremium, slug]);

  useEffect(() => {
    if (premiumLoading) return;
    if (!hasPremium) {
      setDetail(null);
      setLoading(false);
      return;
    }
    void load();
  }, [hasPremium, load, premiumLoading]);

  function applyToPlan() {
    if (!detail) return;
    void trackEvent('mystic_secret_entry', {
      module: 'felsefe_yolu_uygula',
      path: detail.name,
    });
    setPendingChatMessage(
      `${detail.name} ile ilerlemek istiyorum — ${detail.tagline}. Bu yolu niyetime işler misin?`,
    );
    router.push('/' as Href);
  }

  const locked = !premiumLoading && !hasPremium;
  const sourceNote =
    detail?.source_note ||
    'Bu yol kamuya açık yaklaşımlardan ilham alır; anılan kişilerle bağlantılı değildir.';

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.content}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Geri"
            hitSlop={12}
            onPress={() => router.back()}
            style={styles.back}>
            <ThemedText type="smallBold" themeColor="tint">
              ← Yollar
            </ThemedText>
          </Pressable>

          <View style={styles.titleRow}>
            <ThemedText type="screenTitle" style={{ fontFamily: Fonts.serif, flex: 1 }}>
              {detail?.name ?? 'Felsefe yolu'}
            </ThemedText>
            {locked ? <ProBadge /> : null}
          </View>
          {detail?.tagline ? (
            <ThemedText type="small" themeColor="textSecondary">
              {detail.tagline}
            </ThemedText>
          ) : null}

          {locked ? (
            <View
              style={[
                styles.lockCard,
                { backgroundColor: theme.backgroundElement, borderColor: theme.border },
              ]}>
              <ThemedText style={styles.lockGlyph}>{sproutGlyph(2)}</ThemedText>
              <ThemedText type="subtitle" style={{ textAlign: 'center' }}>
                Yolun iç yüzü burada
              </ThemedText>
              <ThemedText
                type="small"
                themeColor="textSecondary"
                style={{ textAlign: 'center' }}>
                Alışkanlıklar, rutin, karar stili ve dersler — PRO ile açılır.
                Sonra sohbete bağlayıp niyetine işlersin.
              </ThemedText>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/paywall' as Href)}
                style={({ pressed }) => [
                  styles.lockCta,
                  { backgroundColor: theme.tint, opacity: pressed ? 0.85 : 1 },
                ]}>
                <ThemedText type="smallBold" style={{ color: theme.onAccent }}>
                  PRO ile aç
                </ThemedText>
              </Pressable>
            </View>
          ) : null}

          {(premiumLoading || loading) && !locked ? (
            <ActivityIndicator color={theme.tint} style={{ marginTop: Spacing.four }} />
          ) : null}

          {error ? (
            <View style={styles.errorBlock}>
              <ThemedText themeColor="danger">{error}</ThemedText>
              <Pressable onPress={() => void load()} hitSlop={12}>
                <ThemedText themeColor="tint">Tekrar dene</ThemedText>
              </Pressable>
            </View>
          ) : null}

          {detail && hasPremium ? (
            <>
              {detail.philosophy ? (
                <SurfaceCard style={styles.card}>
                  <ThemedText type="smallBold" themeColor="textSecondary">
                    FELSEFE
                  </ThemedText>
                  <ThemedText type="small">{detail.philosophy}</ThemedText>
                </SurfaceCard>
              ) : null}

              {detail.sections.map((section: PathDetailSection) => (
                <SurfaceCard key={section.key} style={styles.card}>
                  <ThemedText type="subtitle" style={{ fontFamily: Fonts.serifMedium }}>
                    {sectionTitle(section.key)}
                  </ThemedText>
                  <SectionBody value={section.value} />
                </SurfaceCard>
              ))}

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Bu yolu planıma uygula"
                onPress={applyToPlan}
                style={({ pressed }) => [
                  styles.applyCta,
                  { backgroundColor: theme.accentWarm, opacity: pressed ? 0.88 : 1 },
                ]}>
                <ThemedText type="smallBold" style={{ color: theme.onAccent }}>
                  Bu yolu planıma uygula
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
  errorBlock: { gap: Spacing.two, alignItems: 'flex-start' },
  sourceNote: {
    textAlign: 'center',
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});

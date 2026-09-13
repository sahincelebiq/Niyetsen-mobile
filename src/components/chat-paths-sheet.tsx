import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { type Href, useRouter } from 'expo-router';

import { ComposerPopover } from '@/components/composer-popover';
import { ProBadge } from '@/components/pro-badge';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { usePremiumAccess } from '@/hooks/use-premium-access';
import { useTheme } from '@/hooks/use-theme';
import {
  activatePhilosophyPath,
  ApiError,
  getPhilosophyPaths,
  isPaywallError,
  type PhilosophyPath,
} from '@/lib/api';
import { trackEvent } from '@/lib/analytics';
import { useLocale } from '@/providers/locale-provider';

type ChatPathsSheetProps = {
  onClose: () => void;
  /**
   * "Yola çevir" başarılı: yol aktivasyonu yapıldı; ebeveyn öneri metnini
   * composer'a düşürür (otomatik gönderim YOK — kullanıcı son sözü söyler).
   */
  onTurnPath: (path: PhilosophyPath) => void;
};

const CARD_WIDTH = 196;

/**
 * Felsefe Yolları mini sayfası — Bağlam drawer'dan buraya taşındı
 * (ss-09 geri bildirimi: kart oraya ait değildi). Composer yanındaki ✿
 * ikonundan açılır; ilham kartları yatay kaydırılır, seçilen kart sohbete
 * niyet önerisi olarak düşer. Kapı İÇERİDE: ücretsiz kullanıcı kartları
 * görür, aktivasyon CTA'sı paywall'a gider (yollar.tsx ile aynı kural).
 */
export function ChatPathsSheet({ onClose, onTurnPath }: ChatPathsSheetProps) {
  const theme = useTheme();
  const { t } = useLocale();
  const router = useRouter();
  const { hasPaidAccess, loading: premiumLoading } = usePremiumAccess();
  const [paths, setPaths] = useState<PhilosophyPath[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busySlug, setBusySlug] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setPaths(await getPhilosophyPaths());
    } catch (value) {
      setPaths([]);
      setError(value instanceof ApiError ? value.message : t.paths.loadFailed);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleTurn(path: PhilosophyPath) {
    const slug = path.slug?.trim() || path.name;
    void trackEvent('mystic_secret_entry', { module: 'felsefe_yolu', path: path.name });
    if (!hasPaidAccess) {
      onClose();
      router.push('/paywall' as Href);
      return;
    }
    setBusySlug(slug);
    try {
      await activatePhilosophyPath(slug);
      onTurnPath(path);
    } catch (value) {
      if (isPaywallError(value)) {
        onClose();
        router.push('/paywall' as Href);
        return;
      }
      setError(value instanceof ApiError ? value.message : t.paths.loadFailed);
    } finally {
      setBusySlug(null);
    }
  }

  const locked = !premiumLoading && !hasPaidAccess;

  return (
    <ComposerPopover title={t.chat.pathsSheet.title} onClose={onClose}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
        {t.chat.pathsSheet.subtitle}
      </ThemedText>
      {paths === null ? (
        <View style={styles.stateBlock} accessibilityLabel={t.common.loading}>
          <ActivityIndicator color={theme.tint} />
        </View>
      ) : paths.length === 0 ? (
        <View style={styles.stateBlock}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.stateCopy}>
            {error ?? t.paths.empty}
          </ThemedText>
          {error ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.common.retry}
              onPress={() => void load()}
              style={({ pressed }) => [styles.retry, pressed && styles.pressed]}>
              <ThemedText type="smallBold" themeColor="tint">
                {t.common.retry}
              </ThemedText>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.cardsRow}>
          {paths.map((path) => {
            const slug = path.slug?.trim() || path.name;
            const busy = busySlug === slug;
            return (
              <View
                key={slug}
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.background,
                    borderColor: theme.border,
                  },
                ]}>
                <View style={styles.cardHead}>
                  <ThemedText type="smallBold" numberOfLines={1} style={styles.cardName}>
                    {path.name}
                  </ThemedText>
                  {locked ? <ProBadge /> : null}
                </View>
                <ThemedText
                  type="small"
                  themeColor="textSecondary"
                  numberOfLines={3}
                  style={styles.cardTagline}>
                  {path.tagline}
                </ThemedText>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${path.name} — ${t.chat.pathsSheet.turn}`}
                  accessibilityState={{ busy }}
                  disabled={busySlug !== null}
                  onPress={() => void handleTurn(path)}
                  style={({ pressed }) => [
                    styles.turnButton,
                    {
                      backgroundColor: locked ? theme.backgroundSelected : theme.accentWarm,
                      opacity: pressed ? 0.88 : 1,
                    },
                  ]}>
                  {busy ? (
                    <ActivityIndicator size="small" color={theme.onAccent} />
                  ) : (
                    <ThemedText
                      type="smallBold"
                      style={{ color: locked ? theme.tint : theme.onAccent }}>
                      {locked ? t.paths.startPro : t.chat.pathsSheet.turn}
                    </ThemedText>
                  )}
                </Pressable>
              </View>
            );
          })}
        </ScrollView>
      )}
    </ComposerPopover>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    marginTop: -Spacing.one,
  },
  stateBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.four,
  },
  stateCopy: {
    textAlign: 'center',
  },
  retry: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  cardsRow: {
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: Radii.medium,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  cardName: {
    flex: 1,
  },
  cardTagline: {
    minHeight: 42,
  },
  turnButton: {
    minHeight: 44,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
});

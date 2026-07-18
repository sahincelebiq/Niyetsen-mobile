import { type Href, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ui/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { trackEvent } from '@/lib/analytics';
import { ApiError, getPhilosophyPaths, isPaywallError, type PhilosophyPath } from '@/lib/api';
import { setPendingChatMessage } from '@/lib/pending-chat';

/**
 * Felsefe Yolları (İdol Modu, Dalga 4.2).
 * "Bir filmden, bir kitaptan, bir insandan ilham aldın" anını sisteme çevirir:
 * yol seçilir → sohbet, hazır mesajla açılır → rehber yolu niyete işler.
 * İlke: taklit değil, tercüme. Kişi adları yalnız ilham kaynağı olarak geçer.
 */
export default function PhilosophyPathsScreen() {
  const theme = useTheme();
  const router = useRouter();
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
        if (isPaywallError(value)) {
          // Felsefe Yolları premium — free kullanıcı pakete yönlendirilir.
          router.replace('/paywall' as Href);
          return;
        }
        setPaths([]);
        setError(
          value instanceof ApiError ? value.message : 'Yollar şu an yüklenemiyor.',
        );
      });
    return () => {
      mounted = false;
    };
  }, []);

  function startWithPath(path: PhilosophyPath) {
    void trackEvent('mystic_secret_entry', { module: 'felsefe_yolu', path: path.name });
    // Otomatik göndermiyoruz: mesaj giriş kutusuna konur, kontrol kullanıcıda.
    setPendingChatMessage(
      `${path.name} ile ilerlemek istiyorum — ${path.tagline}. Bu yolu niyetime işler misin?`,
    );
    router.push('/' as Href);
  }

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.content}>
          <ScreenHeader
            title="Felsefe Yolları"
            subtitle="Bir insandan, bir filmden, bir kitaptan ilham aldın. O anı söndürme — bir yola çevir."
          />

          {paths === null ? (
            <ActivityIndicator color={theme.tint} style={styles.loader} />
          ) : paths.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
              {error ?? 'Henüz tanımlı yol yok.'}
            </ThemedText>
          ) : (
            paths.map((path) => {
              const isOpen = expanded === path.name;
              return (
                <View
                  key={path.name}
                  style={[
                    styles.card,
                    { borderColor: theme.border, backgroundColor: theme.backgroundElement },
                  ]}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${path.name}: ${path.tagline}`}
                    onPress={() => setExpanded(isOpen ? null : path.name)}
                    style={styles.cardHeader}>
                    <View style={styles.cardTitle}>
                      <ThemedText type="subtitle">{path.name}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {path.tagline}
                      </ThemedText>
                    </View>
                    <ThemedText type="smallBold" themeColor="tint">
                      {isOpen ? '−' : '+'}
                    </ThemedText>
                  </Pressable>

                  {isOpen ? (
                    <>
                      <ThemedText type="small" themeColor="textSecondary">
                        {path.philosophy}
                      </ThemedText>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => startWithPath(path)}
                        style={({ pressed }) => [
                          styles.startButton,
                          { backgroundColor: theme.accentWarm, opacity: pressed ? 0.85 : 1 },
                        ]}>
                        <ThemedText type="smallBold" style={{ color: theme.onAccent }}>
                          Bu yolla sohbete başla
                        </ThemedText>
                      </Pressable>
                    </>
                  ) : null}
                </View>
              );
            })
          )}

          <ThemedText type="small" themeColor="textSecondary" style={styles.disclaimer}>
            Yollar, kamuya açık kitap ve röportajlardan ilham alır; anılan
            kişilerle bağlantılı değildir. İlke: taklit değil, tercüme.
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
  loader: { marginTop: Spacing.six },
  center: { textAlign: 'center' },
  card: {
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radii.large,
    padding: Spacing.four,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    minHeight: 44,
  },
  cardTitle: { flex: 1, gap: 2 },
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

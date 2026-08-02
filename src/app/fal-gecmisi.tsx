import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
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
  BottomTabInset, MaxContentWidth, MysticColors, Radii, Shadows, Spacing,
} from '@/constants/theme';
import { useRequirePremium } from '@/hooks/use-premium-access';
import { getFortuneHistory, type FortuneHistoryItem } from '@/lib/api';

const TYPE_META: Record<FortuneHistoryItem['type'], { symbol: string; label: string }> = {
  tarot: { symbol: '◈', label: 'Tarot' },
  kahve: { symbol: '☕', label: 'Kahve Falı' },
  el: { symbol: '✋', label: 'El Falı' },
  burc: { symbol: '✦', label: 'Günlük Burç' },
};

function formatDay(iso: string): string {
  const [year, month, day] = iso.split('-');
  if (!year || !month || !day) return iso;
  return `${day}.${month}.${year}`;
}

export default function FortuneHistoryScreen() {
  const router = useRouter();
  useRequirePremium();
  const scheme = useColorScheme();
  const colors = MysticColors[scheme === 'dark' ? 'dark' : 'light'];
  const [items, setItems] = useState<FortuneHistoryItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setItems(await getFortuneHistory(30));
    } catch (value) {
      setItems([]);
      setError(value instanceof Error ? value.message : 'Geçmiş yüklenemedi.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <Image
        source={require('@/assets/images/chat-mystic-bg.png')}
        style={styles.background}
        contentFit="cover"
        pointerEvents="none"
      />
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <ThemedText type="title" style={{ color: colors.text }}>
              Fal Geçmişin
            </ThemedText>
            <ThemedText type="small" style={[styles.center, { color: colors.textSecondary }]}>
              Aynaya önceki bakışların — hangi gün ne fısıldamıştı?
            </ThemedText>
          </View>

          {items === null ? (
            <ActivityIndicator color={colors.tint} style={styles.loader} />
          ) : items.length === 0 ? (
            <View style={[styles.card, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
              <ThemedText type="small" style={[styles.center, { color: colors.textSecondary }]}>
                {error ?? 'Henüz kayıtlı bir fal yok. İlk çekimini tarot ile yapabilirsin.'}
              </ThemedText>
            </View>
          ) : (
            items.map((item) => {
              const meta = TYPE_META[item.type];
              const interpretation = item.result.interpretation ?? '';
              const expanded = expandedId === item.id;
              return (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  onPress={() => setExpandedId(expanded ? null : item.id)}
                  style={({ pressed }) => [
                    styles.card,
                    {
                      backgroundColor: colors.backgroundElement,
                      borderColor: colors.border,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}>
                  <View style={styles.cardHeader}>
                    <ThemedText style={[styles.cardSymbol, { color: colors.tint }]}>
                      {meta.symbol}
                    </ThemedText>
                    <View style={styles.cardTitle}>
                      <ThemedText type="smallBold" style={{ color: colors.text }}>
                        {meta.label}
                        {item.result.sign ? ` · ${item.result.sign}` : ''}
                      </ThemedText>
                      <ThemedText type="small" style={{ color: colors.textSecondary }}>
                        {formatDay(item.day)}
                      </ThemedText>
                    </View>
                  </View>
                  {item.result.cards?.length ? (
                    <ThemedText type="small" style={{ color: colors.accentWarm }}>
                      {item.result.cards
                        .map((card) => `${card.name}${card.reversed ? ' (ters)' : ''}`)
                        .join(' · ')}
                    </ThemedText>
                  ) : null}
                  {item.result.symbols?.length ? (
                    <ThemedText type="small" style={{ color: colors.accentWarm }}>
                      {item.result.symbols.join(' · ')}
                    </ThemedText>
                  ) : null}
                  {interpretation ? (
                    <ThemedText
                      type="small"
                      numberOfLines={expanded ? undefined : 3}
                      style={{ color: colors.textSecondary }}>
                      {interpretation}
                    </ThemedText>
                  ) : null}
                </Pressable>
              );
            })
          )}

          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace('/mystic')}
            style={({ pressed }) => [styles.linkButton, { opacity: pressed ? 0.6 : 1 }]}>
            <ThemedText type="smallBold" style={{ color: colors.tint }}>
              Mistik Keşfe Dön
            </ThemedText>
          </Pressable>
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
    gap: Spacing.three,
    padding: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  header: { gap: Spacing.one, alignItems: 'center', marginBottom: Spacing.two },
  loader: { marginTop: Spacing.six },
  card: {
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radii.large,
    padding: Spacing.four,
    ...(Shadows.soft ?? {}),
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  cardSymbol: { fontSize: 26, lineHeight: 32 },
  cardTitle: { flex: 1, gap: 2 },
  center: { textAlign: 'center' },
  linkButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingVertical: Spacing.two,
  },
});

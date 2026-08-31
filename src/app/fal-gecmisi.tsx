import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { MysticScreenShell, useMysticColors } from '@/components/mystic-screen-shell';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { getFortuneHistory, type FortuneHistoryItem } from '@/lib/api';
import { mysticHref } from '@/lib/mystic-routes';
import { useLocale } from '@/providers/locale-provider';
import { useRouter } from 'expo-router';

function formatDay(iso: string): string {
  const datePart = iso.slice(0, 10);
  const [year, month, day] = datePart.split('-');
  if (!year || !month || !day) return iso;
  return `${day}.${month}.${year}`;
}

export default function FortuneHistoryScreen() {
  const router = useRouter();
  const { colors } = useMysticColors();
  const { t } = useLocale();
  const [items, setItems] = useState<FortuneHistoryItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function typeMeta(type: string): { symbol: string; label: string } {
    const labels: Record<string, { symbol: string; label: string }> = {
      tarot: { symbol: '◈', label: t.mystic.typeTarot },
      kahve: { symbol: '☕', label: t.mystic.typeCoffee },
      el: { symbol: '✋', label: t.mystic.typePalm },
      burc: { symbol: '✦', label: t.mystic.typeHoroscope },
      chat: { symbol: '✶', label: t.mystic.typeChat },
    };
    return labels[type] ?? { symbol: '☾', label: t.mystic.typeGeneric };
  }

  const load = useCallback(async () => {
    setError(null);
    try {
      setItems(await getFortuneHistory(30));
    } catch (value) {
      setItems([]);
      setError(value instanceof Error ? value.message : t.mystic.historyLoadFailed);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <MysticScreenShell
      symbol="☾"
      title={t.mystic.historyScreenTitle}
      subtitle={t.mystic.historySubtitle}>
      {items === null ? (
        <ActivityIndicator color={colors.tint} />
      ) : items.length === 0 ? (
        <View style={[styles.empty, { borderColor: colors.border, backgroundColor: colors.background }]}>
          <ThemedText type="small" style={[styles.center, { color: colors.textSecondary }]}>
            {error ?? t.mystic.historyEmpty}
          </ThemedText>
          {error ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => void load()}
              style={({ pressed }) => [
                styles.retry,
                { backgroundColor: colors.tint, opacity: pressed ? 0.75 : 1 },
              ]}>
              <ThemedText type="smallBold" style={{ color: colors.background }}>
                {t.common.retry}
              </ThemedText>
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push(mysticHref.tarot)}
              style={({ pressed }) => [
                styles.retry,
                { backgroundColor: colors.tint, opacity: pressed ? 0.75 : 1 },
              ]}>
              <ThemedText type="smallBold" style={{ color: colors.background }}>
                {t.mystic.drawTarot}
              </ThemedText>
            </Pressable>
          )}
        </View>
      ) : (
        items.map((item) => {
          const meta = typeMeta(item.type);
          const interpretation = item.result?.interpretation ?? item.result?.preview ?? '';
          const expanded = expandedId === item.id;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              onPress={() => setExpandedId(expanded ? null : item.id)}
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: colors.background,
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
                    {item.result?.sign ? ` · ${item.result.sign}` : ''}
                  </ThemedText>
                  <ThemedText type="small" style={{ color: colors.textSecondary }}>
                    {formatDay(item.day)}
                  </ThemedText>
                </View>
              </View>
              {item.result?.cards?.length ? (
                <ThemedText type="small" style={{ color: colors.accentWarm }}>
                  {item.result.cards
                    .map((card) => `${card.name}${card.reversed ? ` ${t.mystic.tarotReversed}` : ''}`)
                    .join(' · ')}
                </ThemedText>
              ) : null}
              {item.result?.symbols?.length ? (
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
        onPress={() => router.replace(mysticHref.hub)}
        style={({ pressed }) => [styles.linkButton, { opacity: pressed ? 0.6 : 1 }]}>
        <ThemedText type="smallBold" style={{ color: colors.tint }}>
          {t.mystic.hubTitle}
        </ThemedText>
      </Pressable>
    </MysticScreenShell>
  );
}

const styles = StyleSheet.create({
  empty: {
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Radii.medium,
    padding: Spacing.three,
    alignItems: 'center',
  },
  retry: {
    minHeight: 44,
    minWidth: 160,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  card: {
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radii.medium,
    padding: Spacing.three,
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

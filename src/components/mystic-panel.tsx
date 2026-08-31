import { type Href, useRouter } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useMysticColors } from '@/components/mystic-screen-shell';
import { ThemedText } from '@/components/themed-text';
import { Radii, Shadows, Spacing } from '@/constants/theme';
import { mysticHref } from '@/lib/mystic-routes';
import { useLocale } from '@/providers/locale-provider';

/**
 * faz8.13/2a — Mistiğin yeni evi: Bugün sekmesi. Bu panel Bugün'deki ☾
 * rozetinden açılır (bottom sheet); mistikle ilgili HER ŞEY buradan ulaşılır.
 * Fal ÜCRETSİZDİR (kilitli karar) — panelde kilit/paywall yoktur.
 */

type MysticPanelProps = {
  visible: boolean;
  onClose: () => void;
};

export function MysticPanel({ visible, onClose }: MysticPanelProps) {
  const router = useRouter();
  const { colors, edge } = useMysticColors();
  const { t } = useLocale();

  const entries: { symbol: string; title: string; description: string; href: Href }[] = [
    {
      symbol: '✶',
      title: t.mystic.chatTitle,
      description: t.mystic.chatDesc,
      href: mysticHref.chat,
    },
    { symbol: '◈', title: t.mystic.tarotTitle, description: t.mystic.tarotDesc, href: mysticHref.tarot },
    {
      symbol: '☕',
      title: t.mystic.coffeeTitle,
      description: t.mystic.coffeeDesc,
      href: mysticHref.kahve,
    },
    {
      symbol: '✋',
      title: t.mystic.palmTitle,
      description: t.mystic.palmDesc,
      href: mysticHref.el,
    },
    {
      symbol: '✦',
      title: t.mystic.astroTitle,
      description: t.mystic.astroDesc,
      href: mysticHref.astroloji,
    },
    {
      symbol: '☾',
      title: t.mystic.historyScreenTitle,
      description: t.mystic.historyHint,
      href: mysticHref.history,
    },
  ];

  function open(href: Href) {
    // Önce push: Modal kapanırken Native/Stack geçişi yutulmasın.
    router.push(href);
    onClose();
  }

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.mystic.panelClose}
        onPress={onClose}
        style={styles.backdrop}
      />
      <View
        style={[
          styles.sheet,
          Shadows.lifted ?? {},
          {
            backgroundColor: colors.background,
            borderColor: colors.border,
            borderTopColor: edge,
          },
        ]}>
        <View style={[styles.grabber, { backgroundColor: colors.border }]} />
        <ThemedText type="screenTitle" style={[styles.title, { color: colors.text }]}>
          {t.mystic.panelTitle}
        </ThemedText>
        <ThemedText type="small" style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t.mystic.panelSubtitle}
        </ThemedText>
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled">
          {entries.map((entry) => (
            <Pressable
              key={entry.title}
              accessibilityRole="button"
              accessibilityLabel={entry.title}
              onPress={() => open(entry.href)}
              style={({ pressed }) => [
                styles.row,
                {
                  backgroundColor: colors.backgroundElement,
                  borderColor: colors.border,
                  opacity: pressed ? 0.7 : 1,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                },
              ]}>
              <ThemedText style={[styles.symbol, { color: colors.tint }]}>
                {entry.symbol}
              </ThemedText>
              <View style={styles.rowText}>
                <ThemedText type="smallBold" style={{ color: colors.text }}>
                  {entry.title}
                </ThemedText>
                <ThemedText type="small" style={{ color: colors.textSecondary }}>
                  {entry.description}
                </ThemedText>
              </View>
              <ThemedText type="smallBold" style={{ color: colors.textSecondary }}>
                ›
              </ThemedText>
            </Pressable>
          ))}
        </ScrollView>
        <ThemedText type="small" style={[styles.disclaimer, { color: colors.textSecondary }]}>
          {t.mystic.disclaimer}
        </ThemedText>
      </View>
    </Modal>
  );
}

/** Bugün başlığındaki ☾ girişi + panel durumu tek yerde. */
export function useMysticPanel() {
  const [visible, setVisible] = useState(false);
  return {
    visible,
    open: () => setVisible(true),
    close: () => setVisible(false),
  };
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    borderTopLeftRadius: Radii.large,
    borderTopRightRadius: Radii.large,
    borderWidth: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.five,
    gap: Spacing.two,
    maxHeight: '82%',
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: Spacing.one,
  },
  title: { textAlign: 'center' },
  subtitle: { textAlign: 'center', marginBottom: Spacing.one },
  list: { flexGrow: 0 },
  listContent: { gap: Spacing.two, paddingBottom: Spacing.one },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Radii.medium,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    minHeight: 56,
  },
  rowText: { flex: 1, gap: 2 },
  symbol: { fontSize: 20, lineHeight: 24, width: 28, textAlign: 'center' },
  disclaimer: { textAlign: 'center', marginTop: Spacing.one, fontSize: 11 },
});

import { type Href, useRouter } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useMysticColors } from '@/components/mystic-screen-shell';
import { ThemedText } from '@/components/themed-text';
import { Radii, Shadows, Spacing } from '@/constants/theme';
import { mysticHref } from '@/lib/mystic-routes';

/**
 * faz8.13/2a — Mistiğin yeni evi: Bugün sekmesi. Bu panel Bugün'deki ☾
 * rozetinden açılır (bottom sheet); mistikle ilgili HER ŞEY buradan ulaşılır.
 * Fal ÜCRETSİZDİR (kilitli karar) — panelde kilit/paywall yoktur.
 */

const ENTRIES: { symbol: string; title: string; description: string; href: Href }[] = [
  {
    symbol: '✶',
    title: 'Mistik Sohbet',
    description: 'Rehberinle konuş; fallarını birlikte yorumlayın.',
    href: mysticHref.chat,
  },
  { symbol: '◈', title: 'Tarot', description: 'Günün üç kartını çek.', href: mysticHref.tarot },
  {
    symbol: '☕',
    title: 'Kahve Falı',
    description: 'Fincanını çek, telveyi yorumlat.',
    href: mysticHref.kahve,
  },
  {
    symbol: '✋',
    title: 'El Falı',
    description: 'Avuç içi çizgilerine bak.',
    href: mysticHref.el,
  },
  {
    symbol: '✦',
    title: 'Astroloji',
    description: 'Günlük ve haftalık burç yorumun.',
    href: mysticHref.astroloji,
  },
  {
    symbol: '☾',
    title: 'Fal Geçmişin',
    description: 'Önceki çekimlerine dön.',
    href: mysticHref.history,
  },
];

type MysticPanelProps = {
  visible: boolean;
  onClose: () => void;
};

export function MysticPanel({ visible, onClose }: MysticPanelProps) {
  const router = useRouter();
  const { colors, edge } = useMysticColors();

  function open(href: Href) {
    // Önce push: Modal kapanırken Native/Stack geçişi yutulmasın.
    router.push(href);
    onClose();
  }

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Mistik paneli kapat"
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
          Mistik ☾
        </ThemedText>
        <ThemedText type="small" style={[styles.subtitle, { color: colors.textSecondary }]}>
          Sembolik rehberlik — planın merkezde kalır, ayna burada.
        </ThemedText>
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled">
          {ENTRIES.map((entry) => (
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
          Bu içerik eğlence amaçlıdır; tıbbi, hukuki veya finansal tavsiye değildir.
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

import { useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RegionPicker } from '@/components/region-picker';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { regionById } from '@/i18n/regions';
import type { RegionId } from '@/i18n/types';
import { useI18n } from '@/providers/locale-provider';

type Props = {
  value: RegionId;
  onChange: (id: RegionId) => void;
  busy?: boolean;
};

/**
 * FAZ 8.10 — Ayarlar dil seçici: tek satır (mevcut dil + chevron)
 * → seçim bottom sheet'te. Auth/onboarding hâlâ inline RegionPicker kullanır.
 */
export function RegionLanguageSheet({ value, onChange, busy = false }: Props) {
  const theme = useTheme();
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const region = regionById(value);
  const overlayOpacity = scheme === 'dark' ? 0.55 : 0.32;

  function select(id: RegionId) {
    onChange(id);
    setOpen(false);
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${t.profile.language}: ${t.regions[region.labelKey]}`}
        accessibilityHint={t.auth.languageRegionHint}
        disabled={busy}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.row,
          {
            borderColor: theme.border,
            backgroundColor: theme.surfaceMuted,
            opacity: pressed || busy ? 0.85 : 1,
          },
        ]}>
        <ThemedText type="smallBold" style={styles.rowLabel} numberOfLines={1}>
          {t.regions[region.labelKey]}
        </ThemedText>
        <ThemedText type="smallBold" themeColor="tint">
          ▾
        </ThemedText>
      </Pressable>

      <Modal
        visible={open}
        animationType="slide"
        transparent
        onRequestClose={() => setOpen(false)}>
        <View style={styles.sheetRoot}>
          <View style={styles.sheetBackdrop}>
            <View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: theme.text, opacity: overlayOpacity },
              ]}
            />
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setOpen(false)}
              accessibilityRole="button"
              accessibilityLabel={t.common.cancel}
            />
          </View>
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: theme.backgroundElement,
                paddingBottom: insets.bottom + Spacing.three,
                borderColor: theme.border,
              },
            ]}>
            <View style={[styles.handle, { backgroundColor: theme.border }]} />
            <ThemedText type="subtitle">{t.profile.language}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {t.auth.languageRegionHint}
            </ThemedText>
            <RegionPicker value={value} onChange={select} compact />
            <Pressable
              accessibilityRole="button"
              onPress={() => setOpen(false)}
              style={({ pressed }) => [
                styles.closeBtn,
                {
                  borderColor: theme.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                {t.common.cancel}
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  rowLabel: { flex: 1 },
  sheetRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    borderTopLeftRadius: Radii.large,
    borderTopRightRadius: Radii.large,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    gap: Spacing.three,
    maxHeight: '72%',
    ...Platform.select({
      android: { elevation: 8 },
      default: {},
    }),
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: Radii.pill,
    marginBottom: Spacing.one,
  },
  closeBtn: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

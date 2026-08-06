import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { REGIONS } from '@/i18n/regions';
import type { RegionId } from '@/i18n/types';
import { useI18n } from '@/providers/locale-provider';

type Props = {
  value: RegionId;
  onChange: (id: RegionId) => void;
  /** Compact = auth card; full = onboarding/settings */
  compact?: boolean;
};

export function RegionPicker({ value, onChange, compact = false }: Props) {
  const theme = useTheme();
  const { t } = useI18n();

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]} accessibilityRole="radiogroup">
      {!compact && (
        <ThemedText type="small" themeColor="textSecondary">
          {t.auth.languageRegionHint}
        </ThemedText>
      )}
      <View style={styles.grid}>
        {REGIONS.map((region) => {
          const selected = value === region.id;
          return (
            <Pressable
              key={region.id}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={t.regions[region.labelKey]}
              onPress={() => onChange(region.id)}
              style={({ pressed }) => [
                styles.chip,
                {
                  borderColor: selected ? theme.tint : theme.border,
                  backgroundColor: selected ? theme.backgroundSelected : theme.surfaceMuted,
                  opacity: pressed ? 0.88 : 1,
                },
              ]}>
              <ThemedText type="smallBold" themeColor={selected ? 'tint' : 'text'}>
                {t.regions[region.labelKey]}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.two },
  wrapCompact: { marginTop: Spacing.one },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    minHeight: 44,
    borderWidth: 1.5,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: '100%',
  },
});

import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
};

export function ScreenHeader({ title, subtitle, trailing }: ScreenHeaderProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={styles.titles}>
          <ThemedText type="screenTitle">{title}</ThemedText>
          {subtitle ? (
            <ThemedText type="small" themeColor="textSecondary">
              {subtitle}
            </ThemedText>
          ) : null}
        </View>
        {trailing}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.one,
    paddingVertical: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    minHeight: 44,
  },
  titles: {
    flex: 1,
    gap: Spacing.half,
  },
});

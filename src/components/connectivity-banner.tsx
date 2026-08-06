import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useLocale } from '@/providers/locale-provider';

type Props = {
  visible: boolean;
  onRetry?: () => void;
  retrying?: boolean;
};

/**
 * FAZ 8.11.0 — backend / ağ yokken uygulamayı düşürmeden nazik uyarı.
 * Uçak modu KAPI: banner görünür, sekmeler gezilir.
 */
export function ConnectivityBanner({ visible, onRetry, retrying }: Props) {
  const theme = useTheme();
  const { t } = useLocale();
  if (!visible) return null;

  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.banner,
        {
          backgroundColor: theme.backgroundSelected,
          borderColor: theme.border,
        },
      ]}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.copy}>
        {t.common.offlineBanner}
      </ThemedText>
      {onRetry ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.common.retry}
          hitSlop={12}
          disabled={retrying}
          onPress={onRetry}
          style={({ pressed }) => [
            styles.retry,
            {
              borderColor: theme.tint,
              opacity: pressed || retrying ? 0.7 : 1,
            },
          ]}>
          <ThemedText type="smallBold" themeColor="tint">
            {retrying ? t.common.loading : t.common.retry}
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: Spacing.three,
    marginTop: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
      borderRadius: Radii.medium,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 44,
  },
  copy: { flex: 1 },
  retry: {
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: Spacing.two,
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: Radii.pill,
  },
});

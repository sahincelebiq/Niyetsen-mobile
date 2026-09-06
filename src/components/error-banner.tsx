import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useLocale } from '@/providers/locale-provider';

type ErrorBannerProps = {
  message: string;
  onRetry?: () => void;
  retrying?: boolean;
};

/** Ağ hatası / 503 (GEMINI_DOWN_MSG) için nazik ortak banner + "Tekrar dene". */
export function ErrorBanner({ message, onRetry, retrying }: ErrorBannerProps) {
  const { t } = useLocale();
  return (
    <ThemedView type="backgroundElement" style={styles.container}>
      <ThemedText type="small" style={styles.message}>
        {message}
      </ThemedText>
      {onRetry && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={retrying ? t.common.retrying : t.common.retry}
          onPress={onRetry}
          disabled={retrying}
          style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}>
          <ThemedText type="linkPrimary">
            {retrying ? t.common.retrying : t.common.retry}
          </ThemedText>
        </Pressable>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
    alignItems: 'center',
  },
  message: {
    textAlign: 'center',
  },
  retryButton: {
    minHeight: 44,
    minWidth: 44,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});

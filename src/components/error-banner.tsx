import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useI18n } from '@/providers/locale-provider';

type ErrorBannerProps = {
  message: string;
  onRetry?: () => void;
  retrying?: boolean;
  retryLabel?: string;
  retryingLabel?: string;
};

/** Ağ hatası / 503 için nazik ortak banner + "Tekrar dene". */
export function ErrorBanner({
  message,
  onRetry,
  retrying,
  retryLabel,
  retryingLabel,
}: ErrorBannerProps) {
  const { t } = useI18n();
  const retry = retryLabel ?? t.common.retry;
  const retryingText = retryingLabel ?? t.common.loading;

  return (
    <ThemedView type="backgroundElement" accessibilityRole="alert" style={styles.container}>
      <ThemedText type="small" themeColor="danger" style={styles.message}>
        {message}
      </ThemedText>
      {onRetry ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={retrying ? retryingText : retry}
          onPress={onRetry}
          disabled={retrying}
          style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}>
          <ThemedText type="linkPrimary">
            {retrying ? retryingText : retry}
          </ThemedText>
        </Pressable>
      ) : null}
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
    justifyContent: 'center',
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
  },
  pressed: {
    opacity: 0.6,
  },
});

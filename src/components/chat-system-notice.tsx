import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Radii, Spacing, Texture } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ChatSystemNoticeProps = {
  message: string;
};

/** Sohbet akışının altında, input üstünde gösterilen sistem bilgilendirmesi. */
export function ChatSystemNotice({ message }: ChatSystemNoticeProps) {
  const theme = useTheme();

  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: theme.border,
          },
        ]}>
        <ThemedText type="small" style={{ color: theme.text, lineHeight: 20 }}>
          {message}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
  card: {
    borderWidth: Texture.cardBorderWidth,
    borderRadius: Radii.large,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
});

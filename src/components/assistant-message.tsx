import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ChatMessageBody } from '@/components/chat-message-body';
import { Radii, Shadows, Spacing, Texture } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type AssistantMessageProps = {
  content: string;
};

export const AssistantMessage = memo(function AssistantMessage({ content }: AssistantMessageProps) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: theme.border,
          },
          Shadows.subtle ?? {},
        ]}>
        <ChatMessageBody content={content} style={styles.text} />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    maxWidth: '88%',
    alignSelf: 'flex-start',
    paddingVertical: Spacing.one,
  },
  bubble: {
    borderWidth: Texture.cardBorderWidth,
    borderRadius: Radii.bubble,
    borderBottomLeftRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  text: {
    lineHeight: 22,
    fontSize: 15,
  },
});

import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { ChatMessageBody } from '@/components/chat-message-body';
import { Radii, Shadows, Spacing, Texture } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type AssistantMessageProps = {
  content: string;
};

export function AssistantMessage({ content }: AssistantMessageProps) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <Image
        source={require('@/assets/images/niyetsen-chain.png')}
        style={styles.avatar}
        contentFit="contain"
      />
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
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    maxWidth: '92%',
    alignSelf: 'flex-start',
    paddingVertical: Spacing.one,
  },
  avatar: {
    width: 28,
    height: 28,
    marginTop: 2,
  },
  bubble: {
    flex: 1,
    borderWidth: Texture.cardBorderWidth,
    borderRadius: Radii.bubble,
    borderBottomLeftRadius: 6,
    paddingVertical: 11,
    paddingHorizontal: 15,
    maxWidth: '82%',
  },
  text: {
    lineHeight: 22,
    fontSize: 14.5,
  },
});

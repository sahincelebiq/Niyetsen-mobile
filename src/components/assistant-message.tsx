import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { ChatMessageBody } from '@/components/chat-message-body';
import { Spacing } from '@/constants/theme';

type AssistantMessageProps = {
  content: string;
};

export function AssistantMessage({ content }: AssistantMessageProps) {
  return (
    <View style={styles.row}>
      <Image
        source={require('@/assets/images/niyetsen-chain.png')}
        style={styles.avatar}
        contentFit="contain"
      />
      <ChatMessageBody content={content} style={styles.text} />
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
  text: {
    flex: 1,
    lineHeight: 22,
  },
});

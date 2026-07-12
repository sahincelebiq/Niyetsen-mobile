import * as Clipboard from 'expo-clipboard';
import { Alert, type TextStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';

type ChatMessageBodyProps = {
  content: string;
  style?: TextStyle;
  color?: string;
};

export function ChatMessageBody({ content, style, color }: ChatMessageBodyProps) {
  const handleLongPress = () => {
    Alert.alert('Mesaj', undefined, [
      {
        text: 'Kopyala',
        onPress: () => {
          void Clipboard.setStringAsync(content);
        },
      },
      { text: 'İptal', style: 'cancel' },
    ]);
  };

  return (
    <ThemedText
      selectable
      onLongPress={handleLongPress}
      style={[style, color ? { color } : null]}>
      {content}
    </ThemedText>
  );
}

import { memo } from 'react';
import { StyleSheet, useColorScheme, View } from 'react-native';
import Animated, { FadeInUp, ReduceMotion } from 'react-native-reanimated';

import { ChatMessageBody } from '@/components/chat-message-body';
import { Motion, Radii, Shadows, Spacing, SurfaceEdge, Texture } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type AssistantMessageProps = {
  content: string;
};

/**
 * Rehber balonu — İlkbahar v3: backgroundElement + SurfaceEdge + Shadows.subtle;
 * giriş: 12px yukarı kayma + fade (Motion.base, stagger yok).
 */
export const AssistantMessage = memo(function AssistantMessage({ content }: AssistantMessageProps) {
  const theme = useTheme();
  const scheme = useColorScheme();
  return (
    <Animated.View
      entering={FadeInUp.duration(Motion.base)
        .withInitialValues({ opacity: 0, transform: [{ translateY: 12 }] })
        .reduceMotion(ReduceMotion.System)}
      style={styles.row}>
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: theme.border,
            borderTopColor: scheme === 'dark' ? SurfaceEdge.dark : SurfaceEdge.light,
          },
          Shadows.subtle ?? {},
        ]}>
        <ChatMessageBody content={content} style={styles.text} />
      </View>
    </Animated.View>
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

import { memo } from 'react';
import { Image, StyleSheet, useColorScheme, View } from 'react-native';
import Animated, { FadeInUp, ReduceMotion } from 'react-native-reanimated';

import { ChatMessageBody } from '@/components/chat-message-body';
import { Motion, Radii, Shadows, Spacing, SurfaceEdge, Texture } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type AssistantMessageProps = {
  content: string;
};

/**
 * Rehber balonu + küçük Niyetsen logo avatarı (kişi kartı).
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
          styles.avatar,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: theme.border,
          },
        ]}
        accessibilityLabel="Niyetsen">
        <Image
          source={require('@/assets/images/niyetsen-logo.png')}
          style={styles.avatarImage}
          resizeMode="cover"
        />
      </View>
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
    maxWidth: '92%',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 9,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    marginBottom: 2,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  bubble: {
    flexShrink: 1,
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

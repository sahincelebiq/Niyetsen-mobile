import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ChatQuickRepliesProps = {
  suggestions: readonly string[];
  onSelect: (label: string) => void;
  /** Boş sohbet daveti — tek satır, çiplerin üstünde. */
  invite?: string;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function QuickReplyChip({
  label,
  onSelect,
}: {
  label: string;
  onSelect: (label: string) => void;
}) {
  const theme = useTheme();
  const scale = useSharedValue(1);
  const [pressed, setPressed] = useState(false);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={() => onSelect(label)}
      onPressIn={() => {
        setPressed(true);
        scale.value = withSpring(0.97, {
          damping: 18,
          stiffness: 320,
          reduceMotion: ReduceMotion.System,
        });
      }}
      onPressOut={() => {
        setPressed(false);
        scale.value = withSpring(1, {
          damping: 16,
          stiffness: 280,
          reduceMotion: ReduceMotion.System,
        });
      }}
      style={[
        styles.chip,
        {
          borderColor: theme.border,
          backgroundColor: pressed ? theme.backgroundSelected : theme.surfaceMuted,
        },
        animStyle,
      ]}>
      <ThemedText type="small" themeColor="text">
        {label}
      </ThemedText>
    </AnimatedPressable>
  );
}

export function ChatQuickReplies({ suggestions, onSelect, invite }: ChatQuickRepliesProps) {
  return (
    <View style={styles.strip}>
      {invite ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.invite}>
          {invite}
        </ThemedText>
      ) : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.row}>
        {suggestions.map((label) => (
          <QuickReplyChip key={label} label={label} onSelect={onSelect} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingTop: Spacing.one,
    paddingBottom: Spacing.two,
    gap: Spacing.two,
  },
  invite: {
    paddingHorizontal: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  chip: {
    flexShrink: 0,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
});

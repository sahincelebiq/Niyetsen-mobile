import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ChatQuickRepliesProps = {
  suggestions: readonly string[];
  onSelect: (label: string) => void;
};

export function ChatQuickReplies({ suggestions, onSelect }: ChatQuickRepliesProps) {
  const theme = useTheme();

  return (
    <View style={styles.strip}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.row}>
        {suggestions.map((label) => (
          <Pressable
            key={label}
            onPress={() => onSelect(label)}
            style={({ pressed }) => [
              styles.chip,
              {
                borderColor: theme.accentWarm,
                backgroundColor: theme.backgroundElement,
                opacity: pressed ? 0.75 : 1,
              },
            ]}>
            <ThemedText type="small" style={{ color: theme.accentWarm }}>
              {label}
            </ThemedText>
          </Pressable>
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
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  chip: {
    flexShrink: 0,
    borderWidth: 1,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
});

import { Pressable, StyleSheet, TextInput } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  BottomTabInset, Fonts, MaxContentWidth, Radii, Shadows, Spacing,
} from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ChatComposerProps = {
  value: string;
  onChangeText: (value: string) => void;
  onSubmit: () => void;
  disabled: boolean;
};

export function ChatComposer({
  value,
  onChangeText,
  onSubmit,
  disabled,
}: ChatComposerProps) {
  const theme = useTheme();
  const canSend = !disabled && !!value.trim();
  return (
    <ThemedView type="backgroundElement" style={styles.inputRow}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="Mesajını yaz…"
        placeholderTextColor={theme.textSecondary}
        style={[styles.input, { color: theme.text, fontFamily: Fonts.sansMedium }]}
        multiline
        editable={!disabled}
        returnKeyType="send"
        submitBehavior="submit"
        onSubmitEditing={onSubmit}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Mesajı gönder"
        onPress={onSubmit}
        disabled={!canSend}
        style={({ pressed }) => [
          styles.sendButton,
          { opacity: !canSend ? 0.4 : pressed ? 0.7 : 1 },
        ]}>
        <ThemedText type="smallBold" themeColor="tint">
          Gönder
        </ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    paddingBottom: BottomTabInset > 0 ? Spacing.two : Spacing.three,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
    borderTopLeftRadius: Radii.large,
    borderTopRightRadius: Radii.large,
    ...(Shadows.soft ?? {}),
  },
  input: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    maxHeight: 120,
    paddingVertical: Spacing.two,
  },
  sendButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
});

import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  BottomTabInset, Fonts, MaxContentWidth, Radii, Shadows, Spacing,
} from '@/constants/theme';
import { useKeyboardVisible } from '@/hooks/use-keyboard-visible';
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
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();
  const canSend = !disabled && !!value.trim();
  const bottomPadding = keyboardVisible
    ? insets.bottom + Spacing.two
    : insets.bottom + BottomTabInset + Spacing.two;
  return (
    <ThemedView
      type="backgroundElement"
      style={[
        styles.inputRow,
        {
          paddingBottom: bottomPadding,
          borderTopColor: theme.border,
        },
      ]}>
      <View
        style={[
          styles.inputShell,
          { backgroundColor: theme.background, borderColor: theme.border },
        ]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="Niyetini yaz…"
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
            styles.sendCircle,
            { backgroundColor: theme.accentWarm },
            !canSend && styles.sendDisabled,
            pressed && canSend && styles.pressed,
          ]}>
          <ThemedText style={styles.sendGlyph}>↑</ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  inputRow: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    ...(Shadows.soft ?? {}),
  },
  inputShell: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    borderRadius: Radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingLeft: Spacing.three,
    paddingRight: Spacing.one,
    paddingVertical: Spacing.one,
    minHeight: 52,
  },
  input: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    maxHeight: 120,
    paddingVertical: Spacing.two,
  },
  sendCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  sendGlyph: {
    color: '#FBF7EF',
    fontSize: 20,
    lineHeight: 22,
    fontFamily: Fonts.sansBold,
  },
  sendDisabled: {
    opacity: 0.35,
  },
  pressed: {
    opacity: 0.85,
  },
});

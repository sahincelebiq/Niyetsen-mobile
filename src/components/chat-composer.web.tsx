import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { NativeSyntheticEvent, TextInputKeyPressEventData } from 'react-native';
import { Pressable, StyleSheet, TextInput } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  Fonts, MaxContentWidth, Radii, Shadows, Spacing,
} from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useLocale } from '@/providers/locale-provider';

type WebKeyboardEvent = TextInputKeyPressEventData & {
  shiftKey?: boolean;
  isComposing?: boolean;
};

type ChatComposerProps = {
  value: string;
  onChangeText: (value: string) => void;
  onSubmit: () => void;
  disabled: boolean;
  /** true iken input yazılabilir kalır, yalnız gönderme kilitlenir (yanıt beklenirken). */
  sending?: boolean;
  pendingAttachment?: { filename: string; summary: string; mime_type: string } | null;
  /** `＋` butonu: ek eylemler mini sayfasını açar (fotoğraf / dosya / bonus). */
  onOpenActions?: () => void;
  onClearAttachment?: () => void;
  attaching?: boolean;
  /** Composer yanındaki ✿ ikonu: Felsefe Yolları mini sayfasını açar. */
  onOpenPaths?: () => void;
  /** Web'de klavye overlay'i yok; prop uyumu için kabul edilir, kullanılmaz. */
  keyboardOpen?: boolean;
};

export function ChatComposer({
  value,
  onChangeText,
  onSubmit,
  disabled,
  sending = false,
  onOpenActions,
  onOpenPaths,
}: ChatComposerProps) {
  const theme = useTheme();
  const { t } = useLocale();
  const canSend = !disabled && !sending && !!value.trim();

  function handleKeyPress(
    event: NativeSyntheticEvent<TextInputKeyPressEventData>,
  ) {
    const keyboard = event.nativeEvent as WebKeyboardEvent;
    if (
      keyboard.key === 'Enter' &&
      !keyboard.shiftKey &&
      !keyboard.isComposing &&
      canSend
    ) {
      event.preventDefault();
      onSubmit();
    }
  }

  return (
    <ThemedView type="backgroundElement" style={styles.inputRow}>
      {onOpenActions ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.chat.attachMenu}
          onPress={onOpenActions}
          disabled={disabled}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
          <ThemedText style={styles.attachGlyph}>＋</ThemedText>
        </Pressable>
      ) : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onKeyPress={handleKeyPress}
        placeholder={t.chat.inputPlaceholder}
        placeholderTextColor={theme.textSecondary}
        style={[styles.input, { color: theme.text, fontFamily: Fonts.sansMedium }]}
        multiline
        editable={!disabled}
      />
      {onOpenPaths ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.chat.pathsOpen}
          onPress={onOpenPaths}
          disabled={disabled}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
          <MaterialCommunityIcons name="flower-tulip-outline" size={22} color={theme.tint} />
        </Pressable>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.chat.sendMessage}
        accessibilityState={{ disabled: !canSend }}
        onPress={onSubmit}
        disabled={!canSend}
        style={({ pressed }) => [
          styles.sendButton,
          {
            backgroundColor: canSend ? theme.accentWarm : theme.surfaceMuted,
            opacity: pressed && canSend ? 0.85 : 1,
          },
        ]}>
        <ThemedText
          type="smallBold"
          style={{ color: canSend ? theme.onAccent : theme.textSecondary }}>
          {t.chat.sendShort}
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
    paddingBottom: Spacing.three,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
    borderTopLeftRadius: Radii.large,
    borderTopRightRadius: Radii.large,
    ...(Shadows.soft ?? {}),
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachGlyph: {
    fontSize: 22,
    lineHeight: 24,
    fontFamily: Fonts.sansBold,
  },
  input: {
    flex: 1,
    minHeight: 44,
    fontSize: 16,
    lineHeight: 22,
    maxHeight: 126,
    paddingVertical: Spacing.two,
  },
  sendButton: {
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  pressed: {
    opacity: 0.85,
  },
});

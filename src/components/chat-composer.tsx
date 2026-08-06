import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  BottomTabInset, Fonts, MaxContentWidth, Radii, Shadows, Spacing,
} from '@/constants/theme';
import { useKeyboardHeight } from '@/hooks/use-keyboard-height';
import { useTheme } from '@/hooks/use-theme';
import { useLocale } from '@/providers/locale-provider';

export type PendingAttachment = {
  filename: string;
  summary: string;
  mime_type: string;
};

export type ChatComposerProps = {
  value: string;
  onChangeText: (value: string) => void;
  onSubmit: () => void;
  disabled: boolean;
  /** true iken input yazılabilir kalır, yalnız gönderme kilitlenir (yanıt beklenirken). */
  sending?: boolean;
  pendingAttachment?: PendingAttachment | null;
  onAttach?: () => void;
  onClearAttachment?: () => void;
  attaching?: boolean;
};

export function ChatComposer({
  value,
  onChangeText,
  onSubmit,
  disabled,
  sending = false,
  pendingAttachment,
  onAttach,
  onClearAttachment,
  attaching = false,
}: ChatComposerProps) {
  const theme = useTheme();
  const { t } = useLocale();
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const keyboardOpen = keyboardHeight > 0;
  const canSend = !disabled && !sending && (!!value.trim() || !!pendingAttachment);
  const bottomPadding = keyboardOpen
    ? Math.max(insets.bottom, Spacing.two)
    : Math.max(insets.bottom, Spacing.one) + BottomTabInset;

  return (
    <ThemedView
      style={[
        styles.dock,
        {
          paddingBottom: bottomPadding,
          borderTopColor: theme.border,
          backgroundColor: theme.background,
        },
      ]}>
      <View style={styles.inputRow}>
        {pendingAttachment ? (
          <View
            style={[
              styles.attachmentChip,
              { borderColor: theme.border, backgroundColor: theme.backgroundElement },
            ]}>
            <ThemedText type="small" numberOfLines={1} style={styles.attachmentName}>
              📎 {pendingAttachment.filename}
            </ThemedText>
            <Pressable onPress={onClearAttachment} hitSlop={8}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                ✕
              </ThemedText>
            </Pressable>
          </View>
        ) : null}
        <View
          style={[
            styles.inputShell,
            { backgroundColor: theme.backgroundElement, borderColor: theme.border },
          ]}>
          {onAttach ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Dosya ekle"
              onPress={onAttach}
              disabled={disabled || attaching}
              style={({ pressed }) => [styles.attachButton, pressed && styles.pressed]}>
              <ThemedText style={styles.attachGlyph}>{attaching ? '…' : '＋'}</ThemedText>
            </Pressable>
          ) : null}
          <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={t.chat.inputPlaceholder}
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { color: theme.text, fontFamily: Fonts.sansMedium }]}
            multiline
            editable={!disabled}
            // Yanıt beklenirken (sending) kullanıcı bir sonraki mesajını yazmayı
            // sürdürebilir; yalnız gönderme butonu kilitlenir.
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
              Shadows.clay ?? {},
            ]}>
            <ThemedText style={[styles.sendGlyph, { color: theme.onAccent }]}>↑</ThemedText>
          </Pressable>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  dock: {
    width: '100%',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inputRow: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  inputShell: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    borderRadius: Radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingLeft: Spacing.one,
    paddingRight: Spacing.one,
    paddingVertical: Spacing.one,
    minHeight: 52,
  },
  attachButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  attachGlyph: {
    fontSize: 22,
    lineHeight: 24,
    fontFamily: Fonts.sansBold,
  },
  attachmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    marginBottom: Spacing.one,
  },
  attachmentName: {
    flex: 1,
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

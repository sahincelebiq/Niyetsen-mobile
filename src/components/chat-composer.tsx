import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { forwardRef } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  BottomTabInset, Fonts, MaxContentWidth, Motion, Radii, Shadows, Spacing,
} from '@/constants/theme';
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
  /** `＋` butonu: ek eylemler mini sayfasını açar (fotoğraf / dosya / bonus). */
  onOpenActions?: () => void;
  onClearAttachment?: () => void;
  attaching?: boolean;
  /** Composer yanındaki ✿ ikonu: Felsefe Yolları mini sayfasını açar. */
  onOpenPaths?: () => void;
  /**
   * Overlay klavye açıkken tab payı düşer (kutu klavyenin üstüne oturur).
   * adjustResize'da false kalmalı — tab bar hâlâ görünür, pay silinirse yazı gizlenir.
   */
  keyboardOpen?: boolean;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const ChatComposer = forwardRef<View, ChatComposerProps>(function ChatComposer(
  {
    value,
    onChangeText,
    onSubmit,
    disabled,
    sending = false,
    pendingAttachment,
    onOpenActions,
    onClearAttachment,
    attaching = false,
    onOpenPaths,
    keyboardOpen = false,
  },
  ref,
) {
  const theme = useTheme();
  const { t } = useLocale();
  const insets = useSafeAreaInsets();
  const canSend = !disabled && !sending && (!!value.trim() || !!pendingAttachment);
  // Overlay + lift varken tab bar klavyenin arkasındadır → gerçek nefes payı yeter.
  // Resize / kapalı: tab bar görünür, BottomTabInset kalmazsa yazı kutusu sekmelerin altında kaybolur.
  const bottomPadding = keyboardOpen
    ? Spacing.three
    : Math.max(insets.bottom, Spacing.one) + BottomTabInset;

  // Gönder butonu durumu renkle konuşur: boşken soluk yüzey, yazınca mercan
  // dolgu — Motion.fast ile yumuşak geçiş (reduce-motion'da sönümlenir).
  const sendAnimStyle = useAnimatedStyle(() => ({
    backgroundColor: withTiming(canSend ? theme.accentWarm : theme.surfaceMuted, {
      duration: Motion.fast,
      reduceMotion: ReduceMotion.System,
    }),
  }));

  return (
    <View ref={ref} collapsable={false} style={styles.dockMeasure}>
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
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.chat.clearAttachment}
              onPress={onClearAttachment}
              hitSlop={12}
              style={styles.clearAttachment}>
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
          {onOpenActions ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.chat.attachMenu}
              accessibilityHint={t.chat.attachMenuHint}
              onPress={onOpenActions}
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
            accessibilityLabel={t.chat.inputPlaceholder}
            style={[styles.input, { color: theme.text, fontFamily: Fonts.sansMedium }]}
            multiline
            textAlignVertical="center"
            underlineColorAndroid="transparent"
            selectionColor={theme.tint}
            editable={!disabled}
            // Yanıt beklenirken (sending) kullanıcı bir sonraki mesajını yazmayı
            // sürdürebilir; yalnız gönderme butonu kilitlenir.
            returnKeyType="send"
            submitBehavior="submit"
            onSubmitEditing={onSubmit}
          />
          {onOpenPaths ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.chat.pathsOpen}
              accessibilityHint={t.chat.pathsOpenHint}
              onPress={onOpenPaths}
              disabled={disabled}
              style={({ pressed }) => [styles.pathsButton, pressed && styles.pressed]}>
              <MaterialCommunityIcons
                name="flower-tulip-outline"
                size={22}
                color={theme.tint}
              />
            </Pressable>
          ) : null}
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel={t.chat.sendMessage}
            accessibilityState={{ disabled: !canSend, busy: sending }}
            onPress={onSubmit}
            disabled={!canSend}
            style={({ pressed }) => [
              styles.sendCircle,
              sendAnimStyle,
              canSend ? (Shadows.clay ?? {}) : null,
              pressed && canSend && styles.pressed,
            ]}>
            <ThemedText
              style={[
                styles.sendGlyph,
                { color: canSend ? theme.onAccent : theme.textSecondary },
              ]}>
              ↑
            </ThemedText>
          </AnimatedPressable>
        </View>
        </View>
      </ThemedView>
    </View>
  );
});

ChatComposer.displayName = 'ChatComposer';

const styles = StyleSheet.create({
  dockMeasure: {
    width: '100%',
  },
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
    alignItems: 'center',
    gap: Spacing.half,
    borderRadius: Radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingLeft: Spacing.one,
    paddingRight: Spacing.one,
    paddingVertical: Spacing.one,
    minHeight: 56,
  },
  attachButton: {
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
  pathsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
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
    minHeight: 44,
    fontSize: 16,
    lineHeight: 22,
    // 5 satır + dikey padding; sonrasında kendi içinde kayar.
    maxHeight: 126,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
    includeFontPadding: false,
  },
  sendCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearAttachment: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendGlyph: {
    fontSize: 20,
    lineHeight: 22,
    fontFamily: Fonts.sansBold,
  },
  pressed: {
    opacity: 0.85,
  },
});

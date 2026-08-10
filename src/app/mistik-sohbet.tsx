import { Image } from 'expo-image';
import { type Href, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { KeyboardAwareView } from '@/components/keyboard-aware-view';
import { useMysticColors } from '@/components/mystic-screen-shell';
import { ThemedText } from '@/components/themed-text';
import { Motion, Radii, Spacing } from '@/constants/theme';
import { trackEvent } from '@/lib/analytics';
import { ApiError, sendMysticChat, type MysticChatMessage } from '@/lib/api';

/**
 * faz8.13/2b — Mistik rehber sohbeti: fal modülünün merkez ekranı.
 * Kullanıcı rehberle serbestçe konuşur; tarot/kahve/el kısayolları soldan
 * açılır, çekilen falların sonucu rehberin hafızasında (fortune_log) durur
 * ve rehber onları KONUŞUR ("geçen çekiminde şu görünmüştü…").
 * Fal AYNA'dır — her ekranda disclaimer (store uyumu).
 */

type Bubble = { id: string; role: 'user' | 'assistant'; text: string };

const OPENING: Bubble = {
  id: 'opening',
  role: 'assistant',
  text:
    'Hoş geldin ☾ Ben mistik rehberinim. Aklındakini sor, istersen soldaki ' +
    'kısayollardan tarot çek ya da fal baktır — sonuçları burada birlikte yorumlarız.',
};

const SHORTCUTS: { symbol: string; label: string; href: Href }[] = [
  { symbol: '◈', label: 'Tarot', href: '/tarot' as Href },
  { symbol: '☕', label: 'Kahve', href: '/fal?kind=kahve' as Href },
  { symbol: '✋', label: 'El', href: '/fal?kind=el' as Href },
  { symbol: '✦', label: 'Astroloji', href: '/astroloji' as Href },
  { symbol: '☾', label: 'Geçmiş', href: '/fal-gecmisi' as Href },
];

export default function MysticChatScreen() {
  const router = useRouter();
  const { colors, edge } = useMysticColors();
  const [bubbles, setBubbles] = useState<Bubble[]>([OPENING]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<Bubble>>(null);

  const send = useCallback(async () => {
    const text = draft.trim();
    if (!text || sending) {
      return;
    }
    setDraft('');
    setSending(true);
    const userBubble: Bubble = { id: `u-${Date.now()}`, role: 'user', text };
    const nextBubbles = [...bubbles, userBubble];
    setBubbles(nextBubbles);
    try {
      const history: MysticChatMessage[] = nextBubbles
        .filter((bubble) => bubble.id !== 'opening')
        .slice(-12)
        .map((bubble) => ({ role: bubble.role, content: bubble.text }));
      const response = await sendMysticChat(history);
      setBubbles((current) => [
        ...current,
        { id: `a-${Date.now()}`, role: 'assistant', text: response.reply },
      ]);
      trackEvent('mystic_chat_message');
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : 'Yıldızlara şu an ulaşamadım — birazdan tekrar dener misin? ✨';
      setBubbles((current) => [
        ...current,
        { id: `e-${Date.now()}`, role: 'assistant', text: message },
      ]);
    } finally {
      setSending(false);
    }
  }, [bubbles, draft, sending]);

  const inverted = [...bubbles].reverse();

  return (
    <Animated.View
      entering={FadeIn.duration(Motion.base).reduceMotion(ReduceMotion.System)}
      style={[styles.flex, { backgroundColor: colors.background }]}>
      <Image
        source={require('@/assets/images/chat-mystic-bg.png')}
        style={styles.background}
        contentFit="cover"
        pointerEvents="none"
      />
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right', 'bottom']}>
        <KeyboardAwareView style={styles.flex}>
          {/* Üst bar: geri + başlık */}
          <View style={styles.topBar}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Geri"
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/daily' as Href))}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.6 }]}>
              <ThemedText type="smallBold" style={{ color: colors.tint }}>
                ‹ Geri
              </ThemedText>
            </Pressable>
            <ThemedText type="subtitle" style={{ color: colors.text }}>
              Mistik Rehber ☾
            </ThemedText>
            <View style={styles.backButton} />
          </View>

          <View style={styles.body}>
            {/* Sol kısayol rayı: tarot / kahve / el / astroloji / geçmiş */}
            <View
              style={[
                styles.rail,
                { backgroundColor: colors.backgroundElement, borderColor: colors.border, borderTopColor: edge },
              ]}>
              {SHORTCUTS.map((shortcut) => (
                <Pressable
                  key={shortcut.label}
                  accessibilityRole="button"
                  accessibilityLabel={shortcut.label}
                  onPress={() => router.push(shortcut.href)}
                  style={({ pressed }) => [
                    styles.railItem,
                    pressed && { opacity: 0.6, transform: [{ scale: 0.94 }] },
                  ]}>
                  <ThemedText style={[styles.railSymbol, { color: colors.tint }]}>
                    {shortcut.symbol}
                  </ThemedText>
                  <ThemedText type="small" style={{ color: colors.textSecondary, fontSize: 11 }}>
                    {shortcut.label}
                  </ThemedText>
                </Pressable>
              ))}
            </View>

            {/* Sohbet listesi */}
            <FlatList
              ref={listRef}
              data={inverted}
              inverted
              keyExtractor={(bubble) => bubble.id}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <View
                  style={[
                    styles.bubble,
                    item.role === 'user'
                      ? [styles.bubbleUser, { backgroundColor: colors.tint }]
                      : [
                          styles.bubbleGuide,
                          {
                            backgroundColor: colors.backgroundElement,
                            borderColor: colors.border,
                          },
                        ],
                  ]}>
                  <ThemedText
                    style={{
                      color: item.role === 'user' ? colors.background : colors.text,
                    }}>
                    {item.text}
                  </ThemedText>
                </View>
              )}
              ListHeaderComponent={
                sending ? (
                  <View style={[styles.bubble, styles.bubbleGuide, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
                    <ActivityIndicator size="small" color={colors.tint} />
                  </View>
                ) : null
              }
            />
          </View>

          {/* Disclaimer + kompozer */}
          <ThemedText type="small" style={[styles.disclaimer, { color: colors.textSecondary }]}>
            Bu içerik eğlence amaçlıdır; tıbbi, hukuki veya finansal tavsiye değildir.
          </ThemedText>
          <View
            style={[
              styles.composer,
              { backgroundColor: colors.backgroundElement, borderColor: colors.border },
            ]}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Rehbere sor…"
              placeholderTextColor={colors.textSecondary}
              multiline
              accessibilityLabel="Mistik rehbere mesaj yaz"
              style={[styles.input, { color: colors.text }]}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Gönder"
              disabled={sending || !draft.trim()}
              onPress={send}
              style={({ pressed }) => [
                styles.sendButton,
                {
                  backgroundColor: colors.tint,
                  opacity: sending || !draft.trim() ? 0.4 : pressed ? 0.75 : 1,
                },
              ]}>
              <ThemedText type="smallBold" style={{ color: colors.background }}>
                ➤
              </ThemedText>
            </Pressable>
          </View>
        </KeyboardAwareView>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  background: { ...StyleSheet.absoluteFillObject, opacity: 0.18 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  backButton: { minWidth: 56, minHeight: 44, justifyContent: 'center' },
  body: { flex: 1, flexDirection: 'row' },
  rail: {
    width: 64,
    marginLeft: Spacing.two,
    marginBottom: Spacing.two,
    borderWidth: 1,
    borderRadius: Radii.large,
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingVertical: Spacing.two,
    alignSelf: 'flex-start',
  },
  railItem: {
    alignItems: 'center',
    gap: 2,
    minHeight: 48,
    minWidth: 48,
    justifyContent: 'center',
  },
  railSymbol: { fontSize: 20, lineHeight: 24 },
  listContent: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
    gap: Spacing.two,
  },
  bubble: {
    maxWidth: '86%',
    borderRadius: Radii.large,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  bubbleUser: { alignSelf: 'flex-end' },
  bubbleGuide: { alignSelf: 'flex-start', borderWidth: 1 },
  disclaimer: {
    textAlign: 'center',
    paddingHorizontal: Spacing.four,
    paddingBottom: 4,
    fontSize: 11,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.two,
    borderWidth: 1,
    borderRadius: Radii.large,
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    fontSize: 16,
    paddingVertical: 8,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

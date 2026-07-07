import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { ErrorBanner } from '@/components/error-banner';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  ApiError,
  ChatMessage,
  CollectedIntent,
  EMPTY_COLLECTED,
  generatePlan,
  sendChatMessage,
} from '@/lib/api';

const WELCOME_MESSAGE: ChatMessage = {
  role: 'assistant',
  content:
    'Merhaba 🌙 Ben Niyetsen. Bu yılı nasıl geçirmek istediğini birlikte konuşalım — ' +
    'hangi şehirdesin, neyle vakit geçirmeyi seviyorsun, haftada ne kadar zamanın var?',
};

export default function ChatScreen() {
  const theme = useTheme();
  const router = useRouter();
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [collected, setCollected] = useState<CollectedIntent>(EMPTY_COLLECTED);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [readyForPlan, setReadyForPlan] = useState(false);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<'send' | 'generate' | null>(null);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, []);

  const doSend = useCallback(
    async (nextMessages: ChatMessage[]) => {
      setSending(true);
      setError(null);
      setLastAction('send');
      try {
        const res = await sendChatMessage(nextMessages, collected);
        setMessages([...nextMessages, { role: 'assistant', content: res.reply }]);
        setCollected(res.collected);
        setReadyForPlan(res.ready_for_plan);
        scrollToEnd();
      } catch (e) {
        setError(e instanceof ApiError ? e.message : 'Beklenmeyen bir hata oluştu.');
      } finally {
        setSending(false);
      }
    },
    [collected, scrollToEnd],
  );

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || sending) return;
    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(nextMessages);
    setInput('');
    scrollToEnd();
    void doSend(nextMessages);
  }, [doSend, input, messages, scrollToEnd, sending]);

  const handleGeneratePlan = useCallback(async () => {
    setGeneratingPlan(true);
    setError(null);
    setLastAction('generate');
    try {
      await generatePlan(collected, 7);
      router.push('/explore');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Plan oluşturulamadı, tekrar dener misin?');
    } finally {
      setGeneratingPlan(false);
    }
  }, [collected, router]);

  const handleRetry = useCallback(() => {
    if (lastAction === 'generate') {
      void handleGeneratePlan();
    } else {
      void doSend(messages);
    }
  }, [doSend, handleGeneratePlan, lastAction, messages]);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.select({ ios: 'padding', default: undefined })}
      keyboardVerticalOffset={Platform.select({ ios: 90, default: 0 })}>
      <ThemedView style={styles.flex}>
        <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(_, i) => String(i)}
            contentContainerStyle={styles.listContent}
            onContentSizeChange={scrollToEnd}
            renderItem={({ item }) => <MessageBubble message={item} />}
            ListFooterComponent={
              <ThemedView style={styles.footerGap}>
                {sending && (
                  <ThemedView style={styles.typingRow}>
                    <ActivityIndicator size="small" color={theme.textSecondary} />
                    <ThemedText type="small" themeColor="textSecondary">
                      yazıyor…
                    </ThemedText>
                  </ThemedView>
                )}
                {error && (
                  <ErrorBanner message={error} onRetry={handleRetry} retrying={sending || generatingPlan} />
                )}
                {readyForPlan && !error && (
                  <Pressable
                    onPress={handleGeneratePlan}
                    disabled={generatingPlan}
                    style={({ pressed }) => [
                      styles.ctaButton,
                      { backgroundColor: theme.text },
                      pressed && styles.pressed,
                    ]}>
                    {generatingPlan ? (
                      <ActivityIndicator size="small" color={theme.background} />
                    ) : (
                      <ThemedText style={{ color: theme.background }} type="smallBold">
                        Planını Oluştur ✨
                      </ThemedText>
                    )}
                  </Pressable>
                )}
              </ThemedView>
            }
          />

          <ThemedView type="backgroundElement" style={styles.inputRow}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Mesajını yaz…"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.text }]}
              multiline
              editable={!sending}
              onSubmitEditing={handleSend}
            />
            <Pressable
              onPress={handleSend}
              disabled={sending || !input.trim()}
              style={({ pressed }) => [
                styles.sendButton,
                { opacity: sending || !input.trim() ? 0.4 : pressed ? 0.7 : 1 },
              ]}>
              <ThemedText type="smallBold" themeColor="text">
                Gönder
              </ThemedText>
            </Pressable>
          </ThemedView>
        </SafeAreaView>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const theme = useTheme();
  const isUser = message.role === 'user';
  return (
    <ThemedView
      style={[
        styles.bubble,
        isUser ? styles.bubbleUser : styles.bubbleAssistant,
        { backgroundColor: isUser ? theme.text : theme.backgroundElement },
      ]}>
      <ThemedText style={isUser ? { color: theme.background } : undefined}>
        {message.content}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.three,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  bubble: {
    borderRadius: Spacing.three,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    maxWidth: '85%',
  },
  bubbleUser: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: Spacing.half,
  },
  bubbleAssistant: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: Spacing.half,
  },
  footerGap: {
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    alignSelf: 'flex-start',
  },
  ctaButton: {
    borderRadius: Spacing.four,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
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
  },
  input: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    maxHeight: 120,
    paddingVertical: Spacing.two,
  },
  sendButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
});

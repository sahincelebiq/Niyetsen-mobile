import { useCallback, useEffect, useRef, useState } from 'react';
import { Image } from 'expo-image';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { ErrorBanner } from '@/components/error-banner';
import { ChatComposer } from '@/components/chat-composer';
import { useConsentPreferences } from '@/components/consent-gate';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  MaxContentWidth, Radii, Shadows, Spacing, Texture,
} from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  ApiError,
  ChatMessage,
  CollectedIntent,
  EMPTY_COLLECTED,
  generatePlan,
  generateMessageId,
  getChatSession,
  sendChatMessage,
} from '@/lib/api';
import { executeDeviceTool } from '@/lib/task-reminders';

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    'Merhaba 🌙 Ben Niyetsen. Bu yılı nasıl geçirmek istediğini birlikte konuşalım — ' +
    'hangi şehirdesin, neyle vakit geçirmeyi seviyorsun, haftada ne kadar zamanın var?',
};

export default function ChatScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { status: consentStatus } = useConsentPreferences();
  const aiAllowed = consentStatus.ai_chat_processing.accepted;
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [collected, setCollected] = useState<CollectedIntent>(EMPTY_COLLECTED);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [readyForPlan, setReadyForPlan] = useState(false);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<'send' | 'generate' | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, []);

  // Faz 2: sohbet artık backend'de kalıcı — uygulama yeniden açılınca / yeni
  // cihazda kaldığı yerden devam etsin (önceden sadece bu bileşenin local
  // state'inde yaşıyordu, kapanınca kaybolurdu).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const session = await getChatSession();
        if (!cancelled) {
          if (session.messages.length > 0) {
            setMessages(session.messages);
          }
          setCollected(session.collected);
          setReadyForPlan(session.ready_for_plan);
        }
      } catch {
        // Geçmiş yüklenemezse sessizce karşılama mesajıyla devam et.
      } finally {
        if (!cancelled) setLoadingHistory(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const doSend = useCallback(
    async (nextMessages: ChatMessage[]) => {
      setSending(true);
      setError(null);
      setLastAction('send');
      try {
        const res = await sendChatMessage(nextMessages, collected);
        const deviceResults = await Promise.all(
          (res.tool_calls ?? [])
            .filter((call) => call.name === 'alarm_kur' || call.name === 'takvime_ekle')
            .map(async (call) => {
              try {
                return await executeDeviceTool(call);
              } catch {
                return { ok: false, message: 'Cihaz işlemi tamamlanamadı.' };
              }
            }),
        );
        const assistantContent = [
          res.reply,
          ...deviceResults.map((result) => result.message),
        ].filter(Boolean).join('\n\n');
        setMessages([
          ...nextMessages,
          {
            id: res.message_id ?? generateMessageId(),
            role: 'assistant',
            content: assistantContent,
          },
        ]);
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
    if (!aiAllowed) {
      setError('AI sohbeti rızan kapalı. Ayarlar’dan tercihini değiştirebilirsin.');
      return;
    }
    const text = input.trim();
    if (!text || sending) return;
    const nextMessages: ChatMessage[] = [
      ...messages,
      { id: generateMessageId(), role: 'user', content: text },
    ];
    setMessages(nextMessages);
    setInput('');
    scrollToEnd();
    void doSend(nextMessages);
  }, [aiAllowed, doSend, input, messages, scrollToEnd, sending]);

  const handleGeneratePlan = useCallback(async () => {
    if (!aiAllowed) {
      setError('Plan oluşturmak için AI sohbeti rızası gerekli.');
      return;
    }
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
  }, [aiAllowed, collected, router]);

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
        <Image
          source={require('@/assets/images/chat-mystic-bg.png')}
          style={styles.backgroundImage}
          contentFit="cover"
          pointerEvents="none"
        />
        <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
          {loadingHistory ? (
            <ThemedView style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.textSecondary} />
            </ThemedView>
          ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
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
                      { backgroundColor: theme.tint },
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
          )}

          {!aiAllowed && (
            <Pressable
              onPress={() => router.push('/settings')}
              style={[styles.consentBanner, { borderColor: theme.border }]}>
              <ThemedText type="smallBold" themeColor="tint">
                AI sohbeti kapalı · Ayarlar’dan tercihini değiştirebilirsin
              </ThemedText>
            </Pressable>
          )}
          <ChatComposer
            value={input}
            onChangeText={setInput}
            onSubmit={handleSend}
            disabled={sending || !aiAllowed}
          />
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
        {
          backgroundColor: isUser ? theme.tint : theme.backgroundElement,
          borderColor: isUser ? theme.tint : theme.border,
        },
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
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: Texture.backgroundOpacity,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    borderRadius: Radii.large,
    borderWidth: Texture.cardBorderWidth,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    maxWidth: '85%',
    ...(Shadows.subtle ?? {}),
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
    borderRadius: Radii.pill,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Shadows.soft ?? {}),
  },
  pressed: {
    opacity: 0.8,
  },
  consentBanner: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
});

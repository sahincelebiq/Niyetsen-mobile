import { useCallback, useEffect, useRef, useState } from 'react';
import { Image } from 'expo-image';
import * as DocumentPicker from 'expo-document-picker';
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

import { AssistantMessage } from '@/components/assistant-message';
import { ChatMessageBody } from '@/components/chat-message-body';
import { ChainThinkingIndicator } from '@/components/chain-thinking-indicator';
import { ChatComposer, type PendingAttachment } from '@/components/chat-composer';
import { ChatEdgeDrawer } from '@/components/chat-edge-drawer';
import { ErrorBanner } from '@/components/error-banner';
import { ChatHeader } from '@/components/chat-header';
import { ChatHistorySheet } from '@/components/project-sheets';
import { useConsentPreferences } from '@/components/consent-gate';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Copy } from '@/constants/copy';
import {
  BottomTabInset,
  MaxContentWidth,
  Radii,
  Shadows,
  Spacing,
  Texture,
} from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  ApiError,
  ChatMessage,
  CollectedIntent,
  EMPTY_COLLECTED,
  generatePlan,
  generateMessageId,
  getChatGreeting,
  getChatSession,
  getState,
  isPaywallError,
  sendChatMessage,
  uploadChatAttachment,
} from '@/lib/api';
import { trackEvent } from '@/lib/analytics';
import { executeDeviceTool } from '@/lib/task-reminders';
import { useSubscription } from '@/providers/subscription-provider';

const FALLBACK_WELCOME: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    'Merhaba 🌙 Ben Niyetsen. Bu yılı nasıl geçirmek istediğini birlikte konuşalım — ' +
    'hangi şehirdesin, neyle vakit geçirmeyi seviyorsun, haftada ne kadar zamanın var?',
};

async function loadWelcomeMessage(): Promise<ChatMessage> {
  try {
    const greeting = await getChatGreeting();
    return { id: 'welcome', role: 'assistant', content: greeting.message };
  } catch {
    return FALLBACK_WELCOME;
  }
}

function buildOutgoingText(text: string, attachment: PendingAttachment | null): string {
  if (!attachment) return text;
  const header = `[Ek dosya: ${attachment.filename}]\n${attachment.summary}`;
  return text.trim() ? `${header}\n\n${text.trim()}` : header;
}

export default function ChatScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { status: consentStatus } = useConsentPreferences();
  const { status: subscriptionStatus } = useSubscription();
  const aiAllowed = consentStatus.ai_chat_processing.accepted;
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([FALLBACK_WELCOME]);
  const [collected, setCollected] = useState<CollectedIntent>(EMPTY_COLLECTED);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [readyForPlan, setReadyForPlan] = useState(false);
  const [planHasContent, setPlanHasContent] = useState(false);
  const [activePlanName, setActivePlanName] = useState('Planım');
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<'send' | 'generate' | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [streakDays, setStreakDays] = useState(0);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<PendingAttachment | null>(null);
  const [attaching, setAttaching] = useState(false);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, []);

  const applySession = useCallback(
    async (session: Awaited<ReturnType<typeof getChatSession>>) => {
      if (session.messages.length > 0) {
        setMessages(session.messages);
      } else {
        setMessages([await loadWelcomeMessage()]);
      }
      setCollected(session.collected);
      setReadyForPlan(session.ready_for_plan);
      setPlanHasContent(session.plan_has_content);
      setActivePlanName(session.active_plan_name || 'Planım');
      setInput('');
      setPendingAttachment(null);
      setError(null);
    },
    [],
  );

  const reloadSession = useCallback(async () => {
    try {
      await applySession(await getChatSession());
    } catch {
      setMessages([await loadWelcomeMessage()]);
    }
  }, [applySession]);

  const handleProjectChanged = useCallback(async () => {
    setLoadingHistory(true);
    setMessages([]);
    setCollected(EMPTY_COLLECTED);
    setReadyForPlan(false);
    setPlanHasContent(false);
    setPendingAttachment(null);
    setError(null);
    try {
      await applySession(await getChatSession());
    } catch {
      setMessages([await loadWelcomeMessage()]);
    } finally {
      setLoadingHistory(false);
      scrollToEnd();
    }
  }, [applySession, scrollToEnd]);

  const refreshStreak = useCallback(async () => {
    try {
      const state = await getState();
      setStreakDays(state.streak_len);
    } catch {
      // Zincir bilgisi yüklenemezse sohbet akışı devam eder.
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const session = await getChatSession();
        if (!cancelled) await applySession(session);
      } catch {
        if (!cancelled) setMessages([await loadWelcomeMessage()]);
      } finally {
        if (!cancelled) setLoadingHistory(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applySession]);

  useEffect(() => {
    void refreshStreak();
  }, [refreshStreak]);

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
        setPendingAttachment(null);
        scrollToEnd();
        void refreshStreak();
      } catch (e) {
        if (isPaywallError(e)) {
          router.push('/paywall');
          return;
        }
        setError(e instanceof ApiError ? e.message : 'Beklenmeyen bir hata oluştu.');
      } finally {
        setSending(false);
      }
    },
    [collected, planHasContent, refreshStreak, router, scrollToEnd],
  );

  const handleSend = useCallback(() => {
    if (!aiAllowed) {
      setError('AI sohbeti rızan kapalı. Ayarlar’dan tercihini değiştirebilirsin.');
      return;
    }
    const text = buildOutgoingText(input, pendingAttachment);
    if (!text.trim() || sending) return;
    const nextMessages: ChatMessage[] = [
      ...messages,
      { id: generateMessageId(), role: 'user', content: text },
    ];
    setMessages(nextMessages);
    setInput('');
    scrollToEnd();
    void doSend(nextMessages);
  }, [aiAllowed, doSend, input, messages, pendingAttachment, scrollToEnd, sending]);

  const handleAttach = useCallback(async () => {
    if (!aiAllowed || attaching) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
        type: [
          'image/png',
          'image/jpeg',
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setAttaching(true);
      setError(null);
      const ingested = await uploadChatAttachment(
        asset.uri,
        asset.name ?? 'ek',
        asset.mimeType ?? 'application/octet-stream',
      );
      setPendingAttachment(ingested);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Dosya okunamadı.');
    } finally {
      setAttaching(false);
    }
  }, [aiAllowed, attaching]);

  const handleGeneratePlan = useCallback(async () => {
    if (!aiAllowed) {
      setError('Plan oluşturmak için AI sohbeti rızası gerekli.');
      return;
    }
    setGeneratingPlan(true);
    setError(null);
    setLastAction('generate');
    try {
      const days = collected.duration_days ?? 7;
      await generatePlan(collected, days);
      void trackEvent('first_plan_generated');
      setPlanHasContent(true);
      setReadyForPlan(false);
      router.push('/explore');
    } catch (e) {
      if (isPaywallError(e)) {
        router.push('/paywall');
        return;
      }
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

  const showPlanCta = readyForPlan && !planHasContent && !error;

  return (
    <ThemedView style={[styles.flex, { backgroundColor: theme.background }]}>
      <Image
        source={require('@/assets/images/chat-mystic-bg.png')}
        style={styles.backgroundImage}
        contentFit="cover"
        pointerEvents="none"
      />
      <SafeAreaView
        style={[styles.flex, { backgroundColor: theme.background }]}
        edges={['top', 'left', 'right']}>
        <ChatHeader
          streakDays={streakDays}
          trialDaysRemaining={subscriptionStatus?.trial_days_remaining}
          onOpenHistory={() => setHistoryOpen(true)}
        />
        {activePlanName !== 'Planım' ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.planHint}>
            Aktif niyet: {activePlanName}
          </ThemedText>
        ) : null}
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? BottomTabInset : 0}>
          <ChatEdgeDrawer onOpen={() => setHistoryOpen(true)}>
            {loadingHistory ? (
              <ThemedView style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={theme.textSecondary} />
              </ThemedView>
            ) : (
              <FlatList
                ref={listRef}
                style={styles.list}
                data={messages}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="interactive"
                maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
                renderItem={({ item }) =>
                  item.role === 'user' ? (
                    <UserBubble content={item.content} />
                  ) : (
                    <AssistantMessage content={item.content} />
                  )
                }
                ListFooterComponent={
                  <ThemedView style={styles.footerGap}>
                    {sending ? <ChainThinkingIndicator /> : null}
                    {error ? (
                      <ErrorBanner
                        message={error}
                        onRetry={handleRetry}
                        retrying={sending || generatingPlan}
                      />
                    ) : null}
                    {showPlanCta ? (
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
                            {Copy.chat.planCta}
                          </ThemedText>
                        )}
                      </Pressable>
                    ) : null}
                    {planHasContent ? (
                      <ThemedText type="small" themeColor="textSecondary" style={styles.planHint}>
                        {Copy.chat.planReadyHint}
                      </ThemedText>
                    ) : null}
                  </ThemedView>
                }
              />
            )}
          </ChatEdgeDrawer>

          {!aiAllowed ? (
            <Pressable
              onPress={() => router.push('/settings')}
              style={[styles.consentBanner, { borderColor: theme.border }]}>
              <ThemedText type="smallBold" themeColor="tint">
                AI sohbeti kapalı · Ayarlar’dan tercihini değiştirebilirsin
              </ThemedText>
            </Pressable>
          ) : null}
          <ChatComposer
            value={input}
            onChangeText={setInput}
            onSubmit={handleSend}
            disabled={sending || !aiAllowed}
            pendingAttachment={pendingAttachment}
            onAttach={() => void handleAttach()}
            onClearAttachment={() => setPendingAttachment(null)}
            attaching={attaching}
          />
        </KeyboardAvoidingView>
        <ChatHistorySheet
          visible={historyOpen}
          onClose={() => setHistoryOpen(false)}
          subscriptionStatus={subscriptionStatus}
          onProjectChanged={() => void handleProjectChanged()}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

function UserBubble({ content }: { content: string }) {
  const theme = useTheme();
  return (
    <ThemedView
      style={[
        styles.bubbleUser,
        {
          backgroundColor: theme.accentWarm,
          borderColor: theme.accentWarm,
        },
      ]}>
      <ChatMessageBody content={content} color={theme.onAccent} />
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
  list: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  listContent: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.five,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  bubbleUser: {
    alignSelf: 'flex-end',
    borderRadius: Radii.bubble,
    borderBottomRightRadius: 6,
    borderWidth: 0,
    paddingVertical: 11,
    paddingHorizontal: 15,
    maxWidth: '80%',
    ...(Shadows.subtle ?? {}),
  },
  footerGap: {
    gap: Spacing.three,
    marginTop: Spacing.two,
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
  planHint: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.one,
    textAlign: 'center',
  },
});

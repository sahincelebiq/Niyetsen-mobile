import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type ListRenderItem,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Animated, { FadeInUp, ReduceMotion } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';

import { AssistantMessage } from '@/components/assistant-message';
import { ChatMessageBody } from '@/components/chat-message-body';
import { ChainThinkingIndicator } from '@/components/chain-thinking-indicator';
import { ChatComposer, type PendingAttachment } from '@/components/chat-composer';
import { ChatEdgeDrawer } from '@/components/chat-edge-drawer';
import { ChatQuickReplies } from '@/components/chat-quick-replies';
import { ChatWallpaper } from '@/components/chat-wallpaper';
import { ErrorBanner } from '@/components/error-banner';
import { ChatHeader } from '@/components/chat-header';
import { KeyboardAwareView } from '@/components/keyboard-aware-view';
import { ChatHistorySheet } from '@/components/project-sheets';
import { useConsentPreferences } from '@/components/consent-gate';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Copy } from '@/constants/copy';
import {
  MaxContentWidth,
  Motion,
  Radii,
  Shadows,
  Spacing,
} from '@/constants/theme';
import { useKeyboardHeight } from '@/hooks/use-keyboard-height';
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
import { consumePendingChatMessage } from '@/lib/pending-chat';
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

const UserBubble = memo(function UserBubble({ content }: { content: string }) {
  const theme = useTheme();
  return (
    // İlkbahar v3: tint dolgu + onAccent metin; 12px yukarı + fade (Motion.base).
    <Animated.View
      entering={FadeInUp.duration(Motion.base)
        .withInitialValues({ opacity: 0, transform: [{ translateY: 12 }] })
        .reduceMotion(ReduceMotion.System)}>
      <ThemedView
        style={[
          styles.bubbleUser,
          {
            backgroundColor: theme.tint,
            borderColor: theme.tint,
          },
        ]}>
        <ChatMessageBody content={content} color={theme.onAccent} />
      </ThemedView>
    </Animated.View>
  );
});

export default function ChatScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
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
  // Hızlı yanıt çipleri: modelin sorduğu soruya tek dokunuşla cevap (FAZ 7.5)
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Kullanıcı geçmişi okmak için yukarı kaydırdıysa otomatik scroll devre dışı kalır;
  // yalnız listenin dibine yakınken yeni içerikte en alta iner (zorla zıplama biter).
  // inverted listede görsel "alt" = offset ~0; geçmiş okurken auto-scroll kapanır.
  const nearBottomRef = useRef(true);
  const scrollToEnd = useCallback((force = false) => {
    if (!force && !nearBottomRef.current) return;
    requestAnimationFrame(() =>
      listRef.current?.scrollToOffset({ offset: 0, animated: true }),
    );
  }, []);

  const handleListScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      nearBottomRef.current = event.nativeEvent.contentOffset.y < 120;
    },
    [],
  );

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
      setSuggestions([]);
      setError(null);
    },
    [],
  );

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

  // Felsefe Yolları ekranından gelen hazır mesajı giriş kutusuna koy
  // (otomatik göndermeyiz — kontrol kullanıcıda).
  useFocusEffect(
    useCallback(() => {
      const pending = consumePendingChatMessage();
      if (pending) {
        setInput(pending);
        scrollToEnd(true);
      }
    }, [scrollToEnd]),
  );

  useEffect(() => {
    if (keyboardHeight > 0) {
      scrollToEnd();
    }
  }, [keyboardHeight, scrollToEnd]);

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
        setSuggestions(res.suggestions ?? []);
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
    [collected, refreshStreak, router, scrollToEnd],
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
    setSuggestions([]);
    scrollToEnd(true);
    void doSend(nextMessages);
  }, [aiAllowed, doSend, input, messages, pendingAttachment, scrollToEnd, sending]);

  const handleSuggestionTap = useCallback(
    (suggestion: string) => {
      if (!aiAllowed || sending) return;
      const nextMessages: ChatMessage[] = [
        ...messages,
        { id: generateMessageId(), role: 'user', content: suggestion },
      ];
      setMessages(nextMessages);
      setSuggestions([]);
      scrollToEnd(true);
      void doSend(nextMessages);
    },
    [aiAllowed, doSend, messages, scrollToEnd, sending],
  );

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
      if (e instanceof ApiError && e.status === 409) {
        setError(Copy.plan.alreadyExists);
        setPlanHasContent(true);
        setReadyForPlan(false);
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

  const renderItem: ListRenderItem<ChatMessage> = useCallback(
    ({ item }) =>
      item.role === 'user' ? (
        <UserBubble content={item.content} />
      ) : (
        <AssistantMessage content={item.content} />
      ),
    [],
  );

  const keyExtractor = useCallback((item: ChatMessage) => item.id, []);

  // inverted FlatList: en yeni mesaj görsel olarak alta yapışır (boşluk kayması biter).
  const invertedMessages = useMemo(() => [...messages].reverse(), [messages]);

  // Modelin ürettiği dinamik çipler öncelikli; yoksa (plan öncesi) statik öneriler.
  const dynamicSuggestions = suggestions.length > 0 ? suggestions : null;
  const hasUserMessage = messages.some((m) => m.role === 'user');
  const showEmptyInvite = !hasUserMessage && !planHasContent && dynamicSuggestions === null;
  const showQuickReplies =
    !sending &&
    aiAllowed &&
    !input.trim() &&
    !pendingAttachment &&
    (dynamicSuggestions !== null || !planHasContent);

  const listFooter = (
    <View style={styles.footerGap}>
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
          onPress={() => void handleGeneratePlan()}
          disabled={generatingPlan}
          style={({ pressed }) => [
            styles.ctaButton,
            { backgroundColor: theme.accentWarm },
            pressed && styles.pressed,
          ]}>
          {generatingPlan ? (
            <ActivityIndicator size="small" color={theme.onAccent} />
          ) : (
            <ThemedText style={{ color: theme.onAccent }} type="smallBold">
              {Copy.chat.planCta}
            </ThemedText>
          )}
        </Pressable>
      ) : null}
    </View>
  );

  return (
    <View style={[styles.flex, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <ChatHeader
          streakDays={streakDays}
          trialDaysRemaining={subscriptionStatus?.trial_days_remaining}
          onOpenHistory={() => setHistoryOpen(true)}
          onSecretGesture={() => {
            // Gizli geçiş: başlığa uzun basmak mistik bölümü açar.
            void trackEvent('mystic_secret_entry', { source: 'chat_header' });
            router.push('/mystic');
          }}
        />
        {activePlanName !== 'Planım' ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.planHint}>
            Aktif niyet: {activePlanName}
          </ThemedText>
        ) : null}
        <KeyboardAwareView offset={Platform.OS === 'ios' ? insets.top : 0}>
          <View style={styles.chatColumn}>
            <ChatWallpaper />
            <ChatEdgeDrawer onOpen={() => setHistoryOpen(true)}>
              {loadingHistory ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={theme.textSecondary} />
                </View>
              ) : (
                <FlatList
                  ref={listRef}
                  inverted
                  style={styles.list}
                  data={invertedMessages}
                  keyExtractor={keyExtractor}
                  renderItem={renderItem}
                  contentContainerStyle={styles.listContent}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="interactive"
                  removeClippedSubviews={Platform.OS === 'android'}
                  maxToRenderPerBatch={12}
                  windowSize={9}
                  initialNumToRender={16}
                  onContentSizeChange={() => scrollToEnd()}
                  onLayout={() => scrollToEnd()}
                  onScroll={handleListScroll}
                  scrollEventThrottle={64}
                  ListHeaderComponent={listFooter}
                />
              )}
            </ChatEdgeDrawer>

            {showQuickReplies ? (
              <ChatQuickReplies
                invite={showEmptyInvite ? Copy.chat.emptyInvite : undefined}
                suggestions={dynamicSuggestions ?? Copy.chat.suggestions}
                onSelect={(label) => {
                  if (dynamicSuggestions) {
                    // Dinamik çip = hazır cevap: tek dokunuşla gönder.
                    handleSuggestionTap(label);
                  } else {
                    setInput(label);
                    scrollToEnd();
                  }
                }}
              />
            ) : null}

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
              disabled={!aiAllowed}
              sending={sending}
              pendingAttachment={pendingAttachment}
              onAttach={() => void handleAttach()}
              onClearAttachment={() => setPendingAttachment(null)}
              attaching={attaching}
            />
          </View>
        </KeyboardAwareView>
        <ChatHistorySheet
          visible={historyOpen}
          onClose={() => setHistoryOpen(false)}
          subscriptionStatus={subscriptionStatus}
          onProjectChanged={() => void handleProjectChanged()}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  chatColumn: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
    position: 'relative',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    flex: 1,
    minHeight: 0,
    backgroundColor: 'transparent',
  },
  listContent: {
    flexGrow: 1,
    // inverted: paddingTop görsel olarak input'a yakın alt boşluk.
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
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
    // inverted ListHeader → görsel altta, mesaj ile composer arası sıkı.
    marginBottom: Spacing.one,
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

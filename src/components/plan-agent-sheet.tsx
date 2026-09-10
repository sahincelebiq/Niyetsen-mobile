/**
 * Plan-içi asistan sohbeti (bottom sheet, 2026-09-10).
 *
 * Global sohbetten ayrı: kendi thread'i (`chat_threads.kind = plan_agent`),
 * yalnız bu plan için etkinlik ekler / hatırlatır; yeni 365 plan üretmez.
 * Sunucu etkinliği kendisi oluşturur → her yanıttan sonra liste yenilenir.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChatMessageBody } from '@/components/chat-message-body';
import { ChatQuickReplies } from '@/components/chat-quick-replies';
import { KeyboardAwareView } from '@/components/keyboard-aware-view';
import { ThemedText } from '@/components/themed-text';
import { Fonts, Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  generateMessageId,
  getPlanAgentHistory,
  sendPlanAgentMessage,
  type ChatMessage,
} from '@/lib/api';
import { executeDeviceTool } from '@/lib/task-reminders';
import { useLocale } from '@/providers/locale-provider';

type Props = {
  visible: boolean;
  planId: string | null;
  planName: string;
  onClose: () => void;
  /** Asistan yanıt verdikten sonra (etkinlik eklenmiş olabilir) — liste yenilensin. */
  onEventsChanged: () => void;
};

export function PlanAgentSheet({ visible, planId, planName, onClose, onEventsChanged }: Props) {
  const theme = useTheme();
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const { t } = useLocale();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const loadedForPlan = useRef<string | null>(null);

  useEffect(() => {
    if (!visible || !planId) return;
    if (loadedForPlan.current === planId && messages.length) return;
    if (loadedForPlan.current !== planId) {
      // Plan değişti — önceki planın baloncukları görünmesin.
      setMessages([]);
      setSuggestions([]);
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getPlanAgentHistory(planId)
      .then((history) => {
        if (cancelled) return;
        loadedForPlan.current = planId;
        setMessages(history);
        setSuggestions(history.length ? [] : [...t.events.agentSuggestions]);
      })
      .catch(() => {
        if (cancelled) return;
        // Geçmiş gelmese de sohbet açılır (thread degrade modu).
        loadedForPlan.current = planId;
        setMessages([]);
        setSuggestions([...t.events.agentSuggestions]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // messages.length bilerek dışarıda: yalnız açılışta/plan değişince yükle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, planId, t.events.agentSuggestions]);

  const send = useCallback(
    async (text: string) => {
      const clean = text.trim();
      if (!clean || !planId || sending) return;
      const next: ChatMessage[] = [
        ...messages,
        { id: generateMessageId(), role: 'user', content: clean },
      ];
      setMessages(next);
      setDraft('');
      setSuggestions([]);
      setError(null);
      setSending(true);
      try {
        const res = await sendPlanAgentMessage(planId, next);
        const deviceResults = await Promise.all(
          (res.tool_calls ?? [])
            .filter((call) => call.name === 'alarm_kur' || call.name === 'takvime_ekle')
            .map(async (call) => {
              try {
                return await executeDeviceTool(call);
              } catch {
                return { ok: false, message: t.chat.deviceFailed };
              }
            }),
        );
        const content = [res.reply, ...deviceResults.map((result) => result.message)]
          .filter(Boolean)
          .join('\n\n');
        setMessages([
          ...next,
          { id: res.message_id ?? generateMessageId(), role: 'assistant', content },
        ]);
        setSuggestions(res.suggestions ?? []);
        onEventsChanged();
      } catch (err) {
        setError(err instanceof Error && err.message ? err.message : t.events.agentUnavailable);
      } finally {
        setSending(false);
      }
    },
    [planId, sending, messages, onEventsChanged, t],
  );

  const overlayOpacity = scheme === 'dark' ? 0.55 : 0.32;
  const canSend = !!draft.trim() && !sending && !!planId;
  const inverted = [...messages].reverse();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: theme.text, opacity: overlayOpacity }]}
      />
      <KeyboardAwareView style={styles.wrap}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t.common.closeSection}
        />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.background,
              borderColor: theme.border,
              paddingBottom: Math.max(insets.bottom, Spacing.two),
            },
          ]}>
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <View style={[styles.grabber, { backgroundColor: theme.border }]} />
            <View style={styles.headerRow}>
              <View style={styles.headerText}>
                <ThemedText type="subtitle" numberOfLines={1}>
                  {t.events.agentTitle}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
                  {planName || t.events.planNameFallback} · {t.events.agentSubtitle}
                </ThemedText>
              </View>
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel={t.common.closeSection}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.close,
                  { backgroundColor: theme.surfaceMuted, opacity: pressed ? 0.7 : 1 },
                ]}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  ✕
                </ThemedText>
              </Pressable>
            </View>
          </View>

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={theme.tint} />
            </View>
          ) : (
            <FlatList
              ref={listRef}
              data={inverted}
              inverted
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              contentContainerStyle={styles.list}
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
                    {t.events.agentEmpty}
                  </ThemedText>
                </View>
              }
              renderItem={({ item }) => {
                const mine = item.role === 'user';
                return (
                  <View style={[styles.bubbleRow, mine ? styles.bubbleRowMine : null]}>
                    <View
                      style={[
                        styles.bubble,
                        mine
                          ? { backgroundColor: theme.tint }
                          : { backgroundColor: theme.backgroundElement, borderColor: theme.border, borderWidth: 1 },
                      ]}>
                      <ChatMessageBody
                        content={item.content}
                        color={mine ? theme.onAccent : theme.text}
                      />
                    </View>
                  </View>
                );
              }}
            />
          )}

          {sending ? (
            <View style={styles.typing}>
              <ActivityIndicator size="small" color={theme.textSecondary} />
              <ThemedText type="small" themeColor="textSecondary">
                {t.common.loading}
              </ThemedText>
            </View>
          ) : null}
          {error ? (
            <ThemedText type="small" themeColor="danger" style={styles.error}>
              {error}
            </ThemedText>
          ) : null}
          {!sending && suggestions.length ? (
            <ChatQuickReplies suggestions={suggestions} onSelect={(label) => void send(label)} />
          ) : null}

          <View style={[styles.composer, { borderTopColor: theme.border }]}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder={t.events.agentPlaceholder}
              placeholderTextColor={theme.textSecondary}
              multiline
              maxLength={600}
              editable={!!planId}
              onSubmitEditing={() => void send(draft)}
              blurOnSubmit={false}
              style={[
                styles.input,
                {
                  color: theme.text,
                  borderColor: theme.border,
                  backgroundColor: theme.backgroundElement,
                },
              ]}
            />
            <Pressable
              onPress={() => void send(draft)}
              disabled={!canSend}
              accessibilityRole="button"
              accessibilityLabel={t.chat.sendMessage}
              style={({ pressed }) => [
                styles.send,
                {
                  backgroundColor: canSend ? theme.accentWarm : theme.surfaceMuted,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}>
              <ThemedText
                type="smallBold"
                style={{ color: canSend ? theme.onAccent : theme.textSecondary }}>
                ↑
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </KeyboardAwareView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    // Klavye kaldırırken (paddingBottom) kap küçülür; sabit yükseklik taşardı.
    flex: 1,
    maxHeight: '88%',
    borderTopLeftRadius: Radii.large + 6,
    borderTopRightRadius: Radii.large + 6,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: Radii.pill,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  close: {
    width: 36,
    height: 36,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.two,
  },
  emptyWrap: {
    // inverted liste: boş bileşen ters çevrilir, düzelt.
    transform: [{ scaleY: -1 }],
    paddingVertical: Spacing.four,
  },
  empty: {
    textAlign: 'center',
  },
  bubbleRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  bubbleRowMine: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '86%',
    borderRadius: Radii.bubble,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
  },
  typing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.one,
  },
  error: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.one,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    minHeight: 46,
    maxHeight: 120,
    borderWidth: 1,
    borderRadius: Radii.bubble,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    fontFamily: Fonts.sans,
    fontSize: 16,
  },
  send: {
    width: 46,
    height: 46,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

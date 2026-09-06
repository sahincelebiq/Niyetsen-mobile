import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ErrorBanner } from '@/components/error-banner';
import { KeyboardAwareView } from '@/components/keyboard-aware-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ScreenHeader } from '@/components/ui/screen-header';
import { DailyTaskSkeleton } from '@/components/ui/skeleton';
import { SurfaceCard } from '@/components/ui/surface-card';
import { MaxContentWidth, Radii, Spacing } from '@/constants/theme';
import { useScreenInsets } from '@/hooks/use-screen-insets';
import { useTheme } from '@/hooks/use-theme';
import {
  ApiError,
  getLeague,
  joinLeague,
  type League,
  type LeagueMember,
  leaveLeague,
} from '@/lib/api';
import { showConfirm } from '@/lib/web-alert';
import { useLocale } from '@/providers/locale-provider';

/**
 * faz8.13/4 — Arkadaşlar & Lig: opt-in takma adlı gelişim ligi
 * (2026-08-10 Şahin kararı: leaderboard öne çekildi).
 * KVKK: gerçek isim sızmaz — yalnız RUMUZ + puan + zincir görünür.
 * Ton: yalnız kazanımlar sıralanır; utandırma/karşı düşüş gösterimi YOK.
 */
export default function LeagueScreen() {
  const theme = useTheme();
  const { t } = useLocale();
  const screenInsets = useScreenInsets();
  const [league, setLeague] = useState<League | null>(null);
  const [alias, setAlias] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [privacyOpen, setPrivacyOpen] = useState(false);

  const load = useCallback(async (asRefresh = false) => {
    if (asRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      setLeague(await getLeague());
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : t.league.loadFailed,
      );
      // TODO: /league 404 veya eski backend — kabuk düşmesin; katılım formu kalsın.
      setLeague((current) => current ?? {
        opted_in: false,
        alias: null,
        my_rank: null,
        members: [],
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleJoin() {
    const cleaned = alias.trim();
    if (cleaned.length < 2 || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      setLeague(await joinLeague(cleaned));
      setAlias('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.league.joinFailed);
    } finally {
      setBusy(false);
    }
  }

  function confirmLeave() {
    showConfirm(t.league.leaveTitle, t.league.leaveBody, {
      confirmLabel: t.league.leaveAction,
      onConfirm: () => {
        void (async () => {
          setBusy(true);
          try {
            setLeague(await leaveLeague());
          } catch {
            setError(t.league.leaveFailed);
          } finally {
            setBusy(false);
          }
        })();
      },
    });
  }

  const header = (
    <View style={styles.headerBlock}>
      <ScreenHeader
        title={t.league.title}
        subtitle={t.league.subtitle}
      />
      {error ? <ErrorBanner message={error} onRetry={() => void load()} /> : null}
      {loading && !league ? (
        <View style={styles.skeletonStack}>
          <DailyTaskSkeleton />
        </View>
      ) : null}

      {!loading && league && !league.opted_in ? (
        <SurfaceCard elevated>
          <ThemedText type="subtitle">{t.league.joinTitle}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {t.league.joinHint}
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.league.privacyTitle}
            onPress={() => setPrivacyOpen(true)}
            hitSlop={8}
            style={styles.privacyLink}>
            <ThemedText type="smallBold" themeColor="tint">
              {t.league.privacyLink}
            </ThemedText>
          </Pressable>
          <TextInput
            value={alias}
            onChangeText={setAlias}
            placeholder={t.league.aliasPlaceholder}
            placeholderTextColor={theme.textSecondary}
            maxLength={24}
            accessibilityLabel={t.league.aliasA11y}
            style={[
              styles.aliasInput,
              { borderColor: theme.border, color: theme.text, backgroundColor: theme.background },
            ]}
          />
          <Pressable
            accessibilityRole="button"
            disabled={busy || alias.trim().length < 2}
            onPress={() => void handleJoin()}
            style={({ pressed }) => [
              styles.cta,
              {
                backgroundColor: theme.tint,
                opacity: busy || alias.trim().length < 2 ? 0.4 : pressed ? 0.8 : 1,
              },
            ]}>
            {busy ? (
              <ActivityIndicator color={theme.onAccent} />
            ) : (
              <ThemedText type="smallBold" style={{ color: theme.onAccent }}>
                {t.league.joinCta}
              </ThemedText>
            )}
          </Pressable>
        </SurfaceCard>
      ) : null}

      {!loading && league?.opted_in ? (
        <SurfaceCard hero>
          <View style={styles.meRow}>
            <View style={styles.rankBadge} accessibilityRole="text">
              <ThemedText type="title" themeColor="tint">
                {league.my_rank ? `#${league.my_rank}` : '—'}
              </ThemedText>
            </View>
            <View style={styles.meText}>
              <ThemedText type="smallBold">☘ {league.alias}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {league.my_rank
                  ? t.league.ranked(league.my_rank)
                  : t.league.unranked}
              </ThemedText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.league.leaveA11y}
              disabled={busy}
              onPress={confirmLeave}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={({ pressed }) => [styles.leaveButton, pressed && { opacity: 0.6 }]}>
              <ThemedText type="small" themeColor="textSecondary">
                {t.league.leaveAction}
              </ThemedText>
            </Pressable>
          </View>
        </SurfaceCard>
      ) : null}

      {!loading && league && league.members.length > 0 ? (
        <View style={styles.listMeta}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            {t.league.scoreLabel}
          </ThemedText>
        </View>
      ) : null}

      {!loading && league && league.members.length === 0 ? (
        <SurfaceCard>
          <ThemedText type="subtitle">{t.league.emptyTitle}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {t.league.emptyBody}
          </ThemedText>
        </SurfaceCard>
      ) : null}
    </View>
  );

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <KeyboardAwareView>
        <FlatList
          data={league?.members ?? []}
          keyExtractor={(member) => `${member.rank}-${member.alias}`}
          ListHeaderComponent={header}
          contentContainerStyle={[styles.listContent, { paddingBottom: screenInsets.bottom }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />
          }
          renderItem={({ item }) => <MemberRow member={item} />}
        />
        </KeyboardAwareView>
      </SafeAreaView>

      <Modal
        visible={privacyOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setPrivacyOpen(false)}>
        <View style={styles.sheetBackdrop}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setPrivacyOpen(false)}
            style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.text, opacity: 0.35 }]}
          />
          <Pressable
            style={[styles.sheet, { backgroundColor: theme.backgroundElement }]}
            onPress={(event) => event.stopPropagation()}>
            <ThemedText type="subtitle">{t.league.privacyTitle}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {t.league.joinBody}
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              onPress={() => setPrivacyOpen(false)}
              style={({ pressed }) => [
                styles.cta,
                { backgroundColor: theme.tint, opacity: pressed ? 0.85 : 1 },
              ]}>
              <ThemedText type="smallBold" style={{ color: theme.onAccent }}>
                {t.common.done}
              </ThemedText>
            </Pressable>
          </Pressable>
        </View>
      </Modal>
    </ThemedView>
  );
}

function MemberRow({ member }: { member: LeagueMember }) {
  const theme = useTheme();
  const { t } = useLocale();
  const medal = member.rank === 1 ? '🥇' : member.rank === 2 ? '🥈' : member.rank === 3 ? '🥉' : null;
  return (
    <View
      style={[
        styles.memberRow,
        {
          backgroundColor: member.is_me ? theme.surfaceMuted : theme.backgroundElement,
          borderColor: member.is_me ? theme.tint : theme.border,
        },
      ]}>
      <ThemedText type="smallBold" style={styles.rank} themeColor={member.is_me ? 'tint' : 'textSecondary'}>
        {medal ?? member.rank}
      </ThemedText>
      <View style={styles.memberText}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {member.alias}
          {member.is_me ? t.league.youSuffix : ''}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {t.league.streakDays(member.streak)}
        </ThemedText>
      </View>
      <ThemedText type="smallBold" themeColor="tint">
        {member.score}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerBlock: { gap: Spacing.three, marginBottom: Spacing.two },
  skeletonStack: { gap: Spacing.two },
  listContent: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.three,
    gap: Spacing.two,
  },
  aliasInput: {
    borderWidth: 1,
    borderRadius: Radii.medium,
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  cta: {
    minHeight: 48,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  privacyLink: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
  },
  meRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  rankBadge: {
    minWidth: 56,
    alignItems: 'center',
  },
  meText: { flex: 1, gap: 2 },
  leaveButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: Spacing.two },
  listMeta: {
    paddingHorizontal: Spacing.one,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Radii.medium,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    minHeight: 56,
  },
  rank: { width: 32, textAlign: 'center' },
  memberText: { flex: 1, gap: 2 },
  sheetBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: Radii.large,
    borderTopRightRadius: Radii.large,
    padding: Spacing.four,
    gap: Spacing.three,
  },
});

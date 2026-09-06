import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ErrorBanner } from '@/components/error-banner';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ScreenHeader } from '@/components/ui/screen-header';
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
      {loading ? <ActivityIndicator color={theme.tint} size="large" /> : null}

      {!loading && league && !league.opted_in ? (
        <SurfaceCard elevated>
          <ThemedText type="subtitle">{t.league.joinTitle}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {t.league.joinBody}
          </ThemedText>
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
            accessibilityState={{ disabled: busy || alias.trim().length < 2 }}
            disabled={busy || alias.trim().length < 2}
            onPress={() => void handleJoin()}
            style={({ pressed }) => [
              styles.cta,
              {
                backgroundColor:
                  alias.trim().length < 2 ? theme.surfaceMuted : theme.tint,
                opacity: busy ? 0.7 : pressed && alias.trim().length >= 2 ? 0.85 : 1,
              },
            ]}>
            {busy ? (
              <ActivityIndicator color={theme.onAccent} />
            ) : (
              <ThemedText
                type="smallBold"
                style={{
                  color: alias.trim().length < 2 ? theme.textSecondary : theme.onAccent,
                }}>
                {t.league.joinCta}
              </ThemedText>
            )}
          </Pressable>
        </SurfaceCard>
      ) : null}

      {!loading && league?.opted_in ? (
        <SurfaceCard>
          <View style={styles.meRow}>
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
      </SafeAreaView>
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
  meRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  meText: { flex: 1, gap: 2 },
  leaveButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: Spacing.two },
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
});

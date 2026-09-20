import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { type Href, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator, Pressable, ScrollView, StyleSheet, View,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ErrorBanner } from '@/components/error-banner';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  BottomTabInset, MaxContentWidth, Motion, Radii, Shadows, Spacing, SurfaceEdge, Texture,
} from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { trackEvent } from '@/lib/analytics';
import { waitForPremiumAccess } from '@/lib/api';
import { LEGAL_APP_ROUTES } from '@/lib/legal-links';
import { paywallCatalogFromPrices } from '@/lib/paywall-catalog';
import {
  getStorePrices, purchasePlan, restorePurchases, storeUnavailableReason,
} from '@/lib/purchases';
import { useLocale } from '@/providers/locale-provider';
import { useSubscription } from '@/providers/subscription-provider';

function useReduceMotion() {
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    return () => sub.remove();
  }, []);
  return reduceMotion;
}

function surfaceEdge(scheme: string | null | undefined) {
  return scheme === 'dark' ? SurfaceEdge.dark : SurfaceEdge.light;
}

/** İlk mount: 8px kayma + fade, stagger 60ms. ReduceMotion açıksa yok. */
function firstMountEnter(index: number, reduceMotion: boolean) {
  if (reduceMotion) return undefined;
  return FadeInDown.delay(index * Motion.stagger)
    .duration(Motion.base)
    .withInitialValues({
      opacity: 0,
      transform: [{ translateY: -8 }],
    })
    .reduceMotion(ReduceMotion.System);
}

export default function PaywallScreen() {
  const theme = useTheme();
  const scheme = useColorScheme();
  const { t } = useLocale();
  const router = useRouter();
  const { status, refresh } = useSubscription();
  const reduceMotion = useReduceMotion();
  const [busy, setBusy] = useState<'monthly' | 'yearly' | 'restore' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  // Fiyat ASLA uydurulmaz — mağazadan gelene kadar yükleniyor gösterilir
  // (App Store 3.1.2 / Play ödeme politikası: gösterilen fiyat gerçek olmalı).
  const [monthlyPrice, setMonthlyPrice] = useState<string | null>(null);
  const [yearlyPrice, setYearlyPrice] = useState<string | null>(null);
  const [monthlyIntroDays, setMonthlyIntroDays] = useState<number | null>(null);
  const [yearlyIntroDays, setYearlyIntroDays] = useState<number | null>(null);
  const [priceState, setPriceState] = useState<'loading' | 'ready' | 'unavailable'>(
    storeUnavailableReason() ? 'unavailable' : 'loading',
  );

  const applyPrices = useCallback(
    (prices: Awaited<ReturnType<typeof getStorePrices>>) => {
      if (prices.monthly) setMonthlyPrice(t.paywall.pricePerMonth(prices.monthly));
      else setMonthlyPrice(null);
      if (prices.yearly) setYearlyPrice(t.paywall.pricePerYear(prices.yearly));
      else setYearlyPrice(null);
      setMonthlyIntroDays(prices.monthlyIntroDays);
      setYearlyIntroDays(prices.yearlyIntroDays);
      setPriceState(paywallCatalogFromPrices(prices.monthly, prices.yearly).state);
      if (!prices.yearly && prices.monthly) setSelectedPlan('monthly');
      if (prices.yearly) setSelectedPlan('yearly');
    },
    [t],
  );

  useEffect(() => {
    void trackEvent('paywall_shown', { status: status?.status ?? 'unknown' });
  }, [status?.status]);

  useEffect(() => {
    if (storeUnavailableReason()) return undefined;
    let mounted = true;
    void getStorePrices()
      .then((prices) => {
        if (mounted) applyPrices(prices);
      })
      .catch(() => {
        if (mounted) {
          setMonthlyPrice(null);
          setYearlyPrice(null);
          setPriceState('unavailable');
        }
      });
    return () => {
      mounted = false;
    };
  }, [applyPrices, t]);

  async function refreshPrices() {
    setPriceState('loading');
    setMessage(null);
    try {
      const prices = await getStorePrices();
      applyPrices(prices);
    } catch {
      setMonthlyPrice(null);
      setYearlyPrice(null);
      setPriceState('unavailable');
    }
  }

  const shouldRedirectHome = Boolean(status?.has_premium_access && !status.show_paywall);
  useEffect(() => {
    if (shouldRedirectHome) {
      router.replace('/' as Href);
    }
  }, [shouldRedirectHome, router]);

  async function handlePurchase(plan: 'monthly' | 'yearly') {
    setBusy(plan);
    setMessage(null);
    // 06-C kritik akış: deneme her basışta, sonuç yalnız başarıda.
    void trackEvent('odeme_denemesi', { plan });
    const result = await purchasePlan(plan);
    if (result.ok) {
      void trackEvent('subscription_started', { plan });
      try {
        await waitForPremiumAccess();
      } catch {
        setMessage(t.paywall.syncing);
        setBusy(null);
        await refresh();
        return;
      }
      await refresh();
      setBusy(null);
      router.replace('/' as Href);
      return;
    }
    setMessage(result.message);
    setBusy(null);
  }

  async function handleRestore() {
    setBusy('restore');
    setMessage(null);
    const result = await restorePurchases();
    if (result.ok) {
      void trackEvent('subscription_restored', { plan: result.plan });
      try {
        await waitForPremiumAccess();
      } catch {
        setMessage(t.paywall.restoreSyncing);
        setBusy(null);
        await refresh();
        return;
      }
      await refresh();
      setBusy(null);
      router.replace('/' as Href);
      return;
    }
    setMessage(result.message);
    setBusy(null);
  }

  function close() {
    if (router.canGoBack()) router.back();
    else router.replace('/' as Href);
  }

  if (shouldRedirectHome) {
    return (
      <ThemedView style={styles.flex}>
        <SafeAreaView style={styles.redirect} edges={['top', 'left', 'right']}>
          <ActivityIndicator color={theme.tint} />
        </SafeAreaView>
      </ThemedView>
    );
  }

  const catalog = [
    t.paywall.benefitPlan,
    t.paywall.benefitPaths,
    t.paywall.benefitReport,
    t.paywall.benefitProof,
  ];

  const edge = surfaceEdge(scheme);
  const selectedHasPrice = selectedPlan === 'yearly' ? !!yearlyPrice : !!monthlyPrice;
  const subscribeBusy = busy === selectedPlan;

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}>
          <View style={styles.topBar}>
            <Pressable
              onPress={close}
              hitSlop={12}
              style={styles.iconHit}
              accessibilityRole="button"
              accessibilityLabel={t.paywall.close}>
              <MaterialCommunityIcons name="close" size={22} color={theme.text} />
            </Pressable>
            <Pressable
              disabled={busy !== null}
              onPress={() => void handleRestore()}
              hitSlop={8}
              style={styles.restoreHit}
              accessibilityRole="button">
              <ThemedText type="smallBold" themeColor="tint">
                {busy === 'restore' ? t.paywall.restoring : t.paywall.restoreShort}
              </ThemedText>
            </Pressable>
          </View>

          <ThemedView style={styles.hero}>
            <ThemedText type="screenTitle">{t.paywall.brandTitle}</ThemedText>
            <ThemedText themeColor="textSecondary">
              {t.paywall.body}
            </ThemedText>
            {status?.status === 'trial' && (status.trial_days_remaining ?? 0) > 0 ? (
              <ThemedText type="smallBold" themeColor="tint">
                {t.paywall.trialRemaining.replace(
                  '{n}',
                  String(status.trial_days_remaining),
                )}
              </ThemedText>
            ) : null}
            {(status?.trial_days_remaining === 0
              && (status.status === 'expired' || status.status === 'trial')) ? (
              <ThemedText type="smallBold" themeColor="accentWarm">
                {t.paywall.trialEnded}
              </ThemedText>
            ) : null}
          </ThemedView>

          <ThemedView
            style={[
              styles.benefitCard,
              Shadows.subtle ?? {},
              {
                borderColor: theme.border,
                borderTopColor: edge,
                backgroundColor: theme.backgroundElement,
              },
            ]}>
            {catalog.map((line, index) => (
              <Animated.View
                key={line}
                entering={firstMountEnter(index, reduceMotion)}
                style={styles.benefitRow}>
                <MaterialCommunityIcons
                  name="check-circle"
                  size={20}
                  color={theme.tint}
                />
                <ThemedText type="small" style={styles.benefitText}>
                  {line}
                </ThemedText>
              </Animated.View>
            ))}
          </ThemedView>

          {priceState === 'loading' ? (
            <View
              style={styles.priceRow}
              accessibilityRole="progressbar"
              accessibilityState={{ busy: true }}
              accessibilityLabel={t.paywall.priceLoading}>
              <PlanCardSkeleton recommended reduceMotion={reduceMotion} />
              <PlanCardSkeleton reduceMotion={reduceMotion} />
            </View>
          ) : null}

          {priceState === 'unavailable' ? (
            <ThemedView style={styles.retryBlock}>
              <ThemedText themeColor="textSecondary" style={styles.message}>
                {t.paywall.storeUnavailable}
              </ThemedText>
              <Pressable
                onPress={() => void refreshPrices()}
                accessibilityRole="button"
                style={[styles.retryHit, { borderColor: theme.tint }]}>
                <ThemedText type="smallBold" themeColor="tint">
                  {t.paywall.retryPrices}
                </ThemedText>
              </Pressable>
            </ThemedView>
          ) : priceState === 'ready' ? (
            <Animated.View
              entering={
                reduceMotion
                  ? undefined
                  : FadeIn.duration(Motion.fast).reduceMotion(ReduceMotion.System)
              }
              style={styles.priceRow}>
              {monthlyPrice ? (
                <PlanCard
                  title={t.paywall.monthlyLabel}
                  price={monthlyPrice}
                  hint={
                    monthlyIntroDays
                      ? t.paywall.introFree(monthlyIntroDays)
                      : t.paywall.monthlyHint
                  }
                  selected={selectedPlan === 'monthly'}
                  disabled={busy !== null}
                  reduceMotion={reduceMotion}
                  onPress={() => setSelectedPlan('monthly')}
                />
              ) : null}
              {yearlyPrice ? (
                <PlanCard
                  recommended
                  title={t.paywall.yearlyRecommended}
                  price={yearlyPrice}
                  hint={
                    yearlyIntroDays
                      ? t.paywall.introFree(yearlyIntroDays)
                      : t.paywall.yearlyHint
                  }
                  selected={selectedPlan === 'yearly'}
                  disabled={busy !== null}
                  reduceMotion={reduceMotion}
                  onPress={() => setSelectedPlan('yearly')}
                />
              ) : null}
            </Animated.View>
          ) : null}

          {priceState === 'ready' ? (
            <Pressable
              disabled={busy !== null || !selectedHasPrice}
              onPress={() => void handlePurchase(selectedPlan)}
              accessibilityRole="button"
              accessibilityState={{ disabled: busy !== null || !selectedHasPrice }}
              style={({ pressed }) => [
                styles.subscribe,
                { backgroundColor: theme.accentWarm },
                busy !== null || !selectedHasPrice ? { opacity: 0.5 } : null,
                pressed && busy === null && selectedHasPrice ? { opacity: 0.9 } : null,
              ]}>
              {subscribeBusy ? (
                <ActivityIndicator color={theme.onAccent} />
              ) : (
                <ThemedText type="smallBold" style={{ color: theme.onAccent }}>
                  {t.paywall.subscribeCta}
                </ThemedText>
              )}
            </Pressable>
          ) : null}

          {message ? (
            message === t.paywall.syncing || message === t.paywall.restoreSyncing ? (
              <ThemedText themeColor="textSecondary" style={styles.message}>
                {message}
              </ThemedText>
            ) : (
              <ErrorBanner
                message={message}
                onRetry={busy ? undefined : () => void handleRestore()}
              />
            )
          ) : null}

          <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
            {t.paywall.cancelAnytime}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
            {t.paywall.closedTesterHint}
          </ThemedText>

          <ThemedView style={styles.legalRow}>
            <Pressable
              hitSlop={8}
              accessibilityRole="link"
              style={styles.legalHit}
              onPress={() => router.push(LEGAL_APP_ROUTES.terms as Href)}>
              <ThemedText type="linkPrimary">{t.paywall.terms}</ThemedText>
            </Pressable>
            <ThemedText themeColor="textSecondary">·</ThemedText>
            <Pressable
              hitSlop={8}
              accessibilityRole="link"
              style={styles.legalHit}
              onPress={() => router.push(LEGAL_APP_ROUTES.privacy as Href)}>
              <ThemedText type="linkPrimary">{t.paywall.privacy}</ThemedText>
            </Pressable>
          </ThemedView>

          <ThemedText type="small" themeColor="textSecondary" style={styles.renewal}>
            {t.paywall.renewalNote}
          </ThemedText>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function PlanCardSkeleton({
  recommended,
  reduceMotion,
}: {
  recommended?: boolean;
  reduceMotion: boolean;
}) {
  const theme = useTheme();
  const scheme = useColorScheme();
  const pulse = useSharedValue(0.62);

  useEffect(() => {
    if (reduceMotion) {
      pulse.value = 0.72;
      return;
    }
    pulse.value = withRepeat(
      withTiming(1, {
        duration: Motion.slow,
        easing: Easing.inOut(Easing.quad),
        reduceMotion: ReduceMotion.System,
      }),
      -1,
      true,
    );
  }, [pulse, reduceMotion]);

  const animated = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <Animated.View
      style={[
        styles.card,
        recommended ? Shadows.lifted ?? {} : Shadows.subtle ?? {},
        {
          borderColor: recommended ? theme.tint : theme.border,
          borderWidth: recommended ? 2 : Texture.cardBorderWidth,
          borderTopColor: recommended ? theme.tint : surfaceEdge(scheme),
          backgroundColor: theme.backgroundElement,
        },
        animated,
      ]}>
      {recommended ? (
        <View style={[styles.badge, { backgroundColor: theme.backgroundSelected }]} />
      ) : null}
      <View style={[styles.skeletonLine, { width: '48%', backgroundColor: theme.surfaceMuted }]} />
      <View
        style={[
          styles.skeletonLine,
          styles.skeletonPrice,
          { backgroundColor: theme.surfaceMuted },
        ]}
      />
      <View style={[styles.skeletonLine, { width: '72%', backgroundColor: theme.surfaceMuted }]} />
    </Animated.View>
  );
}

function PlanCard({
  title,
  price,
  hint,
  selected,
  recommended,
  disabled,
  reduceMotion,
  onPress,
}: {
  title: string;
  price: string;
  hint: string;
  selected: boolean;
  recommended?: boolean;
  disabled: boolean;
  reduceMotion: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const scheme = useColorScheme();
  const { t } = useLocale();
  const scale = useSharedValue(1);

  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.cardWrap, animated]}>
      <Pressable
        disabled={disabled}
        onPress={onPress}
        onPressIn={() => {
          if (reduceMotion) return;
          scale.value = withSpring(0.97, {
            damping: 18,
            stiffness: 320,
            reduceMotion: ReduceMotion.System,
          });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, {
            damping: 16,
            stiffness: 280,
            reduceMotion: ReduceMotion.System,
          });
        }}
        accessibilityRole="button"
        accessibilityState={{ disabled, selected }}
        style={[
          styles.card,
          selected ? Shadows.lifted ?? {} : Shadows.subtle ?? {},
          {
            borderColor: selected ? theme.accentWarm : theme.border,
            borderWidth: selected ? 2 : Texture.cardBorderWidth,
            borderTopColor: selected ? theme.accentWarm : surfaceEdge(scheme),
            backgroundColor: theme.backgroundElement,
          },
          disabled ? { opacity: 0.5 } : null,
        ]}>
        {recommended ? (
          <View style={[styles.badge, { backgroundColor: theme.backgroundSelected }]}>
            <ThemedText type="smallBold" themeColor="tint">
              {t.paywall.recommendedBadge}
            </ThemedText>
          </View>
        ) : null}
        <ThemedText type="smallBold" themeColor={selected ? 'accentWarm' : 'text'}>
          {title}
        </ThemedText>
        <ThemedText type="subtitle">{price}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {hint}
        </ThemedText>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  redirect: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.five,
    gap: Spacing.four,
  },
  topBar: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconHit: {
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  restoreHit: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: Spacing.one,
  },
  hero: { gap: Spacing.two },
  benefitCard: {
    borderWidth: Texture.cardBorderWidth,
    borderRadius: Radii.large,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    minHeight: 44,
  },
  benefitText: { flex: 1, paddingTop: 2 },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: Spacing.three,
  },
  cardWrap: {
    flex: 1,
    minWidth: 0,
  },
  card: {
    flex: 1,
    borderRadius: Radii.large,
    padding: Spacing.three,
    gap: Spacing.two,
    minHeight: 132,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    minHeight: 28,
    justifyContent: 'center',
  },
  skeletonLine: {
    height: 14,
    borderRadius: Radii.small,
  },
  skeletonPrice: {
    width: '62%',
    height: 22,
  },
  retryBlock: { gap: Spacing.three, alignItems: 'center' },
  retryHit: {
    minHeight: 44,
    minWidth: 160,
    paddingHorizontal: Spacing.four,
    borderRadius: Radii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subscribe: {
    minHeight: 48,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legalRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  legalHit: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: Spacing.one,
  },
  renewal: { textAlign: 'center', lineHeight: 20 },
  hint: { textAlign: 'center', lineHeight: 20 },
  message: { textAlign: 'center' },
});

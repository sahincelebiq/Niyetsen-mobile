import { type Href, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator, Pressable, ScrollView, StyleSheet, View,
} from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  BottomTabInset, MaxContentWidth, Motion, Radii, Shadows, Spacing, Texture,
} from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { trackEvent } from '@/lib/analytics';
import { waitForPremiumAccess } from '@/lib/api';
import { openLegalDocument } from '@/lib/legal-links';
import { getStorePrices, purchasePlan, restorePurchases } from '@/lib/purchases';
import { useLocale } from '@/providers/locale-provider';
import { useSubscription } from '@/providers/subscription-provider';

const FALLBACK_MONTHLY = '150 TL / ay';
const FALLBACK_YEARLY = '1.200 TL / yıl';

export default function PaywallScreen() {
  const theme = useTheme();
  const { t } = useLocale();
  const router = useRouter();
  const { status, refresh } = useSubscription();
  const [busy, setBusy] = useState<'monthly' | 'yearly' | 'restore' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [monthlyPrice, setMonthlyPrice] = useState(FALLBACK_MONTHLY);
  const [yearlyPrice, setYearlyPrice] = useState(FALLBACK_YEARLY);

  useEffect(() => {
    let mounted = true;
    void trackEvent('paywall_shown', { status: status?.status ?? 'unknown' });
    void getStorePrices().then((prices) => {
      if (!mounted) return;
      if (prices.monthly) setMonthlyPrice(`${prices.monthly} / ay`);
      if (prices.yearly) setYearlyPrice(`${prices.yearly} / yıl`);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const shouldRedirectHome = Boolean(status?.has_premium_access && !status.show_paywall);
  useEffect(() => {
    if (shouldRedirectHome) {
      router.replace('/' as Href);
    }
  }, [shouldRedirectHome, router]);

  async function handlePurchase(plan: 'monthly' | 'yearly') {
    setBusy(plan);
    setMessage(null);
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
      try {
        await waitForPremiumAccess();
      } catch {
        setMessage(t.paywall.restoreSyncing);
        setBusy(null);
        await refresh();
        return;
      }
      await refresh();
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
    return null;
  }

  const benefits = [
    t.paywall.benefitPlan,
    t.paywall.benefitProof,
    t.paywall.benefitReport,
  ];

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}>
          <Pressable
            onPress={close}
            hitSlop={12}
            style={styles.closeHit}
            accessibilityRole="button"
            accessibilityLabel={t.common.back}>
            <ThemedText type="small" themeColor="textSecondary">
              {t.paywall.close}
            </ThemedText>
          </Pressable>

          <ThemedView style={styles.hero}>
            <ThemedText type="title">{t.paywall.title}</ThemedText>
            <ThemedText themeColor="textSecondary">
              {t.paywall.body}
            </ThemedText>
            {status?.trial_days_remaining === 0 && status.status === 'trial' ? (
              <ThemedText type="smallBold" themeColor="accentWarm">
                {t.paywall.trialEnded}
              </ThemedText>
            ) : null}
          </ThemedView>

          <ThemedView
            style={[
              styles.benefitCard,
              { borderColor: theme.border, backgroundColor: theme.backgroundElement },
            ]}>
            {benefits.map((line) => (
              <View key={line} style={styles.benefitRow}>
                <View style={[styles.benefitDot, { backgroundColor: theme.tint }]} />
                <ThemedText type="small" style={styles.benefitText}>
                  {line}
                </ThemedText>
              </View>
            ))}
          </ThemedView>

          <PlanCard
            recommended
            title={t.paywall.yearlyRecommended}
            price={yearlyPrice}
            hint={t.paywall.yearlyHint}
            cta={t.paywall.yearlyCta}
            busy={busy === 'yearly'}
            disabled={busy !== null}
            fill
            onPress={() => void handlePurchase('yearly')}
          />

          <PlanCard
            title={t.paywall.monthlyLabel}
            price={monthlyPrice}
            hint={t.paywall.monthlyHint}
            cta={t.paywall.monthlyCta}
            busy={busy === 'monthly'}
            disabled={busy !== null}
            fill={false}
            onPress={() => void handlePurchase('monthly')}
          />

          {message ? (
            <ThemedText themeColor="textSecondary" style={styles.message}>
              {message}
            </ThemedText>
          ) : null}

          <Pressable
            disabled={busy !== null}
            onPress={() => void handleRestore()}
            style={styles.linkButton}
            accessibilityRole="button">
            <ThemedText type="linkPrimary">
              {busy === 'restore' ? t.paywall.restoring : t.paywall.restore}
            </ThemedText>
          </Pressable>

          <ThemedView style={styles.legalRow}>
            <Pressable hitSlop={8} onPress={() => void openLegalDocument('terms')}>
              <ThemedText type="linkPrimary">{t.paywall.terms}</ThemedText>
            </Pressable>
            <ThemedText themeColor="textSecondary">·</ThemedText>
            <Pressable hitSlop={8} onPress={() => void openLegalDocument('privacy')}>
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

function PlanCard({
  title,
  price,
  hint,
  cta,
  busy,
  disabled,
  fill,
  recommended,
  onPress,
}: {
  title: string;
  price: string;
  hint: string;
  cta: string;
  busy: boolean;
  disabled: boolean;
  fill: boolean;
  recommended?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const scale = useSharedValue(1);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    return () => sub.remove();
  }, []);

  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.card,
        Shadows.soft ?? {},
        {
          borderColor: recommended ? theme.tint : theme.border,
          borderWidth: recommended ? 2 : Texture.cardBorderWidth,
          backgroundColor: theme.backgroundElement,
        },
        animated,
      ]}>
      <ThemedText type="subtitle" themeColor={recommended ? 'tint' : 'text'}>
        {title}
      </ThemedText>
      <ThemedText type="screenTitle">{price}</ThemedText>
      <ThemedText themeColor="textSecondary">{hint}</ThemedText>
      <Pressable
        disabled={disabled}
        onPress={onPress}
        onPressIn={() => {
          if (reduceMotion) return;
          scale.value = withTiming(0.97, {
            duration: Motion.fast,
            easing: Easing.out(Easing.quad),
            reduceMotion: ReduceMotion.System,
          });
        }}
        onPressOut={() => {
          scale.value = withTiming(1, {
            duration: Motion.fast,
            easing: Easing.out(Easing.quad),
            reduceMotion: ReduceMotion.System,
          });
        }}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.button,
          fill
            ? { backgroundColor: theme.tint }
            : { backgroundColor: theme.surfaceMuted, borderWidth: 1, borderColor: theme.tint },
          pressed && reduceMotion ? { opacity: 0.85 } : null,
        ]}>
        {busy ? (
          <ActivityIndicator color={fill ? theme.onAccent : theme.tint} />
        ) : (
          <ThemedText
            type="smallBold"
            style={{ color: fill ? theme.onAccent : theme.tint }}>
            {cta}
          </ThemedText>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.five,
    gap: Spacing.four,
  },
  closeHit: {
    minHeight: 44,
    justifyContent: 'center',
    alignSelf: 'flex-start',
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
  },
  benefitDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  benefitText: { flex: 1 },
  card: {
    borderRadius: Radii.large,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  button: {
    minHeight: 48,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.two,
  },
  linkButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingVertical: Spacing.two,
  },
  legalRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  renewal: { textAlign: 'center', lineHeight: 20 },
  message: { textAlign: 'center' },
});

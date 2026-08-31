import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  Fraunces_500Medium,
  Fraunces_600SemiBold,
} from '@expo-google-fonts/fraunces';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  useFonts,
} from '@expo-google-fonts/manrope';
import * as SplashScreen from 'expo-splash-screen';
import { Slot, Stack, usePathname, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, InteractionManager, Pressable, StyleSheet, useColorScheme, View,
} from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthScreen } from '@/components/auth-screen';
import { ConnectivityBanner } from '@/components/connectivity-banner';
import { ConsentGate } from '@/components/consent-gate';
import { OnboardingScreen } from '@/components/onboarding-screen';
import { SubscriptionGate } from '@/components/subscription-gate';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import {
  addNotificationResponseListener,
  openLastNotificationResponse,
} from '@/lib/push-notifications';
import { trackEvent } from '@/lib/analytics';
import { pingHealth, updateProfile } from '@/lib/api';
import { initSentry } from '@/lib/sentry';
import { Motion } from '@/constants/theme';
import { AppearanceProvider } from '@/providers/appearance-provider';
import { AuthProvider, useAuth } from '@/providers/auth-provider';
import { coerceAppLocale } from '@/i18n/catalog';
import { LocaleProvider, useI18n } from '@/providers/locale-provider';
import { ProfileProvider, useProfile } from '@/providers/profile-provider';
import { SubscriptionProvider } from '@/providers/subscription-provider';

SplashScreen.preventAutoHideAsync();

const FONT_WAIT_MS = 2500;

export default function TabLayout() {
  const pathname = usePathname();
  const [fontsLoaded, fontError] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Fraunces_500Medium,
    Fraunces_600SemiBold,
  });
  const [fontWaitOver, setFontWaitOver] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setFontWaitOver(true), FONT_WAIT_MS);
    return () => clearTimeout(timer);
  }, []);

  const fontsReady = fontsLoaded || !!fontError || fontWaitOver;

  useEffect(() => {
    if (!fontsReady) return;
    void SplashScreen.hideAsync().catch(() => undefined);
  }, [fontsReady]);

  if (!fontsReady) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <AppearanceProvider>
        <LocaleProvider>
          <RootNavigation pathname={pathname} />
        </LocaleProvider>
      </AppearanceProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigation({ pathname }: { pathname: string }) {
  const colorScheme = useColorScheme();
  const publicRoute =
    pathname.startsWith('/legal/') || pathname.startsWith('/auth/');
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <AuthProvider>
        {publicRoute ? <Slot /> : <AuthenticatedApp />}
      </AuthProvider>
    </ThemeProvider>
  );
}

function AuthenticatedApp() {
  const { session, loading, recovery } = useAuth();
  const theme = useTheme();

  if (loading) {
    return (
      <ThemedView style={styles.loading}>
        <ActivityIndicator color={theme.tint} />
      </ThemedView>
    );
  }

  if (!session || recovery) return <AuthScreen />;
  return (
    <ProfileProvider>
      <ProfileGate />
    </ProfileProvider>
  );
}

function ProfileGate() {
  const { profile, loading, error, offline, refresh } = useProfile();
  const { signOut } = useAuth();
  const theme = useTheme();
  const { t, locale, timezone, setLocale, hasStoredPreference, ready: localeReady } = useI18n();
  const [retrying, setRetrying] = useState(false);
  const syncedLocaleRef = useRef<string | null>(null);

  useEffect(() => {
    if (!localeReady || !profile) return;
    const profileLang = coerceAppLocale(profile.preferred_language);

    // Yeni cihaz: kayıtlı yerel tercih yoksa profil dili UI'ya gelir.
    if (!hasStoredPreference && profileLang && profileLang !== locale) {
      void setLocale(profileLang).catch(() => undefined);
      return;
    }

    // Giriş/Profil seçici kazansın — eski tr profili Almanca seçimi ezmesin.
    if (!hasStoredPreference) return;
    if (profileLang === locale) {
      syncedLocaleRef.current = locale;
      return;
    }
    if (!profile.name || !profile.birth_date) return;
    // Aynı dile ikinci PATCH yok — refresh gecikirse döngü oluşmasın.
    if (syncedLocaleRef.current === locale) return;
    syncedLocaleRef.current = locale;
    void updateProfile({
      name: profile.name,
      birth_date: profile.birth_date,
      timezone: profile.timezone || timezone,
      preferred_language: locale,
      notif_hour: profile.notif_hour ?? 8,
      notif_minute: profile.notif_minute ?? 0,
      irade_modu_active: profile.irade_modu_active ?? false,
      gender: profile.gender,
    })
      .then(() => refresh())
      .catch(() => {
        syncedLocaleRef.current = null;
      });
  }, [
    localeReady,
    hasStoredPreference,
    locale,
    timezone,
    profile,
    profile?.preferred_language,
    profile?.name,
    profile?.birth_date,
    refresh,
    setLocale,
  ]);

  async function retry() {
    setRetrying(true);
    try {
      await refresh();
    } finally {
      setRetrying(false);
    }
  }

  // FAZ 8.11.0: önbellek varsa spinner/error engeli yok — uygulama açılır.
  if (loading && !profile) {
    return (
      <ThemedView style={styles.loading}>
        <ActivityIndicator color={theme.tint} />
      </ThemedView>
    );
  }
  if (error && !profile) {
    return (
      <ThemedView style={styles.loading}>
        <ThemedText themeColor="danger">{error}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
          {t.common.offlineBanner}
        </ThemedText>
        <Pressable onPress={() => void retry()} hitSlop={12} style={styles.retryHit}>
          <ThemedText themeColor="tint">{t.common.retry}</ThemedText>
        </Pressable>
        <Pressable onPress={() => void signOut()} hitSlop={12} style={styles.retryHit}>
          <ThemedText themeColor="tint">{t.auth.signOutRetry}</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  if (!profile) {
    return (
      <ThemedView style={styles.loading}>
        <ActivityIndicator color={theme.tint} />
      </ThemedView>
    );
  }

  const body = profile.onboarding_complete ? (
    <ConsentGate>
      <SubscriptionProvider>
        <SubscriptionGate>
          <NotificationRouter />
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'fade',
              animationDuration: Motion.fast,
              freezeOnBlur: true,
            }}>
            <Stack.Screen
              name="(tabs)"
              options={{ animation: 'none', freezeOnBlur: false }}
            />
            <Stack.Screen name="mystic" />
            <Stack.Screen name="mistik-sohbet" />
            <Stack.Screen name="tarot" />
            <Stack.Screen name="fal" />
            <Stack.Screen name="fal-gecmisi" />
            <Stack.Screen name="astroloji" />
            <Stack.Screen name="rapor" />
            <Stack.Screen name="paywall" />
            <Stack.Screen name="bonus" />
            <Stack.Screen name="yollar" />
            <Stack.Screen name="yol-detay" />
            <Stack.Screen name="arkadaslar" />
          </Stack>
        </SubscriptionGate>
      </SubscriptionProvider>
    </ConsentGate>
  ) : (
    <OnboardingScreen />
  );

  return (
    <View style={styles.root}>
      {/* Onboarding yolunda SubscriptionGate yok — banner burada. */}
      {!profile.onboarding_complete ? (
        <ConnectivityBanner
          visible={offline}
          onRetry={() => void retry()}
          retrying={retrying}
        />
      ) : null}
      {body}
    </View>
  );
}

function NotificationRouter() {
  const router = useRouter();

  useEffect(() => {
    initSentry();
    const subscription = addNotificationResponseListener(router);
    const handle = InteractionManager.runAfterInteractions(() => {
      void trackEvent('app_open');
      void pingHealth().catch(() => undefined);
      void openLastNotificationResponse(router).catch(() => undefined);
    });
    return () => {
      handle.cancel();
      subscription?.remove();
    };
  }, [router]);

  return null;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  retryHit: {
    minHeight: 44,
    justifyContent: 'center',
  },
});

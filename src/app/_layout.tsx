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
import { useEffect, useState } from 'react';
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
import { pingHealth } from '@/lib/api';
import { initSentry } from '@/lib/sentry';
import { AppearanceProvider } from '@/providers/appearance-provider';
import { AuthProvider, useAuth } from '@/providers/auth-provider';
import { isAppLocale } from '@/i18n/catalog';
import { LocaleProvider, useI18n } from '@/providers/locale-provider';
import { ProfileProvider, useProfile } from '@/providers/profile-provider';
import { SubscriptionProvider } from '@/providers/subscription-provider';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const pathname = usePathname();
  const [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Fraunces_500Medium,
    Fraunces_600SemiBold,
  });

  useEffect(() => {
    if (!fontsLoaded) return;
    void SplashScreen.hideAsync().catch(() => undefined);
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

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
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      {pathname.startsWith('/legal/') ? (
        <Slot />
      ) : pathname.startsWith('/auth/') ? (
        <AuthProvider>
          <Slot />
        </AuthProvider>
      ) : (
        <AuthProvider>
          <AuthenticatedApp />
        </AuthProvider>
      )}
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
  const { t, setLocale } = useI18n();
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    const lang = profile?.preferred_language;
    if (!isAppLocale(lang)) return;
    void setLocale(lang).catch(() => undefined);
  }, [profile?.preferred_language, setLocale]);

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
          <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
            <Stack.Screen name="(tabs)" />
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

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  Fraunces_500Medium,
  Fraunces_500Medium_Italic,
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
import { Slot, usePathname, useRouter } from 'expo-router';
import { useEffect } from 'react';
import {
  ActivityIndicator, Pressable, StyleSheet, useColorScheme,
} from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { AuthScreen } from '@/components/auth-screen';
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
import { AuthProvider, useAuth } from '@/providers/auth-provider';
import { ProfileProvider, useProfile } from '@/providers/profile-provider';
import { SubscriptionProvider } from '@/providers/subscription-provider';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const pathname = usePathname();
  const [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Fraunces_500Medium,
    Fraunces_500Medium_Italic,
    Fraunces_600SemiBold,
  });

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      {pathname.startsWith('/legal/') ? (
        <Slot />
      ) : (
        <AuthProvider>
          <AuthenticatedApp />
        </AuthProvider>
      )}
    </ThemeProvider>
    </GestureHandlerRootView>
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
  const { profile, loading, error, refresh } = useProfile();
  const theme = useTheme();

  if (loading) {
    return (
      <ThemedView style={styles.loading}>
        <ActivityIndicator color={theme.tint} />
      </ThemedView>
    );
  }
  if (error) {
    return (
      <ThemedView style={styles.loading}>
        <ThemedText themeColor="danger">{error}</ThemedText>
        <Pressable onPress={() => void refresh()}>
          <ThemedText themeColor="tint">Tekrar dene</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }
  return profile?.onboarding_complete ? (
    <ConsentGate>
      <SubscriptionProvider>
        <SubscriptionGate>
          <NotificationRouter />
          <AppTabs />
        </SubscriptionGate>
      </SubscriptionProvider>
    </ConsentGate>
  ) : (
    <OnboardingScreen />
  );
}

function NotificationRouter() {
  const router = useRouter();

  useEffect(() => {
    void trackEvent('app_open');
    void openLastNotificationResponse(router);
    const subscription = addNotificationResponseListener(router);
    return () => subscription?.remove();
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
});

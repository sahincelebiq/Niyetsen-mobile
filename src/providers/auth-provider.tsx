import * as AppleAuthentication from 'expo-apple-authentication';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import type { Session, User } from '@supabase/supabase-js';
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { InteractionManager, Platform } from 'react-native';

import {
  completeAuthFromUrl,
  getAuthRedirectUri,
  looksLikeAuthCallback,
} from '@/lib/auth-redirect';
import { supabase } from '@/lib/supabase';
import { resetAnalyticsIdentity } from '@/lib/analytics';
import { configurePurchases, logOutPurchases } from '@/lib/purchases';

WebBrowser.maybeCompleteAuthSession();

export type AuthFlowCode =
  | 'email_not_confirmed'
  | 'wrong_password'
  | 'already_registered'
  | 'google_incomplete'
  | 'provider_not_enabled'
  | 'session_failed'
  | 'recovery_expired'
  | 'generic';

export class AuthFlowError extends Error {
  code: AuthFlowCode;
  constructor(code: AuthFlowCode, message: string) {
    super(message);
    this.code = code;
  }
}

function toAuthFlowError(error: unknown): AuthFlowError {
  const raw = error instanceof Error ? error.message : String(error);
  const text = raw.toLowerCase();
  if (text.includes('email not confirmed')) {
    return new AuthFlowError('email_not_confirmed', raw);
  }
  if (text.includes('invalid login credentials')) {
    return new AuthFlowError('wrong_password', raw);
  }
  if (text.includes('already registered') || text.includes('already been registered')) {
    return new AuthFlowError('already_registered', raw);
  }
  if (text.includes('provider is not enabled')) {
    return new AuthFlowError('provider_not_enabled', raw);
  }
  if (
    text.includes('otp_expired') ||
    text.includes('token has expired') ||
    (text.includes('expired') && text.includes('token'))
  ) {
    return new AuthFlowError('recovery_expired', raw);
  }
  if (text.includes('tamamlanmadı') || text.includes('cancelled') || text.includes('canceled')) {
    return new AuthFlowError('google_incomplete', raw);
  }
  return new AuthFlowError('generic', raw);
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  recovery: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<boolean>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const SESSION_BOOT_MS = 8000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(label)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

async function openOAuth(provider: 'google' | 'apple') {
  const redirectTo = getAuthRedirectUri();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: Platform.OS !== 'web',
      queryParams:
        provider === 'google'
          ? { prompt: 'select_account', access_type: 'offline' }
          : undefined,
    },
  });
  if (error) throw toAuthFlowError(error);
  if (Platform.OS === 'web' || !data.url) return;

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') {
    throw new AuthFlowError('google_incomplete', 'Giriş işlemi tamamlanmadı.');
  }
  const exchanged = await completeAuthFromUrl(result.url);
  if (!exchanged.handled) {
    throw new AuthFlowError('session_failed', 'Supabase oturumu alınamadı.');
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [recovery, setRecovery] = useState(false);

  useEffect(() => {
    let mounted = true;

    const applyUrl = async (url: string | null) => {
      if (!url || !looksLikeAuthCallback(url)) return;
      try {
        const result = await completeAuthFromUrl(url);
        if (mounted && result.recovery) setRecovery(true);
      } catch (error) {
        console.warn('OAuth geri dönüşü tamamlanamadı', error);
      }
    };

    void (async () => {
      try {
        const { data } = await withTimeout(
          supabase.auth.getSession(),
          SESSION_BOOT_MS,
          'session_timeout',
        );
        if (mounted) setSession(data.session);
      } catch (error) {
        console.warn('Oturum okunamadı', error);
        // Timeout'ta session'ı silme — OAuth/onAuthStateChange gelmiş olabilir.
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      if (event === 'SIGNED_OUT') setRecovery(false);
      if (event === 'SIGNED_OUT' || event === 'SIGNED_IN') {
        resetAnalyticsIdentity();
      }
      setLoading(false);
    });

    void Linking.getInitialURL().then((url) => {
      if (mounted) void applyUrl(url);
    });
    const linking = Linking.addEventListener('url', ({ url }) => {
      void applyUrl(url);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
      linking.remove();
    };
  }, []);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) {
      void logOutPurchases();
      return;
    }
    const handle = InteractionManager.runAfterInteractions(() => {
      void configurePurchases(userId);
    });
    return () => handle.cancel();
  }, [session?.user?.id]);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: normalizeEmail(email),
      password,
    });
    if (error) throw toAuthFlowError(error);
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    const redirectTo = getAuthRedirectUri();
    const { data, error } = await supabase.auth.signUp({
      email: normalizeEmail(email),
      password,
      options: { emailRedirectTo: redirectTo },
    });
    if (error) throw toAuthFlowError(error);
    return !data.session;
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(normalizeEmail(email), {
      redirectTo: getAuthRedirectUri(),
    });
    if (error) throw toAuthFlowError(error);
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw toAuthFlowError(error);
    setRecovery(false);
  }, []);

  const signInWithGoogle = useCallback(() => openOAuth('google'), []);

  const signInWithApple = useCallback(async () => {
    if (Platform.OS !== 'ios') {
      await openOAuth('apple');
      return;
    }
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    if (!credential.identityToken) {
      throw new Error('Apple kimlik belirteci alınamadı.');
    }
    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
    });
    if (error) throw toAuthFlowError(error);
  }, []);

  const signOut = useCallback(async () => {
    await logOutPurchases();
    setRecovery(false);
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      recovery,
      signInWithEmail,
      signUpWithEmail,
      resetPassword,
      updatePassword,
      signInWithGoogle,
      signInWithApple,
      signOut,
    }),
    [
      loading,
      recovery,
      resetPassword,
      session,
      signInWithApple,
      signInWithEmail,
      signInWithGoogle,
      signOut,
      signUpWithEmail,
      updatePassword,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth, AuthProvider içinde kullanılmalı.');
  return context;
}

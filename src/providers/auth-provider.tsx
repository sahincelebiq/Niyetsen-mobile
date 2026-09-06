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
  AuthFlowError,
  logAuthEvent,
  toAuthFlowError,
  type AuthFlowKod,
} from '@/features/auth/auth-errors';
import {
  completeAuthFromUrl,
  getAuthRedirectUri,
  looksLikeAuthCallback,
} from '@/lib/auth-redirect';
import { supabase } from '@/lib/supabase';
import { resetAnalyticsIdentity } from '@/lib/analytics';
import { configurePurchases, logOutPurchases } from '@/lib/purchases';

WebBrowser.maybeCompleteAuthSession();

export { AuthFlowError };
export type AuthFlowCode = AuthFlowKod;

function throwAuth(error: unknown, akis: string): never {
  const flow = toAuthFlowError(error);
  logAuthEvent(flow.kod, akis, flow.teknikDetay);
  throw flow;
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
  sendEmailOtp: (email: string, purpose: 'recovery' | 'signup') => Promise<void>;
  verifyEmailOtp: (email: string, token: string, purpose: 'recovery' | 'signup') => Promise<void>;
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
  if (error) throwAuth(error, 'oauth');
  if (Platform.OS === 'web' || !data.url) return;

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') {
    const flow = new AuthFlowError({ kod: 'iptal' });
    logAuthEvent(flow.kod, 'oauth', result.type);
    throw flow;
  }
  try {
    const exchanged = await completeAuthFromUrl(result.url);
    if (!exchanged.handled) {
      const flow = new AuthFlowError({
        kod: 'bilinmeyen',
        teknikDetay: 'oauth_session_unhandled',
      });
      logAuthEvent(flow.kod, 'oauth', flow.teknikDetay);
      throw flow;
    }
  } catch (sessionError) {
    if (sessionError instanceof AuthFlowError) throw sessionError;
    throwAuth(sessionError, 'oauth');
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
        throwAuth(error, 'callback');
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
      if (mounted) void applyUrl(url).catch(() => undefined);
    });
    const linking = Linking.addEventListener('url', ({ url }) => {
      void applyUrl(url).catch(() => undefined);
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
    if (error) throwAuth(error, 'signIn');
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    const redirectTo = getAuthRedirectUri();
    const { data, error } = await supabase.auth.signUp({
      email: normalizeEmail(email),
      password,
      options: { emailRedirectTo: redirectTo },
    });
    if (error) throwAuth(error, 'signUp');
    return !data.session;
  }, []);

  const sendEmailOtp = useCallback(async (email: string, purpose: 'recovery' | 'signup') => {
    const normalized = normalizeEmail(email);
    const redirectTo = getAuthRedirectUri();
    if (purpose === 'signup') {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: normalized,
        options: { emailRedirectTo: redirectTo },
      });
      if (error) throwAuth(error, 'resend');
      return;
    }
    // Şifre unuttum: 6 haneli OTP (şablon {{ .Token }}). Magic-link yedek değil —
    // kapalı testte deep link kırılıyordu.
    const { error } = await supabase.auth.signInWithOtp({
      email: normalized,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: redirectTo,
      },
    });
    if (error) throwAuth(error, 'otp');
  }, []);

  const resetPassword = useCallback(
    async (email: string) => {
      await sendEmailOtp(email, 'recovery');
    },
    [sendEmailOtp],
  );

  const verifyEmailOtp = useCallback(
    async (email: string, token: string, purpose: 'recovery' | 'signup') => {
      const normalized = normalizeEmail(email);
      const code = token.replace(/\s/g, '');
      const order: Array<'recovery' | 'email' | 'signup'> =
        purpose === 'signup' ? ['signup', 'email'] : ['email', 'recovery'];
      let lastError: unknown;
      for (const type of order) {
        const { error } = await supabase.auth.verifyOtp({
          email: normalized,
          token: code,
          type,
        });
        if (!error) {
          if (purpose === 'recovery') setRecovery(true);
          return;
        }
        lastError = error;
      }
      throwAuth(lastError, 'otp');
    },
    [],
  );

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throwAuth(error, 'updatePassword');
    setRecovery(false);
  }, []);

  const signInWithGoogle = useCallback(() => openOAuth('google'), []);

  const signInWithApple = useCallback(async () => {
    try {
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
        throw new AuthFlowError({
          kod: 'bilinmeyen',
          teknikDetay: 'apple_identity_token_missing',
        });
      }
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });
      if (error) throw error;
    } catch (error) {
      if (error instanceof AuthFlowError) throw error;
      throwAuth(error, 'oauth');
    }
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
      sendEmailOtp,
      verifyEmailOtp,
      updatePassword,
      signInWithGoogle,
      signInWithApple,
      signOut,
    }),
    [
      loading,
      recovery,
      resetPassword,
      sendEmailOtp,
      session,
      signInWithApple,
      signInWithEmail,
      signInWithGoogle,
      signOut,
      signUpWithEmail,
      updatePassword,
      verifyEmailOtp,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth, AuthProvider içinde kullanılmalı.');
  return context;
}

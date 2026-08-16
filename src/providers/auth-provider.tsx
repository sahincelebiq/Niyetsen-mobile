import { makeRedirectUri } from 'expo-auth-session';
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
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';
import { resetAnalyticsIdentity } from '@/lib/analytics';
import { configurePurchases, logOutPurchases } from '@/lib/purchases';

WebBrowser.maybeCompleteAuthSession();

export type AuthFlowCode =
  | 'email_not_confirmed'
  | 'wrong_password'
  | 'already_registered'
  | 'google_incomplete'
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
  if (text.includes('tamamlanmadı') || text.includes('cancelled') || text.includes('canceled')) {
    return new AuthFlowError('google_incomplete', raw);
  }
  return new AuthFlowError('generic', raw);
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
const redirectTo = makeRedirectUri({ scheme: 'niyetsen', path: 'auth/callback' });

async function openOAuth(provider: 'google' | 'apple') {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: Platform.OS !== 'web',
    },
  });
  if (error) throw toAuthFlowError(error);
  if (Platform.OS === 'web' || !data.url) return;

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') {
    throw new AuthFlowError('google_incomplete', 'Giriş işlemi tamamlanmadı.');
  }
  const rawParams = result.url.includes('#')
    ? result.url.split('#')[1]
    : result.url.split('?')[1] ?? '';
  const params = new URLSearchParams(rawParams);
  const errorDescription = params.get('error_description');
  if (errorDescription) throw new Error(errorDescription);

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (accessToken && refreshToken) {
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (sessionError) throw toAuthFlowError(sessionError);
    return;
  }
  const exchanged = await completeAuthFromUrl(result.url);
  if (!exchanged) {
    throw new AuthFlowError('generic', 'Supabase oturumu alınamadı.');
  }
}

async function completeAuthFromUrl(url: string): Promise<boolean> {
  const parsed = Linking.parse(url);
  const query = parsed.queryParams ?? {};
  const hash = url.includes('#') ? new URLSearchParams(url.split('#')[1]) : null;
  const pick = (key: string): string | undefined => {
    const fromQuery = query[key];
    if (typeof fromQuery === 'string' && fromQuery) return fromQuery;
    const fromHash = hash?.get(key);
    return fromHash || undefined;
  };
  const code = pick('code');
  const tokenHash = pick('token_hash') ?? pick('token');
  const type = pick('type');
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw toAuthFlowError(error);
    return true;
  }
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as 'signup' | 'email' | 'recovery' | 'invite',
    });
    if (error) throw toAuthFlowError(error);
    return true;
  }
  return false;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [recovery, setRecovery] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session);
        setLoading(false);
      }
    });
    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      if (event === 'SIGNED_OUT' || event === 'SIGNED_IN') {
        // Hesap değişince PostHog kimliği sıfırlanır; aksi hâlde yeni hesabın
        // event'leri önceki kullanıcıya yazılıyordu.
        resetAnalyticsIdentity();
      }
      setLoading(false);
    });
    const linking = Linking.addEventListener('url', ({ url }) => {
      void completeAuthFromUrl(url).catch(() => undefined);
    });
    return () => {
      mounted = false;
      data.subscription.unsubscribe();
      linking.remove();
    };
  }, []);

  useEffect(() => {
    const userId = session?.user?.id;
    if (userId) {
      void configurePurchases(userId);
      return;
    }
    void logOutPurchases();
  }, [session?.user?.id]);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw toAuthFlowError(error);
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectTo },
    });
    if (error) throw toAuthFlowError(error);
    // true = e-posta onayı bekleniyor (oturum henüz yok).
    return !data.session;
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
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

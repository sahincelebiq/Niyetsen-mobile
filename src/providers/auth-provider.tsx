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

export { AuthFlowError } from '@/features/auth/auth-errors';
export type { AuthFlowKod as AuthFlowCode } from '@/features/auth/auth-errors';

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
  if (error) {
    const mapped = toAuthFlowError(error);
    logAuthEvent(mapped.kod, `oauth:${provider}`, mapped.teknikDetay);
    throw mapped;
  }
  if (Platform.OS === 'web' || !data.url) return;

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  // Android Custom Tab çoğu zaman 'dismiss' döner; oturum deep link ile
  // zaten kurulmuş olabilir. Bunu iptal sanıp kullanıcıyı atma.
  if (result.type === 'success' && result.url) {
    try {
      const exchanged = await completeAuthFromUrl(result.url);
      if (exchanged.handled) return;
    } catch (error) {
      if (error instanceof AuthFlowError) throw error;
      const mapped = toAuthFlowError(error);
      logAuthEvent(mapped.kod, `oauth:${provider}:exchange`, mapped.teknikDetay);
      throw mapped;
    }
  }
  // Deep link AuthProvider'da işleniyor olabilir; hemen iptal deme.
  for (let i = 0; i < 8; i += 1) {
    const { data: after } = await supabase.auth.getSession();
    if (after.session) return;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  if (result.type !== 'success') {
    throw new AuthFlowError({ kod: 'iptal' });
  }
  const mapped = new AuthFlowError({ kod: 'bilinmeyen' });
  logAuthEvent(mapped.kod, `oauth:${provider}:session`, 'oturum alınamadı');
  throw mapped;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [oauthHold, setOauthHold] = useState(false);
  const [recovery, setRecovery] = useState(false);

  useEffect(() => {
    let mounted = true;

    const applyUrl = async (url: string | null) => {
      if (!url || !looksLikeAuthCallback(url)) return;
      try {
        const result = await completeAuthFromUrl(url);
        if (mounted && result.recovery) setRecovery(true);
      } catch (error) {
        const mapped = toAuthFlowError(error);
        logAuthEvent(mapped.kod, 'authCallback', mapped.teknikDetay);
      }
    };

    void (async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        const fromOAuth = Boolean(initialUrl && looksLikeAuthCallback(initialUrl));
        if (fromOAuth && initialUrl) {
          await applyUrl(initialUrl);
        }
        const attempts = fromOAuth ? 10 : 1;
        let next: Session | null = null;
        for (let i = 0; i < attempts; i += 1) {
          const { data } = await withTimeout(
            supabase.auth.getSession(),
            SESSION_BOOT_MS,
            'session_timeout',
          );
          next = data.session;
          if (next) break;
          if (fromOAuth) {
            await new Promise((resolve) => setTimeout(resolve, 200));
          }
        }
        if (mounted) {
          // OAuth deep link SIGNED_IN olmuşken geç gelen null boot sonucu
          // oturumu ezmesin — Google sonrası giriş ekranına düşüren yarış.
          setSession((current) => next ?? current);
        }
      } catch (error) {
        console.warn('Oturum okunamadı', error);
        // Timeout'ta session'ı silme — OAuth/onAuthStateChange gelmiş olabilir.
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession((current) => {
        // INITIAL_SESSION depo henüz yazılmadan null gelebilir; OAuth
        // SIGNED_IN'i ezmek Google sonrası giriş ekranına düşürür.
        if (event === 'INITIAL_SESSION' && !nextSession && current) {
          return current;
        }
        return nextSession;
      });
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

  // Custom Tab dönüşünde depo yazısı gecikirse giriş ekranı bir kez
  // görünür; kısa süre sonra oturumu tekrar oku — kapat-aç gerekmesin.
  useEffect(() => {
    if (loading || session) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      void supabase.auth.getSession().then(({ data }) => {
        if (!cancelled && data.session) {
          setSession(data.session);
        }
      });
    }, 700);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [loading, session]);

  useEffect(() => {
    if (session) setOauthHold(false);
  }, [session]);

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
    if (error) {
      const mapped = toAuthFlowError(error);
      logAuthEvent(mapped.kod, 'signInWithEmail', mapped.teknikDetay);
      throw mapped;
    }
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    const redirectTo = getAuthRedirectUri();
    const { data, error } = await supabase.auth.signUp({
      email: normalizeEmail(email),
      password,
      options: { emailRedirectTo: redirectTo },
    });
    if (error) {
      const mapped = toAuthFlowError(error);
      logAuthEvent(mapped.kod, 'signUpWithEmail', mapped.teknikDetay);
      throw mapped;
    }
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
      if (error) {
        const mapped = toAuthFlowError(error);
        logAuthEvent(mapped.kod, 'resendSignup', mapped.teknikDetay);
        throw mapped;
      }
      return;
    }
    // Şifre unuttum: e-posta OTP (şablon {{ .Token }}, 6 veya 8 hane).
    // Magic-link yedek değil — kapalı testte deep link kırılıyordu.
    const { error } = await supabase.auth.signInWithOtp({
      email: normalized,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: redirectTo,
      },
    });
    if (error) {
      const mapped = toAuthFlowError(error);
      logAuthEvent(mapped.kod, 'sendEmailOtp', mapped.teknikDetay);
      throw mapped;
    }
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
      const mapped = toAuthFlowError(lastError);
      logAuthEvent(mapped.kod, 'verifyEmailOtp', mapped.teknikDetay);
      throw mapped;
    },
    [],
  );

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      const mapped = toAuthFlowError(error);
      logAuthEvent(mapped.kod, 'updatePassword', mapped.teknikDetay);
      throw mapped;
    }
    setRecovery(false);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setOauthHold(true);
    try {
      await openOAuth('google');
    } catch (error) {
      setOauthHold(false);
      throw error;
    }
  }, []);

  const signInWithApple = useCallback(async () => {
    setOauthHold(true);
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
        throw new Error('Apple kimlik belirteci alınamadı.');
      }
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });
      if (error) {
        const mapped = toAuthFlowError(error);
        logAuthEvent(mapped.kod, 'signInWithApple', mapped.teknikDetay);
        throw mapped;
      }
    } catch (error) {
      setOauthHold(false);
      throw error;
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
      loading: loading || oauthHold,
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
      oauthHold,
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

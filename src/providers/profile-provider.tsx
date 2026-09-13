import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { getProfile, UserProfile } from '@/lib/api';
import { siniflaHata, type UygulamaHatasi } from '@/lib/app-error';
import { bildirHata } from '@/lib/error-report';
import { readCachedProfile, writeCachedProfile } from '@/lib/boot-cache';
import { useI18n } from '@/providers/locale-provider';

type ProfileContextValue = {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  /** Sınıflanmış hata — varsa ekranda `hataMesaji(hata, t)` gösterilir. */
  hata: UygulamaHatasi | null;
  /** Sunucuya ulaşılamadı; önbellek / çevrimdışı görünüm. */
  offline: boolean;
  refresh: () => Promise<void>;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: PropsWithChildren) {
  const { t } = useI18n();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hata, setHata] = useState<UygulamaHatasi | null>(null);
  const [offline, setOffline] = useState(false);
  const profileRef = useRef<UserProfile | null>(null);
  profileRef.current = profile;

  const refresh = useCallback(async (opts?: { background?: boolean }) => {
    const background = opts?.background ?? Boolean(profileRef.current);
    if (!background) {
      setLoading(true);
    }
    setError(null);
    setHata(null);
    try {
      const next = await getProfile();
      setProfile(next);
      setOffline(false);
      void writeCachedProfile(next);
    } catch {
      const cached = profileRef.current ?? (await readCachedProfile());
      if (cached) {
        setProfile(cached);
        setOffline(true);
        setError(null);
        setHata(null);
      } else {
        // Ham mesaj EKRANA gitmez — tüketici `hata` üzerinden i18n gösterir.
        const sinifli = siniflaHata(value, 'PROFIL_YUK_001');
        bildirHata(sinifli, 'profile.refresh');
        setHata(sinifli);
        setError(`${sinifli.name}:${sinifli.hataKodu}`);
        setOffline(true);
      }
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const cached = await readCachedProfile();
      if (cancelled) return;
      if (cached) {
        setProfile(cached);
        setLoading(false);
      }
      await refresh({ background: Boolean(cached) });
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const value = useMemo(
    () => ({ profile, loading, error, hata, offline, refresh: () => refresh() }),
    [error, hata, loading, offline, profile, refresh],
  );
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const value = useContext(ProfileContext);
  if (!value) throw new Error('useProfile, ProfileProvider içinde kullanılmalı.');
  return value;
}

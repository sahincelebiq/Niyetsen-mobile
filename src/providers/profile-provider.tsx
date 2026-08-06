import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { getProfile, UserProfile } from '@/lib/api';
import { readCachedProfile, writeCachedProfile } from '@/lib/boot-cache';

type ProfileContextValue = {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  /** Sunucuya ulaşılamadı; önbellek / çevrimdışı görünüm. */
  offline: boolean;
  refresh: () => Promise<void>;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: PropsWithChildren) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await getProfile();
      setProfile(next);
      setOffline(false);
      void writeCachedProfile(next);
    } catch (value) {
      const cached = await readCachedProfile();
      if (cached) {
        setProfile(cached);
        setOffline(true);
        setError(null);
      } else {
        setError(value instanceof Error ? value.message : 'Profil yüklenemedi.');
        setOffline(true);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ profile, loading, error, offline, refresh }),
    [error, loading, offline, profile, refresh],
  );
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const value = useContext(ProfileContext);
  if (!value) throw new Error('useProfile, ProfileProvider içinde kullanılmalı.');
  return value;
}

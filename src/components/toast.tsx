/**
 * Toast — geçici, engellemeyen bilgi ("tamamlandı", "geri alındı").
 * Bilerek animasyonsuzdur: hareket kısıtlamasına saygı varsayılan gelir,
 * akışı kesmez, 3.5 sn sonra kendiliğinden kapanır.
 *
 * Kökte bir kez sarılır (`_layout.tsx`): `<ToastProvider>…</ToastProvider>`
 * Kullanım: `const { goster } = useToast(); goster(t.bonus.doneBody);`
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radii, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ToastTon = 'bilgi' | 'basari';

type ToastDurumu = { id: number; ileti: string; ton: ToastTon } | null;

const ToastContext = createContext<{ goster: (ileti: string, ton?: ToastTon) => void } | null>(
  null,
);

const GOSTERIM_MS = 3500;

export function ToastProvider({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const [durum, setDurum] = useState<ToastDurumu>(null);
  const zamanlayici = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goster = useCallback((ileti: string, ton: ToastTon = 'bilgi') => {
    if (zamanlayici.current) clearTimeout(zamanlayici.current);
    setDurum({ id: Date.now(), ileti, ton });
    zamanlayici.current = setTimeout(() => setDurum(null), GOSTERIM_MS);
  }, []);

  const deger = useMemo(() => ({ goster }), [goster]);

  return (
    <ToastContext.Provider value={deger}>
      <View style={styles.kok}>
        {children}
        {durum ? (
          <View pointerEvents="none" style={styles.katman}>
            <View
              key={durum.id}
              accessibilityRole="alert"
              style={[
                styles.balon,
                {
                  backgroundColor:
                    durum.ton === 'basari' ? theme.tint : theme.backgroundElement,
                  borderColor: theme.border,
                },
                Shadows.soft ?? {},
              ]}>
              <ThemedText
                type="smallBold"
                style={
                  durum.ton === 'basari' ? { color: theme.onAccent } : undefined
                }>
                {durum.ileti}
              </ThemedText>
            </View>
          </View>
        ) : null}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast(): { goster: (ileti: string, ton?: ToastTon) => void } {
  const deger = useContext(ToastContext);
  if (!deger) throw new Error('useToast, ToastProvider içinde kullanılmalı.');
  return deger;
}

const styles = StyleSheet.create({
  kok: {
    flex: 1,
  },
  katman: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 96,
    paddingHorizontal: Spacing.four,
  },
  balon: {
    maxWidth: 420,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    minHeight: 44,
    justifyContent: 'center',
  },
});

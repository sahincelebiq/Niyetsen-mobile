import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, type TextStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';

type CountUpTextProps = {
  value: number;
  style?: TextStyle | TextStyle[];
  /** Binlik ayraç (puan toplamı gibi büyük sayılarda). */
  grouped?: boolean;
  suffix?: string;
};

/**
 * Sayı akışı: değer 0'dan hedefe yumuşakça sayılır (zincir günü, toplam puan).
 *
 * TASARIM KARARI (26 Tem 2026 — çökme sonrası):
 * Bu bileşen BİLİNÇLİ olarak Reanimated KULLANMAZ. Önceki sürüm `withTiming`
 * + `Easing` ile yazılmıştı; `Easing` yanlış paketten (react-native) import
 * edildiği için worklet olmayan bir fonksiyon animasyona geçti ve uygulama
 * "Render Error: The easing function is not a worklet" ile ÇÖKTÜ.
 * Sayı gösterimi zaten JS tarafında yapıldığından (runOnJS) worklet'in hiçbir
 * faydası yoktu — yalnız risk ekliyordu. Saf JS + requestAnimationFrame ile
 * aynı görsel sonuç, SIFIR worklet riski elde edilir.
 *
 * Erişilebilirlik: sistemde "hareketi azalt" açıksa animasyon atlanır.
 */
export function CountUpText({ value, style, grouped = false, suffix = '' }: CountUpTextProps) {
  const [display, setDisplay] = useState(value);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const animate = (reduceMotion: boolean) => {
      if (cancelled) return;
      if (reduceMotion || value <= 0) {
        setDisplay(value);
        return;
      }
      const duration = Math.min(420 + value * 8, 1100);
      const start = Date.now();
      setDisplay(0);

      const tick = () => {
        if (cancelled) return;
        const elapsed = Date.now() - start;
        const t = Math.min(elapsed / duration, 1);
        // easeOutCubic — dışa bağımlılık yok, worklet yok.
        const eased = 1 - Math.pow(1 - t, 3);
        setDisplay(Math.round(value * eased));
        if (t < 1) {
          frameRef.current = requestAnimationFrame(tick);
        }
      };
      frameRef.current = requestAnimationFrame(tick);
    };

    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => animate(enabled))
      .catch(() => animate(false)); // sorgu başarısızsa animasyonlu devam

    return () => {
      cancelled = true;
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [value]);

  const text = grouped ? display.toLocaleString('tr-TR') : String(display);
  return <ThemedText style={style}>{`${text}${suffix}`}</ThemedText>;
}

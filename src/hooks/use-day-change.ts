/**
 * Gün sınırı dinleyicileri (03-Bugün, madde B).
 *
 * - useDayChange: gece yarısı geçişinde VE uygulama ön plana dönünce gün
 *   değiştiyse tetiklenir. Ekranlar "bugün"ü böylece doğru kaydırır.
 * - useNowMinutes: "şu an" çizgisi ve geri sayım için dakikalık nabız;
 *   ön plana dönüşte anında güncellenir.
 */
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { bugunIso, geceYarisinaKalanMs, simdiDakika } from '@/lib/zaman';

export function useDayChange(onDayChange: () => void): string {
  const [today, setToday] = useState(bugunIso());
  const callbackRef = useRef(onDayChange);
  callbackRef.current = onDayChange;

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let lastDay = bugunIso();

    const check = () => {
      const now = bugunIso();
      if (now !== lastDay) {
        lastDay = now;
        setToday(now);
        callbackRef.current();
      }
    };

    const armMidnight = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        check();
        armMidnight();
      }, geceYarisinaKalanMs());
    };
    armMidnight();

    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        check();
        armMidnight();
      }
    });
    return () => {
      if (timer) clearTimeout(timer);
      sub.remove();
    };
  }, []);

  return today;
}

export function useNowMinutes(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => simdiDakika());

  useEffect(() => {
    const tick = () => setNow(simdiDakika());
    const timer = setInterval(tick, intervalMs);
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') tick();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [intervalMs]);

  return now;
}

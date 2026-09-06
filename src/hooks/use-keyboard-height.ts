import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import {
  Keyboard,
  Platform,
  type KeyboardEvent,
  type View,
} from 'react-native';

import { BottomTabInset } from '@/constants/theme';

const OPEN_PX = 40;

function subscribeKeyboard(handler: (event: KeyboardEvent) => void) {
  if (Platform.OS === 'ios') {
    return [
      Keyboard.addListener('keyboardWillChangeFrame', handler),
      Keyboard.addListener('keyboardWillHide', handler),
    ];
  }
  return [
    Keyboard.addListener('keyboardDidShow', handler),
    Keyboard.addListener('keyboardDidHide', handler),
    Keyboard.addListener('keyboardDidChangeFrame', handler),
  ];
}

export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const onEvent = (event: KeyboardEvent) => {
      const next = event.endCoordinates?.height ?? 0;
      setHeight(next > OPEN_PX ? next : 0);
    };
    const subs = subscribeKeyboard(onEvent);
    return () => subs.forEach((sub) => sub.remove());
  }, []);
  return height;
}

/**
 * NativeTabs + edge-to-edge: KeyboardAvoidingView kutuyu klavyenin altında
 * bırakıyordu (602fb22). c3e8624 yazı kutusunu ölçüp lift etti ve tab payını
 * SABİT tuttu — açıkken inset düşürmek + lift 0 = kutu klavyenin altında.
 * a61e346 inset'i tekrar düşürdü (yarış); bu hook o regresyonu geri alır.
 *
 * Android `resize` pencereyi küçültürse çakışma ~0 → lift 0 (çift kaydırma yok).
 * Ölçü başarısızsa iOS'ta klavye yüksekliği yedek lift olur.
 */
export function useKeyboardDockLift(
  dockRef: RefObject<View | null>,
  gap = 8,
): { lift: number; height: number; open: boolean; remasure: () => void } {
  const [height, setHeight] = useState(0);
  const [lift, setLift] = useState(0);
  const liftRef = useRef(0);
  liftRef.current = lift;
  const keyboardTopRef = useRef(0);
  const keyboardHeightRef = useRef(0);
  const didMeasureRef = useRef(false);

  const applyFromMeasure = useCallback(
    (keyboardTop: number, open: boolean) => {
      if (!open) {
        didMeasureRef.current = false;
        setLift(0);
        return;
      }
      const node = dockRef.current;
      if (!node || typeof node.measureInWindow !== 'function') {
        return;
      }
      node.measureInWindow((_x, y, _w, h) => {
        const measuredBottom = y + h;
        if (measuredBottom <= 1) return;
        didMeasureRef.current = true;
        const restBottom = measuredBottom + liftRef.current;
        const next = Math.max(0, Math.round(restBottom + gap - keyboardTop));
        if (next !== liftRef.current) {
          setLift(next);
        }
      });
    },
    [dockRef, gap],
  );

  const remasure = useCallback(() => {
    if (keyboardTopRef.current <= 0) return;
    applyFromMeasure(keyboardTopRef.current, true);
  }, [applyFromMeasure]);

  const applyEvent = useCallback(
    (event: KeyboardEvent) => {
      const nextHeight = event.endCoordinates?.height ?? 0;
      const keyboardTop = event.endCoordinates?.screenY ?? 0;
      const open = nextHeight > OPEN_PX;
      setHeight(open ? nextHeight : 0);
      keyboardTopRef.current = keyboardTop;
      keyboardHeightRef.current = open ? nextHeight : 0;
      if (!open) {
        didMeasureRef.current = false;
        setLift(0);
        return;
      }
      applyFromMeasure(keyboardTop, true);
    },
    [applyFromMeasure],
  );

  useEffect(() => {
    const subs = subscribeKeyboard(applyEvent);
    return () => subs.forEach((sub) => sub.remove());
  }, [applyEvent]);

  // İlk karede ölçü 0 dönebilir; klavye animasyonu bitene kadar birkaç kez dene.
  useEffect(() => {
    if (height <= OPEN_PX) return;
    let frames = 0;
    let frameId = 0;
    const tick = () => {
      applyFromMeasure(keyboardTopRef.current, true);
      frames += 1;
      if (frames < 5) {
        frameId = requestAnimationFrame(tick);
      }
    };
    frameId = requestAnimationFrame(tick);
    const timer = setTimeout(() => {
      applyFromMeasure(keyboardTopRef.current, true);
      // Ölçü hiç gelmezse (ilk karede 0) iOS overlay kutuyu yine yutar.
      if (
        Platform.OS === 'ios' &&
        !didMeasureRef.current &&
        keyboardHeightRef.current > OPEN_PX
      ) {
        setLift(
          Math.max(0, Math.round(keyboardHeightRef.current - BottomTabInset + gap)),
        );
      }
    }, 180);
    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(timer);
    };
  }, [applyFromMeasure, gap, height]);

  return { lift, height, open: height > 0, remasure };
}

/** @deprecated useKeyboardDockLift — eski pencere-küçülme tahmini. */
export function useKeyboardInset(): { height: number; lift: number } {
  const height = useKeyboardHeight();
  return { height, lift: 0 };
}

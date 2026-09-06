import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import {
  Dimensions,
  Keyboard,
  Platform,
  type KeyboardEvent,
  type View,
} from 'react-native';

import {
  KEYBOARD_GAP_PX,
  KEYBOARD_OPEN_PX,
  isKeyboardOverlaying,
  resolveKeyboardLift,
} from '@/lib/keyboard-geometry';

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

function windowHeight(): number {
  return Dimensions.get('window').height;
}

export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const onEvent = (event: KeyboardEvent) => {
      const next = event.endCoordinates?.height ?? 0;
      setHeight(next > KEYBOARD_OPEN_PX ? next : 0);
    };
    const subs = subscribeKeyboard(onEvent);
    return () => subs.forEach((sub) => sub.remove());
  }, []);
  return height;
}

/**
 * NativeTabs + edge-to-edge'de KeyboardAvoidingView kutuyu klavyenin altında
 * bırakıyordu. Yazı kutusunu ekranda ölç; overlay ise lift et.
 *
 * Pencere Android'de zaten küçüldüyse overlay=false → lift 0 (çift kaydırma yok).
 * measureInWindow 0/geç dönerse klavye yüksekliği yedek — yazı kutusu gömülmesin.
 */
export function useKeyboardDockLift(
  dockRef: RefObject<View | null>,
  gap = KEYBOARD_GAP_PX,
): { lift: number; height: number; open: boolean; overlaying: boolean } {
  const [height, setHeight] = useState(0);
  const [lift, setLift] = useState(0);
  const [overlaying, setOverlaying] = useState(false);
  const liftRef = useRef(0);
  liftRef.current = lift;
  const keyboardTopRef = useRef(0);
  const keyboardHeightRef = useRef(0);

  const applyFromMeasure = useCallback(
    (keyboardTop: number, keyboardHeight: number) => {
      const open = keyboardHeight > KEYBOARD_OPEN_PX;
      const overlay = open && isKeyboardOverlaying(keyboardTop, windowHeight());
      setOverlaying(overlay);
      if (!open) {
        setLift(0);
        return;
      }
      const node = dockRef.current;
      const finish = (measuredRestBottom: number | null) => {
        setLift(
          resolveKeyboardLift({
            open,
            overlaying: overlay,
            keyboardHeight,
            keyboardTop,
            measuredRestBottom,
            gap,
          }),
        );
      };
      if (!node || typeof node.measureInWindow !== 'function') {
        finish(null);
        return;
      }
      node.measureInWindow((_x, y, _w, h) => {
        const measuredBottom = y + h;
        if (measuredBottom <= 1) {
          finish(null);
          return;
        }
        finish(measuredBottom + liftRef.current);
      });
    },
    [dockRef, gap],
  );

  const applyEvent = useCallback(
    (event: KeyboardEvent) => {
      const nextHeight = event.endCoordinates?.height ?? 0;
      const keyboardTop = event.endCoordinates?.screenY ?? 0;
      const open = nextHeight > KEYBOARD_OPEN_PX;
      setHeight(open ? nextHeight : 0);
      keyboardTopRef.current = keyboardTop;
      keyboardHeightRef.current = open ? nextHeight : 0;
      if (!open) {
        setOverlaying(false);
        setLift(0);
        return;
      }
      applyFromMeasure(keyboardTop, nextHeight);
    },
    [applyFromMeasure],
  );

  useEffect(() => {
    const subs = subscribeKeyboard(applyEvent);
    return () => subs.forEach((sub) => sub.remove());
  }, [applyEvent]);

  // Composer padding / pencere resize bir kare sonra netleşir — yeniden ölç.
  useEffect(() => {
    if (height <= KEYBOARD_OPEN_PX) return;
    const timer = setTimeout(() => {
      applyFromMeasure(keyboardTopRef.current, keyboardHeightRef.current);
    }, 48);
    return () => clearTimeout(timer);
  }, [applyFromMeasure, height]);

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', () => {
      if (keyboardHeightRef.current <= KEYBOARD_OPEN_PX) return;
      applyFromMeasure(keyboardTopRef.current, keyboardHeightRef.current);
    });
    return () => sub.remove();
  }, [applyFromMeasure]);

  return { lift, height, open: height > 0, overlaying };
}

/** Overlay klavye için yedek inset — ölçüm yoksa (profil formu) kullanılır. */
export function useOverlayKeyboardInset(gap = KEYBOARD_GAP_PX): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const apply = (event: KeyboardEvent) => {
      const nextHeight = event.endCoordinates?.height ?? 0;
      const keyboardTop = event.endCoordinates?.screenY ?? 0;
      const open = nextHeight > KEYBOARD_OPEN_PX;
      const overlay = open && isKeyboardOverlaying(keyboardTop, windowHeight());
      setInset(
        resolveKeyboardLift({
          open,
          overlaying: overlay,
          keyboardHeight: nextHeight,
          keyboardTop,
          measuredRestBottom: null,
          gap,
        }),
      );
    };
    const subs = subscribeKeyboard(apply);
    const dim = Dimensions.addEventListener('change', () => {
      const metrics = Keyboard.metrics();
      if (!metrics) {
        setInset(0);
        return;
      }
      apply({ endCoordinates: metrics } as KeyboardEvent);
    });
    return () => {
      subs.forEach((sub) => sub.remove());
      dim.remove();
    };
  }, [gap]);

  return inset;
}

/** @deprecated useKeyboardDockLift — eski pencere-küçülme tahmini. */
export function useKeyboardInset(): { height: number; lift: number } {
  const height = useKeyboardHeight();
  return { height, lift: 0 };
}

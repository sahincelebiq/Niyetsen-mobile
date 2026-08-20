import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import {
  Keyboard,
  Platform,
  type KeyboardEvent,
  type View,
} from 'react-native';

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
 * NativeTabs + edge-to-edge'de KeyboardAvoidingView / "pencere küçüldü mü"
 * tahmini kutucuğu klavyenin altında bırakıyordu.
 *
 * Yazı kutusunu ekranda ölç, klavye üstüyle çakışan pikseli lift et.
 * Pencere zaten küçüldüyse çakışma ~0 → lift 0 (çift kaydırma yok).
 */
export function useKeyboardDockLift(
  dockRef: RefObject<View | null>,
  gap = 8,
): { lift: number; height: number; open: boolean } {
  const [height, setHeight] = useState(0);
  const [lift, setLift] = useState(0);
  const restBottomRef = useRef(0);
  const liftRef = useRef(0);
  liftRef.current = lift;

  const applyEvent = useCallback(
    (event: KeyboardEvent) => {
      const nextHeight = event.endCoordinates?.height ?? 0;
      const keyboardTop = event.endCoordinates?.screenY ?? 0;
      const open = nextHeight > OPEN_PX;
      setHeight(open ? nextHeight : 0);
      if (!open) {
        restBottomRef.current = 0;
        setLift(0);
        return;
      }

      const fromStoredRest = () => {
        const rest = restBottomRef.current;
        if (rest <= 0) return;
        setLift(Math.max(0, Math.round(rest + gap - keyboardTop)));
      };

      if (liftRef.current > 0) {
        fromStoredRest();
        return;
      }

      const node = dockRef.current;
      if (!node || typeof node.measureInWindow !== 'function') {
        fromStoredRest();
        return;
      }

      node.measureInWindow((_x, y, _w, h) => {
        const bottom = y + h;
        if (bottom > 1) restBottomRef.current = bottom;
        setLift(Math.max(0, Math.round(bottom + gap - keyboardTop)));
      });
    },
    [dockRef, gap],
  );

  useEffect(() => {
    const subs = subscribeKeyboard(applyEvent);
    return () => subs.forEach((sub) => sub.remove());
  }, [applyEvent]);

  return { lift, height, open: height > 0 };
}

/** @deprecated useKeyboardDockLift — eski pencere-küçülme tahmini. */
export function useKeyboardInset(): { height: number; lift: number } {
  const height = useKeyboardHeight();
  return { height, lift: 0 };
}

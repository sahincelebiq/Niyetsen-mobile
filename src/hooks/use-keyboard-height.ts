import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import {
  Dimensions,
  Keyboard,
  Platform,
  type KeyboardEvent,
  type View,
} from 'react-native';

import {
  KEYBOARD_FIT_SLACK_PX,
  KEYBOARD_GAP_PX,
  normalizeKeyboardFrame,
  resolveKeyboardLift,
} from '@/lib/keyboard-geometry';

/** app.json android.softwareKeyboardLayoutMode = resize. pan lift'i 0 bırakıp yazı kutusunu klavyenin altında bırakıyordu. */
const PLATFORM_RESIZES = Platform.OS === 'android';
/**
 * Android'de root'un küçülmesi (edge-to-edge IME padding → Yoga relayout)
 * keyboardDidShow'dan bir-iki kare sonra biter; ölçümü yeniden al.
 * Kap ölçümü lift'ten etkilenmediği için tekrar ölçüm salınım yaratmaz.
 */
const REMEASURE_DELAYS_MS = [48, 160, 400] as const;

export type KeyboardLiftState = {
  /** Kaba uygulanacak paddingBottom. */
  lift: number;
  /** Klavye yüksekliği (kapalıysa 0). */
  height: number;
  open: boolean;
  /** Klavye yazı kutusunu örtüyor ve lift ile telafi ediliyor (overlay). */
  covering: boolean;
};

export const KEYBOARD_CLOSED: KeyboardLiftState = {
  lift: 0,
  height: 0,
  open: false,
  covering: false,
};

type KeyboardFrame = { top: number; height: number; open: boolean };
const NO_KEYBOARD: KeyboardFrame = { top: 0, height: 0, open: false };

function frameFromEvent(event: KeyboardEvent): KeyboardFrame {
  const platform =
    Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'other';
  return normalizeKeyboardFrame(
    event.endCoordinates?.height ?? 0,
    event.endCoordinates?.screenY ?? 0,
    Dimensions.get('screen').height,
    platform,
  );
}

export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const onFrame = (event: KeyboardEvent) => setHeight(frameFromEvent(event).height);
    const onHide = () => setHeight(0);
    const subs =
      Platform.OS === 'ios'
        ? [
            Keyboard.addListener('keyboardWillChangeFrame', onFrame),
            Keyboard.addListener('keyboardWillHide', onHide),
          ]
        : [
            Keyboard.addListener('keyboardDidShow', onFrame),
            Keyboard.addListener('keyboardDidHide', onHide),
          ];
    return () => subs.forEach((sub) => sub.remove());
  }, []);
  return height;
}

/**
 * NativeTabs + edge-to-edge için tek klavye telafisi.
 *
 * containerRef: KeyboardAwareView'in dış kabı (yalnız flex:1; padding iç
 * Animated.View'e uygulanır). Kabın dibi lift'ten etkilenmez → her ölçüm
 * bağımsızdır, "uygulanan lift'i geri ekle" düzeltmesi ve yarış hatası yok.
 *
 * - Android adjustResize root'u küçülttüyse kap dibi ≈ klavye üstü → lift 0.
 * - iOS / resize olmayan pencere: kap dibi klavyenin altında → lift = örtüşme + gap.
 * - Kabın onLayout'unu bağla: root küçülünce anında yeniden ölçülür.
 */
export function useKeyboardLift(
  containerRef: RefObject<View | null>,
  opts: { gap?: number; bottomInset?: number } = {},
): KeyboardLiftState & { onLayout: () => void } {
  const gap = opts.gap ?? KEYBOARD_GAP_PX;
  const bottomInset = opts.bottomInset ?? 0;
  const [state, setState] = useState<KeyboardLiftState>(KEYBOARD_CLOSED);
  const frameRef = useRef<KeyboardFrame>(NO_KEYBOARD);
  const restingBottomRef = useRef<number | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const measureTokenRef = useRef(0);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current = [];
  }, []);

  const measureAndApply = useCallback((allowUnconfirmed: boolean) => {
    const token = ++measureTokenRef.current;
    const startedOpen = frameRef.current.open;
    const finish = (containerBottom: number | null) => {
      if (token !== measureTokenRef.current) return;
      const frame = frameRef.current;
      if (!frame.open) {
        // Kapanış karesi hâlâ küçülmüş kabı görebilir; daha büyük (kapalı)
        // dibi ezmesin. Dönüş boyutu Dimensions change'de sıfırlanır.
        if (!startedOpen && containerBottom != null && containerBottom > 1) {
          const previous = restingBottomRef.current;
          if (previous == null || containerBottom + KEYBOARD_FIT_SLACK_PX >= previous) {
            restingBottomRef.current = containerBottom;
          }
        }
        setState(KEYBOARD_CLOSED);
        return;
      }
      const lift = resolveKeyboardLift({
        keyboardHeight: frame.height,
        keyboardTop: frame.top,
        containerBottom,
        restingBottom: restingBottomRef.current,
        bottomInset,
        gap,
        platformResizes: PLATFORM_RESIZES,
        screenHeight: Dimensions.get('screen').height,
      });
      // Android didShow, adjustResize bitmeden ölçülür. O anki pozitif lift
      // yayınlanırsa pencere küçülünce geri iner — sheet zıplar, çift kayar.
      // Sıfır lift hemen uygulanır; pozitif lift layout veya gecikmeli ölçü ister.
      if (PLATFORM_RESIZES && !allowUnconfirmed && lift > 0) return;
      setState((prev) =>
        prev.open && prev.lift === lift && prev.height === frame.height
          ? prev
          : { lift, height: frame.height, open: true, covering: lift > 0 },
      );
    };
    const node = containerRef.current;
    if (!node || typeof node.measureInWindow !== 'function') {
      finish(null);
      return;
    }
    node.measureInWindow((_x, y, _w, h) => {
      finish(h > 0 ? y + h : null);
    });
  }, [bottomInset, containerRef, gap]);

  const schedule = useCallback(() => {
    clearTimers();
    measureAndApply(false);
    for (const delay of REMEASURE_DELAYS_MS) {
      timersRef.current.push(setTimeout(() => measureAndApply(true), delay));
    }
  }, [clearTimers, measureAndApply]);

  useEffect(() => {
    const onFrame = (event: KeyboardEvent) => {
      const next = frameFromEvent(event);
      const prev = frameRef.current;
      if (prev.open === next.open && prev.top === next.top && prev.height === next.height) {
        return;
      }
      frameRef.current = next;
      schedule();
    };
    const onHide = () => {
      frameRef.current = NO_KEYBOARD;
      measureTokenRef.current += 1;
      clearTimers();
      setState(KEYBOARD_CLOSED);
    };
    const subs =
      Platform.OS === 'ios'
        ? [
            Keyboard.addListener('keyboardWillChangeFrame', onFrame),
            Keyboard.addListener('keyboardWillHide', onHide),
          ]
        : [
            Keyboard.addListener('keyboardDidShow', onFrame),
            Keyboard.addListener('keyboardDidChangeFrame', onFrame),
            Keyboard.addListener('keyboardDidHide', onHide),
          ];
    const dim = Dimensions.addEventListener('change', () => {
      restingBottomRef.current = null;
      if (frameRef.current.open) schedule();
    });
    return () => {
      subs.forEach((sub) => sub.remove());
      dim.remove();
      clearTimers();
    };
  }, [clearTimers, schedule]);

  const onLayout = useCallback(() => {
    // Dış kabın layout'u pencere boyudur (padding içtedir). Android'de bu,
    // didShow'dan önce gelen tahmin değil, resize'ın kendisidir.
    measureAndApply(true);
  }, [measureAndApply]);

  return { ...state, onLayout };
}

/** @deprecated useKeyboardLift(containerRef) — eski pencere-küçülme tahmini. */
export function useKeyboardInset(): { height: number; lift: number } {
  const height = useKeyboardHeight();
  return { height, lift: 0 };
}

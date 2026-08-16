import { useEffect, useRef, useState } from 'react';
import { Dimensions, Keyboard, Platform, type KeyboardEvent } from 'react-native';

/**
 * Klavye yüksekliği + pencere gerçekten küçüldü mü.
 * Android NativeTabs'te adjustResize bazen no-op; o zaman JS lift gerekir.
 * Pencere zaten küçüldüyse lift EKLEME — yoksa sohbet iki kez kayar, yazı kaybolur.
 */
export function useKeyboardHeight(): number {
  return useKeyboardInset().height;
}

export function useKeyboardInset(): { height: number; lift: number } {
  const [height, setHeight] = useState(0);
  const [windowShrunk, setWindowShrunk] = useState(false);
  const baseHeight = useRef(Dimensions.get('window').height);

  useEffect(() => {
    const onShow = (event: KeyboardEvent) => {
      const next = event.endCoordinates.height;
      setHeight(next);
      const current = Dimensions.get('window').height;
      setWindowShrunk(current < baseHeight.current - 64);
    };
    const onHide = () => {
      setHeight(0);
      setWindowShrunk(false);
    };

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const lift = height > 0 && !windowShrunk ? height : 0;
  return { height, lift };
}

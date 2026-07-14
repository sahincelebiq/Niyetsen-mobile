import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomTabInset, Spacing } from '@/constants/theme';

/** Scrollable ekranlar için üst/alt güvenli alan + tab bar payı. */
export function useScreenInsets(extraBottom = Spacing.three) {
  const insets = useSafeAreaInsets();
  return {
    top: insets.top,
    left: insets.left,
    right: insets.right,
    bottom: insets.bottom + BottomTabInset + extraBottom,
    safeBottom: insets.bottom,
    tabBar: BottomTabInset,
  };
}

/**
 * Web'de Alert.alert çoğu zaman sessiz kalır. Native'de Alert; web'de
 * window.confirm / alert fallback — paywall ve onay akışları görünür kalsın.
 */
import { Alert, Platform } from 'react-native';

type ConfirmButtons = {
  cancelLabel?: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel?: () => void;
};

export function showConfirm(
  title: string,
  message: string,
  { cancelLabel = 'Vazgeç', confirmLabel, onConfirm, onCancel }: ConfirmButtons,
): void {
  if (Platform.OS === 'web') {
    const ok =
      typeof window !== 'undefined' &&
      window.confirm(`${title}\n\n${message}`);
    if (ok) onConfirm();
    else onCancel?.();
    return;
  }
  Alert.alert(title, message, [
    { text: cancelLabel, style: 'cancel', onPress: onCancel },
    { text: confirmLabel, onPress: onConfirm },
  ]);
}

export function showAlert(title: string, message?: string): void {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.alert(message ? `${title}\n\n${message}` : title);
    }
    return;
  }
  Alert.alert(title, message);
}

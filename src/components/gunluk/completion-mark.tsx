import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

type MarkState = 'pending' | 'done' | 'missed';

type CompletionMarkProps = {
  state: MarkState;
  label: string;
  busy?: boolean;
  onPress?: () => void;
  /** Üst satır zaten checkbox ise iç daire ekran okuyucuya tekrar okunmasın. */
  decorative?: boolean;
};

/** 44pt halka: bekleyen boş daire, biten dolu onay, kaçan kapalı daire. */
export function CompletionMark({ state, label, busy, onPress, decorative }: CompletionMarkProps) {
  const theme = useTheme();
  const color =
    state === 'done' ? theme.success : state === 'missed' ? theme.textSecondary : theme.tint;
  const name =
    state === 'done'
      ? 'checkbox-marked-circle'
      : state === 'missed'
        ? 'close-circle-outline'
        : 'checkbox-blank-circle-outline';
  const icon = busy ? (
    <ActivityIndicator color={theme.tint} />
  ) : (
    <MaterialCommunityIcons name={name} size={26} color={color} />
  );
  if (decorative) {
    return (
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.hit}>
        {icon}
      </View>
    );
  }
  if (!onPress) {
    return (
      <View
        accessibilityRole="image"
        accessibilityLabel={label}
        style={styles.hit}>
        {icon}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: state === 'done', disabled: !!busy }}
      disabled={busy}
      hitSlop={4}
      onPress={onPress}
      style={styles.hit}>
      {icon}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

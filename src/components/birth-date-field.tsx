import { StyleSheet, TextInput } from 'react-native';

import { Fonts, Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatBirthDateInput } from '@/lib/birth-date';
import { useI18n } from '@/providers/locale-provider';

type BirthDateFieldProps = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  accessibilityLabel?: string;
};

export function BirthDateField({
  value,
  onChangeText,
  placeholder,
  accessibilityLabel,
}: BirthDateFieldProps) {
  const theme = useTheme();
  const { t } = useI18n();
  const shownPlaceholder = placeholder ?? t.onboarding.birthPlaceholder;
  const label = accessibilityLabel ?? t.onboarding.birthTitle;

  return (
    <TextInput
      value={value}
      onChangeText={(text) => onChangeText(formatBirthDateInput(text))}
      placeholder={shownPlaceholder}
      placeholderTextColor={theme.textSecondary}
      accessibilityLabel={label}
      keyboardType="number-pad"
      inputMode="numeric"
      maxLength={10}
      style={[
        styles.input,
        {
          borderColor: theme.border,
          color: theme.text,
          backgroundColor: theme.surfaceMuted,
          fontFamily: Fonts.sans,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: Radii.medium,
    paddingHorizontal: Spacing.three,
    // Gövde ile aynı ölçek — ThemedText `default` (16).
    fontSize: 16,
  },
});

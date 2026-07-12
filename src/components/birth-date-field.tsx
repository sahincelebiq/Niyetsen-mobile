import { StyleSheet, TextInput } from 'react-native';

import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatBirthDateInput } from '@/lib/birth-date';

type BirthDateFieldProps = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
};

export function BirthDateField({
  value,
  onChangeText,
  placeholder = '10.04.1995',
}: BirthDateFieldProps) {
  const theme = useTheme();

  return (
    <TextInput
      value={value}
      onChangeText={(text) => onChangeText(formatBirthDateInput(text))}
      placeholder={placeholder}
      placeholderTextColor={theme.textSecondary}
      keyboardType="number-pad"
      maxLength={10}
      style={[
        styles.input,
        {
          borderColor: theme.border,
          color: theme.text,
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
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
});

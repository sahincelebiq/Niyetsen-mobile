import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ComposerPopover } from '@/components/composer-popover';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useLocale } from '@/providers/locale-provider';

type ChatAttachMenuProps = {
  onClose: () => void;
  /** Fotoğraf seçici (kanıt / görsel ek). */
  onPickImage: () => void;
  /** Belge seçici (PDF / DOCX). */
  onPickFile: () => void;
  /** Bonus görev ekranına gider. */
  onOpenBonus: () => void;
  attaching?: boolean;
};

type ActionRowProps = {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  hint: string;
  onPress: () => void;
  disabled?: boolean;
};

function ActionRow({ icon, label, hint, onPress, disabled }: ActionRowProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}. ${hint}`}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.row,
        {
          borderColor: theme.border,
          backgroundColor: pressed ? theme.backgroundSelected : theme.background,
        },
        disabled && styles.disabled,
      ]}>
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: theme.backgroundSelected, borderColor: theme.border },
        ]}>
        <MaterialCommunityIcons name={icon} size={20} color={theme.tint} />
      </View>
      <View style={styles.rowText}>
        <ThemedText type="smallBold">{label}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {hint}
        </ThemedText>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color={theme.textSecondary} />
    </Pressable>
  );
}

/**
 * `＋` ek eylemler sayfası — composer üstünde yükselen küçük yaprak.
 * Fotoğraf kanıtı / dosya eki / bonus görev tek çatıda; sohbet bölünmez.
 */
export function ChatAttachMenu({
  onClose,
  onPickImage,
  onPickFile,
  onOpenBonus,
  attaching = false,
}: ChatAttachMenuProps) {
  const { t } = useLocale();
  return (
    <ComposerPopover title={t.chat.attachSheet.title} onClose={onClose}>
      <ActionRow
        icon="image-outline"
        label={t.chat.attachSheet.photo}
        hint={t.chat.attachSheet.photoHint}
        onPress={onPickImage}
        disabled={attaching}
      />
      <ActionRow
        icon="file-document-outline"
        label={t.chat.attachSheet.file}
        hint={t.chat.attachSheet.fileHint}
        onPress={onPickFile}
        disabled={attaching}
      />
      <ActionRow
        icon="star-four-points-outline"
        label={t.chat.attachSheet.bonus}
        hint={t.chat.attachSheet.bonusHint}
        onPress={onOpenBonus}
      />
    </ComposerPopover>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 56,
    borderRadius: Radii.medium,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  disabled: {
    opacity: 0.5,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    gap: 1,
  },
});

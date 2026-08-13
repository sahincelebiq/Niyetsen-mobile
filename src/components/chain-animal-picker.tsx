import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { CHAIN_ANIMALS } from '@/constants/chain-animals';
import { Radii, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ChainAnimalPickerProps = {
  visible: boolean;
  onClose: () => void;
  selectedIndex: number | null;
  onSelect: (index: number | null) => void;
};

/**
 * 12 hayvan + otomatik (zincirle büyüsün). Filiz/Serçe yeniden seçilebilir.
 */
export function ChainAnimalPicker({
  visible,
  onClose,
  selectedIndex,
  onSelect,
}: ChainAnimalPickerProps) {
  const theme = useTheme();

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Hayvan panelini kapat"
        onPress={onClose}
        style={styles.backdrop}
      />
      <View
        style={[
          styles.sheet,
          Shadows.lifted ?? {},
          { backgroundColor: theme.background, borderColor: theme.border },
        ]}>
        <View style={[styles.grabber, { backgroundColor: theme.border }]} />
        <ThemedText type="screenTitle" style={styles.title}>
          Yoldaşını seç
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
          Aşama (bebek / genç / yetişkin) zincir gününe göre büyür. Hayvanı sen seçersin.
        </ThemedText>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: selectedIndex == null }}
          onPress={() => {
            onSelect(null);
            onClose();
          }}
          style={({ pressed }) => [
            styles.autoRow,
            {
              backgroundColor: theme.backgroundSelected,
              borderColor: selectedIndex == null ? theme.tint : theme.border,
              opacity: pressed ? 0.8 : 1,
            },
          ]}>
          <ThemedText type="smallBold" style={{ color: theme.tint }}>
            Zincirle büyüsün
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Serçe’den Tek Boynuz’a otomatik evrim
          </ThemedText>
        </Pressable>

        <View style={styles.grid}>
          {CHAIN_ANIMALS.map((animal) => {
            const selected = selectedIndex === animal.index;
            return (
              <Pressable
                key={animal.index}
                accessibilityRole="button"
                accessibilityLabel={animal.name}
                accessibilityState={{ selected }}
                onPress={() => {
                  onSelect(animal.index);
                  onClose();
                }}
                style={({ pressed }) => [
                  styles.cell,
                  {
                    backgroundColor: theme.backgroundElement,
                    borderColor: selected ? theme.tint : theme.border,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}>
                <MaterialCommunityIcons
                  name={animal.icon}
                  size={28}
                  color={selected ? theme.tint : theme.text}
                />
                <ThemedText
                  type="smallBold"
                  numberOfLines={1}
                  style={{ color: selected ? theme.tint : theme.text }}>
                  {animal.name}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    borderTopLeftRadius: Radii.large,
    borderTopRightRadius: Radii.large,
    borderWidth: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.five,
    gap: Spacing.two,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: Spacing.one,
  },
  title: { textAlign: 'center' },
  subtitle: { textAlign: 'center' },
  autoRow: {
    borderWidth: 1,
    borderRadius: Radii.medium,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    minHeight: 52,
    justifyContent: 'center',
    gap: 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  cell: {
    width: '31%',
    flexGrow: 1,
    minHeight: 88,
    borderWidth: 1,
    borderRadius: Radii.medium,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: Spacing.two,
  },
});

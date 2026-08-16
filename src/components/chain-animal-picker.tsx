import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import {
  CHAIN_ANIMALS,
  companionVisual,
  SPROUT_ID,
  type CompanionId,
} from '@/constants/chain-animals';
import { Radii, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ChainAnimalPickerProps = {
  visible: boolean;
  onClose: () => void;
  selectedId: CompanionId | null;
  investedFor: (id: CompanionId) => number;
  streakDays: number;
  onSelect: (id: CompanionId | null) => void;
};

export function ChainAnimalPicker({
  visible,
  onClose,
  selectedId,
  investedFor,
  streakDays,
  onSelect,
}: ChainAnimalPickerProps) {
  const theme = useTheme();

  function pick(id: CompanionId | null) {
    onSelect(id);
    onClose();
  }

  const sprout = companionVisual(SPROUT_ID, investedFor(SPROUT_ID), streakDays, 26);

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Yoldaş panelini kapat"
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
          Filiz veya 12 hayvandan biri. Bebek → olgun → erişkin, sonra Yaş 1, Yaş 2…
          Seçtiğin yoldaşın yaşı kayıtlı kalır.
        </ThemedText>

        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled">
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: selectedId == null }}
            onPress={() => pick(null)}
            style={({ pressed }) => [
              styles.autoRow,
              {
                backgroundColor: theme.backgroundSelected,
                borderColor: selectedId == null ? theme.tint : theme.border,
                opacity: pressed ? 0.8 : 1,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              },
            ]}>
            <ThemedText type="smallBold" style={{ color: theme.tint }}>
              Zincirle büyüsün
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Serçe’den Tek Boynuz’a otomatik evrim
            </ThemedText>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Filiz"
            accessibilityState={{ selected: selectedId === SPROUT_ID }}
            onPress={() => pick(SPROUT_ID)}
            style={({ pressed }) => [
              styles.sproutRow,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: selectedId === SPROUT_ID ? theme.tint : theme.border,
                opacity: pressed ? 0.8 : 1,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              },
            ]}>
            <MaterialCommunityIcons
              name={sprout.icon}
              size={28}
              color={selectedId === SPROUT_ID ? theme.tint : theme.text}
            />
            <View style={styles.sproutCopy}>
              <ThemedText
                type="smallBold"
                style={{ color: selectedId === SPROUT_ID ? theme.tint : theme.text }}>
                Filiz
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {sprout.stageLabel} · sonra {sprout.nextLabel}
              </ThemedText>
            </View>
          </Pressable>

          <View style={styles.grid}>
            {CHAIN_ANIMALS.map((animal) => {
              const selected = selectedId === animal.index;
              const visual = companionVisual(
                animal.index,
                investedFor(animal.index),
                streakDays,
                26,
              );
              return (
                <Pressable
                  key={animal.index}
                  accessibilityRole="button"
                  accessibilityLabel={`${visual.name}, ${visual.stageLabel}`}
                  accessibilityState={{ selected }}
                  onPress={() => pick(animal.index)}
                  style={({ pressed }) => [
                    styles.cell,
                    {
                      backgroundColor: theme.backgroundElement,
                      borderColor: selected ? theme.tint : theme.border,
                      opacity: pressed ? 0.8 : 1,
                      transform: [{ scale: pressed ? 0.97 : 1 }],
                    },
                  ]}>
                  <MaterialCommunityIcons
                    name={visual.icon}
                    size={visual.iconSize}
                    color={selected ? theme.tint : theme.text}
                  />
                  <ThemedText
                    type="smallBold"
                    numberOfLines={1}
                    style={{ color: selected ? theme.tint : theme.text }}>
                    {visual.name}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                    {visual.stageLabel}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
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
    maxHeight: '86%',
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
  list: { flexGrow: 0 },
  listContent: { gap: Spacing.two, paddingBottom: Spacing.two },
  autoRow: {
    borderWidth: 1,
    borderRadius: Radii.medium,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    minHeight: 52,
    justifyContent: 'center',
    gap: 2,
  },
  sproutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Radii.medium,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    minHeight: 56,
  },
  sproutCopy: { flex: 1, gap: 2 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  cell: {
    width: '31%',
    flexGrow: 1,
    minHeight: 96,
    borderWidth: 1,
    borderRadius: Radii.medium,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.one,
  },
});

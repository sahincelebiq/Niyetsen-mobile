import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Icon, Label, NativeTabs, VectorIcon } from 'expo-router/unstable-native-tabs';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';
import { useI18n } from '@/providers/locale-provider';

/**
 * Tab ikonları: SF Symbols web'de çizilmez. VectorIcon (MaterialCommunityIcons)
 * iOS / Android / web'de görünür kalır.
 */
export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = scheme === 'dark' ? Colors.dark : Colors.light;
  const { t } = useI18n();

  return (
    <NativeTabs
      backgroundColor={colors.backgroundElement}
      indicatorColor={colors.backgroundSelected}
      labelStyle={{
        default: { color: colors.tabInactive },
        selected: { color: colors.accentWarm },
      }}
      iconColor={{
        default: colors.tabInactive,
        selected: colors.accentWarm,
      }}>
      <NativeTabs.Trigger name="index">
        <Label>{t.tabs.chat}</Label>
        <Icon src={<VectorIcon family={MaterialCommunityIcons} name="chat" />} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="daily">
        <Label>{t.tabs.today}</Label>
        <Icon src={<VectorIcon family={MaterialCommunityIcons} name="check-circle" />} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="explore">
        <Label>{t.tabs.plan}</Label>
        <Icon src={<VectorIcon family={MaterialCommunityIcons} name="calendar-blank" />} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="rank">
        <Label>{t.tabs.chain}</Label>
        <Icon src={<VectorIcon family={MaterialCommunityIcons} name="link-variant" />} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings">
        <Label>{t.tabs.profile}</Label>
        <Icon src={<VectorIcon family={MaterialCommunityIcons} name="account-circle" />} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

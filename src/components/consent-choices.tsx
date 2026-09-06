import { type Href, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { LEGAL_VERSIONS, type LegalDocumentId } from '@/constants/legal';
import { LEGAL_APP_ROUTES } from '@/lib/legal-links';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/providers/locale-provider';

export type ConsentChoicesValue = {
  privacy: boolean;
  ai: boolean;
  proofPhoto: boolean;
  marketing: boolean;
  /** Uygunluk beyanı; backend’e gitmez. Özellik rızası verirken opsiyonel. */
  age18?: boolean;
};

export const EMPTY_CONSENT_CHOICES: ConsentChoicesValue = {
  privacy: false,
  ai: false,
  proofPhoto: false,
  marketing: false,
  age18: false,
};

export function ConsentChoices({
  value,
  onChange,
}: {
  value: ConsentChoicesValue;
  onChange: (value: ConsentChoicesValue) => void;
}) {
  const { t } = useI18n();

  return (
    <View style={styles.container}>
      <ConsentRow
        checked={Boolean(value.age18)}
        onChange={(checked) => onChange({ ...value, age18: checked })}
        label={t.legal.ageLabel}
        detail={t.legal.ageDetail}
        required
      />
      <ConsentRow
        checked={value.privacy}
        onChange={(checked) => onChange({ ...value, privacy: checked })}
        label={t.legal.privacyReadLabel}
        detail={t.legal.privacyReadDetail}
        required
      />
      <View style={styles.links}>
        <LegalLink documentId="privacy" label={t.legal.privacyLink} />
        <LegalLink documentId="kvkk" label={t.legal.noticeLink} />
      </View>

      <ConsentRow
        checked={value.ai}
        onChange={(checked) => onChange({ ...value, ai: checked })}
        label={t.legal.aiLabel}
        detail={t.legal.aiDetail}
      />

      <ConsentRow
        checked={value.proofPhoto}
        onChange={(checked) => onChange({ ...value, proofPhoto: checked })}
        label={t.legal.photoLabel}
        detail={t.legal.photoDetail}
      />

      <ConsentRow
        checked={value.marketing}
        onChange={(checked) => onChange({ ...value, marketing: checked })}
        label={t.legal.marketingLabel}
        detail={t.legal.marketingDetail}
      />

      <View style={styles.links}>
        <LegalLink documentId="consent" label={t.legal.consentLink} />
        <LegalLink documentId="terms" label={t.legal.termsLink} />
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {t.legal.versionLine(LEGAL_VERSIONS.privacyPolicy)}
      </ThemedText>
    </View>
  );
}

function ConsentRow({
  checked,
  onChange,
  label,
  detail,
  required = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  detail: string;
  required?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={() => onChange(!checked)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View
        style={[
          styles.checkbox,
          {
            borderColor: theme.tint,
            backgroundColor: checked ? theme.tint : 'transparent',
          },
        ]}>
        {checked && <ThemedText style={{ color: theme.background }}>✓</ThemedText>}
      </View>
      <View style={styles.copy}>
        <ThemedText type="smallBold">
          {label} {required && <ThemedText themeColor="danger">*</ThemedText>}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {detail}
        </ThemedText>
      </View>
    </Pressable>
  );
}

function LegalLink({
  documentId,
  label,
}: {
  documentId: LegalDocumentId;
  label: string;
}) {
  const { t } = useI18n();
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={t.legal.openDocument(label)}
      hitSlop={8}
      onPress={() => router.push(LEGAL_APP_ROUTES[documentId] as Href)}
      style={({ pressed }) => pressed && styles.pressed}>
      <ThemedText type="smallBold" themeColor="tint">
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.three },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  checkbox: {
    width: 28,
    height: 28,
    borderWidth: 2,
    borderRadius: Radii.small,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, gap: Spacing.one },
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  pressed: { opacity: 0.7 },
});

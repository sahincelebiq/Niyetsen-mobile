import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { LegalDocumentScreen } from '@/components/legal-document-screen';
import { ThemedText } from '@/components/themed-text';
import { LEGAL_VERSIONS, type LegalDocumentId } from '@/constants/legal';
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
  const [openDoc, setOpenDoc] = useState<LegalDocumentId | null>(null);

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
        <LegalLink documentId="privacy" label={t.legal.privacyLink} onOpen={setOpenDoc} />
        <LegalLink documentId="kvkk" label={t.legal.noticeLink} onOpen={setOpenDoc} />
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
        <LegalLink documentId="consent" label={t.legal.consentLink} onOpen={setOpenDoc} />
        <LegalLink documentId="terms" label={t.legal.termsLink} onOpen={setOpenDoc} />
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {t.legal.versionLine(LEGAL_VERSIONS.privacyPolicy)}
      </ThemedText>

      <Modal
        visible={openDoc !== null}
        animationType="slide"
        onRequestClose={() => setOpenDoc(null)}>
        {openDoc ? (
          <LegalDocumentScreen documentId={openDoc} onClose={() => setOpenDoc(null)} />
        ) : null}
      </Modal>
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
  onOpen,
}: {
  documentId: LegalDocumentId;
  label: string;
  onOpen: (id: LegalDocumentId) => void;
}) {
  const { t } = useI18n();
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={t.legal.openDocument(label)}
      hitSlop={8}
      onPress={() => onOpen(documentId)}
      style={({ pressed }) => pressed && styles.pressed}>
      <ThemedText type="smallBold" themeColor="tint">
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.four },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    minHeight: 44,
  },
  checkbox: {
    width: 24,
    height: 24,
    marginTop: 2,
    borderWidth: 2,
    borderRadius: Radii.small,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, gap: Spacing.one },
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  pressed: { opacity: 0.7 },
});

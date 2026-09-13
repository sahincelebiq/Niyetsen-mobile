import AsyncStorage from '@react-native-async-storage/async-storage';

import type { GenderOption } from '@/lib/api';

const ONBOARDING_DRAFT_PREFIX = 'niyetsen.onboarding.draft.';
const STEP_ORDER = ['region', 'name', 'gender', 'birth', 'notif', 'consent'] as const;

export type OnboardingStepId = (typeof STEP_ORDER)[number];

export type OnboardingDraft = {
  stepId: OnboardingStepId;
  name: string;
  gender: GenderOption | null;
  birthDate: string;
  notifTime: {
    hour: number;
    minute: number;
  };
  consents: {
    privacy: boolean;
    ai: boolean;
    proofPhoto: boolean;
    marketing: boolean;
    age18: boolean;
  };
};

function keyFor(userId: string): string {
  return `${ONBOARDING_DRAFT_PREFIX}${userId}`;
}

function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function normalizeStepId(value: unknown, legacyStep: unknown): OnboardingStepId | null {
  if (typeof value === 'string' && STEP_ORDER.includes(value as OnboardingStepId)) {
    return value as OnboardingStepId;
  }
  if (isValidNumber(legacyStep)) {
    const index = Math.min(Math.max(Math.floor(legacyStep), 0), STEP_ORDER.length - 1);
    return STEP_ORDER[index];
  }
  return null;
}

function normalizeDraft(value: unknown): OnboardingDraft | null {
  if (!value || typeof value !== 'object') return null;
  const source = value as Record<string, unknown>;
  const stepIdRaw = source.stepId;
  const legacyStepRaw = source.step;
  const nameRaw = source.name;
  const genderRaw = source.gender;
  const birthDateRaw = source.birthDate;
  const notifTimeRaw = source.notifTime;
  const consentsRaw = source.consents;
  const stepId = normalizeStepId(stepIdRaw, legacyStepRaw);
  if (!stepId) return null;
  if (typeof nameRaw !== 'string') return null;
  if (genderRaw !== null && genderRaw !== 'kadın' && genderRaw !== 'erkek' && genderRaw !== 'belirtmek istemiyorum') {
    return null;
  }
  if (typeof birthDateRaw !== 'string') return null;
  if (!notifTimeRaw || typeof notifTimeRaw !== 'object') return null;
  if (!consentsRaw || typeof consentsRaw !== 'object') return null;

  const notif = notifTimeRaw as Record<string, unknown>;
  const consents = consentsRaw as Record<string, unknown>;
  if (!isValidNumber(notif.hour) || !isValidNumber(notif.minute)) return null;
  if (
    typeof consents.privacy !== 'boolean' ||
    typeof consents.ai !== 'boolean' ||
    typeof consents.proofPhoto !== 'boolean' ||
    typeof consents.marketing !== 'boolean' ||
    typeof consents.age18 !== 'boolean'
  ) {
    return null;
  }
  return {
    stepId,
    name: nameRaw,
    gender: genderRaw,
    birthDate: birthDateRaw,
    notifTime: {
      hour: notif.hour,
      minute: notif.minute,
    },
    consents: {
      privacy: consents.privacy,
      ai: consents.ai,
      proofPhoto: consents.proofPhoto,
      marketing: consents.marketing,
      age18: consents.age18,
    },
  };
}

export function parseOnboardingDraft(value: unknown): OnboardingDraft | null {
  return normalizeDraft(value);
}

export async function readOnboardingDraft(userId: string): Promise<OnboardingDraft | null> {
  try {
    const raw = await AsyncStorage.getItem(keyFor(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return parseOnboardingDraft(parsed);
  } catch {
    return null;
  }
}

export async function writeOnboardingDraft(userId: string, draft: OnboardingDraft): Promise<void> {
  try {
    await AsyncStorage.setItem(keyFor(userId), JSON.stringify(draft));
  } catch {
    // Taslak kaydedilemese de onboarding akışı çalışmalı.
  }
}

export async function clearOnboardingDraft(userId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(keyFor(userId));
  } catch {
    // Temizlik başarısız olsa da akış sürmeli.
  }
}

export async function clearAllOnboardingDrafts(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const draftKeys = keys.filter((key) => key.startsWith(ONBOARDING_DRAFT_PREFIX));
    if (draftKeys.length > 0) {
      await AsyncStorage.multiRemove(draftKeys);
    }
  } catch {
    // Toplu temizlik başarısız olsa da akış sürmeli.
  }
}

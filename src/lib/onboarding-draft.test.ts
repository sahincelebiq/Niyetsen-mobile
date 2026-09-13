import assert from 'node:assert/strict';
import test from 'node:test';

import { parseOnboardingDraft } from './onboarding-draft.ts';

test('geçerli onboarding taslağı parse edilir', () => {
  const payload = {
    stepId: 'birth',
    name: 'Ada',
    gender: 'kadın',
    birthDate: '12.03.1998',
    notifTime: { hour: 8, minute: 30 },
    consents: {
      privacy: true,
      ai: true,
      proofPhoto: false,
      marketing: false,
      age18: true,
    },
  };
  assert.deepEqual(parseOnboardingDraft(payload), payload);
});

test('geçersiz gender değeri reddedilir', () => {
  const payload = {
    stepId: 'name',
    name: 'Ada',
    gender: 'female',
    birthDate: '12.03.1998',
    notifTime: { hour: 8, minute: 30 },
    consents: {
      privacy: true,
      ai: true,
      proofPhoto: false,
      marketing: false,
      age18: true,
    },
  };
  assert.equal(parseOnboardingDraft(payload), null);
});

test('age18 eksikse taslak reddedilir', () => {
  const payload = {
    stepId: 'consent',
    name: 'Ada',
    gender: null,
    birthDate: '12.03.1998',
    notifTime: { hour: 8, minute: 30 },
    consents: {
      privacy: true,
      ai: true,
      proofPhoto: false,
      marketing: false,
    },
  };
  assert.equal(parseOnboardingDraft(payload), null);
});

test('eski sayısal step alanı geriye dönük uyarlanır', () => {
  const payload = {
    step: 4,
    name: 'Ada',
    gender: null,
    birthDate: '12.03.1998',
    notifTime: { hour: 8, minute: 30 },
    consents: {
      privacy: true,
      ai: false,
      proofPhoto: false,
      marketing: true,
      age18: true,
    },
  };
  const parsed = parseOnboardingDraft(payload);
  assert.equal(parsed?.stepId, 'notif');
});

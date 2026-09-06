import assert from 'node:assert/strict';
import test from 'node:test';

import { canEnterApp, type ConsentGateStatus } from './consent-access.ts';

function status(overrides: Partial<ConsentGateStatus> = {}): ConsentGateStatus {
  return {
    needs_reconsent: false,
    privacy_policy: { accepted: true, version: '2026-09-06', decided_at: '2026-09-06T10:00:00Z' },
    kvkk_explicit_consent: { accepted: true, version: '2026-09-06', decided_at: '2026-09-06T10:00:00Z' },
    ...overrides,
  };
}

test('sunucu needs_reconsent=false ise sürüm farkı uygulamayı kilitlemez', () => {
  assert.equal(
    canEnterApp(
      status({
        privacy_policy: { accepted: true, version: '2026-07-11', decided_at: '2026-07-11T10:00:00Z' },
        kvkk_explicit_consent: { accepted: true, version: '2026-07-11', decided_at: '2026-07-11T10:00:00Z' },
      }),
    ),
    true,
  );
});

test('isteğe bağlı rızalar kararsız olsa da temel onay yeterli', () => {
  assert.equal(
    canEnterApp(
      status({
        ai_chat_processing: { accepted: false, version: '2026-09-06', decided_at: null },
        proof_photo_processing: { accepted: false, version: '2026-09-06', decided_at: null },
        marketing_communications: { accepted: false, version: '2026-09-06', decided_at: null },
      }),
    ),
    true,
  );
});

test('needs_reconsent=true iken içeri alınmaz', () => {
  assert.equal(canEnterApp(status({ needs_reconsent: true })), false);
});

test('KVKK veya aydınlatma kabul edilmediyse içeri alınmaz', () => {
  assert.equal(
    canEnterApp(
      status({
        privacy_policy: { accepted: false, version: '2026-09-06', decided_at: null },
      }),
    ),
    false,
  );
});

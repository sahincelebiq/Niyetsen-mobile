import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isFreshGunlukRecord,
  shouldShowDailySkeleton,
  type PersistedGunluk,
} from './gunluk-akis-cache.ts';

const payload = { items: [], events: [] };
const today = '2026-09-20';

test('önbellek yalnız aynı gün ve (varsa) aynı kullanıcı için taze', () => {
  const record: PersistedGunluk<typeof payload> = {
    date: today,
    savedAt: 1,
    userId: 'u1',
    payload,
  };
  assert.equal(isFreshGunlukRecord(record, today, 'u1'), true);
  assert.equal(isFreshGunlukRecord(record, today, 'u2'), false);
  assert.equal(isFreshGunlukRecord(record, '2026-09-19', 'u1'), false);
  assert.equal(isFreshGunlukRecord(null, today, 'u1'), false);
});

test('eski kayıtlarda userId yoksa gün eşleşmesi yeter (bir kezlik geçiş)', () => {
  const legacy: PersistedGunluk<typeof payload> = {
    date: today,
    savedAt: 1,
    payload,
  };
  assert.equal(isFreshGunlukRecord(legacy, today, 'u1'), true);
});

test('iskelet: hidrate/ilk fetch bitmeden boş kart yok; hata varken iskelet yok', () => {
  assert.equal(
    shouldShowDailySkeleton({
      data: null,
      loading: false,
      hydrated: false,
      error: null,
      stale: true,
    }),
    true,
  );
  assert.equal(
    shouldShowDailySkeleton({
      data: null,
      loading: false,
      hydrated: true,
      error: null,
      stale: true,
    }),
    true,
  );
  assert.equal(
    shouldShowDailySkeleton({
      data: null,
      loading: false,
      hydrated: true,
      error: { status: 0 },
      stale: false,
    }),
    false,
  );
  assert.equal(
    shouldShowDailySkeleton({
      data: payload,
      loading: false,
      hydrated: true,
      error: null,
      stale: false,
    }),
    false,
  );
});

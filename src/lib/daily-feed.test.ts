import assert from 'node:assert/strict';
import test from 'node:test';

import { dailyEmptyMode, resolveAgentPlanId } from './daily-feed.ts';

test('boş gün ve süre gerideyse uzatma', () => {
  assert.equal(
    dailyEmptyMode({
      showSkeleton: false,
      totalCount: 0,
      needsExtension: true,
      hasActivePlan: true,
    }),
    'extend',
  );
});

test('boş gün, plan var, uzatma yoksa ajan', () => {
  assert.equal(
    dailyEmptyMode({
      showSkeleton: false,
      totalCount: 0,
      needsExtension: false,
      hasActivePlan: true,
    }),
    'agent',
  );
});

test('plan yoksa sohbet', () => {
  assert.equal(
    dailyEmptyMode({
      showSkeleton: false,
      totalCount: 0,
      needsExtension: false,
      hasActivePlan: false,
    }),
    'chat',
  );
});

test('görev varken boş kart yok', () => {
  assert.equal(
    dailyEmptyMode({
      showSkeleton: false,
      totalCount: 2,
      needsExtension: true,
      hasActivePlan: true,
    }),
    'hidden',
  );
});

test('iskelet varken kart yok', () => {
  assert.equal(
    dailyEmptyMode({
      showSkeleton: true,
      totalCount: 0,
      needsExtension: true,
      hasActivePlan: true,
    }),
    'hidden',
  );
});

test('ajan planı önce aktif id', () => {
  assert.equal(
    resolveAgentPlanId({
      activePlanId: 'aktif',
      taskPlanId: 'gorev',
      eventPlanId: 'etkinlik',
    }),
    'aktif',
  );
});

test('aktif id yoksa görev planı', () => {
  assert.equal(
    resolveAgentPlanId({ activePlanId: '  ', taskPlanId: 'gorev' }),
    'gorev',
  );
});

test('hiç id yoksa null', () => {
  assert.equal(resolveAgentPlanId({}), null);
});

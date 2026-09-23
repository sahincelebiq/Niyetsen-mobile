import assert from 'node:assert/strict';
import { test } from 'node:test';

import { companionGrowth, companionStageIndex, companionVisual } from './chain-animals.ts';

test('73. gün bebek baykuşta kalmaz', () => {
  const growth = companionGrowth(73);
  assert.equal(growth.key, 'bilge');
  assert.equal(growth.label, 'Bilge');
  assert.equal(growth.daysToNext, 0);
  assert.equal(companionStageIndex(73), 3);

  const owl = companionVisual(4, 1, 73);
  assert.equal(owl.name, 'Baykuş');
  assert.equal(owl.stageLabel, 'Bilge');
});

test('aşama eşikleri', () => {
  assert.equal(companionGrowth(1).key, 'bebek');
  assert.equal(companionGrowth(7).key, 'bebek');
  assert.equal(companionGrowth(8).key, 'cirak');
  assert.equal(companionGrowth(21).key, 'cirak');
  assert.equal(companionGrowth(22).key, 'olgun');
  assert.equal(companionGrowth(66).key, 'olgun');
  assert.equal(companionGrowth(67).key, 'bilge');
});

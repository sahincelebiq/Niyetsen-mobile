import assert from 'node:assert/strict';
import { test } from 'node:test';

import { scoreTier, scoreTierProgress } from './score-tier.ts';

test('kademe sınırları', () => {
  assert.equal(scoreTier(0), 'foundation');
  assert.equal(scoreTier(60), 'foundation');
  assert.equal(scoreTier(99), 'foundation');
  assert.equal(scoreTier(100), 'progressing');
  assert.equal(scoreTier(249), 'progressing');
  assert.equal(scoreTier(250), 'proficient');
  assert.equal(scoreTier(499), 'proficient');
  assert.equal(scoreTier(500), 'consistent');
  assert.equal(scoreTier(999), 'consistent');
  assert.equal(scoreTier(1000), 'master');
  assert.equal(scoreTier(-4), 'foundation');
});

test('60 puan çubuğu boş görünmez', () => {
  assert.equal(scoreTierProgress(0), 0);
  assert.ok(Math.abs(scoreTierProgress(60) - 0.6) < 0.001);
  assert.equal(scoreTierProgress(100), 0);
  assert.equal(scoreTierProgress(1500), 1);
});

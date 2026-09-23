import assert from 'node:assert/strict';
import { test } from 'node:test';

import { planGunu } from './zaman.ts';

test('plan günü başlangıç gününde 1, kesintisiz seriden bağımsız', () => {
  assert.equal(planGunu('2026-07-10', '2026-07-10'), 1);
  assert.equal(planGunu('2026-07-10', '2026-09-22'), 75);
});

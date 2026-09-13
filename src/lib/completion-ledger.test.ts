import assert from 'node:assert/strict';
import test from 'node:test';

import {
  EMPTY_LEDGER,
  ledgerApply,
  ledgerHas,
  ledgerTotal,
  parseLedger,
  pruneLedger,
} from '@/lib/completion-ledger';

test('aynı olayId ikinci kez uygulanmaz; toplam bir kez artar', () => {
  const first = ledgerApply(EMPTY_LEDGER, 'olay-1', 50, '2026-09-13T08:00:00Z');
  assert.equal(first.applied, true);
  const second = ledgerApply(first.ledger, 'olay-1', 50, '2026-09-13T08:00:01Z');
  assert.equal(second.applied, false);
  assert.equal(second.ledger, first.ledger);
  assert.equal(ledgerTotal(second.ledger), 50);
  assert.equal(ledgerHas(second.ledger, 'olay-1'), true);
});

test('defter donmuş (immutable) döner ve boş olayId reddedilir', () => {
  const { ledger } = ledgerApply(EMPTY_LEDGER, 'a', 10, '2026-09-13T08:00:00Z');
  assert.equal(Object.isFrozen(ledger), true);
  assert.throws(() => ledgerApply(ledger, '', 10, '2026-09-13T08:00:00Z'), RangeError);
});

test('budama yalnız eşikten eski kayıtları siler', () => {
  let ledger = EMPTY_LEDGER;
  ledger = ledgerApply(ledger, 'eski', 50, '2026-08-01T08:00:00Z').ledger;
  ledger = ledgerApply(ledger, 'yeni', 50, '2026-09-12T08:00:00Z').ledger;
  const pruned = pruneLedger(ledger, '2026-09-01T00:00:00Z');
  assert.equal(ledgerHas(pruned, 'eski'), false);
  assert.equal(ledgerHas(pruned, 'yeni'), true);
});

test('bozuk JSON güvenle boş deftere düşer; geçersiz kayıtlar atlanır', () => {
  assert.deepEqual(parseLedger('{bozuk'), EMPTY_LEDGER);
  assert.deepEqual(parseLedger(null), EMPTY_LEDGER);
  const parsed = parseLedger(
    JSON.stringify({ ok: { puan: 50, at: '2026-09-13T08:00:00Z' }, bad: { puan: 'x' } }),
  );
  assert.equal(ledgerHas(parsed, 'ok'), true);
  assert.equal(ledgerHas(parsed, 'bad'), false);
});

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  daysInWeek,
  planHorizon,
  progressTotal,
  visibleWeeks,
  weekBounds,
  weekIndex,
  weekNeedsHorizonUnlock,
  weekWasSkipped,
} from './plan-weeks.ts';

test('gün 7 hâlâ 1. hafta, gün 8 2. haftadır; 70. gün 10. haftanın sonudur', () => {
  assert.equal(weekIndex(7), 1);
  assert.equal(weekIndex(8), 2);
  assert.deepEqual(daysInWeek(weekBounds(1, 365)!), [1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(daysInWeek(weekBounds(2, 365)!), [8, 9, 10, 11, 12, 13, 14]);
  assert.equal(weekIndex(70), 10);
  assert.deepEqual(daysInWeek(weekBounds(10, 365)!), [64, 65, 66, 67, 68, 69, 70]);
  assert.equal(weekIndex(71), 11);
});

test('73. gün 11. haftadır ve şerit 71–77 gösterir', () => {
  assert.equal(weekIndex(73), 11);
  assert.equal(planHorizon(7, 73), 77);
  const weeks = visibleWeeks({ horizonDays: 77, todayDay: 73 });
  const current = weeks.find((week) => week.week === 11);
  assert.ok(current);
  assert.deepEqual(daysInWeek(current), [71, 72, 73, 74, 75, 76, 77]);
  assert.equal(weeks[0].week, 2);
  assert.equal(weeks.at(-1)?.week, 11);
});

test('süre 365 iken ufuk 365 kalır, aktif hafta ortadadır', () => {
  assert.equal(planHorizon(365, 73), 365);
  assert.equal(progressTotal(365, 73), 365);
  const current = weekBounds(11, 365);
  assert.deepEqual(current && daysInWeek(current), [71, 72, 73, 74, 75, 76, 77]);
});

test('ilk haftada payda kayıtlı süredir', () => {
  assert.equal(planHorizon(7, 3), 7);
  assert.equal(progressTotal(7, 3), 7);
  assert.equal(progressTotal(7, 73), 365);
});

test('süre dolmuşken bugünün haftası kilitlenir, atlanan eski hafta kilitlenmez', () => {
  const live = weekBounds(11, 77);
  const skipped = weekBounds(5, 77);
  assert.ok(live && weekNeedsHorizonUnlock(live, 7, 73));
  assert.ok(skipped && !weekNeedsHorizonUnlock(skipped, 7, 73));
  assert.equal(weekWasSkipped(skipped, [1, 2, 3, 4, 5, 6, 7], 73), true);
  assert.equal(weekWasSkipped(weekBounds(1, 77)!, [1, 7], 73), false);
});

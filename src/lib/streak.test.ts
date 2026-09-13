import assert from 'node:assert/strict';
import test from 'node:test';

import {
  applyCompletion,
  dayDiff,
  EMPTY_STREAK,
  localDayKey,
  reconcileWithServer,
  settleStreak,
  shiftDayKey,
  type StreakState,
} from '@/lib/streak';

const TZ = 'Europe/Istanbul'; // UTC+3, DST yok

test('yerel gün anahtarı saat dilimine göre çizilir (UTC+3)', () => {
  // 20:59 UTC = 23:59 İstanbul → hâlâ 13 Eylül
  assert.equal(localDayKey('2026-09-13T20:59:00Z', TZ), '2026-09-13');
  // 21:01 UTC = 00:01 İstanbul → 14 Eylül
  assert.equal(localDayKey('2026-09-13T21:01:00Z', TZ), '2026-09-14');
  // UTC'de bakılsa aynı an 13 Eylül olurdu
  assert.equal(localDayKey('2026-09-13T21:01:00Z', 'UTC'), '2026-09-13');
});

test('gün farkı ve kaydırma takvim günü üzerinden', () => {
  assert.equal(dayDiff('2026-09-13', '2026-09-14'), 1);
  assert.equal(dayDiff('2026-09-14', '2026-09-13'), -1);
  assert.equal(dayDiff('2026-02-28', '2026-03-01'), 1);
  assert.equal(shiftDayKey('2026-12-31', 1), '2027-01-01');
  assert.equal(shiftDayKey('2026-01-01', -1), '2025-12-31');
});

test('ilk plan görevi zinciri 1 yapar; aynı gün ikincisi artırmaz', () => {
  const first = applyCompletion(EMPTY_STREAK, {
    kind: 'plan_gorev',
    completedAt: '2026-09-13T10:00:00Z',
    timeZone: TZ,
  });
  assert.equal(first.extended, true);
  assert.equal(first.state.streakLen, 1);
  assert.equal(first.state.bestStreak, 1);
  assert.equal(first.state.lastActiveDay, '2026-09-13');

  const second = applyCompletion(first.state, {
    kind: 'plan_etkinlik',
    completedAt: '2026-09-13T15:00:00Z',
    timeZone: TZ,
  });
  assert.equal(second.extended, false);
  assert.equal(second.state.streakLen, 1);
});

test('gün sınırı: 23:59 → 00:01 geçişi zinciri +1 uzatır, yanlış kırmaz', () => {
  const lateNight = applyCompletion(EMPTY_STREAK, {
    kind: 'plan_gorev',
    completedAt: '2026-09-13T20:59:00Z', // 23:59 İstanbul
    timeZone: TZ,
  });
  assert.equal(lateNight.state.lastActiveDay, '2026-09-13');

  const justAfterMidnight = applyCompletion(lateNight.state, {
    kind: 'plan_gorev',
    completedAt: '2026-09-13T21:01:00Z', // 00:01 İstanbul, 14 Eylül
    timeZone: TZ,
  });
  assert.equal(justAfterMidnight.extended, true);
  assert.equal(justAfterMidnight.restarted, false);
  assert.equal(justAfterMidnight.state.streakLen, 2);
  assert.equal(justAfterMidnight.state.lastActiveDay, '2026-09-14');
});

test('okuma anı (lazy): bugün/dün aktifse yaşar, daha eskiyse kırılır; best düşmez', () => {
  const state: StreakState = { streakLen: 23, bestStreak: 23, lastActiveDay: '2026-09-12' };
  assert.deepEqual(settleStreak(state, '2026-09-12'), { state, broken: false });
  assert.deepEqual(settleStreak(state, '2026-09-13'), { state, broken: false });
  const broken = settleStreak(state, '2026-09-14');
  assert.equal(broken.broken, true);
  assert.equal(broken.state.streakLen, 0);
  assert.equal(broken.state.bestStreak, 23);
});

test('bir gün boşluktan sonra tamamlama zinciri 1den yeniden başlatır', () => {
  const state: StreakState = { streakLen: 5, bestStreak: 5, lastActiveDay: '2026-09-10' };
  const result = applyCompletion(state, {
    kind: 'plan_gorev',
    completedAt: '2026-09-12T08:00:00Z',
    timeZone: TZ,
  });
  assert.equal(result.restarted, true);
  assert.equal(result.state.streakLen, 1);
  assert.equal(result.state.bestStreak, 5);
});

test('bonus görev zinciri hiçbir koşulda değiştirmez', () => {
  const alive: StreakState = { streakLen: 4, bestStreak: 4, lastActiveDay: '2026-09-12' };
  const next = applyCompletion(alive, {
    kind: 'bonus',
    completedAt: '2026-09-13T08:00:00Z',
    timeZone: TZ,
  });
  assert.equal(next.extended, false);
  assert.deepEqual(next.state, alive);

  const broken: StreakState = { streakLen: 4, bestStreak: 4, lastActiveDay: '2026-09-01' };
  const afterBonus = applyCompletion(broken, {
    kind: 'bonus',
    completedAt: '2026-09-13T08:00:00Z',
    timeZone: TZ,
  });
  assert.deepEqual(afterBonus.state, broken);
  assert.equal(afterBonus.milestone, null);
});

test('kilometre taşı tam 7. günde bir kez; 8. günde tekrar etmez', () => {
  let state: StreakState = { streakLen: 6, bestStreak: 6, lastActiveDay: '2026-09-12' };
  const seventh = applyCompletion(state, {
    kind: 'plan_gorev',
    completedAt: '2026-09-13T08:00:00Z',
    timeZone: TZ,
  });
  assert.equal(seventh.milestone, 7);
  state = seventh.state;

  const sameDayAgain = applyCompletion(state, {
    kind: 'plan_gorev',
    completedAt: '2026-09-13T18:00:00Z',
    timeZone: TZ,
  });
  assert.equal(sameDayAgain.milestone, null);

  const eighth = applyCompletion(state, {
    kind: 'plan_gorev',
    completedAt: '2026-09-14T08:00:00Z',
    timeZone: TZ,
  });
  assert.equal(eighth.milestone, null);
  assert.equal(eighth.state.streakLen, 8);
});

test('geriye dönük tamamlama (varsayılan politika) boşluğu onarmaz', () => {
  const state: StreakState = { streakLen: 5, bestStreak: 5, lastActiveDay: '2026-09-10' };
  const result = applyCompletion(state, {
    kind: 'plan_gorev',
    completedAt: '2026-09-12T08:00:00Z',
    timeZone: TZ,
    creditDay: '2026-09-11', // dünün görevi bugün kapatıldı
  });
  // Onarım kapalı: bugüne kredi, zincir 1'den başlar.
  assert.equal(result.creditedDay, '2026-09-12');
  assert.equal(result.state.streakLen, 1);
});

test('sunucuyla birleştirme: sunucu otorite, best asla düşmez', () => {
  const local: StreakState = { streakLen: 3, bestStreak: 9, lastActiveDay: '2026-09-13' };
  const merged = reconcileWithServer(local, { streak_len: 4, best_streak: 4 }, '2026-09-13');
  assert.equal(merged.streakLen, 4);
  assert.equal(merged.bestStreak, 9);
  assert.equal(merged.lastActiveDay, '2026-09-13');

  const reset = reconcileWithServer(local, { streak_len: 0, best_streak: 9 }, '2026-09-15');
  assert.equal(reset.streakLen, 0);
  assert.equal(reset.lastActiveDay, null);
});

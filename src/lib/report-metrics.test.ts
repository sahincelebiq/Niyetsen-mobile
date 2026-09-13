import assert from 'node:assert/strict';
import test from 'node:test';

import type { Recap, RecapDashboard } from '@/lib/api';
import {
  completionRates,
  emptyDashboard,
  formatHourWindow,
  hasPatternData,
  peakHourWindow,
  planAlignment,
  periodPoints,
  resolveDashboard,
  streakGlyphDays,
} from '@/lib/report-metrics';

const CATS = ['İrade', 'İstikrar'] as const;

function dashboard(overrides: Partial<RecapDashboard> = {}): RecapDashboard {
  return { ...emptyDashboard(CATS), ...overrides };
}

test('saat deseni: en yoğun 2 saatlik pencere, gece yarısını sarmaz', () => {
  const hours = new Array(24).fill(0);
  hours[7] = 3;
  hours[8] = 5;
  hours[21] = 4;
  const window = peakHourWindow(hours);
  assert.deepEqual(window, { startHour: 7, endHour: 9, count: 8, share: 67 });
  assert.equal(formatHourWindow(window!), '07:00–09:00');
  assert.equal(peakHourWindow(new Array(24).fill(0)), null);
  assert.equal(peakHourWindow([1, 2, 3]), null);
  assert.equal(peakHourWindow(undefined), null);
});

test('plan uyumu: adım → etkinlik → tamamlama oranları; adım yoksa null', () => {
  assert.equal(planAlignment({ plan_steps_total: 0 }), null);
  assert.equal(planAlignment({}), null);
  assert.deepEqual(
    planAlignment({ plan_steps_total: 10, plan_steps_scheduled: 8, plan_steps_completed: 5 }),
    { total: 10, scheduled: 8, completed: 5, scheduledRate: 80, completedRate: 50 },
  );
});

test('örüntü kartı ilk hafta dolmadan gösterilmez; veri gelince açılır', () => {
  const hours = new Array(24).fill(0);
  hours[7] = 2;
  assert.equal(hasPatternData(dashboard({ days_in: 3, hour_done: hours })), false);
  assert.equal(hasPatternData(dashboard({ days_in: 8, hour_done: hours })), true);
  assert.equal(hasPatternData(dashboard({ days_in: 8 })), false);
  assert.equal(hasPatternData(dashboard({ days_in: 8, insights: ['Sabahları güçlüsün.'] })), true);
});

test('oranlar ve dönem puanı sunucudan hazır gelir; yoksa null — istemci uydurmaz', () => {
  assert.deepEqual(completionRates(dashboard({ completion_rate: 40 })), {
    daily: null,
    weekly: null,
    overall: 40,
  });
  assert.deepEqual(
    completionRates(dashboard({ completion_rate: 40, daily_completion_rate: 66, weekly_completion_rate: 71 })),
    { daily: 66, weekly: 71, overall: 40 },
  );
  assert.equal(periodPoints(dashboard()), null);
  assert.equal(periodPoints(dashboard({ period_points: 350 })), 350);
});

test('panel çözümü önceliği: sunucu > anlık görüntü > eski backend geçişi > null', () => {
  const server = dashboard({ completed_tasks: 12, completion_rate: 60 });
  const snapshot = dashboard({ completed_tasks: 11 });
  const recapWithDashboard: Recap = {
    period: '7d',
    start_date: '2026-09-06',
    end_date: '2026-09-13',
    days_in: 8,
    completed_tasks: 12,
    total_points: 600,
    top_category: 'İrade',
    cards: [],
    dashboard: server,
  };
  assert.equal(resolveDashboard(recapWithDashboard, snapshot, null, CATS), server);
  assert.equal(resolveDashboard(null, snapshot, null, CATS), snapshot);
  assert.equal(resolveDashboard(null, null, null, CATS), null);

  const legacy = resolveDashboard(
    { ...recapWithDashboard, dashboard: undefined },
    null,
    { points: { İrade: 100, İstikrar: 0 }, streak_len: 4, best_streak: 9 },
    CATS,
  );
  assert.equal(legacy?.completed_tasks, 12);
  assert.equal(legacy?.total_points, 600);
  assert.equal(legacy?.streak_len, 4);
  assert.equal(legacy?.best_streak, 9);
  // Eski backend geçişinde oran TÜRETİLMEZ (eski kod %100 uyduruyordu).
  assert.equal(legacy?.completion_rate, 0);
});

test('zincir filizi gün sayısı panelden okunur, metinden değil', () => {
  assert.equal(streakGlyphDays(dashboard({ streak_len: 23 })), 23);
  assert.equal(streakGlyphDays(null), 0);
});

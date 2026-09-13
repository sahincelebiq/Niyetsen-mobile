import assert from 'node:assert/strict';
import test from 'node:test';

import {
  affectsPlanProgress,
  affectsStreak,
  awardedPointsFromMessage,
  MILESTONE_DAYS,
  milestoneReached,
  milestoneReward,
  nextMilestone,
  pointsForCompletion,
  ProposedScoringRules,
  ScoringRules,
} from '@/constants/scoring';

test('bonus görev zinciri ve plan ilerlemesini etkilemez', () => {
  assert.equal(affectsStreak('bonus'), false);
  assert.equal(affectsPlanProgress('bonus'), false);
  assert.equal(affectsStreak('plan_gorev'), true);
  assert.equal(affectsStreak('plan_etkinlik'), true);
  assert.equal(affectsPlanProgress('plan_etkinlik'), false);
});

test('tamamlama ipuçları yalnız CANLI tablodan okunur (öneriler puan olarak sızmaz)', () => {
  assert.equal(pointsForCompletion('plan_gorev'), ScoringRules.planGorevi);
  assert.equal(pointsForCompletion('plan_etkinlik'), ScoringRules.planEtkinlik);
  assert.equal(pointsForCompletion('bonus'), ScoringRules.bonusGorev);
  assert.ok(ProposedScoringRules.fotoKanitBonusu > 0);
  assert.equal(pointsForCompletion('plan_gorev'), ScoringRules.planGorevi); // bonus eklenmedi
});

test('sunucu mesajındaki +N puan kazanır; yoksa tabloya düşer', () => {
  assert.equal(awardedPointsFromMessage('Halka tamamlandı · +50 puan', 10), 50);
  assert.equal(awardedPointsFromMessage('Zincire eklendi · + 75', 10), 75);
  assert.equal(awardedPointsFromMessage('Halka tamamlandı.', 10), 10);
  assert.equal(awardedPointsFromMessage(null, 10), 10);
  assert.equal(awardedPointsFromMessage('deneme 2/3', 10), 10);
});

test('kilometre taşı tam 7/30/90/180 geçişinde bir kez tetiklenir', () => {
  for (const day of MILESTONE_DAYS) {
    assert.equal(milestoneReached(day - 1, day), day);
    // Aynı taşta ikinci okuma: previous >= next → tetiklenmez.
    assert.equal(milestoneReached(day, day), null);
    // Taşın bir sonrası: tetiklenmez.
    assert.equal(milestoneReached(day, day + 1), null);
    assert.ok(milestoneReward(day) > 0);
  }
  assert.equal(milestoneReached(5, 6), null);
  assert.equal(milestoneReward(6), 0);
});

test('sonraki kilometre taşı ve kalan gün', () => {
  assert.deepEqual(nextMilestone(0), { day: 7, remaining: 7 });
  assert.deepEqual(nextMilestone(27), { day: 30, remaining: 3 });
  assert.deepEqual(nextMilestone(30), { day: 90, remaining: 60 });
  assert.equal(nextMilestone(180), null);
});

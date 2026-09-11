import assert from 'node:assert/strict';
import test from 'node:test';

import {
  KEYBOARD_FIT_SLACK_PX,
  KEYBOARD_GAP_PX,
  isKeyboardFrameOnScreen,
  isKeyboardOpen,
  resolveKeyboardLift,
} from './keyboard-geometry.ts';

test('küçük IME çubuğu açık sayılmaz', () => {
  assert.equal(isKeyboardOpen(12), false);
  assert.equal(isKeyboardOpen(80), true);
});

test('iOS keyboardWillChangeFrame gizlenirken çerçeve ekran dışındadır → kapalı', () => {
  assert.equal(isKeyboardFrameOnScreen(852, 852), false);
  assert.equal(isKeyboardFrameOnScreen(516, 852), true);
  assert.equal(isKeyboardFrameOnScreen(0, 852), true); // bilinmiyor → yükseklik karar verir
});

test('Android adjustResize: kap dibi klavye üstüne oturdu → lift 0 (çift kaydırma yok)', () => {
  // Eski hata: Dimensions.window küçülmediği için "overlay" sanılıp klavye
  // yüksekliği kadar ikinci lift ekleniyordu; sohbet bir şeride sıkışıyordu.
  for (const delta of [0, 1, -1, KEYBOARD_FIT_SLACK_PX]) {
    const lift = resolveKeyboardLift({
      keyboardHeight: 320,
      keyboardTop: 500,
      containerBottom: 500 + delta,
      platformResizes: true,
    });
    assert.equal(lift, 0, `delta=${delta}`);
  }
});

test('overlay klavye (iOS / resize yok): lift = örtüşme + gap, klavye yüksekliği DEĞİL', () => {
  const lift = resolveKeyboardLift({
    keyboardHeight: 336,
    keyboardTop: 516,
    containerBottom: 852,
    platformResizes: false,
  });
  assert.equal(lift, 852 - 516 + KEYBOARD_GAP_PX);
  // Kap ekranın dibinden yukarıda (SafeArea bottom) → daha az lift.
  const shorter = resolveKeyboardLift({
    keyboardHeight: 336,
    keyboardTop: 516,
    containerBottom: 818,
    platformResizes: false,
  });
  assert.equal(shorter, 818 - 516 + KEYBOARD_GAP_PX);
});

test('resize kısmen yetmediyse (nav bar payı) yalnız kalan örtüşme kaldırılır', () => {
  const lift = resolveKeyboardLift({
    keyboardHeight: 320,
    keyboardTop: 500,
    containerBottom: 548,
    platformResizes: true,
  });
  assert.equal(lift, 48 + KEYBOARD_GAP_PX);
});

test('bottomInset kabın dibiyle yazı kutusu arasındaki boşluğu düşer', () => {
  const lift = resolveKeyboardLift({
    keyboardHeight: 336,
    keyboardTop: 516,
    containerBottom: 852,
    bottomInset: 40,
    platformResizes: false,
  });
  assert.equal(lift, 852 - 40 - 516 + KEYBOARD_GAP_PX);
});

test('ölçüm yoksa yedek: iOS klavye yüksekliği, Android resize 0', () => {
  const base = { keyboardHeight: 300, keyboardTop: 500, containerBottom: null };
  assert.equal(
    resolveKeyboardLift({ ...base, platformResizes: false }),
    300 - KEYBOARD_GAP_PX,
  );
  assert.equal(resolveKeyboardLift({ ...base, platformResizes: true }), 0);
  // measureInWindow 0 döndürdü → ölçüm yok sayılır.
  assert.equal(
    resolveKeyboardLift({ ...base, containerBottom: 0, platformResizes: false }),
    300 - KEYBOARD_GAP_PX,
  );
});

test('klavye kapalıyken her durumda 0', () => {
  assert.equal(
    resolveKeyboardLift({
      keyboardHeight: 0,
      keyboardTop: 500,
      containerBottom: 852,
      platformResizes: false,
    }),
    0,
  );
});

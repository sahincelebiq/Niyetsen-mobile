import assert from 'node:assert/strict';
import test from 'node:test';

import {
  KEYBOARD_FIT_SLACK_PX,
  KEYBOARD_GAP_PX,
  isKeyboardFrameOnScreen,
  isKeyboardOpen,
  normalizeKeyboardFrame,
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
  assert.equal(resolveKeyboardLift({ ...base, platformResizes: false }), 300);
  assert.equal(resolveKeyboardLift({ ...base, platformResizes: true }), 0);
  // measureInWindow 0 döndürdü → ölçüm yok sayılır.
  assert.equal(
    resolveKeyboardLift({ ...base, containerBottom: 0, platformResizes: false }),
    300,
  );
});

test('edge-to-edge: kap oynamadı, screenY dibi yalanlıyor → lift klavye yüksekliği', () => {
  const lift = resolveKeyboardLift({
    keyboardHeight: 320,
    keyboardTop: 800,
    containerBottom: 800,
    restingBottom: 800,
    platformResizes: true,
  });
  assert.equal(lift, 320 + KEYBOARD_GAP_PX);
});

test('gerçek resize: kap klavye kadar yükseldi → lift 0 (screenY yalanlasa da)', () => {
  const lift = resolveKeyboardLift({
    keyboardHeight: 320,
    keyboardTop: 480,
    containerBottom: 480,
    restingBottom: 800,
    platformResizes: true,
  });
  assert.equal(lift, 0);
});

test('kısmi resize: kalan örtüşme klavye yüksekliğinden düşülür', () => {
  const lift = resolveKeyboardLift({
    keyboardHeight: 320,
    keyboardTop: 752,
    containerBottom: 752,
    restingBottom: 800,
    platformResizes: true,
  });
  assert.equal(lift, 320 - 48 + KEYBOARD_GAP_PX);
});

test('Android screenY ekran dışı ama yükseklik açık → çerçeve açık, top bilinmiyor', () => {
  const frame = normalizeKeyboardFrame(320, 800, 800, 'android');
  assert.equal(frame.open, true);
  assert.equal(frame.height, 320);
  assert.equal(frame.top, 0);
});

test('iOS screenY ekran dışı → kapalı (gizlenme karesi)', () => {
  const frame = normalizeKeyboardFrame(320, 852, 852, 'ios');
  assert.deepEqual(frame, { top: 0, height: 0, open: false });
});

test('screenY 0 ve kap dibe yapışık: ekran yüksekliğiyle lift klavye kadar', () => {
  const lift = resolveKeyboardLift({
    keyboardHeight: 320,
    keyboardTop: 0,
    containerBottom: 800,
    screenHeight: 800,
    platformResizes: true,
  });
  assert.equal(lift, 320 + KEYBOARD_GAP_PX);
});

test('screenY yalanı kaba yapışık, resting yok: implied top ile kalkar', () => {
  const lift = resolveKeyboardLift({
    keyboardHeight: 320,
    keyboardTop: 800,
    containerBottom: 800,
    screenHeight: 800,
    platformResizes: true,
  });
  assert.equal(lift, 320 + KEYBOARD_GAP_PX);
});

test('pencere zaten klavye üstüne oturdu, screenY yok: lift 0', () => {
  const lift = resolveKeyboardLift({
    keyboardHeight: 320,
    keyboardTop: 0,
    containerBottom: 480,
    screenHeight: 800,
    platformResizes: true,
  });
  assert.equal(lift, 0);
});

test('iOS screenY yok, kap zaten ima edilen klavye üstünde: yedek lift yok', () => {
  const lift = resolveKeyboardLift({
    keyboardHeight: 320,
    keyboardTop: 0,
    containerBottom: 480,
    screenHeight: 800,
    platformResizes: false,
  });
  assert.equal(lift, 0);
});

test('resting kısa kalsa da kap klavye üstündeyse ikinci lift yok', () => {
  const lift = resolveKeyboardLift({
    keyboardHeight: 320,
    keyboardTop: 480,
    containerBottom: 480,
    restingBottom: 500,
    screenHeight: 800,
    platformResizes: true,
  });
  assert.equal(lift, 0);
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

/** Klavye açık eşiği — küçük IME çubuğu / aksesuar barı lift tetiklemesin. */
export const KEYBOARD_OPEN_PX = 40;
/** Yazı kutusu ile klavye üstü arası nefes payı. */
export const KEYBOARD_GAP_PX = 8;
/** Klavyenin pencere dibine bu kadar yakın olması "pencere zaten küçüldü" sayılır. */
const RESIZE_SLACK_PX = 24;

export function isKeyboardOpen(height: number): boolean {
  return height > KEYBOARD_OPEN_PX;
}

/**
 * Edge-to-edge (Expo 54 / Android 15) penceredeki IME overlay midir,
 * yoksa adjustResize pencereyi zaten küçülttü mü?
 *
 * Overlay: keyboardTop pencerenin içinde → içeriği örter, lift gerekir.
 * Resize: keyboardTop ≈ yeni pencere dibi → lift çift boşluk yapar, 0 kalmalı.
 */
export function isKeyboardOverlaying(keyboardTop: number, windowHeight: number): boolean {
  if (keyboardTop <= 0 || windowHeight <= 0) return false;
  return keyboardTop < windowHeight - RESIZE_SLACK_PX;
}

/**
 * NativeTabs + edge-to-edge için tek lift hesabı.
 * Ölçüm yoksa / 0 ise klavye yüksekliğine düşer — gömülme bundan oluyordu.
 */
export function resolveKeyboardLift(opts: {
  open: boolean;
  overlaying: boolean;
  keyboardHeight: number;
  keyboardTop: number;
  measuredRestBottom: number | null;
  gap?: number;
}): number {
  if (!opts.open || !isKeyboardOpen(opts.keyboardHeight)) return 0;
  if (!opts.overlaying) return 0;

  const gap = opts.gap ?? KEYBOARD_GAP_PX;
  const fallback = Math.max(0, Math.round(opts.keyboardHeight - gap));
  const measured =
    opts.measuredRestBottom != null && opts.measuredRestBottom > 1
      ? Math.max(0, Math.round(opts.measuredRestBottom + gap - opts.keyboardTop))
      : 0;

  return Math.max(measured, fallback);
}

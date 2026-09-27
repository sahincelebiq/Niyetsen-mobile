/** Klavye açık eşiği — küçük IME çubuğu / aksesuar barı lift tetiklemesin. */
export const KEYBOARD_OPEN_PX = 40;
/** Yazı kutusu ile klavye üstü arası nefes payı. */
export const KEYBOARD_GAP_PX = 8;
/**
 * Bu kadar ve altı örtüşme "zaten sığıyor" sayılır: adjustResize pencereyi
 * küçültmüşse kabın dibi klavyenin üstüne ±1-2 dp yuvarlamayla oturur.
 */
export const KEYBOARD_FIT_SLACK_PX = 4;

export function isKeyboardOpen(height: number): boolean {
  return height > KEYBOARD_OPEN_PX;
}

/**
 * Klavye çerçevesi ekranın dışına çıktıysa (iOS keyboardWillChangeFrame gizlenirken
 * screenY = ekran yüksekliği gelir) kapalı say.
 */
export function isKeyboardFrameOnScreen(keyboardTop: number, screenHeight: number): boolean {
  if (keyboardTop <= 0) return true; // bilinmiyor → yükseklik karar verir
  if (screenHeight <= 0) return true;
  return keyboardTop < screenHeight - 1;
}

/**
 * TEK lift hesabı — Dimensions tahmini YOK, yalnız ölçüm.
 *
 * Neden: Android edge-to-edge'de `Dimensions.window` klavyeyle küçülmez; eski
 * "keyboardTop < windowHeight → overlay" kuralı pencere zaten resize olmuşken
 * bile lift üretip sohbeti ikinci kez kaydırıyordu (liste bir şeride sıkışıyordu).
 *
 * containerBottom: lift'ten ETKİLENMEYEN kabın pencere içindeki dibi
 *   (paddingBottom kabın içinde kalır, kabın kendi dibi yerinden oynamaz).
 * bottomInset: kabın dibiyle yazı kutusunun dibi arasındaki sabit boşluk (çoğu 0).
 * platformResizes: ölçüm YOKSA yedek — Android (adjustResize) 0, iOS klavye yüksekliği.
 */
export function resolveKeyboardLift(opts: {
  keyboardHeight: number;
  keyboardTop: number;
  containerBottom: number | null;
  /**
   * Klavye kapalıyken ölçülen kap dibi. Pencere gerçekten küçüldüyse
   * containerBottom bundan klavye yüksekliği kadar yukarıdadır.
   * Edge-to-edge Android'de pencere küçülmez ama screenY "zaten oturdu"
   * diye yalan söyler; o zaman lift = klavye yüksekliği.
   */
  restingBottom?: number | null;
  bottomInset?: number;
  gap?: number;
  platformResizes: boolean;
}): number {
  if (!isKeyboardOpen(opts.keyboardHeight)) return 0;
  const gap = opts.gap ?? KEYBOARD_GAP_PX;
  const measured = opts.containerBottom != null && opts.containerBottom > 1;
  const dockBottom = measured
    ? (opts.containerBottom as number) - (opts.bottomInset ?? 0)
    : null;
  const resting =
    opts.restingBottom != null && opts.restingBottom > 1 ? opts.restingBottom : null;
  const shrunk =
    resting != null && dockBottom != null ? Math.round(resting - dockBottom) : null;

  if (shrunk != null && shrunk >= opts.keyboardHeight - KEYBOARD_FIT_SLACK_PX) return 0;

  if (dockBottom != null && opts.keyboardTop > 0) {
    const overlap = Math.round(dockBottom - opts.keyboardTop);
    if (overlap > KEYBOARD_FIT_SLACK_PX) return overlap + gap;
  }

  // screenY örtüşme görmüyor ama kap yerinden oynamadı: IME üstüne çiziyor.
  if (shrunk != null && shrunk < opts.keyboardHeight - KEYBOARD_FIT_SLACK_PX) {
    return Math.max(0, Math.round(opts.keyboardHeight - Math.max(shrunk, 0) + gap));
  }

  if (!measured || opts.keyboardTop <= 0) {
    return opts.platformResizes ? 0 : Math.max(0, Math.round(opts.keyboardHeight - gap));
  }
  return 0;
}

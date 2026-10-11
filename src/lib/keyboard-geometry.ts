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

export type KeyboardFrame = { top: number; height: number; open: boolean };

/**
 * Klavye olayını tek çerçeveye indirger.
 * iOS gizlenirken screenY ekran dibine yapışır → kapalı.
 * Android'de yükseklik > eşik ise açıktır; screenY 0 veya ekran dışıysa
 * top bilinmiyor sayılır (edge-to-edge yalanı lift'i sıfırlamasın).
 */
export function normalizeKeyboardFrame(
  height: number,
  screenY: number,
  screenHeight: number,
  platform: 'ios' | 'android' | 'other',
): KeyboardFrame {
  if (!isKeyboardOpen(height)) return { top: 0, height: 0, open: false };
  const onScreen = isKeyboardFrameOnScreen(screenY, screenHeight);
  if (platform === 'ios' && !onScreen) return { top: 0, height: 0, open: false };
  if (!onScreen || screenY <= 0) return { top: 0, height, open: true };
  return { top: screenY, height, open: true };
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
  /**
   * Klavye screenY'sinin koordinat uzayı (Dimensions.screen).
   * Pencere küçüldü mü tahmini DEĞİL: screenY yalan söylediğinde
   * klavye üstü = screenHeight − yükseklik.
   */
  screenHeight?: number;
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

  const screenHeight = opts.screenHeight ?? 0;
  const impliedTop =
    screenHeight > opts.keyboardHeight ? screenHeight - opts.keyboardHeight : 0;

  let sawKeyboardTop = false;
  if (dockBottom != null) {
    const reported = opts.keyboardTop > 0 ? opts.keyboardTop : impliedTop;
    if (reported > 0) {
      sawKeyboardTop = true;
      let overlap = Math.round(dockBottom - reported);
      const barelyMoved =
        shrunk == null || shrunk < opts.keyboardHeight - KEYBOARD_FIT_SLACK_PX;
      // screenY kabın dibine yapışık yalan: gerçek üst = ekran − yükseklik.
      if (
        overlap <= KEYBOARD_FIT_SLACK_PX &&
        barelyMoved &&
        impliedTop > 0 &&
        opts.keyboardTop > impliedTop + KEYBOARD_FIT_SLACK_PX
      ) {
        overlap = Math.round(dockBottom - impliedTop);
      }
      if (overlap > KEYBOARD_FIT_SLACK_PX) return overlap + gap;
    }
  }

  // Örtüşme yok. Kap kıpırdamadıysa IME üstüne çiziyor olabilir; kap zaten
  // ima edilen klavye üstündeyse kalan yüksekliği eklemek ikinci kaydırmadır.
  const clearsImplied =
    dockBottom != null &&
    impliedTop > 0 &&
    dockBottom <= impliedTop + KEYBOARD_FIT_SLACK_PX;
  if (
    shrunk != null &&
    shrunk >= 0 &&
    shrunk < opts.keyboardHeight - KEYBOARD_FIT_SLACK_PX &&
    !clearsImplied
  ) {
    return Math.max(0, Math.round(opts.keyboardHeight - shrunk + gap));
  }

  // Ölçüm veya klavye üstü yok. Android resize varsayımı → 0.
  // iOS yedek = klavye yüksekliği (gap düşülmez; düşülürse kutu IME'ye girer).
  if (!measured || !sawKeyboardTop) {
    return opts.platformResizes ? 0 : Math.max(0, Math.round(opts.keyboardHeight));
  }
  return 0;
}

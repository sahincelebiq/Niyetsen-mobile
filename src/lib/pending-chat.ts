/**
 * Ekranlar arası sohbet köprüsü (Dalga 4.2).
 * Felsefe Yolları ekranı bir yol seçince mesajı buraya bırakır; sohbet ekranı
 * odaklanınca alır ve giriş kutusuna koyar (otomatik GÖNDERMEZ — kontrol
 * kullanıcıda kalır). Bellek içi tek değer; kalıcılık gerekmez.
 */
let pendingMessage: string | null = null;

export function setPendingChatMessage(message: string): void {
  pendingMessage = message;
}

export function consumePendingChatMessage(): string | null {
  const message = pendingMessage;
  pendingMessage = null;
  return message;
}

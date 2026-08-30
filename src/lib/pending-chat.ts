/**
 * Ekranlar arası sohbet köprüsü (Dalga 4.2 + 2026-08-30).
 * Felsefe Yolları bir yol seçince mesajı buraya bırakır; sohbet odaklanınca
 * alır. autoSend=true ise giriş kutusuna koyup GÖNDERİR — "Bu yolla sohbete
 * başla" gerçekten yola işler. Bellek içi; kalıcılık gerekmez.
 */
export type PendingChat = {
  message: string;
  autoSend: boolean;
};

let pending: PendingChat | null = null;

export function setPendingChatMessage(message: string, autoSend = false): void {
  pending = { message, autoSend };
}

export function peekPendingChatMessage(): PendingChat | null {
  return pending;
}

export function consumePendingChatMessage(): PendingChat | null {
  const value = pending;
  pending = null;
  return value;
}

/** Yalnız https görsel adresini bırakır. Boş, http ve süslü yer tutucu URI'ler kartı kırmaz. */
const HTTPS_IMAGE = /^https:\/\/[^\s]+$/i;

export function safeImageUri(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const uri = value.trim();
  if (!HTTPS_IMAGE.test(uri)) return null;
  return uri;
}

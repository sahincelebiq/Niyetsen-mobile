/** API isteklerine eklenen uygulama dili (UI locale). Circular import yok. */
let currentLocale = 'tr';

export function setApiLocale(locale: string) {
  currentLocale = locale || 'tr';
}

export function getApiLocale(): string {
  return currentLocale;
}

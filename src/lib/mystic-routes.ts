import type { Href } from 'expo-router';

/** Fal türü — query string NativeTabs'te düşer; Stack params kalır. */
export function falHref(kind: 'kahve' | 'el'): Href {
  return { pathname: '/fal', params: { kind } } as Href;
}

export const mysticHref = {
  hub: '/mystic' as Href,
  chat: '/mistik-sohbet' as Href,
  tarot: '/tarot' as Href,
  astroloji: '/astroloji' as Href,
  history: '/fal-gecmisi' as Href,
  kahve: falHref('kahve'),
  el: falHref('el'),
  today: '/daily' as Href,
} as const;

export function isMysticPath(pathname: string): boolean {
  const leaf = pathname.split('/').filter(Boolean).pop() ?? '';
  return (
    leaf === 'mystic' ||
    leaf === 'mistik-sohbet' ||
    leaf === 'tarot' ||
    leaf === 'fal' ||
    leaf === 'fal-gecmisi' ||
    leaf === 'astroloji'
  );
}

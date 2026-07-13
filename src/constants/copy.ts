/** Kullanıcıya görünen metinler — Niyetsen tonu: utandırmayan, potansiyel odaklı. */

export const Copy = {
  brand: {
    tagline: 'niyetini yaşa',
  },
  chat: {
    title: 'Niyet Rehberi',
    subtitle: 'Potansiyelini ortaya çıkart',
    streakActive: (days: number) =>
      `${days} gündür zincirini koruyorsun — her halka seni güçlendirir.`,
    streakNew: 'Bugün atacağın küçük bir adım, yarının zincirini başlatır.',
    inputPlaceholder: 'Niyetini yaz…',
    thinking: 'düşünüyor…',
    planCta: 'Planını Oluştur ✨',
    planReadyHint:
      'Bu niyetin planı hazır. Yeni kapsamlı plan için ☰ menüden Yeni Niyet Başlat.',
  },
  daily: {
    title: 'Bugün',
    subtitle: 'Küçük adımlar, kırılmayan zincir',
    emptyTitle: 'Bugün sakin bir gün',
    emptyBody:
      'Bugüne atanmış görev görünmüyor. Planım sekmesinden gelecek halkalarına göz atabilirsin.',
    complete: 'Tamamla',
    addProof: 'Kanıt ekle',
    chainAdded: (pts: number) => `Zincire eklendi · +${pts} puan`,
    tinyPrefix: 'En küçük halka',
  },
  chain: {
    title: 'Zincir',
    subtitle: 'Bıraktığın izler burada birikir',
    heroLabel: 'Güncel zincir',
    heroHint: 'Bugünkü görevlerini de bitirirsen zincir uzamaya devam eder.',
    categories: 'Gelişim alanların',
    totalPoints: 'Toplam puan',
    gameState: 'Oyun durumu',
    pointsFloor: 'Puan tabanı sıfırdır.',
    overallRank: 'GENEL RÜTBE',
  },
  plan: {
    title: 'Planım',
    subtitle: 'Hayatından türeyen görselli yol haritan',
  },
} as const;

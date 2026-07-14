/** Kullanıcıya görünen metinler — Niyetsen tonu: utandırmayan, potansiyel odaklı. */

export const Copy = {
  brand: {
    tagline: 'niyetini yaşa',
  },
  chat: {
    title: 'Niyetsen',
    subtitle: 'Yanındaki disiplin ortağın',
    streakActive: (days: number) =>
      `${days} gündür zincirini koruyorsun — her halka seni güçlendirir.`,
    streakNew: 'Bugün atacağın küçük bir adım, yarının zincirini başlatır.',
    inputPlaceholder: 'Niyetini yaz…',
    thinking: 'düşünüyor…',
    planCta: 'Planını Oluştur ✨',
    planReadyHint:
      'Bu niyetin planı hazır. Yeni kapsamlı plan için ☰ menüden Yeni Niyet Başlat.',
    suggestions: ['Birini arayacağım', 'Erken yatacağım', 'Kitap okuyacağım'],
  },
  profile: {
    title: 'Profil',
    subtitle: 'Hesabın ve ilerlemen',
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
    subtitle: 'Vizyon panon — bugünün görevleri buradan doğar',
    switchPlan: 'Plan değiştir',
    emptyBody:
      'Henüz bir planın yok. Sohbete başlayıp bu yılki niyetini anlat, sana özel görselli planını birlikte çıkaralım.',
    startChat: 'Sohbete Başla',
    alreadyExists:
      'Bu niyet için plan zaten oluşturulmuş. Yeni plan için ☰ menüden Yeni Niyet Başlat.',
  },
  paywall: {
    title: 'Zincirin seni bekliyor',
    body:
      'Planın hazır, ritmin başladı. 7 günlük denemen bitti — devam etmek için aboneliğini seç. Verilerin silinmez; yalnızca erişim kilitlenir.',
    trialEnded: 'Deneme süren doldu.',
    renewalNote:
      'Abonelik, seçtiğin dönemin sonunda otomatik yenilenir. İptal App Store / Google Play hesap ayarlarından yapılır. Yalnız mağaza içi satın alma (IAP).',
  },
} as const;

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
    emptyInvite: 'Nereden başlamak istersin?',
    suggestions: [
      'Bu yıl ne değişsin?',
      'Daha disiplinli olmak istiyorum',
      'Sağlığımı toparlamak istiyorum',
    ],
  },
  profile: {
    title: 'Profil',
    subtitle: 'Hesabın ve ilerlemen',
  },
  daily: {
    title: 'Bugün',
    subtitle: 'Küçük adımlar, kırılmayan zincir',
    emptyTitle: 'Bugün için görev yok',
    emptyBody:
      'Planın geride kalmış olabilir. Bu haftanın görevlerini yükle — veya bonus dene.',
    emptyCta: 'Bonusa bak',
    extendCta: 'Bu haftanın görevlerini yükle',
    extending: 'Görevler üretiliyor…',
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
    taskActionsTitle: 'Görevi yönet',
    taskActionsHint: 'Yalnız bekleyen görevler düzenlenebilir.',
    move: 'Taşı',
    edit: 'Düzenle',
    delete: 'Sil',
    cancel: 'Vazgeç',
    moveTitle: 'Görevi taşı',
    moveHint: 'Bugünden itibaren bir gün seç. Geçmişe taşınamaz.',
    editTitle: 'Görevi düzenle',
    editHint: 'Görev başlığını güncelle.',
    titlePlaceholder: 'Görev başlığı',
    save: 'Kaydet',
    deleteConfirmTitle: 'Görevi sil',
    deleteConfirmBody: 'Bu görev plandan kaldırılacak. Puan veya ceza işlemez.',
    deleteConfirmAction: 'Sil',
    addTask: 'Görev ekle',
    addTaskTitle: 'Yeni görev',
    addTaskHint: 'Bu güne kendi görevini ekle — tamamlayınca +50 yolu açılır.',
    addTaskAction: 'Ekle',
    notEditable: 'Bu görev artık düzenlenemez.',
    pastDayBlocked: 'Geçmiş güne görev eklenemez veya taşınamaz.',
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

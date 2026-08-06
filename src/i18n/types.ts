/** Desteklenen uygulama dilleri / bölgeler (Play Store çok dilli çıkış). */
export type AppLocale = 'tr' | 'en-US' | 'en-GB' | 'de' | 'fr' | 'ar';

export type RegionId = 'TR' | 'US' | 'UK' | 'DE' | 'FR' | 'AR';

export type RegionOption = {
  id: RegionId;
  /** Cihaz timezone (IANA). */
  timezone: string;
  /** UI + AI yanıt dili. */
  locale: AppLocale;
  /** Seçicide gösterilen bayrak/etiket (dile göre çevrilir). */
  labelKey: keyof Messages['regions'];
};

export type Messages = {
  brand: { tagline: string };
  common: {
    continue: string;
    save: string;
    cancel: string;
    retry: string;
    loading: string;
    back: string;
    next: string;
    done: string;
    errorGeneric: string;
    offlineBanner: string;
  };
  tabs: {
    chat: string;
    today: string;
    plan: string;
    chain: string;
    profile: string;
  };
  auth: {
    hero: string;
    welcomeBack: string;
    startJourney: string;
    newPassword: string;
    email: string;
    password: string;
    signIn: string;
    signUp: string;
    switchToSignUp: string;
    switchToSignIn: string;
    verifySent: string;
    passwordUpdated: string;
    invalidCredentials: string;
    languageRegion: string;
    languageRegionHint: string;
  };
  onboarding: {
    regionTitle: string;
    regionHint: string;
    nameTitle: string;
    genderTitle: string;
    birthTitle: string;
    notifTitle: string;
    consentTitle: string;
    nameRequired: string;
    birthInvalid: string;
    notifRequired: string;
    consentRequired: string;
    birthSaveInvalid: string;
    profileSaveFailed: string;
  };
  regions: {
    TR: string;
    US: string;
    UK: string;
    DE: string;
    FR: string;
    AR: string;
  };
  locales: {
    tr: string;
    'en-US': string;
    'en-GB': string;
    de: string;
    fr: string;
    ar: string;
  };
  chat: {
    title: string;
    subtitle: string;
    streakActive: (days: number) => string;
    streakNew: string;
    inputPlaceholder: string;
    thinking: string;
    planCta: string;
    planReadyHint: string;
    emptyInvite: string;
    suggestions: string[];
  };
  daily: {
    title: string;
    subtitle: string;
    emptyTitle: string;
    emptyBody: string;
    emptyCta: string;
    extendCta: string;
    extending: string;
    complete: string;
    addProof: string;
    chainAdded: (pts: number) => string;
    tinyPrefix: string;
  };
  chain: {
    title: string;
    subtitle: string;
    heroLabel: string;
    heroHint: string;
    categories: string;
    totalPoints: string;
    gameState: string;
    pointsFloor: string;
    overallRank: string;
    reportReady: string;
    reportReadyHint: string;
    reportOpen: string;
    reportProHint: string;
  };
  plan: {
    title: string;
    subtitle: string;
    switchPlan: string;
    emptyBody: string;
    startChat: string;
    alreadyExists: string;
    newPlan: string;
    taskActionsTitle: string;
    taskActionsHint: string;
    move: string;
    edit: string;
    delete: string;
    cancel: string;
    moveTitle: string;
    moveHint: string;
    editTitle: string;
    editHint: string;
    titlePlaceholder: string;
    save: string;
    deleteConfirmTitle: string;
    deleteConfirmBody: string;
    deleteConfirmAction: string;
    addTask: string;
    addTaskTitle: string;
    addTaskHint: string;
    addTaskAction: string;
    notEditable: string;
    pastDayBlocked: string;
    titleRequired: string;
  };
  profile: {
    title: string;
    subtitle: string;
    appearance: string;
    light: string;
    dark: string;
    language: string;
    mystic: string;
    mysticHintPro: string;
    mysticHintFree: string;
    open: string;
  };
  gender: {
    kadın: string;
    erkek: string;
    'belirtmek istemiyorum': string;
  };
  paywall: {
    title: string;
    body: string;
    trialEnded: string;
    renewalNote: string;
  };
};

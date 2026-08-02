/**
 * Niyetsen — Backend API İstemcisi
 * Tüm tipler app/models/schemas.py ile birebir eşleşir; alan adlarını değiştirme.
 * Kimlik: dev'de X-User-Id header'ı (backend AUTH_DISABLED=true iken). Kullanıcı
 * kimliği cihazda AsyncStorage'da saklanır — CLAUDE.md kuralı: localStorage YOK,
 * Expo'da AsyncStorage/SecureStore kullan.
 */
import { supabase } from '@/lib/supabase';
import { ApiTimeoutMs, ChatTimeoutMs, PlanTimeoutMs, ProofTimeoutMs } from '@/constants/theme';
import { Platform } from 'react-native';
import * as Device from 'expo-device';

const CONFIGURED_BASE_URL = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, '');

// Prod (Railway) API — public URL, sır değildir. EXPO_PUBLIC_API_URL unutulursa
// release build localhost'a düşüp tamamen ölü kalıyordu; artık prod URL'e düşer.
const PRODUCTION_BASE_URL = 'https://api-production-86f1.up.railway.app';

function getBaseUrl(): string {
  // An explicit URL must win on every platform. In particular, Expo web may be
  // served from localhost while intentionally talking to the Railway API.
  if (CONFIGURED_BASE_URL) {
    return CONFIGURED_BASE_URL;
  }
  if (!__DEV__) {
    return PRODUCTION_BASE_URL;
  }
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:8000`;
  }
  // Android emulator: host machine is 10.0.2.2 (physical device needs LAN IP in .env).
  if (Platform.OS === 'android' && !Device.isDevice) {
    return 'http://10.0.2.2:8000';
  }
  return 'http://localhost:8000';
}

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function isPaywallError(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 402 || error.code === 'paywall_required');
}

export function generateMessageId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function request<T>(
  path: string,
  init?: RequestInit,
  options?: { timeoutMs?: number },
): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  if (!accessToken) {
    throw new ApiError(401, 'Oturumun sona erdi. Lütfen yeniden giriş yap.');
  }
  let res: Response;
  const controller = new AbortController();
  const timeoutMs = options?.timeoutMs ?? ApiTimeoutMs;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const isMultipart = typeof FormData !== 'undefined' && init?.body instanceof FormData;
    res = await fetch(`${getBaseUrl()}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        ...(!isMultipart && { 'Content-Type': 'application/json' }),
        Authorization: `Bearer ${accessToken}`,
        ...(init?.headers ?? {}),
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError(
        0,
        'Sunucu yanıt vermedi. Biraz bekleyip tekrar dene — bağlantın yavaş olabilir.',
      );
    }
    throw new ApiError(
      0,
      'Sunucuya ulaşılamıyor. Backend çalışıyor mu ve EXPO_PUBLIC_API_URL doğru mu kontrol et.',
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    let detail = 'Şu an yıldızlara ulaşamıyorum, birazdan tekrar dener misin? ✨';
    let code: string | undefined;
    try {
      const body = await res.json();
      if (body?.detail) {
        if (typeof body.detail === 'string') {
          detail = body.detail;
        } else if (typeof body.detail === 'object') {
          detail = body.detail.message ?? detail;
          code = body.detail.code;
        }
      }
    } catch {
      // yanıt JSON değilse varsayılan mesaj kalır
    }
    if (res.status === 429) {
      detail = 'Çok hızlı denedin — bir dakika bekleyip tekrar dene.';
    }
    throw new ApiError(res.status, detail, code);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// ---------- Tipler (app/models/schemas.py) ----------
export type ChatMessage = { id: string; role: 'user' | 'assistant'; content: string };
export type ToolCall = { name: string; args: Record<string, unknown> };

export type CollectedIntent = {
  city: string | null;
  interests: string[];
  weekly_hours: number | null;
  duration_days: number | null;
  social_pref: string | null;
  budget: string | null;
};

export const EMPTY_COLLECTED: CollectedIntent = {
  city: null,
  interests: [],
  weekly_hours: null,
  duration_days: null,
  social_pref: null,
  budget: null,
};

export type ChatResponse = {
  reply: string;
  ready_for_plan: boolean;
  collected: CollectedIntent;
  crisis: boolean;
  message_id: string | null;
  tool_calls: ToolCall[];
  /** Tek dokunuşluk hızlı yanıtlar (boş olabilir). */
  suggestions?: string[];
};

export type ChatSession = {
  messages: ChatMessage[];
  collected: CollectedIntent;
  ready_for_plan: boolean;
  plan_has_content: boolean;
  active_plan_name: string;
};

export type ChatGreeting = {
  message: string;
};

export type AttachmentIngest = {
  filename: string;
  summary: string;
  mime_type: string;
};

export const CATEGORIES = [
  'İrade',
  'İstikrar',
  'Disiplin',
  'Özgüven',
  'Sosyallik',
  'Özsaygı',
] as const;
export type Category = (typeof CATEGORIES)[number];
export type TaskStatus = 'pending' | 'done' | 'missed_silent' | 'missed_excused';

export type Task = {
  id: string;
  day: number;
  title: string;
  task_type: 'yer' | 'alışkanlık' | 'sosyal' | 'kişisel_gelişim';
  categories: Category[];
  image_keyword: string;
  image_url: string;
  image_source: string;
  image_attribution: string;
  image_attribution_url: string;
  duration_min: number;
  tiny_version: string;
  status: TaskStatus;
  date: string | null;
};

export type PlanDay = { day: number; theme: string; tasks: Task[] };

export type Plan = {
  id: string;
  duration_days: number;
  batch_generated_until: number;
  start_date: string;
  days: PlanDay[];
  name?: string;
  slot_no?: number;
  is_active?: boolean;
};

export type PlanSummary = {
  id: string;
  name: string;
  slot_no: number;
  is_active: boolean;
  has_content: boolean;
};

export type DailyTaskItem = {
  plan_id: string;
  plan_name: string;
  task: Task;
};

export type DailyTasksResponse = {
  items: DailyTaskItem[];
  needs_extension: boolean;
  plan_day: number | null;
  batch_generated_until: number | null;
  active_plan_name: string;
  has_active_plan: boolean;
};

export type GenderOption = 'kadın' | 'erkek' | 'belirtmek istemiyorum';

export const GENDER_OPTIONS: readonly GenderOption[] = [
  'kadın',
  'erkek',
  'belirtmek istemiyorum',
] as const;

export type UserProfile = {
  name: string | null;
  birth_date: string | null;
  zodiac_sign: string | null;
  gender: GenderOption | null;
  timezone: string;
  notif_hour: number;
  notif_minute: number;
  irade_modu_active: boolean;
  kvkk_consent_at: string | null;
  onboarding_complete: boolean;
};

export type SubscriptionStatus = 'free' | 'trial' | 'active' | 'expired' | 'cancelled';

export type SubscriptionInfo = {
  status: SubscriptionStatus;
  trial_started_at: string | null;
  trial_days_remaining: number;
  has_premium_access: boolean;
  show_paywall: boolean;
};

/** Backend henüz deploy edilmediyse veya endpoint ulaşılamazsa güvenli varsayılan. */
export const DEFAULT_SUBSCRIPTION: SubscriptionInfo = {
  status: 'free',
  trial_started_at: null,
  trial_days_remaining: 7,
  has_premium_access: true,
  show_paywall: false,
};

export type ProfileUpdate = {
  name: string;
  birth_date: string;
  timezone: string;
  notif_hour: number;
  notif_minute: number;
  kvkk_consent?: boolean;
  irade_modu_active?: boolean;
  gender?: GenderOption | null;
};

export type ConsentItem = {
  version: string;
  accepted: boolean;
  decided_at: string | null;
  required_for: string[];
};

export type ConsentStatus = {
  data_controller: string;
  contact_email: string;
  needs_reconsent: boolean;
  privacy_policy: ConsentItem;
  kvkk_explicit_consent: ConsentItem;
  ai_chat_processing: ConsentItem;
  proof_photo_processing: ConsentItem;
  marketing_communications: ConsentItem;
};

export type ConsentChoice = { accepted: boolean };

export type ConsentUpdate = {
  privacy_policy?: ConsentChoice;
  kvkk_explicit_consent?: ConsentChoice;
  ai_chat_processing?: ConsentChoice;
  proof_photo_processing?: ConsentChoice;
  marketing_communications?: ConsentChoice;
};

export type ProofResult = {
  approved: boolean;
  confidence: number;
  reason: string;
  attempt_no: number;
  accepted_by_declaration: boolean;
  proof_id?: string | null;
  photo_url?: string | null;
};

export type ScoreEvent = {
  category: string;
  delta: number;
  reason: string;
};

export type ExcuseResponse = {
  message: string;
  events: ScoreEvent[];
};

export type StateResponse = {
  points: Record<Category, number>;
  ranks: Record<Category, string>;
  overall_rank: string;
  streak_len: number;
  best_streak: number;
  freeze_tokens: number;
  excuse_count: number;
  silent_miss_streak: number;
};

export type PushPlatform = 'ios' | 'android';

export type BonusOffer = {
  id: string;
  title: string;
  tiny_instruction: string;
  category: Category;
  day: string;
  status: 'offered' | 'completed' | 'expired';
  points: number;
};

export type BonusCompletionResponse = {
  awarded: number;
};

// ---------- Çağrılar ----------
// Uzun sohbetlerde TÜM geçmişi göndermek istek gövdesini şişiriyor ve
// uygulamayı yoruyordu; backend zaten son 24 mesajı kullanıyor. Son 40 mesajı
// göndermek hem bağlamı korur hem yükü sabitler.
const CHAT_HISTORY_SEND_LIMIT = 40;

export function sendChatMessage(
  messages: ChatMessage[],
  collected: CollectedIntent,
): Promise<ChatResponse> {
  // Gemini 2.5 Flash sohbet yanıtı backend retry'larıyla uzayabilir; genel 20s
  // yerine sohbete özel geniş zaman aşımı kullan (erken iptal = "Sunucu yanıt vermedi").
  return request<ChatResponse>('/chat', {
    method: 'POST',
    body: JSON.stringify({
      messages: messages.slice(-CHAT_HISTORY_SEND_LIMIT),
      collected,
    }),
  }, { timeoutMs: ChatTimeoutMs });
}

/** Yeni sohbet başlat: aktif planın konuşma geçmişini sıfırlar (plan korunur). */
export function resetChat(): Promise<ChatGreeting> {
  return request<ChatGreeting>('/chat/reset', { method: 'POST' });
}

export function generatePlan(collected: CollectedIntent, durationDays = 7): Promise<Plan> {
  // Gemini 2.5 Pro plan üretimi backend'de 90 sn'ye kadar sürebilir.
  return request<Plan>('/plan/generate', {
    method: 'POST',
    body: JSON.stringify({ collected, duration_days: durationDays }),
  }, { timeoutMs: PlanTimeoutMs });
}

/** Var olan planı okur; hiç plan yoksa null döner (404'ü hata saymaz). */
export async function getCurrentPlan(): Promise<Plan | null> {
  try {
    return await request<Plan>('/plan');
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

/**
 * Sunucuda kalıcı sohbet geçmişi (Faz 2). Uygulama yeniden açılınca / yeni
 * cihazda kaldığı yerden devam etmek için kullanılır. Hiç mesaj yoksa [] döner.
 */
export function getChatSession(): Promise<ChatSession> {
  return request<ChatSession>('/chat/session', undefined, { timeoutMs: ChatTimeoutMs });
}

/** Boş sohbet veya yeni niyet başlangıcında saat/isim bazlı karşılama metni. */
export function getChatGreeting(): Promise<ChatGreeting> {
  return request<ChatGreeting>('/chat/greeting');
}

export async function uploadChatAttachment(
  uri: string,
  filename: string,
  mimeType: string,
): Promise<AttachmentIngest> {
  const body = new FormData();
  if (Platform.OS === 'web') {
    const blob = await fetch(uri).then((response) => response.blob());
    body.append('file', blob, filename);
  } else {
    body.append('file', {
      uri,
      name: filename,
      type: mimeType,
    } as unknown as Blob);
  }
  return request<AttachmentIngest>('/chat/attachment', { method: 'POST', body });
}

export function listProjects(): Promise<PlanSummary[]> {
  return request<PlanSummary[]>('/projects');
}

export function startNewProject(): Promise<PlanSummary> {
  return request<PlanSummary>('/projects/new', { method: 'POST' });
}

export function activateProject(planId: string): Promise<PlanSummary> {
  return request<PlanSummary>(`/projects/${encodeURIComponent(planId)}/activate`, {
    method: 'PUT',
  });
}

export function renameProject(planId: string, name: string): Promise<PlanSummary> {
  return request<PlanSummary>(`/projects/${encodeURIComponent(planId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  });
}

/** FAZ 8.3 — schemas.TaskEditRequest (time yok: title + date). */
export type TaskEditRequest = {
  title?: string;
  date?: string; // YYYY-MM-DD
};

/** FAZ 8.3 — schemas.TaskCreateRequest */
export type TaskCreateRequest = {
  title: string;
  categories?: Category[];
  tiny_version?: string;
  duration_min?: number;
};

export function editPlanTask(taskId: string, body: TaskEditRequest): Promise<Task> {
  return request<Task>(`/plan/tasks/${encodeURIComponent(taskId)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function addPlanTask(date: string, body: TaskCreateRequest): Promise<Task> {
  return request<Task>(`/plan/days/${encodeURIComponent(date)}/tasks`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function deletePlanTask(taskId: string): Promise<void> {
  return request<void>(`/plan/tasks/${encodeURIComponent(taskId)}`, {
    method: 'DELETE',
  });
}

export async function getDailyTasks(): Promise<DailyTasksResponse> {
  const raw = await request<DailyTasksResponse | DailyTaskItem[]>('/tasks/daily');
  // Eski backend dizi döndürebilir — geri uyum.
  if (Array.isArray(raw)) {
    return {
      items: raw,
      needs_extension: false,
      plan_day: null,
      batch_generated_until: null,
      active_plan_name: '',
      has_active_plan: raw.length > 0,
    };
  }
  return raw;
}

/** Bugünün günü üretilmemişse sonraki partiyi üretir (Gemini — yalnız kullanıcı CTA). */
export function ensureTodayPlan(): Promise<Plan> {
  return request<Plan>('/plan/ensure-today', { method: 'POST' }, { timeoutMs: PlanTimeoutMs });
}

export function getProfile(): Promise<UserProfile> {
  return request<UserProfile>('/me/profile');
}

export function getSubscription(): Promise<SubscriptionInfo> {
  return request<SubscriptionInfo>('/me/subscription');
}

/** Satın alma sonrası RevenueCat REST ile backend senkronu (webhook yedek). */
export function syncSubscription(): Promise<SubscriptionInfo> {
  return request<SubscriptionInfo>('/me/subscription/sync', { method: 'POST' });
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Webhook gecikmesinde premium erişimi bekler (KAPI 5). */
export async function waitForPremiumAccess(
  maxWaitMs = 20_000,
): Promise<SubscriptionInfo> {
  const deadline = Date.now() + maxWaitMs;
  let last: SubscriptionInfo | null = null;
  while (Date.now() < deadline) {
    try {
      last = await syncSubscription();
    } catch {
      try {
        last = await getSubscription();
      } catch {
        // yeniden dene
      }
    }
    if (last?.has_premium_access && !last.show_paywall) return last;
    await sleep(1500);
  }
  throw new ApiError(
    402,
    'Abonelik henüz aktifleşmedi. Birkaç saniye sonra Geri Yükle veya tekrar dene.',
    'paywall_required',
  );
}

export function updateProfile(profile: ProfileUpdate): Promise<UserProfile> {
  return request<UserProfile>('/me/profile', {
    method: 'PUT',
    body: JSON.stringify(profile),
  });
}

export function getConsentStatus(): Promise<ConsentStatus> {
  return request<ConsentStatus>('/me/consent');
}

export function updateConsent(choices: ConsentUpdate): Promise<ConsentStatus> {
  return request<ConsentStatus>('/me/consent', {
    method: 'POST',
    body: JSON.stringify(choices),
  });
}

export async function uploadTaskProof(
  taskId: string,
  photoUri: string,
  hasLocation = false,
): Promise<ProofResult> {
  const body = new FormData();
  const captureId = generateMessageId();
  const fileName = `proof-${taskId}-${Date.now()}.jpg`;
  if (Platform.OS === 'web') {
    const photoBlob = await fetch(photoUri).then((response) => response.blob());
    body.append('photo', photoBlob, fileName);
  } else {
    body.append('photo', {
      uri: photoUri,
      name: fileName,
      type: 'image/jpeg',
    } as unknown as Blob);
  }
  body.append('has_location', String(hasLocation));
  return request<ProofResult>(`/task/${encodeURIComponent(taskId)}/proof`, {
    method: 'POST',
    body,
    headers: {
      'X-Idempotency-Key': captureId,
    },
  }, { timeoutMs: ProofTimeoutMs });
}

export function excuseTask(taskId: string): Promise<ExcuseResponse> {
  return request<ExcuseResponse>(`/task/${encodeURIComponent(taskId)}/excuse`, {
    method: 'POST',
  });
}

export function getState(): Promise<StateResponse> {
  return request<StateResponse>('/me/state');
}

export function registerPushToken(token: string, platform: PushPlatform): Promise<void> {
  return request<void>('/me/push-token', {
    method: 'POST',
    body: JSON.stringify({ token, platform }),
  });
}

export function unregisterPushToken(token: string): Promise<void> {
  return request<void>(`/me/push-token?token=${encodeURIComponent(token)}`, {
    method: 'DELETE',
  });
}

export function offerBonus(): Promise<BonusOffer> {
  return request<BonusOffer>('/bonus/offer', { method: 'POST' });
}

export function getActiveBonus(): Promise<BonusOffer | null> {
  return request<BonusOffer | null>('/bonus/active');
}

export function completeBonus(
  offerId: string,
  completionId: string,
): Promise<BonusCompletionResponse> {
  return request<BonusCompletionResponse>(`/bonus/${encodeURIComponent(offerId)}/complete`, {
    method: 'POST',
    body: JSON.stringify({ completion_id: completionId }),
  });
}

export function deleteAccount(): Promise<void> {
  return request<void>('/me', { method: 'DELETE' });
}

export async function pingHealth(): Promise<boolean> {
  try {
    const base = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, '');
    if (!base) return false;
    const res = await fetch(`${base}/health`, { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}

// ---------- V2: Fal modülü (FAZ 7) ----------
// Backend sözleşmesi: app/models/schemas.py — alan adlarını değiştirme.

export type FortuneRightsItem = {
  limit: number; // -1 = sınırsız
  used: number;
  remaining: number;
};

export type FortuneRights = {
  is_premium: boolean;
  rights: Record<'tarot' | 'kahve' | 'el' | 'burc', FortuneRightsItem>;
  disclaimer: string;
};

export type TarotCard = {
  name: string;
  position: string;
  reversed: boolean;
  meaning: string;
};

export type TarotDraw = {
  cards: TarotCard[];
  interpretation: string;
  already_drawn_today: boolean;
  disclaimer: string;
};

export type PhotoFortune = {
  kind: 'kahve' | 'el';
  symbols: string[];
  interpretation: string;
  remaining_today: number;
  disclaimer: string;
};

export type Horoscope = {
  sign: string;
  day: string;
  interpretation: string;
  disclaimer: string;
};

export type RecapCard = {
  kind: 'intro' | 'journey' | 'tasks' | 'trait' | 'streak' | 'closing';
  title: string;
  headline: string;
  subtitle: string;
};

export type Recap = {
  period: string;
  start_date: string;
  end_date: string;
  days_in: number;
  completed_tasks: number;
  total_points: number;
  top_category: string;
  cards: RecapCard[];
};

export function getRecap(period: '7d' | '14d' | '30d' = '7d'): Promise<Recap> {
  return request<Recap>(`/me/recap?period=${period}`);
}

export function getFortuneRights(): Promise<FortuneRights> {
  return request<FortuneRights>('/fortune/rights');
}

export function drawTarot(question = ''): Promise<TarotDraw> {
  return request<TarotDraw>('/fortune/tarot', {
    method: 'POST',
    body: JSON.stringify({ question }),
  }, { timeoutMs: ChatTimeoutMs });
}

export function getDailyHoroscope(period: 'daily' | 'weekly' = 'daily'): Promise<Horoscope> {
  return request<Horoscope>(`/fortune/horoscope?period=${period}`, undefined, {
    timeoutMs: ChatTimeoutMs,
  });
}

export async function uploadFortunePhoto(
  kind: 'kahve' | 'el',
  photoUri: string,
): Promise<PhotoFortune> {
  const body = new FormData();
  const fileName = `fortune-${kind}-${Date.now()}.jpg`;
  if (Platform.OS === 'web') {
    const blob = await fetch(photoUri).then((response) => response.blob());
    body.append('photo', blob, fileName);
  } else {
    body.append('photo', {
      uri: photoUri,
      name: fileName,
      type: 'image/jpeg',
    } as unknown as Blob);
  }
  return request<PhotoFortune>(`/fortune/photo/${kind}`, {
    method: 'POST',
    body,
  }, { timeoutMs: ProofTimeoutMs });
}

export type FortuneHistoryItem = {
  id: string;
  type: 'tarot' | 'kahve' | 'el' | 'burc';
  day: string;
  result: {
    interpretation?: string;
    symbols?: string[];
    sign?: string;
    question?: string;
    cards?: TarotCard[];
  };
  created_at: string;
};

export function getFortuneHistory(limit = 30): Promise<FortuneHistoryItem[]> {
  return request<FortuneHistoryItem[]>(`/fortune/history?limit=${limit}`);
}

// ---------- Felsefe Yolları (İdol Modu, Dalga 4.2) ----------
export type PhilosophyPath = {
  name: string;
  tagline: string;
  philosophy: string;
  source_note: string;
};

export function getPhilosophyPaths(): Promise<PhilosophyPath[]> {
  return request<PhilosophyPath[]>('/paths');
}

// ---------- Sohbet oturumları (FAZ 7.6 — yeni sohbet eskiyi silmez) ----------
export type ChatThread = {
  id: string;
  title: string;
  is_active: boolean;
  updated_at: string;
};

export function listChatThreads(): Promise<ChatThread[]> {
  return request<ChatThread[]>('/chat/threads');
}

/** Geçmiş bir sohbete döner; o oturumun mesajlarını getirir. */
export function activateChatThread(threadId: string): Promise<ChatMessage[]> {
  return request<ChatMessage[]>(
    `/chat/threads/${encodeURIComponent(threadId)}/activate`,
    { method: 'POST' },
  );
}

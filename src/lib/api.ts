/**
 * Niyetsen — Backend API İstemcisi
 * Tüm tipler app/models/schemas.py ile birebir eşleşir; alan adlarını değiştirme.
 * Kimlik: dev'de X-User-Id header'ı (backend AUTH_DISABLED=true iken). Kullanıcı
 * kimliği cihazda AsyncStorage'da saklanır — CLAUDE.md kuralı: localStorage YOK,
 * Expo'da AsyncStorage/SecureStore kullan.
 */
import { supabase } from '@/lib/supabase';
import { Platform } from 'react-native';

const CONFIGURED_BASE_URL = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, '');

function getBaseUrl(): string {
  // An explicit URL must win on every platform. In particular, Expo web may be
  // served from localhost while intentionally talking to the Railway API.
  if (CONFIGURED_BASE_URL) {
    return CONFIGURED_BASE_URL;
  }
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:8000`;
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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  if (!accessToken) {
    throw new ApiError(401, 'Oturumun sona erdi. Lütfen yeniden giriş yap.');
  }
  let res: Response;
  try {
    const isMultipart = typeof FormData !== 'undefined' && init?.body instanceof FormData;
    res = await fetch(`${getBaseUrl()}${path}`, {
      ...init,
      headers: {
        ...(!isMultipart && { 'Content-Type': 'application/json' }),
        Authorization: `Bearer ${accessToken}`,
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw new ApiError(
      0,
      'Sunucuya ulaşılamıyor. Backend çalışıyor mu ve EXPO_PUBLIC_API_URL doğru mu kontrol et.',
    );
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
};

export type ChatSession = {
  messages: ChatMessage[];
  collected: CollectedIntent;
  ready_for_plan: boolean;
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

export type UserProfile = {
  name: string | null;
  birth_date: string | null;
  zodiac_sign: string | null;
  timezone: string;
  notif_hour: number;
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
  kvkk_consent?: boolean;
  irade_modu_active?: boolean;
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
export function sendChatMessage(
  messages: ChatMessage[],
  collected: CollectedIntent,
): Promise<ChatResponse> {
  return request<ChatResponse>('/chat', {
    method: 'POST',
    body: JSON.stringify({ messages, collected }),
  });
}

export function generatePlan(collected: CollectedIntent, durationDays = 7): Promise<Plan> {
  return request<Plan>('/plan/generate', {
    method: 'POST',
    body: JSON.stringify({ collected, duration_days: durationDays }),
  });
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
  return request<ChatSession>('/chat/session');
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

export function getDailyTasks(): Promise<DailyTaskItem[]> {
  return request<DailyTaskItem[]>('/tasks/daily');
}

export function getProfile(): Promise<UserProfile> {
  return request<UserProfile>('/me/profile');
}

export function getSubscription(): Promise<SubscriptionInfo> {
  return request<SubscriptionInfo>('/me/subscription');
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
  });
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

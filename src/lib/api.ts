/**
 * Niyetsen — Backend API İstemcisi
 * Tüm tipler app/models/schemas.py ile birebir eşleşir; alan adlarını değiştirme.
 * Kimlik: dev'de X-User-Id header'ı (backend AUTH_DISABLED=true iken). Kullanıcı
 * kimliği cihazda AsyncStorage'da saklanır — CLAUDE.md kuralı: localStorage YOK,
 * Expo'da AsyncStorage/SecureStore kullan.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_ID_KEY = 'niyetsen_user_id';

const BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/+$/, '');

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

let cachedUserId: string | null = null;

/** Cihaza özel anonim kullanıcı kimliği — yoksa üretilip AsyncStorage'a yazılır. */
export async function getUserId(): Promise<string> {
  if (cachedUserId) return cachedUserId;
  const stored = await AsyncStorage.getItem(USER_ID_KEY);
  if (stored) {
    cachedUserId = stored;
    return stored;
  }
  const fresh = generateId();
  await AsyncStorage.setItem(USER_ID_KEY, fresh);
  cachedUserId = fresh;
  return fresh;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const userId = await getUserId();
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId,
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
    try {
      const body = await res.json();
      if (body?.detail) detail = body.detail;
    } catch {
      // yanıt JSON değilse varsayılan mesaj kalır
    }
    throw new ApiError(res.status, detail);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// ---------- Tipler (app/models/schemas.py) ----------
export type ChatMessage = { role: 'user' | 'assistant'; content: string };

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
};

export type TaskStatus = 'pending' | 'done' | 'missed_silent' | 'missed_excused';

export type Task = {
  id: string;
  day: number;
  title: string;
  task_type: 'yer' | 'alışkanlık' | 'sosyal' | 'kişisel_gelişim';
  categories: string[];
  image_keyword: string;
  image_url: string;
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

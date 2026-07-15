#!/usr/bin/env node
/**
 * Mobil .env güvenlik kontrolü — service_role mobilde olmamalı.
 * Kullanım: npm run verify-env
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = resolve(root, '.env');

const FORBIDDEN_KEYS = [
  'EXPO_PUBLIC_SUPABASE_SERVICE_KEY',
  'EXPO_PUBLIC_SUPABASE_SECRET_KEY',
  'SUPABASE_SERVICE_KEY',
  'SUPABASE_SECRET_KEY',
];

const REQUIRED_HINT = [
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
];

function parseEnv(text) {
  const out = {};
  for (const line of text.split('\n')) {
    const s = line.trim();
    if (!s || s.startsWith('#') || !s.includes('=')) continue;
    const i = s.indexOf('=');
    out[s.slice(0, i).trim()] = s.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

function jwtRole(token) {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
    const json = Buffer.from(
      padded.replace(/-/g, '+').replace(/_/g, '/'),
      'base64',
    ).toString('utf8');
    return JSON.parse(json).role ?? null;
  } catch {
    return null;
  }
}

function assertPublishable(key) {
  if (!key) return 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY boş';
  if (key.startsWith('sb_secret_')) {
    return 'publishable alanı sb_secret_ içeriyor — service anahtarı mobilde yasak';
  }
  if (key.startsWith('eyJ') && jwtRole(key) === 'service_role') {
    return 'publishable alanı service_role JWT — anon anahtar gerekli';
  }
  return null;
}

if (!existsSync(envPath)) {
  console.error('❌ mobile/.env yok — .env.example kopyala');
  process.exit(1);
}

const env = parseEnv(readFileSync(envPath, 'utf8'));
const errors = [];

for (const key of FORBIDDEN_KEYS) {
  if (env[key]) errors.push(`${key} tanımlı — mobilde kaldır`);
}

const pubErr = assertPublishable(env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '');
if (pubErr) errors.push(pubErr);

for (const key of REQUIRED_HINT) {
  if (!env[key]) errors.push(`${key} eksik`);
}

if (errors.length) {
  console.error('❌ Mobil env güvenlik kontrolü başarısız:');
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log('✅ Mobil env: yalnızca publishable/anon — service_role yok');

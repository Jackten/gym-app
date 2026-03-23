import { createClient } from '@supabase/supabase-js';

const FALLBACK_SUPABASE_URL =
  'https://rgcnvghjmdkannkgocrj.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY =
  'sb_publishable_5fJLcvBiWvnED48jZigkKw_ICrWrWww';

const url = String(import.meta.env.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL).trim();
const anonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY).trim();

export const isSupabaseConfigured = Boolean(url && anonKey);

let client = null;

export function getSupabaseClient() {
  if (!isSupabaseConfigured) return null;
  if (client) return client;

  client = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  });

  return client;
}

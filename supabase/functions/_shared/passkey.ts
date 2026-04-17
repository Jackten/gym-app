import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

export const RP_NAME = 'Pelayo Wellness';
export const PRIMARY_PROD_RP_ID = 'pelayowellness.com';
export const PRIMARY_PROD_ORIGINS = new Set([
  'https://pelayowellness.com',
  'https://www.pelayowellness.com',
]);
export const LEGACY_PROD_RP_ID = 'gym-app-navy-nine.vercel.app';

const DEV_RP_IDS = new Set(['localhost', '127.0.0.1']);

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

export function getEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export function getSupabaseAdmin() {
  const url = getEnv('SUPABASE_URL');
  const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function getSupabaseAnonWithAuthHeader(authorization: string | null) {
  const url = getEnv('SUPABASE_URL');
  const anonKey = getEnv('SUPABASE_ANON_KEY');

  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: authorization ? { Authorization: authorization } : {},
    },
  });
}

export function getSupabaseAnon() {
  const url = getEnv('SUPABASE_URL');
  const anonKey = getEnv('SUPABASE_ANON_KEY');

  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function resolveRpContext(request: Request) {
  const originHeader = request.headers.get('origin') || '';
  let origin: URL;

  try {
    origin = new URL(originHeader);
  } catch {
    throw new Error('Missing or invalid Origin header.');
  }

  const host = origin.hostname;

  if (PRIMARY_PROD_ORIGINS.has(origin.origin)) {
    return {
      rpId: PRIMARY_PROD_RP_ID,
      currentOrigin: origin.origin,
      expectedOrigins: [...PRIMARY_PROD_ORIGINS],
    };
  }

  if (host === LEGACY_PROD_RP_ID) {
    return {
      rpId: LEGACY_PROD_RP_ID,
      currentOrigin: origin.origin,
      expectedOrigins: [`https://${LEGACY_PROD_RP_ID}`],
    };
  }

  if (DEV_RP_IDS.has(host)) {
    return {
      rpId: host,
      currentOrigin: origin.origin,
      expectedOrigins: [
        origin.origin,
        'http://localhost:5173',
        'http://localhost:4173',
        'http://localhost:3000',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:4173',
        'http://127.0.0.1:3000',
      ],
    };
  }

  throw new Error(`Origin is not allowed for passkey auth: ${origin.origin}`);
}

export async function cleanExpiredChallenges(adminClient: ReturnType<typeof getSupabaseAdmin>) {
  const nowIso = new Date().toISOString();
  await adminClient.from('passkey_challenges').delete().lt('expires_at', nowIso);
}

export function mapDeviceType(value: string | undefined): 'single_device' | 'multi_device' {
  if (!value) return 'single_device';
  if (value === 'multiDevice' || value === 'multi_device') return 'multi_device';
  return 'single_device';
}

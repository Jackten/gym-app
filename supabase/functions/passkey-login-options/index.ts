import { generateAuthenticationOptions } from 'npm:@simplewebauthn/server@13.3.0';
import {
  cleanExpiredChallenges,
  corsHeaders,
  getSupabaseAdmin,
  jsonResponse,
  resolveRpContext,
} from '../_shared/passkey.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

    const { rpId } = resolveRpContext(request);
    const admin = getSupabaseAdmin();
    await cleanExpiredChallenges(admin);

    const { data: credentials, error: credentialError } = await admin
      .from('passkey_credentials')
      .select('credential_id, transports');

    if (credentialError) return jsonResponse({ error: credentialError.message }, 500);

    if (!credentials?.length) {
      return jsonResponse({ error: 'No passkeys registered yet. Use email or Google first.' }, 404);
    }

    const options = await generateAuthenticationOptions({
      rpID: rpId,
      timeout: 5 * 60 * 1000,
      userVerification: 'preferred',
      allowCredentials: credentials.map((credential) => ({
        id: credential.credential_id,
        type: 'public-key',
        transports: Array.isArray(credential.transports) ? credential.transports : undefined,
      })),
    });

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const { data: challengeRow, error: challengeError } = await admin
      .from('passkey_challenges')
      .insert({
        challenge: options.challenge,
        ceremony: 'authentication',
        rp_id: rpId,
        expires_at: expiresAt,
      })
      .select('id')
      .single();

    if (challengeError || !challengeRow) {
      return jsonResponse({ error: challengeError?.message || 'Failed to persist challenge.' }, 500);
    }

    return jsonResponse({
      options,
      challengeId: challengeRow.id,
      expiresAt,
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Unexpected error' }, 500);
  }
});

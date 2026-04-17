import { generateRegistrationOptions } from 'npm:@simplewebauthn/server@13.3.0';
import {
  cleanExpiredChallenges,
  corsHeaders,
  getSupabaseAdmin,
  getSupabaseAnonWithAuthHeader,
  jsonResponse,
  resolveRpContext,
  RP_NAME,
} from '../_shared/passkey.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

    const authClient = getSupabaseAnonWithAuthHeader(request.headers.get('authorization'));
    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser();

    if (userError || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const { rpId } = resolveRpContext(request);
    const body = await request.json().catch(() => ({}));
    const friendlyName = typeof body?.friendlyName === 'string' ? body.friendlyName.trim().slice(0, 128) : null;

    const admin = getSupabaseAdmin();
    await cleanExpiredChallenges(admin);

    const { data: existingCredentials, error: credentialError } = await admin
      .from('passkey_credentials')
      .select('credential_id, transports')
      .eq('user_id', user.id)
      .eq('rp_id', rpId);

    if (credentialError) {
      return jsonResponse({ error: credentialError.message }, 500);
    }

    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: rpId,
      userID: user.id,
      userName: user.email ?? user.id,
      userDisplayName:
        typeof user.user_metadata?.full_name === 'string'
          ? user.user_metadata.full_name
          : (user.user_metadata?.name as string | undefined) ?? user.email ?? 'Pelayo Member',
      timeout: 5 * 60 * 1000,
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
      excludeCredentials: (existingCredentials ?? []).map((credential) => ({
        id: credential.credential_id,
        type: 'public-key',
        transports: Array.isArray(credential.transports) ? credential.transports : undefined,
      })),
    });

    const challenge = options.challenge;
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const { error: challengeError } = await admin.from('passkey_challenges').insert({
      challenge,
      ceremony: 'registration',
      user_id: user.id,
      rp_id: rpId,
      friendly_name: friendlyName,
      expires_at: expiresAt,
    });

    if (challengeError) {
      return jsonResponse({ error: challengeError.message }, 500);
    }

    return jsonResponse({
      options,
      expiresAt,
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Unexpected error' }, 500);
  }
});

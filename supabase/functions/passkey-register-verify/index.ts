import { verifyRegistrationResponse } from 'npm:@simplewebauthn/server@13.3.0';
import { isoBase64URL } from 'npm:@simplewebauthn/server@13.3.0/helpers';
import {
  cleanExpiredChallenges,
  corsHeaders,
  getSupabaseAdmin,
  getSupabaseAnonWithAuthHeader,
  jsonResponse,
  mapDeviceType,
  resolveRpContext,
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

    const { rpId, expectedOrigins } = resolveRpContext(request);
    const body = await request.json();
    const response = body?.response;

    if (!response) {
      return jsonResponse({ error: 'Missing registration response payload.' }, 400);
    }

    const admin = getSupabaseAdmin();
    await cleanExpiredChallenges(admin);

    const nowIso = new Date().toISOString();
    const { data: challengeRows, error: challengeError } = await admin
      .from('passkey_challenges')
      .select('id, challenge, friendly_name')
      .eq('ceremony', 'registration')
      .eq('user_id', user.id)
      .eq('rp_id', rpId)
      .is('used_at', null)
      .gt('expires_at', nowIso)
      .order('created_at', { ascending: false })
      .limit(1);

    if (challengeError) return jsonResponse({ error: challengeError.message }, 500);

    const challengeRow = challengeRows?.[0];
    if (!challengeRow) {
      return jsonResponse({ error: 'No active registration challenge. Start again.' }, 400);
    }

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challengeRow.challenge,
      expectedOrigin: expectedOrigins,
      expectedRPID: rpId,
      requireUserVerification: true,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return jsonResponse({ error: 'Passkey registration verification failed.' }, 400);
    }

    const registrationInfo = verification.registrationInfo;

    const credentialId =
      registrationInfo.credential?.id ??
      (registrationInfo.credentialID ? isoBase64URL.fromBuffer(registrationInfo.credentialID) : response.id);

    const publicKeyBuffer = registrationInfo.credential?.publicKey ?? registrationInfo.credentialPublicKey;
    const counter = registrationInfo.credential?.counter ?? registrationInfo.counter ?? 0;
    const deviceType = mapDeviceType(registrationInfo.credential?.deviceType ?? registrationInfo.credentialDeviceType);
    const backedUp = registrationInfo.credential?.backedUp ?? registrationInfo.credentialBackedUp ?? false;

    if (!credentialId || !publicKeyBuffer) {
      return jsonResponse({ error: 'Passkey credential payload was incomplete.' }, 400);
    }

    const transports = Array.isArray(response?.response?.transports)
      ? response.response.transports.filter((v: unknown): v is string => typeof v === 'string')
      : [];

    const friendlyNameFromRequest = typeof body?.friendlyName === 'string' ? body.friendlyName.trim().slice(0, 128) : null;
    const friendlyName = friendlyNameFromRequest || challengeRow.friendly_name || 'Passkey';

    const { error: upsertError } = await admin.from('passkey_credentials').upsert(
      {
        user_id: user.id,
        credential_id: credentialId,
        public_key: isoBase64URL.fromBuffer(publicKeyBuffer),
        counter,
        device_type: deviceType,
        backed_up: backedUp,
        transports,
        friendly_name: friendlyName,
        last_used_at: new Date().toISOString(),
      },
      { onConflict: 'credential_id' },
    );

    if (upsertError) return jsonResponse({ error: upsertError.message }, 500);

    await admin.from('passkey_challenges').update({ used_at: nowIso }).eq('id', challengeRow.id);

    return jsonResponse({
      success: true,
      credentialId,
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Unexpected error' }, 500);
  }
});

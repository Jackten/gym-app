import { verifyAuthenticationResponse } from 'npm:@simplewebauthn/server@13.3.0';
import { isoBase64URL } from 'npm:@simplewebauthn/server@13.3.0/helpers';
import {
  cleanExpiredChallenges,
  corsHeaders,
  getSupabaseAdmin,
  getSupabaseAnon,
  jsonResponse,
  resolveRpContext,
} from '../_shared/passkey.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

    const body = await request.json();
    const response = body?.response;
    const challengeId = typeof body?.challengeId === 'string' ? body.challengeId : '';

    if (!response || !challengeId) {
      return jsonResponse({ error: 'Missing assertion response or challenge ID.' }, 400);
    }

    const { rpId, expectedOrigins } = resolveRpContext(request);
    const admin = getSupabaseAdmin();
    await cleanExpiredChallenges(admin);

    const nowIso = new Date().toISOString();
    const { data: challengeRow, error: challengeError } = await admin
      .from('passkey_challenges')
      .select('id, challenge')
      .eq('id', challengeId)
      .eq('ceremony', 'authentication')
      .eq('rp_id', rpId)
      .is('used_at', null)
      .gt('expires_at', nowIso)
      .maybeSingle();

    if (challengeError) return jsonResponse({ error: challengeError.message }, 500);
    if (!challengeRow) return jsonResponse({ error: 'Authentication challenge expired. Try again.' }, 400);

    const credentialId = response.id || (typeof response.rawId === 'string' ? response.rawId : null);
    if (!credentialId) return jsonResponse({ error: 'Missing credential ID in assertion.' }, 400);

    const { data: credentialRow, error: credentialError } = await admin
      .from('passkey_credentials')
      .select('id, user_id, credential_id, public_key, counter, transports')
      .eq('credential_id', credentialId)
      .maybeSingle();

    if (credentialError) return jsonResponse({ error: credentialError.message }, 500);
    if (!credentialRow) return jsonResponse({ error: 'Passkey not recognized.' }, 404);

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challengeRow.challenge,
      expectedOrigin: expectedOrigins,
      expectedRPID: rpId,
      requireUserVerification: true,
      credential: {
        id: credentialRow.credential_id,
        publicKey: isoBase64URL.toBuffer(credentialRow.public_key),
        counter: Number(credentialRow.counter ?? 0),
        transports: Array.isArray(credentialRow.transports) ? credentialRow.transports : undefined,
      },
    });

    if (!verification.verified) {
      return jsonResponse({ error: 'Passkey assertion verification failed.' }, 400);
    }

    const nextCounter = Number(verification.authenticationInfo.newCounter ?? credentialRow.counter ?? 0);

    const { error: updateCredentialError } = await admin
      .from('passkey_credentials')
      .update({ counter: nextCounter, last_used_at: nowIso })
      .eq('id', credentialRow.id);

    if (updateCredentialError) return jsonResponse({ error: updateCredentialError.message }, 500);

    await admin.from('passkey_challenges').update({ used_at: nowIso }).eq('id', challengeRow.id);

    const { data: userData, error: userError } = await admin.auth.admin.getUserById(credentialRow.user_id);
    if (userError || !userData.user?.email) {
      return jsonResponse({ error: 'Could not load account for passkey.' }, 500);
    }

    const email = userData.user.email;

    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: 'https://gym-app-navy-nine.vercel.app/signin',
      },
    });

    if (linkError) return jsonResponse({ error: linkError.message }, 500);

    const tokenHash = linkData?.properties?.hashed_token;
    if (!tokenHash) {
      return jsonResponse({ error: 'Unable to establish session token for passkey login.' }, 500);
    }

    const anonClient = getSupabaseAnon();
    const { data: otpData, error: verifyOtpError } = await anonClient.auth.verifyOtp({
      type: 'magiclink',
      token_hash: tokenHash,
    });

    if (verifyOtpError || !otpData.session) {
      return jsonResponse({ error: verifyOtpError?.message || 'Session creation failed.' }, 500);
    }

    return jsonResponse({
      success: true,
      session: otpData.session,
      user: otpData.user,
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Unexpected error' }, 500);
  }
});

import { startAuthentication, startRegistration } from '@simplewebauthn/browser';

function parseError(error, fallback) {
  if (!error) return fallback;

  if (typeof error === 'string') return error;

  if (error?.name === 'NotAllowedError') {
    return 'Passkey request was cancelled.';
  }

  if (error?.name === 'InvalidStateError') {
    return 'This passkey is already registered on your account.';
  }

  return error?.message || fallback;
}

async function invokeOrThrow(supabase, functionName, body) {
  const { data, error } = await supabase.functions.invoke(functionName, {
    body,
  });

  if (error) {
    let details = null;

    try {
      details = await error.context?.json?.();
    } catch {
      details = null;
    }

    const message = details?.error || error.message || `Request failed (${functionName})`;
    throw new Error(message);
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data;
}

export async function registerPasskeyCeremony({ supabase, friendlyName }) {
  const optionsPayload = await invokeOrThrow(supabase, 'passkey-register-options', {
    friendlyName,
  });

  const attestationResponse = await startRegistration({
    optionsJSON: optionsPayload.options,
  });

  return invokeOrThrow(supabase, 'passkey-register-verify', {
    response: attestationResponse,
    friendlyName,
  });
}

export async function loginWithPasskeyCeremony({ supabase }) {
  const optionsPayload = await invokeOrThrow(supabase, 'passkey-login-options', {});

  const assertionResponse = await startAuthentication({
    optionsJSON: optionsPayload.options,
  });

  const verifyPayload = await invokeOrThrow(supabase, 'passkey-login-verify', {
    response: assertionResponse,
    challengeId: optionsPayload.challengeId,
  });

  if (!verifyPayload?.session?.access_token || !verifyPayload?.session?.refresh_token) {
    throw new Error('Passkey verification succeeded, but no session was returned.');
  }

  return verifyPayload;
}

export function getPasskeyErrorMessage(error, fallback) {
  return parseError(error, fallback);
}

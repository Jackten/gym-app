const API_BASE = String(import.meta.env.VITE_AUTH_API_BASE_URL || '').replace(/\/+$/, '');

function withPath(path) {
  if (!API_BASE) {
    throw new Error('Email verification backend is not configured. Missing VITE_AUTH_API_BASE_URL.');
  }

  return `${API_BASE}${path}`;
}

async function postJson(path, payload) {
  const response = await fetch(withPath(path), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok || data?.ok === false) {
    throw new Error(data?.error || 'Email verification request failed.');
  }

  return data;
}

export async function requestEmailOtp(email) {
  return postJson('/v1/email-otp/request', { email });
}

export async function verifyEmailOtp({ email, code, requestId }) {
  return postJson('/v1/email-otp/verify', { email, code, requestId });
}

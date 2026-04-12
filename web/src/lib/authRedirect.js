const POST_AUTH_REDIRECT_KEY = 'pelayo-post-auth-redirect';
const AUTH_PUBLIC_PATHS = new Set(['/', '/signin', '/register', '/auth/callback']);

export function sanitizeAuthRedirect(pathname) {
  const value = String(pathname || '').trim();
  if (!value.startsWith('/')) return '/home';
  if (AUTH_PUBLIC_PATHS.has(value)) return '/home';
  return value;
}

export function rememberAuthRedirect(pathname) {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(POST_AUTH_REDIRECT_KEY, sanitizeAuthRedirect(pathname));
}

export function readAuthRedirect() {
  if (typeof window === 'undefined') return '/home';
  return sanitizeAuthRedirect(window.sessionStorage.getItem(POST_AUTH_REDIRECT_KEY));
}

export function consumeAuthRedirect() {
  const next = readAuthRedirect();
  if (typeof window !== 'undefined') {
    window.sessionStorage.removeItem(POST_AUTH_REDIRECT_KEY);
  }
  return next;
}

export function getAuthCallbackUrl() {
  if (typeof window === 'undefined') return undefined;
  return `${window.location.origin}/auth/callback`;
}

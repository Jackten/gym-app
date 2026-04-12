import { beforeEach, describe, expect, it } from 'vitest';
import {
  consumeAuthRedirect,
  readAuthRedirect,
  rememberAuthRedirect,
  sanitizeAuthRedirect,
} from './authRedirect';

function createStorage() {
  const store = new Map();
  return {
    clear: () => store.clear(),
    getItem: (key) => store.get(key) ?? null,
    removeItem: (key) => store.delete(key),
    setItem: (key, value) => store.set(key, String(value)),
  };
}

describe('authRedirect helpers', () => {
  beforeEach(() => {
    globalThis.window = {
      sessionStorage: createStorage(),
    };
    window.sessionStorage.clear();
  });

  it('normalizes invalid and public paths to /home', () => {
    expect(sanitizeAuthRedirect('')).toBe('/home');
    expect(sanitizeAuthRedirect('signin')).toBe('/home');
    expect(sanitizeAuthRedirect('/')).toBe('/home');
    expect(sanitizeAuthRedirect('/signin')).toBe('/home');
    expect(sanitizeAuthRedirect('/register')).toBe('/home');
    expect(sanitizeAuthRedirect('/auth/callback')).toBe('/home');
  });

  it('keeps protected app routes', () => {
    expect(sanitizeAuthRedirect('/calendar')).toBe('/calendar');
    expect(sanitizeAuthRedirect('/bookings')).toBe('/bookings');
  });

  it('stores and consumes the next redirect path safely', () => {
    rememberAuthRedirect('/calendar');
    expect(readAuthRedirect()).toBe('/calendar');
    expect(consumeAuthRedirect()).toBe('/calendar');
    expect(readAuthRedirect()).toBe('/home');
  });
});

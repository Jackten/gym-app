import { createSeedState } from '../data/seed';

const STORAGE_KEY = 'gym-booking-prototype-v2';

function isValidStateShape(value) {
  if (!value || typeof value !== 'object') return false;
  if (!Array.isArray(value.users)) return false;
  if (!Array.isArray(value.bookings)) return false;
  if (!Array.isArray(value.transactions)) return false;
  if (!value.wallets || typeof value.wallets !== 'object') return false;
  if (!Array.isArray(value.packages)) return false;
  if (typeof value.nextBookingId !== 'number') return false;
  if (typeof value.nextTransactionId !== 'number') return false;
  return true;
}

export function loadAppState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = createSeedState();
      saveAppState(seed);
      return seed;
    }

    const parsed = JSON.parse(raw);
    if (!isValidStateShape(parsed)) {
      throw new Error('Corrupt or outdated state');
    }

    return parsed;
  } catch {
    const seed = createSeedState();
    saveAppState(seed);
    return seed;
  }
}

export function saveAppState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetAppState() {
  const seed = createSeedState();
  saveAppState(seed);
  return seed;
}

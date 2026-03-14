import { createSeedState } from '../data/seed';

const STORAGE_KEY = 'gym-booking-prototype-v1';

export function loadAppState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = createSeedState();
      saveAppState(seed);
      return seed;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Corrupt state');
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

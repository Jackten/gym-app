import { EQUIPMENT_LABELS, LEGACY_EQUIPMENT_LABELS } from './constants';

export function formatDateTime(iso) {
  return new Date(iso).toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatDateInput(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function createLocalDate(dateInput, timeInput) {
  const [y, m, d] = dateInput.split('-').map(Number);
  const [hh, mm] = timeInput.split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0);
}

export function startOfTomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function sortByStartDesc(a, b) {
  return new Date(b.startISO) - new Date(a.startISO);
}

export function sortByStartAsc(a, b) {
  return new Date(a.startISO) - new Date(b.startISO);
}

export function toTitleCase(value = '') {
  return value
    .replace(/[-_]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function equipmentLabel(id) {
  return EQUIPMENT_LABELS[id] || LEGACY_EQUIPMENT_LABELS[id] || toTitleCase(id);
}

export function deriveNameFromEmail(email) {
  if (!email) return 'Pelayo Member';
  const local = email.split('@')[0] || '';
  const normalized = local.replace(/[._-]+/g, ' ').trim();
  return normalized ? toTitleCase(normalized) : 'Pelayo Member';
}

export function normalizePhone(raw) {
  if (!raw) return '';
  return raw.replace(/[^\d+]/g, '');
}

export function abbreviateWallet(address) {
  if (!address) return '';
  const trimmed = address.trim();
  if (trimmed.length <= 14) return trimmed;
  return `${trimmed.slice(0, 7)}…${trimmed.slice(-4)}`;
}

export function generateDemoCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function getNextUserId(state) {
  if (typeof state.nextUserId === 'number') {
    const value = state.nextUserId;
    state.nextUserId += 1;
    return `u${value}`;
  }
  const maxExisting = state.users.reduce((max, user) => {
    const match = String(user.id || '').match(/^u(\d+)$/);
    if (!match) return max;
    return Math.max(max, Number(match[1]));
  }, 0);
  state.nextUserId = maxExisting + 2;
  return `u${maxExisting + 1}`;
}

export function addAuthProvider(user, method) {
  const current = Array.isArray(user.authProviders) ? user.authProviders : [];
  if (!current.includes(method)) {
    user.authProviders = [...current, method];
  } else {
    user.authProviders = current;
  }
}

export function findUserByIdentity(state, identity) {
  const normalizedEmail = identity.email?.trim().toLowerCase() || '';
  const normalizedPhone = normalizePhone(identity.phone || '');
  const normalizedWallet = (identity.walletAddress || '').trim().toLowerCase();

  return state.users.find((c) => {
    if (normalizedEmail && c.email?.toLowerCase() === normalizedEmail) return true;
    if (normalizedPhone && normalizePhone(c.phone || '') === normalizedPhone) return true;
    if (normalizedWallet && c.walletAddress?.toLowerCase() === normalizedWallet) return true;
    return false;
  });
}

export function upsertUserFromIdentity(state, identity) {
  const normalizedEmail = identity.email?.trim().toLowerCase() || '';
  const normalizedPhone = normalizePhone(identity.phone || '');
  const normalizedWallet = (identity.walletAddress || '').trim().toLowerCase();

  let user = state.users.find((c) => {
    if (normalizedEmail && c.email?.toLowerCase() === normalizedEmail) return true;
    if (normalizedPhone && normalizePhone(c.phone || '') === normalizedPhone) return true;
    if (normalizedWallet && c.walletAddress?.toLowerCase() === normalizedWallet) return true;
    return false;
  });

  if (user) {
    if (normalizedEmail && !user.email) user.email = normalizedEmail;
    if (normalizedPhone && !user.phone) user.phone = normalizedPhone;
    if (normalizedWallet && !user.walletAddress) user.walletAddress = identity.walletAddress;
    if (identity.name && user.name === 'Pelayo Member') user.name = identity.name;
    addAuthProvider(user, identity.method);
    user.lastSignInAt = identity.timestamp;
    return { user, created: false };
  }

  const newUser = {
    id: getNextUserId(state),
    name: identity.name || deriveNameFromEmail(normalizedEmail),
    email: normalizedEmail || undefined,
    phone: normalizedPhone || undefined,
    walletAddress: identity.walletAddress || undefined,
    authProviders: [identity.method],
    memberSince: identity.timestamp,
    lastSignInAt: identity.timestamp,
  };

  state.users.push(newUser);
  state.wallets[newUser.id] = state.wallets[newUser.id] || 0;

  return { user: newUser, created: true };
}

export function addTransaction(draft, tx) {
  draft.transactions.push({
    ...tx,
    id: `t${draft.nextTransactionId}`,
  });
  draft.nextTransactionId += 1;
}

export function getDayName(date) {
  return date.toLocaleDateString([], { weekday: 'short' });
}

export function getDateNum(date) {
  return date.getDate();
}

export function getMonthShort(date) {
  return date.toLocaleDateString([], { month: 'short' });
}

export function formatDuration(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hrs} hr`;
  return `${hrs} hr ${mins} min`;
}

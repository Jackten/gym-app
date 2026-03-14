import React, { useEffect, useMemo, useState } from 'react';
import {
  calculateQuote,
  getDemandCount,
  getDemandTier,
  getOccupancyByBlock,
  getOccupancyMultiplier,
  getBaseCredits,
  isHoldActive,
  minutesUntil,
} from './lib/pricing';
import { loadAppState, resetAppState, saveAppState } from './lib/storage';
import { requestEmailOtp, verifyEmailOtp } from './lib/authApi';

const DURATION_OPTIONS = [30, 60, 120, 180];
const WORKOUT_TYPES = ['strength', 'cardio', 'conditioning', 'mobility', 'boxing', 'recovery'];
const AUTH_METHODS = [
  {
    id: 'google',
    title: 'Google',
    subtitle: 'Continue with your Google account',
    icon: '🔑',
  },
  {
    id: 'ethereum',
    title: 'Ethereum',
    subtitle: 'Connect wallet to sign in',
    icon: '⬡',
  },
  {
    id: 'phone',
    title: 'Phone',
    subtitle: 'SMS verification code',
    icon: '📱',
  },
  {
    id: 'email',
    title: 'Email',
    subtitle: 'Magic-code sign-in',
    icon: '✉️',
  },
];

const AUTH_VIEW_COPY = {
  signin: {
    eyebrow: 'Member Sign-in',
    title: 'Welcome back',
    blurb: 'Choose your preferred method to access your account.',
    ctaLabel: 'Continue',
    modeCopy: 'Sign in',
    switchText: 'New here? Create an account →',
  },
  register: {
    eyebrow: 'Create Account',
    title: 'Join Pelayo Wellness',
    blurb: 'Create your account to start booking premium training sessions.',
    ctaLabel: 'Create account',
    modeCopy: 'Register',
    switchText: 'Already have an account? Sign in →',
  },
};

const EQUIPMENT_TAXONOMY = [
  {
    id: 'cardio',
    title: 'Cardio',
    items: [
      { id: 'treadmill', label: 'Treadmill' },
      { id: 'assault-bike', label: 'Assault Bike' },
      { id: 'row-machine', label: 'Row Machine' },
      { id: 'ski-erg', label: 'Ski Erg' },
      { id: 'boxing', label: 'Boxing' },
      { id: 'cardio-other', label: 'Other Cardio' },
    ],
  },
  {
    id: 'weights',
    title: 'Weights',
    items: [
      { id: 'dumbbell', label: 'Dumbbell' },
      { id: 'barbell', label: 'Barbell' },
      { id: 'kettlebell', label: 'Kettlebell' },
      { id: 'cable-machine', label: 'Cable Machine' },
      { id: 'benches', label: 'Benches' },
      { id: 'weights-other', label: 'Other Weights' },
    ],
  },
  {
    id: 'body-weight',
    title: 'Body Weight',
    items: [
      { id: 'dips', label: 'Dips Station' },
      { id: 'rings', label: 'Rings' },
      { id: 'pull-up-bar', label: 'Pull-up Bar' },
      { id: 'ghd-machine', label: 'GHD Machine' },
      { id: 'bodyweight-other', label: 'Other Body Weight' },
    ],
  },
  {
    id: 'functional',
    title: 'Functional / Performance',
    items: [
      { id: 'sled', label: 'Sled' },
      { id: 'battle-ropes', label: 'Battle Ropes' },
      { id: 'mobility-zone', label: 'Mobility Zone' },
      { id: 'functional-other', label: 'Other Functional' },
    ],
  },
];

const EQUIPMENT_LABELS = EQUIPMENT_TAXONOMY.flatMap((group) => group.items).reduce((acc, item) => {
  acc[item.id] = item.label;
  return acc;
}, {});

const LEGACY_EQUIPMENT_LABELS = {
  rack: 'Squat Rack',
  barbell: 'Barbell',
  dumbbells: 'Dumbbell',
  bike: 'Assault Bike',
  rower: 'Row Machine',
  sled: 'Sled',
  mat: 'Mobility Mat',
  bench: 'Benches',
};

const QUICK_TIME_SLOTS = ['06:00', '07:00', '08:00', '12:00', '17:00', '18:00', '19:00', '20:00'];

const EMPTY_AUTH_FORM = {
  name: '',
  email: '',
  phone: '',
  code: '',
  walletAddress: '',
};

function formatDateTime(iso) {
  return new Date(iso).toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDateInput(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function createLocalDate(dateInput, timeInput) {
  const [y, m, d] = dateInput.split('-').map(Number);
  const [hh, mm] = timeInput.split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0);
}

function startOfTomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function sortByStartDesc(a, b) {
  return new Date(b.startISO) - new Date(a.startISO);
}

function toTitleCase(value = '') {
  return value
    .replace(/[-_]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function equipmentLabel(id) {
  return EQUIPMENT_LABELS[id] || LEGACY_EQUIPMENT_LABELS[id] || toTitleCase(id);
}

function deriveNameFromEmail(email) {
  if (!email) return 'Pelayo Member';
  const local = email.split('@')[0] || '';
  const normalized = local.replace(/[._-]+/g, ' ').trim();
  return normalized ? toTitleCase(normalized) : 'Pelayo Member';
}

function normalizePhone(raw) {
  if (!raw) return '';
  return raw.replace(/[^\d+]/g, '');
}

function getNextUserId(state) {
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

function addAuthProvider(user, method) {
  const current = Array.isArray(user.authProviders) ? user.authProviders : [];
  if (!current.includes(method)) {
    user.authProviders = [...current, method];
  } else {
    user.authProviders = current;
  }
}

function findUserByIdentity(state, identity) {
  const normalizedEmail = identity.email?.trim().toLowerCase() || '';
  const normalizedPhone = normalizePhone(identity.phone || '');
  const normalizedWallet = (identity.walletAddress || '').trim().toLowerCase();

  return state.users.find((candidate) => {
    if (normalizedEmail && candidate.email?.toLowerCase() === normalizedEmail) return true;
    if (normalizedPhone && normalizePhone(candidate.phone || '') === normalizedPhone) return true;
    if (normalizedWallet && candidate.walletAddress?.toLowerCase() === normalizedWallet) return true;
    return false;
  });
}

function upsertUserFromIdentity(state, identity) {
  const normalizedEmail = identity.email?.trim().toLowerCase() || '';
  const normalizedPhone = normalizePhone(identity.phone || '');
  const normalizedWallet = (identity.walletAddress || '').trim().toLowerCase();

  let user = state.users.find((candidate) => {
    if (normalizedEmail && candidate.email?.toLowerCase() === normalizedEmail) return true;
    if (normalizedPhone && normalizePhone(candidate.phone || '') === normalizedPhone) return true;
    if (normalizedWallet && candidate.walletAddress?.toLowerCase() === normalizedWallet) return true;
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

function abbreviateWallet(address) {
  if (!address) return '';
  const trimmed = address.trim();
  if (trimmed.length <= 14) return trimmed;
  return `${trimmed.slice(0, 7)}…${trimmed.slice(-4)}`;
}

function generateDemoCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export default function App() {
  const [appState, setAppState] = useState(() => loadAppState());
  const [nowMs, setNowMs] = useState(Date.now());
  const [notice, setNotice] = useState('');

  const [view, setView] = useState('landing');
  const [authMode, setAuthMode] = useState('signin');
  const [authMethod, setAuthMethod] = useState('google');
  const [authPending, setAuthPending] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [expectedCode, setExpectedCode] = useState('');
  const [emailOtpRequestId, setEmailOtpRequestId] = useState('');
  const [registrationResult, setRegistrationResult] = useState(null);

  const [authForm, setAuthForm] = useState(EMPTY_AUTH_FORM);

  const [bookingForm, setBookingForm] = useState(() => ({
    date: formatDateInput(startOfTomorrow()),
    time: '18:00',
    durationMinutes: 60,
    workoutType: 'strength',
    equipment: ['barbell'],
  }));

  const now = useMemo(
    () => new Date(nowMs + (appState.clockOffsetMinutes || 0) * 60_000),
    [nowMs, appState.clockOffsetMinutes],
  );

  const currentUser = appState.users.find((u) => u.id === appState.currentUserId) || null;

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    saveAppState(appState);
  }, [appState]);

  useEffect(() => {
    setAppState((prev) => {
      if (!prev.activeQuote) return prev;
      if (isHoldActive(prev.activeQuote, now)) return prev;
      return { ...prev, activeQuote: null };
    });
  }, [now]);

  useEffect(() => {
    if (!currentUser) return;
    if (view === 'account-ready') return;
    if (view === 'signin' || view === 'register') {
      setView('booking');
    }
  }, [currentUser, view]);

  // Auto-dismiss notices after 6 seconds
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 6000);
    return () => clearTimeout(timer);
  }, [notice]);
  const walletBalance = currentUser ? appState.wallets[currentUser.id] || 0 : 0;

  const activeQuote = appState.activeQuote && isHoldActive(appState.activeQuote, now) ? appState.activeQuote : null;

  const quoteSecondsLeft = activeQuote
    ? Math.max(0, Math.floor((new Date(activeQuote.holdExpiresAt).getTime() - now.getTime()) / 1000))
    : 0;

  const myBookings = useMemo(() => {
    if (!currentUser) return [];
    return appState.bookings.filter((b) => b.userId === currentUser.id).sort(sortByStartDesc);
  }, [appState.bookings, currentUser]);

  const allBookings = useMemo(() => [...appState.bookings].sort(sortByStartDesc), [appState.bookings]);

  const landingStats = useMemo(() => {
    const upcoming = appState.bookings.filter((booking) => {
      if (booking.status !== 'confirmed') return false;
      return new Date(booking.startISO) > now;
    });

    return {
      activeMembers: appState.users.length,
      upcomingSessions: upcoming.length,
      avgSessionCredits: upcoming.length
        ? Math.round(
            upcoming.reduce((sum, booking) => sum + (booking.pricing?.finalCredits || 0), 0) / Math.max(upcoming.length, 1),
          )
        : 0,
    };
  }, [appState.bookings, appState.users.length, now]);

  const slotRows = useMemo(() => {
    const rows = [];
    const candidateHours = [15, 16, 17, 18, 19, 20, 21];

    for (const hour of candidateHours) {
      const start = createLocalDate(bookingForm.date, `${String(hour).padStart(2, '0')}:00`);
      const end = new Date(start.getTime() + 60 * 60_000);

      const occupancy = getOccupancyByBlock({
        bookings: appState.bookings,
        startDate: start,
        endDate: end,
        now,
        hold: activeQuote,
        includeHold: true,
      });

      const maxExisting = Math.max(...occupancy.map((b) => b.existingCount));
      const nextOccupancy = Math.min(5, maxExisting + 1);
      const occupancyMultiplier = getOccupancyMultiplier(nextOccupancy);

      const demandCount = getDemandCount({
        bookings: appState.bookings,
        targetStartDate: start,
        targetEndDate: end,
        now,
      });
      const demandTier = getDemandTier(demandCount);

      const estFinalCredits = Math.round(getBaseCredits(60) * demandTier.multiplier * occupancyMultiplier);

      rows.push({
        hour,
        maxExisting,
        nextOccupancy,
        occupancyMultiplier,
        demandTier,
        demandCount,
        estFinalCredits,
      });
    }

    return rows;
  }, [appState.bookings, bookingForm.date, now, activeQuote]);

  function updateBookingForm(patch) {
    setBookingForm((prev) => ({ ...prev, ...patch }));
  }

  function toggleEquipment(itemId) {
    setBookingForm((prev) => {
      const exists = prev.equipment.includes(itemId);
      return {
        ...prev,
        equipment: exists ? prev.equipment.filter((x) => x !== itemId) : [...prev.equipment, itemId],
      };
    });
  }

  function startAuthFlow(mode) {
    if (mode === 'signin' && currentUser) {
      setView('booking');
      setNotice(`You're already signed in as ${currentUser.name}.`);
      return;
    }

    setAuthMode(mode);
    setAuthMethod('google');
    setAuthPending(false);
    setOtpSent(false);
    setExpectedCode('');
    setEmailOtpRequestId('');
    setAuthForm(EMPTY_AUTH_FORM);
    setRegistrationResult(null);
    setView(mode);
  }

  function switchAuthMode(mode) {
    setAuthMode(mode);
    setView(mode);
    setOtpSent(false);
    setExpectedCode('');
    setEmailOtpRequestId('');
    setAuthForm((prev) => ({
      ...prev,
      code: '',
    }));
  }

  async function connectWallet() {
    if (typeof window === 'undefined' || !window.ethereum) {
      setNotice('No injected wallet detected. Install MetaMask / Rabby or paste an address manually.');
      return;
    }

    try {
      setAuthPending(true);
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const first = accounts?.[0];
      if (!first) {
        setNotice('Wallet connected but no account was returned.');
        return;
      }

      setAuthForm((prev) => ({ ...prev, walletAddress: first }));
      setNotice(
        authMode === 'register'
          ? 'Wallet connected. Continue to create your Pelayo account.'
          : 'Wallet connected. Continue to sign in.',
      );
    } catch (error) {
      setNotice(`Wallet connection failed: ${error?.message || 'request rejected'}`);
    } finally {
      setAuthPending(false);
    }
  }

  function sendPhoneOtp() {
    const phone = normalizePhone(authForm.phone);
    if (!phone || phone.length < 8) {
      setNotice('Enter a valid phone number first.');
      return;
    }

    setAuthForm((prev) => ({ ...prev, phone, code: '' }));

    const demoCode = generateDemoCode();
    setExpectedCode(demoCode);
    setOtpSent(true);
    setEmailOtpRequestId('');
    setNotice(`Verification code sent via SMS (demo): ${demoCode}`);
  }

  async function requestRealEmailOtp(email) {
    setAuthPending(true);

    try {
      const response = await requestEmailOtp(email);
      setAuthForm((prev) => ({ ...prev, email, code: '' }));
      setOtpSent(true);
      setExpectedCode('');
      setEmailOtpRequestId(response.requestId || '');
      setNotice(`Verification code sent to ${response.maskedEmail || email}.`);
    } catch (error) {
      setOtpSent(false);
      setEmailOtpRequestId('');
      setNotice(error?.message || 'Unable to send email code right now. Please try again.');
    } finally {
      setAuthPending(false);
    }
  }

  function completeAuth(identityInput) {
    const timestamp = now.toISOString();
    const identity = {
      ...identityInput,
      timestamp,
      method: authMethod,
      name: identityInput.name?.trim() || '',
      email: identityInput.email?.trim().toLowerCase() || '',
      phone: normalizePhone(identityInput.phone || ''),
      walletAddress: identityInput.walletAddress?.trim() || '',
    };

    const existingUser = findUserByIdentity(appState, identity);
    const identityLabel = identity.email || identity.phone || identity.walletAddress || 'that identity';

    if (authMode === 'register' && existingUser) {
      setAuthPending(false);
      setOtpSent(false);
      setExpectedCode('');
      setEmailOtpRequestId('');
      setNotice(`We found an existing account for ${identityLabel}. Please sign in to continue.`);
      setView('signin');
      setAuthMode('signin');
      setAuthMethod(authMethod);
      return;
    }

    if (authMode === 'signin' && !existingUser) {
      setAuthPending(false);
      setOtpSent(false);
      setExpectedCode('');
      setEmailOtpRequestId('');
      setNotice(`No account found for ${identityLabel}. Please register first.`);
      return;
    }

    const nextState = structuredClone(appState);
    const outcome = upsertUserFromIdentity(nextState, identity);
    nextState.currentUserId = outcome.user.id;
    setAppState(nextState);

    setAuthPending(false);
    setOtpSent(false);
    setExpectedCode('');
    setEmailOtpRequestId('');

    if (authMode === 'register') {
      setRegistrationResult({
        user: outcome.user,
        method: authMethod,
        created: outcome.created,
      });
      setNotice(`Welcome to Pelayo Wellness, ${outcome.user.name}!`);
      setView('account-ready');
      return;
    }

    setView('booking');

    if (outcome.created) {
      setNotice(`Welcome to Pelayo Wellness, ${outcome.user.name}!`);
    } else {
      setNotice(`Welcome back, ${outcome.user.name}.`);
    }
  }

  async function handleAuthSubmit() {
    if (authPending) return;

    if (authMethod === 'google') {
      const email = authForm.email.trim().toLowerCase();
      if (!email.includes('@')) {
        setNotice('Enter a valid Google email to continue.');
        return;
      }

      setAuthPending(true);
      setTimeout(() => {
        completeAuth({
          email,
          name: authForm.name.trim() || deriveNameFromEmail(email),
        });
      }, 700);
      return;
    }

    if (authMethod === 'ethereum') {
      const walletAddress = authForm.walletAddress.trim();
      if (!walletAddress || walletAddress.length < 8) {
        setNotice('Connect a wallet or paste a valid Ethereum address.');
        return;
      }

      setAuthPending(true);
      setTimeout(() => {
        completeAuth({
          walletAddress,
          email: authForm.email,
          name: authForm.name || 'Pelayo Wallet Member',
        });
      }, 700);
      return;
    }

    if (authMethod === 'phone') {
      const phone = normalizePhone(authForm.phone);
      if (!phone || phone.length < 8) {
        setNotice('Enter a valid phone number.');
        return;
      }

      if (!otpSent) {
        sendPhoneOtp();
        return;
      }

      if (expectedCode && authForm.code.trim() !== expectedCode) {
        setNotice('Invalid SMS code. Use the demo code shown above.');
        return;
      }

      if (!authForm.code || authForm.code.trim().length < 4) {
        setNotice('Enter the 4–6 digit verification code.');
        return;
      }

      setAuthPending(true);
      setTimeout(() => {
        completeAuth({
          phone,
          name: authForm.name || 'Pelayo Member',
          email: authForm.email,
        });
      }, 650);
      return;
    }

    if (authMethod === 'email') {
      const email = authForm.email.trim().toLowerCase();
      if (!email.includes('@')) {
        setNotice('Enter a valid email address.');
        return;
      }

      if (!otpSent) {
        await requestRealEmailOtp(email);
        return;
      }

      if (!emailOtpRequestId) {
        setOtpSent(false);
        setNotice('Please request a new email code.');
        return;
      }

      const code = authForm.code.trim();
      if (!code || code.length < 4) {
        setNotice('Enter the 4–8 digit verification code.');
        return;
      }

      setAuthPending(true);

      try {
        await verifyEmailOtp({
          email,
          code,
          requestId: emailOtpRequestId,
        });

        completeAuth({
          email,
          name: authForm.name || deriveNameFromEmail(email),
        });
      } catch (error) {
        setAuthPending(false);
        setNotice(error?.message || 'Invalid or expired email code. Request a new one.');
      }
    }
  }

  function proceedToBooking() {
    setView('booking');
    setNotice("You're all set \u2014 book your first session below.");
  }

  function signOut() {
    setAppState((prev) => ({ ...prev, currentUserId: null, activeQuote: null }));
    setView('landing');
    setNotice('Signed out.');
  }

  function addTransaction(draft, tx) {
    draft.transactions.push({
      ...tx,
      id: `t${draft.nextTransactionId}`,
    });
    draft.nextTransactionId += 1;
  }

  function handleTopUp(pkg) {
    if (!currentUser) {
      setNotice('Sign in first.');
      setView('signin');
      return;
    }

    setAppState((prev) => {
      const next = structuredClone(prev);
      next.wallets[currentUser.id] = (next.wallets[currentUser.id] || 0) + pkg.credits;
      addTransaction(next, {
        userId: currentUser.id,
        type: 'topup',
        credits: pkg.credits,
        cash: pkg.cash,
        createdAt: now.toISOString(),
        note: `${pkg.label} package`,
      });
      return next;
    });

    setNotice(`+${pkg.credits} credits added to your wallet.`);
  }

  function buildQuote() {
    if (!currentUser) {
      setNotice('Sign in first.');
      setView('signin');
      return;
    }

    if (!bookingForm.date || !bookingForm.time) {
      setNotice('Please choose date and time.');
      return;
    }

    if (bookingForm.equipment.length === 0) {
      setNotice('Pick at least one planned equipment item.');
      return;
    }

    const startDate = createLocalDate(bookingForm.date, bookingForm.time);
    if (Number.isNaN(startDate.getTime())) {
      setNotice('Invalid date/time.');
      return;
    }

    if (startDate <= now) {
      setNotice('Bookings must start in the future.');
      return;
    }

    const quote = calculateQuote({
      bookings: appState.bookings,
      startDate,
      durationMinutes: Number(bookingForm.durationMinutes),
      now,
      activeHold: null,
    });

    if (!quote.ok) {
      setNotice(`${quote.reason}`);
      return;
    }

    const holdExpiresAt = new Date(now.getTime() + 15 * 60_000).toISOString();

    setAppState((prev) => ({
      ...prev,
      activeQuote: {
        id: `q-${Date.now()}`,
        userId: currentUser.id,
        startISO: quote.startDate.toISOString(),
        endISO: quote.endDate.toISOString(),
        durationMinutes: quote.durationMinutes,
        workoutType: bookingForm.workoutType,
        equipment: bookingForm.equipment,
        holdExpiresAt,
        pricing: {
          baseCredits: quote.baseCredits,
          demandCount: quote.demandCount,
          demandTier: quote.demandTier.name,
          demandMultiplier: quote.demandTier.multiplier,
          occupancyAtQuote: quote.occupancyAfter,
          occupancyMultiplier: quote.occupancyMultiplier,
          finalCredits: quote.finalCredits,
        },
      },
    }));

    setNotice('Quote locked for 15 minutes. Confirm to complete booking.');
  }

  function confirmQuote() {
    if (!currentUser) {
      setNotice('Sign in first.');
      return;
    }

    if (!activeQuote) {
      setNotice('No active quote. Create one first.');
      return;
    }

    if (activeQuote.userId !== currentUser.id) {
      setNotice('This quote belongs to another user.');
      return;
    }

    if (walletBalance < activeQuote.pricing.finalCredits) {
      setNotice(`Insufficient credits. Need ${activeQuote.pricing.finalCredits}, have ${walletBalance}. Top up first.`);
      return;
    }

    const recheck = calculateQuote({
      bookings: appState.bookings,
      startDate: new Date(activeQuote.startISO),
      durationMinutes: activeQuote.durationMinutes,
      now,
      activeHold: null,
    });

    if (!recheck.ok) {
      setNotice('Capacity changed. Please request a new quote.');
      setAppState((prev) => ({ ...prev, activeQuote: null }));
      return;
    }

    setAppState((prev) => {
      const next = structuredClone(prev);
      const bookingId = `b${next.nextBookingId}`;
      next.nextBookingId += 1;

      next.bookings.push({
        id: bookingId,
        userId: currentUser.id,
        startISO: activeQuote.startISO,
        endISO: activeQuote.endISO,
        durationMinutes: activeQuote.durationMinutes,
        workoutType: activeQuote.workoutType,
        equipment: activeQuote.equipment,
        status: 'confirmed',
        pricing: activeQuote.pricing,
        createdAt: now.toISOString(),
        source: 'user',
      });

      next.wallets[currentUser.id] = (next.wallets[currentUser.id] || 0) - activeQuote.pricing.finalCredits;
      addTransaction(next, {
        userId: currentUser.id,
        type: 'charge',
        credits: -activeQuote.pricing.finalCredits,
        createdAt: now.toISOString(),
        note: `Booking ${bookingId}`,
      });

      next.activeQuote = null;
      return next;
    });

    setNotice(`Booking confirmed — ${activeQuote.pricing.finalCredits} credits charged.`);
  }

  function cancelBooking(bookingId) {
    if (!currentUser) return;

    setAppState((prev) => {
      const next = structuredClone(prev);
      const booking = next.bookings.find((b) => b.id === bookingId);
      if (!booking || booking.status !== 'confirmed' || booking.userId !== currentUser.id) {
        return prev;
      }

      const minutesBeforeStart = minutesUntil(booking.startISO, now);
      const autoRefundEligible = minutesBeforeStart > 120;
      const refundCredits = autoRefundEligible ? booking.pricing.finalCredits : 0;

      booking.status = 'cancelled';
      booking.cancelledAt = now.toISOString();
      booking.refundCredits = refundCredits;
      booking.refundMode = autoRefundEligible ? 'auto_full_refund' : 'no_auto_refund';

      if (refundCredits > 0) {
        next.wallets[currentUser.id] = (next.wallets[currentUser.id] || 0) + refundCredits;
        addTransaction(next, {
          userId: currentUser.id,
          type: 'refund',
          credits: refundCredits,
          createdAt: now.toISOString(),
          note: `Auto refund for cancelled booking ${booking.id}`,
        });
      }

      return next;
    });

    const booking = appState.bookings.find((b) => b.id === bookingId);
    if (!booking) return;

    const mins = minutesUntil(booking.startISO, now);
    if (mins > 120) {
      setNotice('Booking cancelled. Full refund applied.');
    } else {
      setNotice('Booking cancelled within 2h of start — no automatic refund.');
    }
  }

  function applyAdminOverrideRefund(bookingId) {
    setAppState((prev) => {
      const next = structuredClone(prev);
      const booking = next.bookings.find((b) => b.id === bookingId);
      if (!booking || booking.status !== 'cancelled') return prev;

      const alreadyRefunded = booking.refundCredits || 0;
      const remaining = booking.pricing.finalCredits - alreadyRefunded;
      if (remaining <= 0) return prev;

      next.wallets[booking.userId] = (next.wallets[booking.userId] || 0) + remaining;
      booking.refundCredits = alreadyRefunded + remaining;
      booking.refundMode = 'admin_override_full_refund';
      booking.adminOverrideAt = now.toISOString();

      addTransaction(next, {
        userId: booking.userId,
        type: 'refund',
        credits: remaining,
        createdAt: now.toISOString(),
        note: `Admin override refund for ${booking.id}`,
      });

      return next;
    });

    setNotice('Admin override applied — remaining credits refunded.');
  }

  function resetDemo() {
    const next = resetAppState();
    setAppState(next);
    setNotice('Demo data reset.');
    setView('landing');
  }

  function setClockOffset(value) {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) return;
    setAppState((prev) => ({ ...prev, clockOffsetMinutes: parsed }));
  }

  const authCopy = AUTH_VIEW_COPY[authMode];
  const authActionLabel = authMode === 'register' ? 'Create account' : 'Sign in';
  const registrationReadyMethodLabel = registrationResult ? toTitleCase(registrationResult.method) : '';

  return (
    <div className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <main className="app">
        <header className="topbar">
          <div className="topbar-brand">
            <p className="eyebrow">Pelayo Studio Platform</p>
            <h1>Pelayo Wellness</h1>
          </div>

          {currentUser ? (
            <div className="topbar-actions">
              <div className="member-pill">
                <strong>{currentUser.name}</strong>
              </div>
              <button onClick={signOut}>Sign out</button>
            </div>
          ) : (
            <div className="topbar-actions">
              <button onClick={() => startAuthFlow('signin')}>Sign in</button>
              <button className="btn-primary" onClick={() => startAuthFlow('register')}>
                Get started
              </button>
            </div>
          )}
        </header>

        {notice && <div className="notice">{notice}</div>}

        {/* ── Landing ─────────────────────────── */}
        {view === 'landing' && (
          <section className="hero card">
            <div className="hero-content">
              <p className="eyebrow">Private Training Studio</p>
              <h2>Train on your terms.<br />No crowds, no compromises.</h2>
              <p>
                Reserve your slot, plan your equipment, and lock transparent demand-based pricing — all before you arrive.
              </p>
              <div className="hero-actions">
                <button
                  className="btn-primary"
                  onClick={() => (currentUser ? setView('booking') : startAuthFlow('register'))}
                >
                  {currentUser ? 'Book a Session' : 'Get Started'}
                </button>
                <button className="btn-secondary" onClick={() => startAuthFlow('signin')}>
                  Sign In
                </button>
              </div>
            </div>

            <div className="hero-metrics">
              <article>
                <span>Active Members</span>
                <strong>{landingStats.activeMembers}</strong>
              </article>
              <article>
                <span>Upcoming Sessions</span>
                <strong>{landingStats.upcomingSessions}</strong>
              </article>
              <article>
                <span>Avg Session Price</span>
                <strong>{landingStats.avgSessionCredits} cr</strong>
              </article>
            </div>
          </section>
        )}

        {/* ── Auth ────────────────────────────── */}
        {(view === 'signin' || view === 'register') && (
          <section className="card auth-card">
            <div className="auth-header">
              <div>
                <p className="eyebrow">{authCopy.eyebrow}</p>
                <h2>{authCopy.title}</h2>
                <p>{authCopy.blurb}</p>
              </div>
              <button onClick={() => setView('landing')}>← Back</button>
            </div>

            <div className="auth-methods">
              {AUTH_METHODS.map((method) => (
                <button
                  key={method.id}
                  className={`auth-method ${authMethod === method.id ? 'active' : ''}`}
                  onClick={() => {
                    setAuthMethod(method.id);
                    setOtpSent(false);
                    setExpectedCode('');
                    setEmailOtpRequestId('');
                    setAuthForm((prev) => ({ ...prev, code: '' }));
                  }}
                >
                  <strong>{method.icon} {method.title}</strong>
                  <span>{method.subtitle}</span>
                </button>
              ))}
            </div>

            <div className="auth-form">
              {authMode === 'register' && (
                <label>
                  Full name
                  <input
                    type="text"
                    value={authForm.name}
                    onChange={(e) => setAuthForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Maria Pelayo"
                  />
                </label>
              )}

              {authMethod === 'google' && (
                <>
                  <label>
                    Google email
                    <input
                      type="email"
                      value={authForm.email}
                      onChange={(e) => setAuthForm((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="you@gmail.com"
                    />
                  </label>
                  {authMode === 'signin' && (
                    <label>
                      Name (optional)
                      <input
                        type="text"
                        value={authForm.name}
                        onChange={(e) => setAuthForm((prev) => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g. Maria Pelayo"
                      />
                    </label>
                  )}
                </>
              )}

              {authMethod === 'ethereum' && (
                <>
                  <label>
                    Wallet address
                    <input
                      type="text"
                      value={authForm.walletAddress}
                      onChange={(e) => setAuthForm((prev) => ({ ...prev, walletAddress: e.target.value }))}
                      placeholder="0x..."
                    />
                  </label>
                  <div className="row">
                    <button onClick={connectWallet} disabled={authPending}>
                      {authPending ? 'Connecting…' : 'Connect Wallet'}
                    </button>
                    {authForm.walletAddress ? (
                      <span className="muted" style={{ fontSize: '0.82rem' }}>
                        Connected: {abbreviateWallet(authForm.walletAddress)}
                      </span>
                    ) : null}
                  </div>
                  <label>
                    Recovery email (recommended)
                    <input
                      type="email"
                      value={authForm.email}
                      onChange={(e) => setAuthForm((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="you@example.com"
                    />
                  </label>
                </>
              )}

              {authMethod === 'phone' && (
                <>
                  <label>
                    Mobile number
                    <input
                      type="tel"
                      value={authForm.phone}
                      onChange={(e) => setAuthForm((prev) => ({ ...prev, phone: e.target.value }))}
                      placeholder="+1 787 555 0199"
                    />
                  </label>
                  {otpSent && (
                    <label>
                      SMS code
                      <input
                        type="text"
                        value={authForm.code}
                        onChange={(e) => setAuthForm((prev) => ({ ...prev, code: e.target.value }))}
                        placeholder="6-digit code"
                        autoFocus
                      />
                    </label>
                  )}
                  <label>
                    Backup email (optional)
                    <input
                      type="email"
                      value={authForm.email}
                      onChange={(e) => setAuthForm((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="you@example.com"
                    />
                  </label>
                </>
              )}

              {authMethod === 'email' && (
                <>
                  <label>
                    Email address
                    <input
                      type="email"
                      value={authForm.email}
                      onChange={(e) => setAuthForm((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="you@example.com"
                    />
                  </label>
                  {otpSent && (
                    <label>
                      Magic code
                      <input
                        type="text"
                        value={authForm.code}
                        onChange={(e) => setAuthForm((prev) => ({ ...prev, code: e.target.value }))}
                        placeholder="Enter verification code"
                        autoFocus
                      />
                    </label>
                  )}
                </>
              )}

              <div className="auth-actions">
                {(authMethod === 'phone' || authMethod === 'email') && !otpSent && (
                  <button
                    disabled={authPending}
                    onClick={() => {
                      if (authMethod === 'phone') {
                        sendPhoneOtp();
                        return;
                      }

                      const email = authForm.email.trim().toLowerCase();
                      if (!email.includes('@')) {
                        setNotice('Enter a valid email address first.');
                        return;
                      }

                      requestRealEmailOtp(email);
                    }}
                  >
                    {`Send ${authMethod === 'phone' ? 'SMS' : 'Email'} Code`}
                  </button>
                )}
                <button className="btn-primary" disabled={authPending} onClick={handleAuthSubmit}>
                  {authPending ? 'Processing…' : authActionLabel}
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => switchAuthMode(authMode === 'signin' ? 'register' : 'signin')}
                >
                  {authCopy.switchText}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ── Account Ready ──────────────────── */}
        {view === 'account-ready' && registrationResult && (
          <section className="card account-ready">
            <div className="success-icon">✓</div>
            <h2>You're in.</h2>
            <p className="muted">
              {registrationResult.user.name}, your account was created via{' '}
              <strong>{registrationReadyMethodLabel}</strong>. You're ready to book your first session.
            </p>
            <div className="row action-row">
              <button className="btn-primary" onClick={proceedToBooking}>
                Book your first session →
              </button>
              <button onClick={() => setView('landing')}>Return home</button>
            </div>
          </section>
        )}

        {/* ── Booking Dashboard ──────────────── */}
        {view === 'booking' && currentUser && (
          <>
            <section className="card member-summary">
              <div>
                <p className="eyebrow">Member Dashboard</p>
                <h2>Book your next session</h2>
                <p className="muted">
                  Select your time, workout profile, and planned equipment.
                </p>
              </div>
              <div className="wallet-block">
                <span>Credit Balance</span>
                <strong>{walletBalance}</strong>
              </div>
            </section>

            <section className="card">
              <h3>Top Up Credits</h3>
              <p className="muted section-desc">1 credit = $1 equivalent. Choose a package to add credits to your wallet.</p>
              <div className="packages">
                {appState.packages.map((pkg) => (
                  <button key={pkg.id} onClick={() => handleTopUp(pkg)}>
                    <strong>{pkg.label}</strong>
                    <span>
                      +{pkg.credits} credits · ${pkg.cash}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <section className="card">
              <h3>Session Details</h3>

              <div className="form-grid">
                <label>
                  Date
                  <input
                    type="date"
                    value={bookingForm.date}
                    onChange={(e) => updateBookingForm({ date: e.target.value })}
                  />
                </label>

                <label>
                  Time
                  <input
                    type="time"
                    step="1800"
                    value={bookingForm.time}
                    onChange={(e) => updateBookingForm({ time: e.target.value })}
                  />
                </label>

                <label>
                  Duration
                  <select
                    value={bookingForm.durationMinutes}
                    onChange={(e) => updateBookingForm({ durationMinutes: Number(e.target.value) })}
                  >
                    {DURATION_OPTIONS.map((duration) => (
                      <option key={duration} value={duration}>
                        {duration} min
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Workout type
                  <select value={bookingForm.workoutType} onChange={(e) => updateBookingForm({ workoutType: e.target.value })}>
                    {WORKOUT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {toTitleCase(type)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="quick-slots">
                <span>Quick time picks</span>
                <div className="chips">
                  {QUICK_TIME_SLOTS.map((slot) => (
                    <button
                      key={slot}
                      className={`chip ${bookingForm.time === slot ? 'on' : ''}`}
                      onClick={() => updateBookingForm({ time: slot })}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>

              <div className="equipment-groups">
                <div className="equipment-head">
                  <h4>Planned Equipment</h4>
                  <p className="muted" style={{ fontSize: '0.84rem', margin: 0 }}>
                    Select what you'll use so coaches can minimize floor conflicts.
                  </p>
                </div>

                {EQUIPMENT_TAXONOMY.map((group) => (
                  <div key={group.id} className="equipment-group">
                    <h5>{group.title}</h5>
                    <div className="chips">
                      {group.items.map((item) => (
                        <label key={item.id} className={`chip ${bookingForm.equipment.includes(item.id) ? 'on' : ''}`}>
                          <input
                            type="checkbox"
                            checked={bookingForm.equipment.includes(item.id)}
                            onChange={() => toggleEquipment(item.id)}
                          />
                          {item.label}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="row action-row">
                <button onClick={buildQuote}>Get Quote (15 min hold)</button>
                <button onClick={confirmQuote} className="btn-primary">
                  Confirm Booking
                </button>
              </div>

              {activeQuote ? (
                <div className="quote">
                  <h4>Active Quote</h4>
                  <p>
                    <strong>{formatDateTime(activeQuote.startISO)}</strong> · {activeQuote.durationMinutes} min
                  </p>
                  <p>
                    Equipment: {activeQuote.equipment.map((item) => equipmentLabel(item)).join(', ')}
                  </p>
                  <p>
                    Hold expires in <strong>{Math.floor(quoteSecondsLeft / 60)}m {quoteSecondsLeft % 60}s</strong>
                  </p>
                  <div className="table-wrap">
                    <table>
                      <tbody>
                        <tr>
                          <th>Base</th>
                          <td>{activeQuote.pricing.baseCredits} credits</td>
                        </tr>
                        <tr>
                          <th>Demand</th>
                          <td>
                            {activeQuote.pricing.demandTier} ({activeQuote.pricing.demandMultiplier.toFixed(2)}×)
                          </td>
                        </tr>
                        <tr>
                          <th>Occupancy</th>
                          <td>
                            #{activeQuote.pricing.occupancyAtQuote} ({activeQuote.pricing.occupancyMultiplier.toFixed(2)}×)
                          </td>
                        </tr>
                        <tr>
                          <th>Total</th>
                          <td>
                            <strong>{activeQuote.pricing.finalCredits} credits</strong>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <p className="muted" style={{ marginTop: '0.75rem', fontSize: '0.85rem' }}>
                  No active quote. Get a quote to lock current pricing for 15 minutes.
                </p>
              )}
            </section>

            <section className="card">
              <h3>Demand & Availability</h3>
              <p className="muted section-desc">
                Live occupancy and trailing 4-week demand for 1-hour blocks. Max 5 athletes per slot.
              </p>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Occupancy</th>
                      <th>Next Tier</th>
                      <th>4-Week Demand</th>
                      <th>Est. 60m Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slotRows.map((row) => (
                      <tr key={row.hour}>
                        <td>{String(row.hour).padStart(2, '0')}:00</td>
                        <td>{row.maxExisting}/5</td>
                        <td>
                          #{row.nextOccupancy} ({row.occupancyMultiplier.toFixed(2)}×)
                        </td>
                        <td>
                          {row.demandTier.name} ({row.demandTier.multiplier.toFixed(2)}×)
                        </td>
                        <td><strong>{row.estFinalCredits}</strong> cr</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="card">
              <h3>My Bookings</h3>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>When</th>
                      <th>Status</th>
                      <th>Type / Equipment</th>
                      <th>Charged</th>
                      <th>Refund</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myBookings.length === 0 && (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '1.5rem 0.5rem' }}>
                          <span className="muted">No bookings yet. Create your first session above.</span>
                        </td>
                      </tr>
                    )}
                    {myBookings.map((booking) => {
                      const isFuture = new Date(booking.startISO) > now;
                      const canCancel = booking.status === 'confirmed' && isFuture;
                      return (
                        <tr key={booking.id}>
                          <td>
                            {formatDateTime(booking.startISO)} ({booking.durationMinutes}m)
                          </td>
                          <td>{booking.status}</td>
                          <td>
                            {toTitleCase(booking.workoutType)} / {booking.equipment.map((item) => equipmentLabel(item)).join(', ')}
                          </td>
                          <td>{booking.pricing?.finalCredits || '-'} cr</td>
                          <td>
                            {booking.refundCredits ? `${booking.refundCredits} cr` : '—'}
                          </td>
                          <td>
                            {canCancel ? (
                              <button onClick={() => cancelBooking(booking.id)}>Cancel</button>
                            ) : (
                              <span className="muted">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="card">
              <h3>Operations Panel</h3>
              <p className="muted section-desc">Demo controls for testing pricing and booking mechanics.</p>
              <div className="row">
                <label>
                  Clock offset (minutes)
                  <input
                    type="number"
                    value={appState.clockOffsetMinutes || 0}
                    onChange={(e) => setClockOffset(e.target.value)}
                  />
                </label>
                <button onClick={resetDemo}>Reset Demo Data</button>
              </div>

              <h4 style={{ marginTop: '1.25rem' }}>All Bookings</h4>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>User</th>
                      <th>Start</th>
                      <th>Status</th>
                      <th>Price</th>
                      <th>Refund</th>
                      <th>Admin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allBookings.map((booking) => {
                      const user = appState.users.find((u) => u.id === booking.userId);
                      const canOverride =
                        booking.status === 'cancelled' && (booking.refundCredits || 0) < (booking.pricing?.finalCredits || 0);

                      return (
                        <tr key={booking.id}>
                          <td>{booking.id}</td>
                          <td>{user?.name || booking.userId}</td>
                          <td>{formatDateTime(booking.startISO)}</td>
                          <td>{booking.status}</td>
                          <td>{booking.pricing?.finalCredits || '-'} cr</td>
                          <td>{booking.refundCredits || 0} cr</td>
                          <td>
                            {canOverride ? (
                              <button onClick={() => applyAdminOverrideRefund(booking.id)}>Override</button>
                            ) : (
                              <span className="muted">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        <footer className="muted">
          <p>Pelayo Wellness · Premium Private Training</p>
        </footer>
      </main>
    </div>
  );
}

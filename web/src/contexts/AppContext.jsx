import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { loadAppState, resetAppState, saveAppState } from '../lib/storage';
import {
  calculateQuote,
  isHoldActive,
  minutesUntil,
  getOccupancyByBlock,
  getDemandCount,
  getDemandTier,
  getBaseCredits,
  getOccupancyMultiplier,
} from '../lib/pricing';
import {
  normalizePhone,
  deriveNameFromEmail,
  findUserByIdentity,
  upsertUserFromIdentity,
  addTransaction,
  sortByStartDesc,
  generateDemoCode,
  createLocalDate,
} from '../lib/helpers';
import { SLOT_CAPACITY, EQUIPMENT_FLOW_CATEGORIES } from '../features/calendar-scheduler/config';
import { getSlotAvailability } from '../features/calendar-scheduler/utils';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabaseClient';
import {
  mapSupabaseBooking,
  buildProfileFromAuth,
  buildEquipmentCategories,
} from '../lib/supabaseBackend';

const AppContext = createContext(null);

function padTime(value) {
  const [h = '00', m = '00'] = String(value || '').split(':');
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
}

function addMinutesToTime(timeInput, minutesToAdd) {
  const [hours, minutes] = String(timeInput).split(':').map(Number);
  const total = hours * 60 + minutes + Number(minutesToAdd || 0);
  const nextHours = Math.floor(total / 60) % 24;
  const nextMinutes = total % 60;
  return `${String(nextHours).padStart(2, '0')}:${String(nextMinutes).padStart(2, '0')}:00`;
}

function pickAuthProviders(authUser) {
  if (!authUser?.app_metadata?.providers) return [];
  return authUser.app_metadata.providers;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}

export function AppProvider({ children }) {
  const [appState, setAppState] = useState(() => loadAppState());
  const [nowMs, setNowMs] = useState(Date.now());
  const [notice, setNotice] = useState('');

  const supabase = useMemo(() => getSupabaseClient(), []);
  const [supabaseSession, setSupabaseSession] = useState(null);
  const [supabaseUser, setSupabaseUser] = useState(null);
  const [supabaseProfile, setSupabaseProfile] = useState(null);
  const [supabaseBookings, setSupabaseBookings] = useState([]);
  const [supabaseEquipment, setSupabaseEquipment] = useState([]);

  // Auth UI state
  const [authMethod, setAuthMethod] = useState('passkey');
  const [authPending, setAuthPending] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [expectedCode, setExpectedCode] = useState('');
  const [emailOtpRequestId, setEmailOtpRequestId] = useState('');
  const [registrationResult, setRegistrationResult] = useState(null);

  const now = useMemo(
    () => new Date(nowMs + (appState.clockOffsetMinutes || 0) * 60_000),
    [nowMs, appState.clockOffsetMinutes],
  );

  const fallbackCurrentUser = appState.users.find((u) => u.id === appState.currentUserId) || null;
  const supabaseCurrentUser = useMemo(
    () => buildProfileFromAuth(supabaseUser, supabaseProfile),
    [supabaseUser, supabaseProfile],
  );

  const currentUser = supabaseCurrentUser || fallbackCurrentUser;

  const effectiveBookings = useMemo(
    () => (supabaseCurrentUser ? supabaseBookings : appState.bookings),
    [supabaseCurrentUser, supabaseBookings, appState.bookings],
  );

  const equipmentCategories = useMemo(
    () => buildEquipmentCategories(supabaseEquipment),
    [supabaseEquipment],
  );

  const walletBalance = currentUser ? appState.wallets[currentUser.id] || 0 : 0;

  const activeQuote =
    appState.activeQuote && isHoldActive(appState.activeQuote, now) ? appState.activeQuote : null;

  const quoteSecondsLeft = activeQuote
    ? Math.max(0, Math.floor((new Date(activeQuote.holdExpiresAt).getTime() - now.getTime()) / 1000))
    : 0;

  const hydrateSupabaseData = useCallback(async () => {
    if (!supabase || !supabaseUser) return;

    const [profileResult, bookingsResult, equipmentResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('*')
        .eq('id', supabaseUser.id)
        .maybeSingle(),
      supabase
        .from('bookings')
        .select('*, recurring_groups(*)')
        .order('slot_date', { ascending: false })
        .order('start_time', { ascending: false }),
      supabase
        .from('equipment')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true }),
    ]);

    if (profileResult.error) {
      console.warn('Unable to load profile from Supabase:', profileResult.error.message);
    }

    if (bookingsResult.error) {
      console.warn('Unable to load bookings from Supabase:', bookingsResult.error.message);
    }

    if (equipmentResult.error) {
      console.warn('Unable to load equipment from Supabase:', equipmentResult.error.message);
    }

    setSupabaseProfile(profileResult.data || null);
    setSupabaseBookings((bookingsResult.data || []).map(mapSupabaseBooking));
    setSupabaseEquipment(equipmentResult.data || []);
  }, [supabase, supabaseUser]);

  const ensureSupabaseProfile = useCallback(async () => {
    if (!supabase || !supabaseUser) return;

    const payload = {
      id: supabaseUser.id,
      email: supabaseUser.email || null,
      full_name:
        supabaseUser.user_metadata?.full_name
        || supabaseUser.user_metadata?.name
        || deriveNameFromEmail(supabaseUser.email || ''),
      phone: supabaseUser.phone || null,
      auth_methods: pickAuthProviders(supabaseUser),
      last_sign_in_at: supabaseUser.last_sign_in_at || new Date().toISOString(),
    };

    const { error } = await supabase
      .from('profiles')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.warn('Unable to upsert profile:', error.message);
    }
  }, [supabase, supabaseUser]);

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

  // Auto-dismiss notices
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 6000);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!supabase || !isSupabaseConfigured) return undefined;

    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      setSupabaseSession(data.session || null);
      setSupabaseUser(data.session?.user || null);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSupabaseSession(session || null);
      setSupabaseUser(session?.user || null);
      if (!session?.user) {
        setSupabaseProfile(null);
        setSupabaseBookings([]);
      }
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!supabaseUser) return;

    ensureSupabaseProfile().finally(() => {
      hydrateSupabaseData();
    });
  }, [supabaseUser, ensureSupabaseProfile, hydrateSupabaseData]);

  const myBookings = useMemo(() => {
    if (!currentUser) return [];
    return effectiveBookings.filter((b) => b.userId === currentUser.id).sort(sortByStartDesc);
  }, [effectiveBookings, currentUser]);

  const allBookings = useMemo(() => [...effectiveBookings].sort(sortByStartDesc), [effectiveBookings]);

  const upcomingBookings = useMemo(() => {
    return myBookings.filter((b) => b.status === 'confirmed' && new Date(b.startISO) > now);
  }, [myBookings, now]);

  const pastBookings = useMemo(() => {
    return myBookings.filter((b) => b.status !== 'confirmed' || new Date(b.startISO) <= now);
  }, [myBookings, now]);

  const landingStats = useMemo(() => {
    const upcoming = effectiveBookings.filter(
      (b) => b.status === 'confirmed' && new Date(b.startISO) > now,
    );
    return {
      activeMembers: Math.max(appState.users.length, new Set(effectiveBookings.map((b) => b.userId)).size),
      upcomingSessions: upcoming.length,
      avgSessionCredits: upcoming.length
        ? Math.round(
            upcoming.reduce((s, b) => s + (b.pricing?.finalCredits || 0), 0) /
              Math.max(upcoming.length, 1),
          )
        : 0,
    };
  }, [effectiveBookings, appState.users.length, now]);

  // Get busy equipment for a given time range
  const getBusyEquipment = useCallback(
    (startDate, endDate) => {
      const busy = new Set();
      for (const booking of effectiveBookings) {
        if (booking.status !== 'confirmed') continue;
        const bStart = new Date(booking.startISO);
        const bEnd = new Date(booking.endISO);
        if (bStart < endDate && startDate < bEnd) {
          (booking.equipment || booking.equipmentItems || []).forEach((e) => busy.add(e));
        }
      }
      return busy;
    },
    [effectiveBookings],
  );

  // Auth
  function resetAuthState() {
    setAuthPending(false);
    setOtpSent(false);
    setExpectedCode('');
    setEmailOtpRequestId('');
  }

  function completeAuth(identityInput, authMode) {
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
    const identityLabel =
      identity.email || identity.phone || identity.walletAddress || 'that identity';

    if (authMode === 'register' && existingUser) {
      resetAuthState();
      setNotice(
        `We found an existing account for ${identityLabel}. Please sign in to continue.`,
      );
      return { redirect: '/signin', success: false };
    }

    if (authMode === 'signin' && !existingUser) {
      resetAuthState();
      setNotice(`No account found for ${identityLabel}. Please register first.`);
      return { redirect: null, success: false };
    }

    const nextState = structuredClone(appState);
    const outcome = upsertUserFromIdentity(nextState, identity);
    nextState.currentUserId = outcome.user.id;
    setAppState(nextState);
    resetAuthState();

    if (authMode === 'register') {
      setRegistrationResult({
        user: outcome.user,
        method: authMethod,
        created: outcome.created,
      });
      setNotice(`Welcome to Pelayo Wellness, ${outcome.user.name}!`);
      return { redirect: '/home', success: true };
    }

    if (outcome.created) {
      setNotice(`Welcome to Pelayo Wellness, ${outcome.user.name}!`);
    } else {
      setNotice(`Welcome back, ${outcome.user.name}.`);
    }
    return { redirect: '/home', success: true };
  }

  async function handleAuthSubmit(authForm, authMode) {
    if (authPending) return {};

    if (isSupabaseConfigured && supabase && authMethod === 'google') {
      setAuthPending(true);
      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.href,
          },
        });

        if (error) {
          setNotice(error.message || 'Google sign-in failed.');
          return {};
        }

        setNotice('Redirecting to Google…');
        return {};
      } finally {
        setAuthPending(false);
      }
    }

    if (isSupabaseConfigured && supabase && authMethod === 'email') {
      const email = authForm.email.trim().toLowerCase();
      if (!email.includes('@')) {
        setNotice('Enter a valid email address.');
        return {};
      }

      if (!otpSent) {
        setAuthPending(true);
        try {
          const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
              shouldCreateUser: authMode === 'register',
            },
          });

          if (error) throw error;
          setOtpSent(true);
          setNotice(`Verification code sent to ${email}.`);
        } catch (error) {
          setOtpSent(false);
          setNotice(error?.message || 'Unable to send email code right now.');
        } finally {
          setAuthPending(false);
        }
        return {};
      }

      const code = authForm.code.trim();
      if (!code || code.length < 4) {
        setNotice('Enter the 4–8 digit verification code.');
        return {};
      }

      setAuthPending(true);
      try {
        const { error } = await supabase.auth.verifyOtp({
          email,
          token: code,
          type: 'email',
        });

        if (error) throw error;

        await hydrateSupabaseData();
        resetAuthState();
        setNotice(`Welcome to Pelayo Wellness, ${deriveNameFromEmail(email)}.`);
        return { redirect: '/home', success: true };
      } catch (error) {
        setAuthPending(false);
        setNotice(error?.message || 'Invalid or expired email code. Request a new one.');
        return {};
      }
    }

    if (authMethod === 'passkey') {
      const email = authForm.email.trim().toLowerCase();
      if (!email.includes('@')) {
        setNotice('Passkey sign in needs a valid account email in this prototype.');
        return {};
      }
      setAuthPending(true);
      await new Promise((r) => setTimeout(r, 450));
      return completeAuth(
        { email, name: authForm.name.trim() || deriveNameFromEmail(email) },
        authMode,
      );
    }

    if (authMethod === 'ethereum') {
      const walletAddress = authForm.walletAddress.trim();
      if (!walletAddress || walletAddress.length < 8) {
        setNotice('Connect a wallet or paste a valid Ethereum address.');
        return {};
      }
      setAuthPending(true);
      await new Promise((r) => setTimeout(r, 700));
      return completeAuth(
        { walletAddress, email: authForm.email, name: authForm.name || 'Pelayo Wallet Member' },
        authMode,
      );
    }

    if (authMethod === 'phone') {
      const phone = normalizePhone(authForm.phone);
      if (!phone || phone.length < 8) {
        setNotice('Enter a valid phone number.');
        return {};
      }
      if (!otpSent) {
        const demoCode = generateDemoCode();
        setExpectedCode(demoCode);
        setOtpSent(true);
        setNotice(`Verification code sent via SMS (demo): ${demoCode}`);
        return {};
      }
      if (expectedCode && authForm.code.trim() !== expectedCode) {
        setNotice('Invalid SMS code. Use the demo code shown above.');
        return {};
      }
      if (!authForm.code || authForm.code.trim().length < 4) {
        setNotice('Enter the 4–6 digit verification code.');
        return {};
      }
      setAuthPending(true);
      await new Promise((r) => setTimeout(r, 650));
      return completeAuth(
        { phone, name: authForm.name || 'Pelayo Member', email: authForm.email },
        authMode,
      );
    }

    return {};
  }

  async function sendOtp(authForm) {
    if (authMethod === 'phone') {
      const phone = normalizePhone(authForm.phone);
      if (!phone || phone.length < 8) {
        setNotice('Enter a valid phone number first.');
        return;
      }
      const demoCode = generateDemoCode();
      setExpectedCode(demoCode);
      setOtpSent(true);
      setNotice(`Verification code sent via SMS (demo): ${demoCode}`);
      return;
    }

    if (authMethod === 'email') {
      const email = authForm.email.trim().toLowerCase();
      if (!email.includes('@')) {
        setNotice('Enter a valid email address first.');
        return;
      }

      if (isSupabaseConfigured && supabase) {
        setAuthPending(true);
        try {
          const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
              shouldCreateUser: true,
            },
          });

          if (error) throw error;

          setOtpSent(true);
          setNotice(`Verification code sent to ${email}.`);
        } catch (error) {
          setOtpSent(false);
          setNotice(error?.message || 'Unable to send email code right now.');
        } finally {
          setAuthPending(false);
        }
      }
    }
  }

  async function connectWallet(authForm, setAuthForm, authMode) {
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

  async function signOut() {
    if (supabase && supabaseSession) {
      await supabase.auth.signOut();
      setSupabaseSession(null);
      setSupabaseUser(null);
      setSupabaseProfile(null);
      setSupabaseBookings([]);
    }

    setAppState((prev) => ({ ...prev, currentUserId: null, activeQuote: null }));
    setNotice('Signed out.');
  }

  // Wallet
  function handleTopUp(pkg) {
    if (!currentUser) {
      setNotice('Sign in first.');
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

  // Booking
  function buildQuote(bookingForm) {
    if (!currentUser) {
      setNotice('Sign in first.');
      return null;
    }
    if (!bookingForm.date || !bookingForm.time) {
      setNotice('Please choose date and time.');
      return null;
    }
    const startDate = createLocalDate(bookingForm.date, bookingForm.time);
    if (Number.isNaN(startDate.getTime())) {
      setNotice('Invalid date/time.');
      return null;
    }
    if (startDate <= now) {
      setNotice('Bookings must start in the future.');
      return null;
    }

    const quote = calculateQuote({
      bookings: effectiveBookings,
      startDate,
      durationMinutes: Number(bookingForm.durationMinutes),
      now,
      activeHold: null,
    });

    if (!quote.ok) {
      setNotice(`${quote.reason}`);
      return null;
    }

    const holdExpiresAt = new Date(now.getTime() + 15 * 60_000).toISOString();

    const newQuote = {
      id: `q-${Date.now()}`,
      userId: currentUser.id,
      startISO: quote.startDate.toISOString(),
      endISO: quote.endDate.toISOString(),
      durationMinutes: quote.durationMinutes,
      workoutType: bookingForm.workoutType,
      equipment: bookingForm.equipment,
      equipmentMode: bookingForm.equipmentMode || 'exact',
      selectedCategories: bookingForm.selectedCategories || [],
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
    };

    setAppState((prev) => ({ ...prev, activeQuote: newQuote }));
    return newQuote;
  }

  function confirmQuote(options = {}) {
    const {
      quoteOverride = null,
      skipWalletCheck = false,
      skipWalletCharge = false,
      source = 'user',
      bookingNote,
    } = options;

    const quoteToConfirm = quoteOverride || activeQuote;

    if (!currentUser) {
      setNotice('Sign in first.');
      return false;
    }
    if (!quoteToConfirm) {
      setNotice('No active quote. Create one first.');
      return false;
    }
    if (quoteToConfirm.userId !== currentUser.id) {
      setNotice('This quote belongs to another user.');
      return false;
    }
    if (!skipWalletCheck && walletBalance < quoteToConfirm.pricing.finalCredits) {
      setNotice(
        `Insufficient credits. Need ${quoteToConfirm.pricing.finalCredits}, have ${walletBalance}. Top up first.`,
      );
      return false;
    }

    const recheck = calculateQuote({
      bookings: effectiveBookings,
      startDate: new Date(quoteToConfirm.startISO),
      durationMinutes: quoteToConfirm.durationMinutes,
      now,
      activeHold: null,
    });

    if (!recheck.ok) {
      setNotice('Capacity changed. Please request a new quote.');
      setAppState((prev) => ({ ...prev, activeQuote: null }));
      return false;
    }

    setAppState((prev) => {
      const next = structuredClone(prev);
      const bookingId = `b${next.nextBookingId}`;
      next.nextBookingId += 1;

      next.bookings.push({
        id: bookingId,
        userId: currentUser.id,
        startISO: quoteToConfirm.startISO,
        endISO: quoteToConfirm.endISO,
        durationMinutes: quoteToConfirm.durationMinutes,
        workoutType: quoteToConfirm.workoutType,
        equipment: quoteToConfirm.equipment,
        status: 'confirmed',
        pricing: quoteToConfirm.pricing,
        createdAt: now.toISOString(),
        source,
        bookingNote,
      });

      if (!skipWalletCharge) {
        next.wallets[currentUser.id] =
          (next.wallets[currentUser.id] || 0) - quoteToConfirm.pricing.finalCredits;
        addTransaction(next, {
          userId: currentUser.id,
          type: 'charge',
          credits: -quoteToConfirm.pricing.finalCredits,
          createdAt: now.toISOString(),
          note: `Booking ${bookingId}`,
        });
      }

      next.activeQuote = null;
      return next;
    });

    if (skipWalletCharge) {
      setNotice('Booking confirmed — payment is deferred in this prototype.');
    } else {
      setNotice(`Booking confirmed — ${quoteToConfirm.pricing.finalCredits} credits charged.`);
    }

    return true;
  }

  async function cancelBooking(bookingId) {
    if (!currentUser) return;

    if (supabase && supabaseCurrentUser) {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId)
        .eq('user_id', currentUser.id);

      if (error) {
        setNotice(error.message || 'Unable to cancel booking right now.');
        return;
      }

      await supabase
        .from('equipment_reservations')
        .update({ status: 'cancelled' })
        .eq('booking_id', bookingId);

      setSupabaseBookings((prev) => prev.map((booking) => (
        booking.id === bookingId
          ? { ...booking, status: 'cancelled', cancelledAt: now.toISOString() }
          : booking
      )));

      setNotice('Booking cancelled.');
      return;
    }

    const booking = appState.bookings.find((b) => b.id === bookingId);
    if (!booking) return;

    const mins = minutesUntil(booking.startISO, now);

    setAppState((prev) => {
      const next = structuredClone(prev);
      const b = next.bookings.find((x) => x.id === bookingId);
      if (!b || b.status !== 'confirmed' || b.userId !== currentUser.id) return prev;

      const autoRefundEligible = mins > 120;
      const refundCredits = autoRefundEligible ? b.pricing.finalCredits : 0;

      b.status = 'cancelled';
      b.cancelledAt = now.toISOString();
      b.refundCredits = refundCredits;
      b.refundMode = autoRefundEligible ? 'auto_full_refund' : 'no_auto_refund';

      if (refundCredits > 0) {
        next.wallets[currentUser.id] = (next.wallets[currentUser.id] || 0) + refundCredits;
        addTransaction(next, {
          userId: currentUser.id,
          type: 'refund',
          credits: refundCredits,
          createdAt: now.toISOString(),
          note: `Auto refund for cancelled booking ${b.id}`,
        });
      }
      return next;
    });

    if (mins > 120) {
      setNotice('Booking cancelled. Full refund applied.');
    } else {
      setNotice('Booking cancelled within 2h of start — no automatic refund.');
    }
  }

  // Admin
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
  }

  function setClockOffset(value) {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) return;
    setAppState((prev) => ({ ...prev, clockOffsetMinutes: parsed }));
  }

  // Legacy quote-based slot helper retained for older pages.
  const getSlotInfo = useCallback(
    (dateStr, hour) => {
      const start = createLocalDate(dateStr, `${String(hour).padStart(2, '0')}:00`);
      const end = new Date(start.getTime() + 60 * 60_000);

      const occupancy = getOccupancyByBlock({
        bookings: effectiveBookings,
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
        bookings: effectiveBookings,
        targetStartDate: start,
        targetEndDate: end,
        now,
      });
      const demandTier = getDemandTier(demandCount);
      const estCredits = Math.round(
        getBaseCredits(60) * demandTier.multiplier * occupancyMultiplier,
      );

      return {
        hour,
        maxExisting,
        nextOccupancy,
        occupancyMultiplier,
        demandTier,
        demandCount,
        estCredits,
        isFull: maxExisting >= 5,
      };
    },
    [effectiveBookings, now, activeQuote],
  );

  const getSlotAvailabilityForDay = useCallback(
    (dateInput) => getSlotAvailability({ bookings: effectiveBookings, dateInput, now }),
    [effectiveBookings, now],
  );

  async function createManualBookings({ sessions, equipmentSelection, note, recurrence }) {
    if (!currentUser) {
      setNotice('Sign in first.');
      return { ok: false };
    }

    if (!Array.isArray(sessions) || sessions.length === 0) {
      setNotice('No sessions to book.');
      return { ok: false };
    }

    if (supabase && supabaseCurrentUser) {
      try {
        let recurringGroupId = null;
        if (recurrence?.frequency && recurrence.frequency !== 'none') {
          const { data: recurringGroup, error: recurringError } = await supabase
            .from('recurring_groups')
            .insert({
              user_id: currentUser.id,
              pattern: 'time-series',
              frequency: recurrence.frequency,
              weekdays: recurrence.weekdays || [],
              end_date: recurrence.endDate || null,
              skip_dates: recurrence.skipDates || [],
            })
            .select('*')
            .single();

          if (recurringError) throw recurringError;
          recurringGroupId = recurringGroup.id;
        }

        const payload = sessions.map((session) => ({
          user_id: currentUser.id,
          slot_date: session.dateInput,
          start_time: padTime(session.timeInput),
          end_time: addMinutesToTime(session.timeInput, session.durationMinutes),
          duration_minutes: session.durationMinutes,
          status: 'confirmed',
          equipment_categories: equipmentSelection.categories || ['dont-know'],
          equipment_items: equipmentSelection.items || [],
          notes: note || null,
          recurring_group_id: recurringGroupId,
        }));

        const { data: insertedBookings, error: insertError } = await supabase
          .from('bookings')
          .insert(payload)
          .select('*, recurring_groups(*)');

        if (insertError) throw insertError;

        const reservationsPayload = (insertedBookings || []).flatMap((bookingRow) =>
          (bookingRow.equipment_items || []).map((equipmentId) => ({
            equipment_id: equipmentId,
            booking_id: bookingRow.id,
            slot_date: bookingRow.slot_date,
            start_time: bookingRow.start_time,
            end_time: bookingRow.end_time,
            status: 'confirmed',
          })),
        );

        if (reservationsPayload.length > 0) {
          const { error: reservationError } = await supabase
            .from('equipment_reservations')
            .insert(reservationsPayload);

          if (reservationError) {
            console.warn('Unable to write equipment reservations:', reservationError.message);
          }
        }

        setSupabaseBookings((prev) => {
          const next = [...prev, ...(insertedBookings || []).map(mapSupabaseBooking)];
          return next.sort(sortByStartDesc);
        });

        const count = insertedBookings?.length || sessions.length;
        setNotice(
          count > 1
            ? `Recurring booking created (${count} sessions).`
            : 'Booking confirmed.',
        );
        return { ok: true, count };
      } catch (error) {
        setNotice(error?.message || 'Unable to create booking right now.');
        return { ok: false };
      }
    }

    const seriesId = sessions.length > 1 ? `series-${Date.now()}` : null;

    setAppState((prev) => {
      const next = structuredClone(prev);
      const booked = [];

      for (let i = 0; i < sessions.length; i += 1) {
        const session = sessions[i];
        const startDate = createLocalDate(session.dateInput, session.timeInput);
        const endDate = new Date(startDate.getTime() + session.durationMinutes * 60_000);

        if (startDate <= now) continue;

        const overlapCount = next.bookings.filter((booking) => {
          if (booking.status !== 'confirmed') return false;
          const bStart = new Date(booking.startISO);
          const bEnd = new Date(booking.endISO);
          return bStart < endDate && startDate < bEnd;
        }).length;

        if (overlapCount >= SLOT_CAPACITY) continue;

        const bookingId = `b${next.nextBookingId}`;
        next.nextBookingId += 1;

        next.bookings.push({
          id: bookingId,
          userId: currentUser.id,
          startISO: startDate.toISOString(),
          endISO: endDate.toISOString(),
          durationMinutes: session.durationMinutes,
          workoutType: 'general-training',
          equipment: equipmentSelection.items.length > 0 ? equipmentSelection.items : ['general'],
          equipmentCategory: equipmentSelection.categories?.[0] || 'dont-know',
          equipmentCategories: equipmentSelection.categories || ['dont-know'],
          status: 'confirmed',
          pricing: {
            baseCredits: 0,
            demandMultiplier: 1,
            demandTier: 'Deferred',
            demandCount: 0,
            occupancyMultiplier: 1,
            occupancyAtQuote: overlapCount + 1,
            finalCredits: 0,
          },
          createdAt: now.toISOString(),
          bookingNote: note || undefined,
          source: 'calendar-v2',
          recurrence: seriesId
            ? {
                seriesId,
                frequency: recurrence.frequency,
                weekdays: recurrence.weekdays,
                endDate: recurrence.endDate,
                skipDates: recurrence.skipDates,
                occurrenceIndex: i + 1,
                totalOccurrences: sessions.length,
              }
            : null,
        });

        booked.push(bookingId);
      }

      if (booked.length === 0) return prev;
      return next;
    });

    const count = sessions.length;
    setNotice(count > 1 ? `Recurring booking created (${count} sessions).` : 'Booking confirmed.');
    return { ok: true, count };
  }

  async function editBookingTime({ bookingId, newTimeInput, scope = 'one' }) {
    if (!currentUser) return false;

    if (supabase && supabaseCurrentUser) {
      const target = myBookings.find((booking) => booking.id === bookingId);
      if (!target || target.status !== 'confirmed') return false;

      const candidates = scope === 'all' && target.recurrence?.seriesId
        ? myBookings.filter((booking) => (
          booking.status === 'confirmed'
          && booking.recurrence?.seriesId === target.recurrence.seriesId
          && new Date(booking.startISO) >= now
        ))
        : [target];

      const updates = [];

      for (const booking of candidates) {
        const currentStart = new Date(booking.startISO);
        const dateInput = `${currentStart.getFullYear()}-${String(currentStart.getMonth() + 1).padStart(2, '0')}-${String(currentStart.getDate()).padStart(2, '0')}`;
        const nextStart = createLocalDate(dateInput, newTimeInput);
        const nextEnd = new Date(nextStart.getTime() + booking.durationMinutes * 60_000);

        const conflictCount = allBookings.filter((candidate) => {
          if (candidate.id === booking.id || candidate.status !== 'confirmed') return false;
          const cStart = new Date(candidate.startISO);
          const cEnd = new Date(candidate.endISO);
          return cStart < nextEnd && nextStart < cEnd;
        }).length;

        if (conflictCount >= SLOT_CAPACITY) continue;

        updates.push({
          id: booking.id,
          slot_date: dateInput,
          start_time: padTime(newTimeInput),
          end_time: addMinutesToTime(newTimeInput, booking.durationMinutes),
        });
      }

      if (updates.length === 0) {
        setNotice('Unable to apply edit — selected slot is full.');
        return false;
      }

      const { error } = await supabase
        .from('bookings')
        .upsert(updates, { onConflict: 'id' });

      if (error) {
        setNotice(error.message || 'Unable to update booking time right now.');
        return false;
      }

      await hydrateSupabaseData();
      setNotice(scope === 'all' ? `Updated ${updates.length} sessions in this series.` : 'Session updated.');
      return true;
    }

    let changedCount = 0;

    setAppState((prev) => {
      const next = structuredClone(prev);
      const target = next.bookings.find((booking) => booking.id === bookingId && booking.userId === currentUser.id);
      if (!target || target.status !== 'confirmed') return prev;

      const targetDate = new Date(target.startISO);
      const targetDateInput = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;

      const updateCandidate = (booking) => {
        const currentStart = new Date(booking.startISO);
        const dateInput = `${currentStart.getFullYear()}-${String(currentStart.getMonth() + 1).padStart(2, '0')}-${String(currentStart.getDate()).padStart(2, '0')}`;
        const nextStart = createLocalDate(dateInput, newTimeInput);
        const nextEnd = new Date(nextStart.getTime() + booking.durationMinutes * 60_000);

        const conflictCount = next.bookings.filter((candidate) => {
          if (candidate.id === booking.id || candidate.status !== 'confirmed') return false;
          const cStart = new Date(candidate.startISO);
          const cEnd = new Date(candidate.endISO);
          return cStart < nextEnd && nextStart < cEnd;
        }).length;

        if (conflictCount >= SLOT_CAPACITY) return;

        booking.startISO = nextStart.toISOString();
        booking.endISO = nextEnd.toISOString();
        changedCount += 1;
      };

      if (scope === 'all' && target.recurrence?.seriesId) {
        next.bookings.forEach((booking) => {
          if (
            booking.userId === currentUser.id
            && booking.status === 'confirmed'
            && booking.recurrence?.seriesId === target.recurrence.seriesId
            && new Date(booking.startISO) >= now
          ) {
            updateCandidate(booking);
          }
        });
      } else {
        const one = next.bookings.find((booking) => booking.id === bookingId && booking.userId === currentUser.id);
        if (!one) return prev;
        const nextStart = createLocalDate(targetDateInput, newTimeInput);
        const nextEnd = new Date(nextStart.getTime() + one.durationMinutes * 60_000);

        const conflictCount = next.bookings.filter((candidate) => {
          if (candidate.id === one.id || candidate.status !== 'confirmed') return false;
          const cStart = new Date(candidate.startISO);
          const cEnd = new Date(candidate.endISO);
          return cStart < nextEnd && nextStart < cEnd;
        }).length;

        if (conflictCount >= SLOT_CAPACITY) return prev;

        one.startISO = nextStart.toISOString();
        one.endISO = nextEnd.toISOString();
        changedCount += 1;
      }

      return changedCount > 0 ? next : prev;
    });

    if (changedCount === 0) {
      setNotice('Unable to apply edit — selected slot is full.');
      return false;
    }

    setNotice(scope === 'all' ? `Updated ${changedCount} sessions in this series.` : 'Session updated.');
    return true;
  }

  const value = {
    appState,
    setAppState,
    now,
    notice,
    setNotice,
    currentUser,
    walletBalance,
    activeQuote,
    quoteSecondsLeft,
    myBookings,
    upcomingBookings,
    pastBookings,
    allBookings,
    landingStats,
    equipmentCategories,

    // Auth
    authMethod,
    setAuthMethod,
    authPending,
    otpSent,
    setOtpSent,
    resetAuthState,
    handleAuthSubmit,
    sendOtp,
    connectWallet,
    signOut,
    registrationResult,
    setRegistrationResult,

    // Booking
    buildQuote,
    confirmQuote,
    cancelBooking,
    getBusyEquipment,
    getSlotInfo,
    getSlotAvailabilityForDay,
    createManualBookings,
    editBookingTime,

    // Wallet
    handleTopUp,

    // Admin
    applyAdminOverrideRefund,
    resetDemo,
    setClockOffset,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

import React from 'react';
import { useEffect, useMemo, useState } from 'react';
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

const DURATION_OPTIONS = [30, 60, 120, 180];
const WORKOUT_TYPES = ['strength', 'cardio', 'conditioning', 'mobility', 'other'];
const EQUIPMENT_OPTIONS = ['rack', 'barbell', 'dumbbells', 'bike', 'rower', 'sled', 'mat', 'bench'];

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

export default function App() {
  const [appState, setAppState] = useState(() => loadAppState());
  const [nowMs, setNowMs] = useState(Date.now());
  const [notice, setNotice] = useState('');

  const [selectedUserId, setSelectedUserId] = useState(appState.currentUserId || appState.users[0]?.id || null);

  const [bookingForm, setBookingForm] = useState(() => ({
    date: formatDateInput(startOfTomorrow()),
    time: '18:00',
    durationMinutes: 60,
    workoutType: 'strength',
    equipment: ['rack'],
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

  const walletBalance = currentUser ? appState.wallets[currentUser.id] || 0 : 0;

  const myBookings = useMemo(() => {
    if (!currentUser) return [];
    return appState.bookings
      .filter((b) => b.userId === currentUser.id)
      .sort(sortByStartDesc);
  }, [appState.bookings, currentUser]);

  const activeQuote = appState.activeQuote && isHoldActive(appState.activeQuote, now) ? appState.activeQuote : null;

  function updateBookingForm(patch) {
    setBookingForm((prev) => ({ ...prev, ...patch }));
  }

  function toggleEquipment(item) {
    setBookingForm((prev) => {
      const exists = prev.equipment.includes(item);
      return {
        ...prev,
        equipment: exists ? prev.equipment.filter((x) => x !== item) : [...prev.equipment, item],
      };
    });
  }

  function handleSignIn() {
    setAppState((prev) => ({ ...prev, currentUserId: selectedUserId }));
    const user = appState.users.find((u) => u.id === selectedUserId);
    setNotice(`Signed in as ${user?.name || 'unknown user'}.`);
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

    setNotice(`Top-up complete: +${pkg.credits} credits for $${pkg.cash}.`);
  }

  function buildQuote() {
    if (!currentUser) {
      setNotice('Sign in first.');
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

    setNotice('Quote locked for 15 minutes.');
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
      setNotice(
        `Insufficient credits. Need ${activeQuote.pricing.finalCredits}, have ${walletBalance}. Buy a package first.`,
      );
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
      setNotice('Capacity changed while confirming. Please request a new quote.');
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

    setNotice(`Booking confirmed. Charged ${activeQuote.pricing.finalCredits} credits.`);
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
      setNotice('Booking cancelled. Full refund applied (>2h before start).');
    } else {
      setNotice('Booking cancelled within 2h. No automatic refund (admin override available).');
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

    setNotice('Admin override applied: remaining credits refunded.');
  }

  function resetDemo() {
    const next = resetAppState();
    setAppState(next);
    setSelectedUserId(next.currentUserId);
    setNotice('Demo data reset.');
  }

  function setClockOffset(value) {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) return;
    setAppState((prev) => ({ ...prev, clockOffsetMinutes: parsed }));
  }

  const quoteSecondsLeft = activeQuote
    ? Math.max(0, Math.floor((new Date(activeQuote.holdExpiresAt).getTime() - now.getTime()) / 1000))
    : 0;

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

  const allBookings = useMemo(() => [...appState.bookings].sort(sortByStartDesc), [appState.bookings]);

  return (
    <div className="app">
      <header>
        <h1>Gym Booking + Credits Prototype</h1>
        <p>
          Demo app with dynamic demand pricing (4-week history), occupancy multipliers, quote holds, wallet top-ups,
          booking history, and cancellation/refund rules.
        </p>
      </header>

      {notice && <div className="notice">{notice}</div>}

      <section className="card">
        <h2>1) Demo Sign-in</h2>
        <div className="row">
          <select value={selectedUserId || ''} onChange={(e) => setSelectedUserId(e.target.value)}>
            {appState.users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
          <button onClick={handleSignIn}>Sign in / Switch user</button>
        </div>
        <p>
          Current user: <strong>{currentUser?.name || 'None'}</strong>
        </p>
      </section>

      <section className="card">
        <h2>2) Wallet + Top-ups</h2>
        <p>
          Balance: <strong>{walletBalance} credits</strong>
        </p>
        <div className="packages">
          {appState.packages.map((pkg) => (
            <button key={pkg.id} onClick={() => handleTopUp(pkg)}>
              {pkg.label}: +{pkg.credits} credits for ${pkg.cash}
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>3) Booking Flow</h2>
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
              {DURATION_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d} min
                </option>
              ))}
            </select>
          </label>

          <label>
            Workout type
            <select
              value={bookingForm.workoutType}
              onChange={(e) => updateBookingForm({ workoutType: e.target.value })}
            >
              {WORKOUT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div>
          <p>Planned equipment</p>
          <div className="chips">
            {EQUIPMENT_OPTIONS.map((item) => (
              <label key={item} className={`chip ${bookingForm.equipment.includes(item) ? 'on' : ''}`}>
                <input
                  type="checkbox"
                  checked={bookingForm.equipment.includes(item)}
                  onChange={() => toggleEquipment(item)}
                />
                {item}
              </label>
            ))}
          </div>
        </div>

        <div className="row">
          <button onClick={buildQuote}>Get quote (hold 15 min)</button>
          <button onClick={confirmQuote} className="accent">
            Confirm booking
          </button>
        </div>

        {activeQuote ? (
          <div className="quote">
            <h3>Active Quote</h3>
            <p>
              Slot: <strong>{formatDateTime(activeQuote.startISO)}</strong> ({activeQuote.durationMinutes} min)
            </p>
            <p>
              Hold expires in <strong>{Math.floor(quoteSecondsLeft / 60)}m {quoteSecondsLeft % 60}s</strong>
            </p>
            <table>
              <tbody>
                <tr>
                  <th>Base</th>
                  <td>{activeQuote.pricing.baseCredits} credits</td>
                </tr>
                <tr>
                  <th>4-week demand tier</th>
                  <td>
                    {activeQuote.pricing.demandTier} ({activeQuote.pricing.demandMultiplier.toFixed(2)}x, history count{' '}
                    {activeQuote.pricing.demandCount})
                  </td>
                </tr>
                <tr>
                  <th>Occupancy multiplier</th>
                  <td>
                    occupancy #{activeQuote.pricing.occupancyAtQuote} ({activeQuote.pricing.occupancyMultiplier.toFixed(2)}x)
                  </td>
                </tr>
                <tr>
                  <th>Final</th>
                  <td>
                    <strong>{activeQuote.pricing.finalCredits} credits</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">No active quote.</p>
        )}
      </section>

      <section className="card">
        <h2>4) Demo Demand + Occupancy Board (1-hour view)</h2>
        <p className="muted">
          Shows seeded dynamic demand tiers from trailing 4-week history and live occupancy (max 5).
        </p>
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Current occupancy</th>
              <th>Next occupancy tier</th>
              <th>4-week demand</th>
              <th>Estimated 60m price</th>
            </tr>
          </thead>
          <tbody>
            {slotRows.map((row) => (
              <tr key={row.hour}>
                <td>{String(row.hour).padStart(2, '0')}:00</td>
                <td>{row.maxExisting}/5</td>
                <td>
                  #{row.nextOccupancy} ({row.occupancyMultiplier.toFixed(2)}x)
                </td>
                <td>
                  {row.demandTier.name} ({row.demandTier.multiplier.toFixed(2)}x, count {row.demandCount})
                </td>
                <td>{row.estFinalCredits} credits</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card">
        <h2>5) My Bookings + History</h2>
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
            {myBookings.map((b) => {
              const isFuture = new Date(b.startISO) > now;
              const canCancel = b.status === 'confirmed' && isFuture;
              return (
                <tr key={b.id}>
                  <td>
                    {formatDateTime(b.startISO)} ({b.durationMinutes}m)
                  </td>
                  <td>{b.status}</td>
                  <td>
                    {b.workoutType} / {b.equipment.join(', ')}
                  </td>
                  <td>{b.pricing?.finalCredits || '-'} credits</td>
                  <td>
                    {b.refundCredits ? `${b.refundCredits} credits` : '-'}
                    {b.refundMode ? <span className="muted"> ({b.refundMode})</span> : ''}
                  </td>
                  <td>
                    {canCancel ? (
                      <button onClick={() => cancelBooking(b.id)}>Cancel</button>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="card">
        <h2>6) Lightweight Admin / Demo Controls</h2>
        <div className="row">
          <label>
            Demo clock offset (minutes)
            <input
              type="number"
              value={appState.clockOffsetMinutes || 0}
              onChange={(e) => setClockOffset(e.target.value)}
            />
          </label>
          <button onClick={resetDemo}>Reset seeded data</button>
        </div>

        <h3>All bookings (admin view)</h3>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>User</th>
              <th>Start</th>
              <th>Status</th>
              <th>Price</th>
              <th>Refund</th>
              <th>Admin action</th>
            </tr>
          </thead>
          <tbody>
            {allBookings.map((b) => {
              const user = appState.users.find((u) => u.id === b.userId);
              const canOverride = b.status === 'cancelled' && (b.refundCredits || 0) < (b.pricing?.finalCredits || 0);
              return (
                <tr key={b.id}>
                  <td>{b.id}</td>
                  <td>{user?.name || b.userId}</td>
                  <td>{formatDateTime(b.startISO)}</td>
                  <td>{b.status}</td>
                  <td>{b.pricing?.finalCredits || '-'} cr</td>
                  <td>{b.refundCredits || 0} cr</td>
                  <td>
                    {canOverride ? (
                      <button onClick={() => applyAdminOverrideRefund(b.id)}>Override refund</button>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <footer className="muted">
        <p>
          Pricing constants: 30m=30, 60m=50, +25/hr | Demand tiers: 1.00 / 1.05 / 1.10 / 1.15 | Occupancy: 1.00,
          1.00, 1.10, 1.20, 1.35 | Capacity cap: 5.
        </p>
      </footer>
    </div>
  );
}

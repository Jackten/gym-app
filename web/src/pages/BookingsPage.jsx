import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock3, RotateCw, Pencil, X } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { formatDateTime, equipmentLabel } from '../lib/helpers';
import { SLOT_TEMPLATES } from '../features/calendar-scheduler/config';
import { Button, Eyebrow } from '../components/ui';

// BookingsPage — upcoming / past list with inline edit.
// Kept feature parity; visual treatment moved onto brand primitives.

export default function BookingsPage() {
  const {
    currentUser,
    upcomingBookings,
    pastBookings,
    cancelBooking,
    editBookingTime,
    now,
  } = useApp();
  const navigate = useNavigate();
  const [tab, setTab] = useState('upcoming');
  const [editingId, setEditingId] = useState('');
  const [editTime, setEditTime] = useState(SLOT_TEMPLATES[0].id);
  const [editScope, setEditScope] = useState('one');

  if (!currentUser) return null;

  const bookings = tab === 'upcoming' ? upcomingBookings : pastBookings;

  function handleCancel(bookingId) {
    if (window.confirm('Cancel this booking?')) {
      cancelBooking(bookingId);
    }
  }

  function openEditor(booking) {
    const start = new Date(booking.startISO);
    const hh = String(start.getHours()).padStart(2, '0');
    const mm = String(start.getMinutes()).padStart(2, '0');
    setEditingId(booking.id);
    setEditTime(`${hh}:${mm}`);
    setEditScope('one');
  }

  async function applyEdit(bookingId) {
    const ok = await editBookingTime({ bookingId, newTimeInput: editTime, scope: editScope });
    if (ok) setEditingId('');
  }

  return (
    <div className="pb-8 animate-fade-up">
      {/* Header */}
      <section className="flex items-end justify-between gap-4 mb-8">
        <div>
          <Eyebrow className="mb-2">Bookings</Eyebrow>
          <h2 className="font-display font-light text-h1 leading-tight tracking-tight text-ivory">
            Your sessions.
          </h2>
        </div>
        <Button size="sm" onClick={() => navigate('/session')}>
          Book a session
        </Button>
      </section>

      {/* Segmented tabs */}
      <div
        role="tablist"
        aria-label="Booking history"
        className="inline-flex items-center gap-1 p-1 mb-8 border border-ash rounded-lg bg-onyx/60"
      >
        {[
          { id: 'upcoming', label: 'Upcoming', count: upcomingBookings.length },
          { id: 'past', label: 'Past', count: pastBookings.length },
        ].map((opt) => {
          const active = tab === opt.id;
          return (
            <button
              key={opt.id}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(opt.id)}
              className={
                'px-4 py-2 text-body-sm rounded-md transition duration-180 ease-out-quart ' +
                (active
                  ? 'bg-brass text-onyx font-medium'
                  : 'text-oat hover:text-ivory')
              }
            >
              {opt.label} <span className="opacity-70">({opt.count})</span>
            </button>
          );
        })}
      </div>

      {/* Booking list */}
      {bookings.length === 0 ? (
        <div className="rounded-lg border border-dashed border-ash p-10 text-center">
          <p className="text-body text-stone">No bookings in this section.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {bookings.map((booking, i) => {
            const isFuture = new Date(booking.startISO) > now;
            const canCancel = booking.status === 'confirmed' && isFuture;
            const isRecurring = Boolean(booking.recurrence?.seriesId);
            const isEditing = editingId === booking.id;

            return (
              <li
                key={booking.id}
                className="rounded-lg border border-ash bg-espresso/60 p-5 animate-fade-up"
                style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="font-display text-h3 text-ivory leading-tight">
                      {formatDateTime(booking.startISO)}
                    </div>
                    <div className="mt-1.5 flex items-center gap-2 text-body-sm text-oat">
                      <Clock3 size={14} strokeWidth={1.5} className="text-brass" />
                      <span>{booking.durationMinutes} min</span>
                      {isRecurring && (
                        <>
                          <span className="text-stone">·</span>
                          <RotateCw size={13} strokeWidth={1.5} className="text-stone" />
                          <span className="text-stone">
                            {Number.isFinite(booking.recurrence?.occurrenceIndex)
                            && Number.isFinite(booking.recurrence?.totalOccurrences)
                              ? `Series ${booking.recurrence.occurrenceIndex}/${booking.recurrence.totalOccurrences}`
                              : 'Recurring'}
                          </span>
                        </>
                      )}
                    </div>
                    {(booking.equipment || []).length > 0 && (
                      <div className="mt-2 text-body-sm text-stone">
                        {(booking.equipment || []).map((item) => equipmentLabel(item)).join(' · ')}
                      </div>
                    )}
                  </div>

                  {canCancel && (
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="tertiary"
                        size="sm"
                        onClick={() => openEditor(booking)}
                      >
                        <Pencil size={14} strokeWidth={1.5} />
                        {isRecurring ? 'Edit one / all' : 'Edit time'}
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleCancel(booking.id)}
                      >
                        <X size={14} strokeWidth={1.5} />
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>

                {isEditing && (
                  <div className="mt-5 pt-5 border-t border-ash/70">
                    <label className="block">
                      <span className="block text-eyebrow uppercase tracking-[0.12em] text-brass mb-2">
                        New time
                      </span>
                      <select
                        value={editTime}
                        onChange={(event) => setEditTime(event.target.value)}
                        className="w-full"
                      >
                        {SLOT_TEMPLATES.map((slot) => (
                          <option key={slot.id} value={slot.id}>{slot.label}</option>
                        ))}
                      </select>
                    </label>

                    {isRecurring && (
                      <fieldset className="mt-4">
                        <legend className="text-eyebrow uppercase tracking-[0.12em] text-brass mb-2">
                          Apply to
                        </legend>
                        <div className="flex flex-wrap gap-4">
                          <label className="inline-flex items-center gap-2 text-body-sm text-oat">
                            <input
                              type="radio"
                              checked={editScope === 'one'}
                              onChange={() => setEditScope('one')}
                            />
                            This session only
                          </label>
                          <label className="inline-flex items-center gap-2 text-body-sm text-oat">
                            <input
                              type="radio"
                              checked={editScope === 'all'}
                              onChange={() => setEditScope('all')}
                            />
                            Entire series
                          </label>
                        </div>
                      </fieldset>
                    )}

                    <div className="mt-5 flex flex-wrap justify-end gap-2">
                      <Button variant="tertiary" size="sm" onClick={() => setEditingId('')}>
                        Close
                      </Button>
                      <Button size="sm" onClick={() => applyEdit(booking.id)}>
                        Save
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { formatDateTime, equipmentLabel } from '../lib/helpers';
import { SLOT_TEMPLATES } from '../features/calendar-scheduler/config';

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

  function applyEdit(bookingId) {
    const ok = editBookingTime({ bookingId, newTimeInput: editTime, scope: editScope });
    if (ok) setEditingId('');
  }

  return (
    <div className="page-bookings">
      <section className="card">
        <div className="bookings-header">
          <h2>Upcoming bookings</h2>
          <button className="btn-primary btn-sm" onClick={() => navigate('/session')}>
            Book a session
          </button>
        </div>

        <div className="tabs">
          <button className={`tab${tab === 'upcoming' ? ' active' : ''}`} onClick={() => setTab('upcoming')}>
            Upcoming ({upcomingBookings.length})
          </button>
          <button className={`tab${tab === 'past' ? ' active' : ''}`} onClick={() => setTab('past')}>
            Past ({pastBookings.length})
          </button>
        </div>

        <div className="booking-list">
          {bookings.length === 0 ? (
            <div className="empty-state">
              <p className="muted">No bookings in this section.</p>
            </div>
          ) : (
            bookings.map((booking) => {
              const isFuture = new Date(booking.startISO) > now;
              const canCancel = booking.status === 'confirmed' && isFuture;
              const isRecurring = Boolean(booking.recurrence?.seriesId);

              return (
                <div key={booking.id} className="booking-card">
                  <div className="booking-card-main">
                    <div className="booking-card-time">
                      <strong>{formatDateTime(booking.startISO)}</strong>
                      <span className="muted">{booking.durationMinutes} min</span>
                    </div>
                    <div className="booking-card-info">
                      <span className="booking-equip muted">
                        {(booking.equipment || []).map((item) => equipmentLabel(item)).join(', ')}
                      </span>
                    </div>
                  </div>

                  {isRecurring && (
                    <p className="muted" style={{ margin: '0 0 0.5rem', fontSize: '0.78rem' }}>
                      Recurring series · occurrence {booking.recurrence.occurrenceIndex}/{booking.recurrence.totalOccurrences}
                    </p>
                  )}

                  <div className="booking-card-actions">
                    {canCancel && <button className="btn-sm btn-danger" onClick={() => handleCancel(booking.id)}>Cancel</button>}
                    {canCancel && (
                      <button className="btn-sm btn-secondary" onClick={() => openEditor(booking)}>
                        {isRecurring ? 'Edit one / all' : 'Edit time'}
                      </button>
                    )}
                  </div>

                  {editingId === booking.id && (
                    <div className="card" style={{ marginTop: '0.75rem', marginBottom: 0, padding: '0.85rem' }}>
                      <label>
                        New time
                        <select value={editTime} onChange={(event) => setEditTime(event.target.value)}>
                          {SLOT_TEMPLATES.map((slot) => (
                            <option key={slot.id} value={slot.id}>{slot.label}</option>
                          ))}
                        </select>
                      </label>

                      {isRecurring && (
                        <div style={{ marginTop: '0.65rem' }}>
                          <p className="muted" style={{ margin: '0 0 0.35rem' }}>Apply changes to</p>
                          <div className="row">
                            <label className="scope-option">
                              <input type="radio" checked={editScope === 'one'} onChange={() => setEditScope('one')} />
                              This session only
                            </label>
                            <label className="scope-option">
                              <input type="radio" checked={editScope === 'all'} onChange={() => setEditScope('all')} />
                              Entire series
                            </label>
                          </div>
                        </div>
                      )}

                      <div className="session-step-actions compact" style={{ marginTop: '0.65rem' }}>
                        <button type="button" className="btn-secondary" onClick={() => setEditingId('')}>Close</button>
                        <button type="button" className="btn-primary" onClick={() => applyEdit(booking.id)}>Save</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}

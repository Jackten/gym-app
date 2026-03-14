import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { formatDateTime, toTitleCase, equipmentLabel } from '../lib/helpers';

export default function BookingsPage() {
  const { currentUser, upcomingBookings, pastBookings, cancelBooking, now } = useApp();
  const navigate = useNavigate();
  const [tab, setTab] = useState('upcoming');

  if (!currentUser) return null;

  const bookings = tab === 'upcoming' ? upcomingBookings : pastBookings;

  function handleCancel(bookingId) {
    if (window.confirm('Cancel this booking?')) {
      cancelBooking(bookingId);
    }
  }

  return (
    <div className="page-bookings">
      <section className="card">
        <div className="bookings-header">
          <h2>My Sessions</h2>
          <button className="btn-primary btn-sm" onClick={() => navigate('/session')}>
            Book New →
          </button>
        </div>

        {/* Tabs */}
        <div className="tabs">
          <button
            className={`tab${tab === 'upcoming' ? ' active' : ''}`}
            onClick={() => setTab('upcoming')}
          >
            Upcoming ({upcomingBookings.length})
          </button>
          <button
            className={`tab${tab === 'past' ? ' active' : ''}`}
            onClick={() => setTab('past')}
          >
            Past ({pastBookings.length})
          </button>
        </div>

        {/* Booking List */}
        <div className="booking-list">
          {bookings.length === 0 ? (
            <div className="empty-state">
              <p className="muted">
                {tab === 'upcoming'
                  ? 'No upcoming sessions. Book one now!'
                  : 'No past sessions yet.'}
              </p>
              {tab === 'upcoming' && (
                <button className="btn-primary" onClick={() => navigate('/session')}>
                  Book a Session
                </button>
              )}
            </div>
          ) : (
            bookings.map((booking) => {
              const isFuture = new Date(booking.startISO) > now;
              const canCancel = booking.status === 'confirmed' && isFuture;

              return (
                <div key={booking.id} className="booking-card">
                  <div className="booking-card-main">
                    <div className="booking-card-time">
                      <strong>{formatDateTime(booking.startISO)}</strong>
                      <span className="muted">{booking.durationMinutes} min</span>
                    </div>
                    <div className="booking-card-info">
                      <span className="badge">{toTitleCase(booking.workoutType)}</span>
                      <span className="booking-equip muted">
                        {booking.equipment.map((e) => equipmentLabel(e)).join(', ')}
                      </span>
                    </div>
                  </div>
                  <div className="booking-card-meta">
                    <span
                      className={`booking-status status-${booking.status}`}
                    >
                      {booking.status}
                    </span>
                    <span className="booking-price">
                      {booking.pricing?.finalCredits || 0} cr
                    </span>
                    {booking.refundCredits > 0 && (
                      <span className="booking-refund">
                        +{booking.refundCredits} cr refunded
                      </span>
                    )}
                  </div>
                  <div className="booking-card-actions">
                    {canCancel && (
                      <button
                        className="btn-sm btn-danger"
                        onClick={() => handleCancel(booking.id)}
                      >
                        Cancel
                      </button>
                    )}
                    {tab === 'past' && booking.status !== 'cancelled' && (
                      <button
                        className="btn-sm btn-secondary"
                        onClick={() => navigate('/session')}
                      >
                        Book Again
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}

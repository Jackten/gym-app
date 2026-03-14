import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { formatDateTime, toTitleCase, equipmentLabel } from '../lib/helpers';

export default function SessionConfirmedPage() {
  const { currentUser, upcomingBookings } = useApp();
  const navigate = useNavigate();

  // Show the most recently created booking
  const latestBooking = upcomingBookings.length > 0
    ? [...upcomingBookings].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      )[0]
    : null;

  return (
    <div className="page-confirmed">
      <section className="card confirmed-card">
        <div className="confirmed-check">
          <div className="success-icon large">✓</div>
        </div>
        <h2>You're booked.</h2>
        {currentUser && (
          <p className="muted confirmed-sub">
            {currentUser.name}, your session is confirmed. See you at Pelayo.
          </p>
        )}

        {latestBooking && (
          <div className="confirmed-details">
            <div className="confirmed-row">
              <span>When</span>
              <strong>{formatDateTime(latestBooking.startISO)}</strong>
            </div>
            <div className="confirmed-row">
              <span>Duration</span>
              <strong>{latestBooking.durationMinutes} min</strong>
            </div>
            <div className="confirmed-row">
              <span>Workout</span>
              <strong>{toTitleCase(latestBooking.workoutType)}</strong>
            </div>
            <div className="confirmed-row">
              <span>Equipment</span>
              <strong>
                {latestBooking.equipment.map((e) => equipmentLabel(e)).join(', ')}
              </strong>
            </div>
            <div className="confirmed-row total">
              <span>Charged</span>
              <strong>{latestBooking.pricing?.finalCredits || 0} credits</strong>
            </div>
          </div>
        )}

        <p className="muted" style={{ fontSize: '0.82rem', marginTop: '1rem' }}>
          Free cancellation up to 2 hours before your session.
        </p>

        <div className="confirmed-actions">
          <button className="btn-primary" onClick={() => navigate('/session')}>
            Book Another Session
          </button>
          <button className="btn-secondary" onClick={() => navigate('/bookings')}>
            View My Sessions
          </button>
          <button onClick={() => navigate('/home')}>Go to Dashboard</button>
        </div>
      </section>
    </div>
  );
}

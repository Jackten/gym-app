import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { formatDateTime } from '../lib/helpers';

export default function HubPage() {
  const { currentUser, upcomingBookings } = useApp();
  const navigate = useNavigate();

  if (!currentUser) return null;

  const nextBooking = upcomingBookings.length > 0
    ? upcomingBookings[upcomingBookings.length - 1]
    : null;

  return (
    <div className="page-hub">
      <section className="hub-hero card">
        <div className="hub-hero-content">
          <p className="eyebrow">Dashboard</p>
          <h2>Welcome back, {currentUser.name}</h2>
          <p className="muted">Your scheduling home. View availability, then jump into booking when ready.</p>
          <div className="hero-actions">
            <button className="btn-primary btn-lg" onClick={() => navigate('/calendar')}>
              View calendar
            </button>
            <button className="btn-secondary btn-lg" onClick={() => navigate('/session')}>
              Book a session
            </button>
          </div>
        </div>
      </section>

      {nextBooking ? (
        <section className="card next-booking-card">
          <div className="next-booking-header">
            <h3>Upcoming booking</h3>
            <button className="btn-sm" onClick={() => navigate('/bookings')}>View all</button>
          </div>
          <strong>{formatDateTime(nextBooking.startISO)}</strong>
          <p className="muted" style={{ marginBottom: 0 }}>{nextBooking.durationMinutes} min session</p>
        </section>
      ) : (
        <section className="card">
          <h3>No upcoming sessions</h3>
          <p className="muted">Tap Book a session to reserve your next training slot.</p>
        </section>
      )}
    </div>
  );
}

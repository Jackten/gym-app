import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { formatDateTime, toTitleCase, equipmentLabel } from '../lib/helpers';

export default function HubPage() {
  const { currentUser, walletBalance, upcomingBookings } = useApp();
  const navigate = useNavigate();

  if (!currentUser) return null;

  const nextBooking = upcomingBookings.length > 0
    ? upcomingBookings[upcomingBookings.length - 1]
    : null;

  return (
    <div className="page-hub">
      {/* Hero CTA */}
      <section className="hub-hero card">
        <div className="hub-hero-content">
          <p className="eyebrow">Ready to train?</p>
          <h2>Book a Session</h2>
          <p className="muted">
            Tell the scheduling agent what you need, review 3 smart options, and lock a slot fast.
          </p>
          <button className="btn-primary btn-lg" onClick={() => navigate('/session')}>
            Start Agent Booking →
          </button>
        </div>
        <div className="hub-hero-visual">
          <div className="hub-hero-icon">📅</div>
        </div>
      </section>

      {/* Quick Info Cards */}
      <div className="hub-cards">
        {/* Wallet Card */}
        <section className="hub-card card" onClick={() => navigate('/wallet')}>
          <div className="hub-card-header">
            <span className="hub-card-icon">💳</span>
            <span className="hub-card-title">Credits</span>
          </div>
          <div className="hub-card-value">{walletBalance}</div>
          <button
            className="btn-sm btn-secondary"
            onClick={(e) => {
              e.stopPropagation();
              navigate('/wallet/topup');
            }}
          >
            Top Up
          </button>
        </section>

        {/* Upcoming Sessions Card */}
        <section className="hub-card card" onClick={() => navigate('/bookings')}>
          <div className="hub-card-header">
            <span className="hub-card-icon">📋</span>
            <span className="hub-card-title">Upcoming</span>
          </div>
          <div className="hub-card-value">{upcomingBookings.length}</div>
          <span className="hub-card-sub">
            {upcomingBookings.length === 1 ? 'session' : 'sessions'}
          </span>
        </section>

        {/* Account Card */}
        <section className="hub-card card" onClick={() => navigate('/account')}>
          <div className="hub-card-header">
            <span className="hub-card-icon">👤</span>
            <span className="hub-card-title">Account</span>
          </div>
          <div className="hub-card-name">{currentUser.name}</div>
          <span className="hub-card-sub">View profile</span>
        </section>
      </div>

      {/* Next Booking Preview */}
      {nextBooking && (
        <section className="card next-booking-card">
          <div className="next-booking-header">
            <h3>Next Session</h3>
            <button className="btn-sm" onClick={() => navigate('/bookings')}>
              View All
            </button>
          </div>
          <div className="next-booking-body">
            <div className="next-booking-time">
              <strong>{formatDateTime(nextBooking.startISO)}</strong>
              <span className="muted">{nextBooking.durationMinutes} min</span>
            </div>
            <div className="next-booking-details">
              <span className="badge">{toTitleCase(nextBooking.workoutType)}</span>
              <span className="muted">
                {nextBooking.equipment.map((e) => equipmentLabel(e)).join(', ')}
              </span>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

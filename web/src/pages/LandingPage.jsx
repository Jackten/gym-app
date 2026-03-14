import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';

export default function LandingPage() {
  const { currentUser, landingStats } = useApp();
  const navigate = useNavigate();

  return (
    <div className="page-landing">
      <section className="hero card">
        <div className="hero-content">
          <p className="eyebrow">Private Training Studio</p>
          <h2>
            Train on your terms.
            <br />
            No crowds, no compromises.
          </h2>
          <p>
            Reserve your slot, plan your equipment, and lock transparent demand-based pricing —
            all before you arrive.
          </p>
          <div className="hero-actions">
            <button
              className="btn-primary"
              onClick={() => navigate(currentUser ? '/home' : '/register')}
            >
              {currentUser ? 'Go to Dashboard' : 'Get Started'}
            </button>
            {!currentUser && (
              <button className="btn-secondary" onClick={() => navigate('/signin')}>
                Sign In
              </button>
            )}
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

      <section className="features-grid">
        <div className="feature-card card">
          <div className="feature-icon">📅</div>
          <h3>Book Your Time</h3>
          <p>Choose from visual time slots with live demand and occupancy indicators.</p>
        </div>
        <div className="feature-card card">
          <div className="feature-icon">💰</div>
          <h3>Transparent Pricing</h3>
          <p>Demand-based pricing — quieter times mean better rates. Always clear, never hidden.</p>
        </div>
        <div className="feature-card card">
          <div className="feature-icon">🏋️</div>
          <h3>Plan Equipment</h3>
          <p>Reserve your gear ahead of time. See what's available, minimize floor conflicts.</p>
        </div>
      </section>
    </div>
  );
}

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';

export default function TopUpPage() {
  const { currentUser } = useApp();
  const navigate = useNavigate();

  if (!currentUser) return null;

  return (
    <div className="page-topup">
      <section className="card">
        <div className="topup-header">
          <div>
            <p className="eyebrow">Payments</p>
            <h2>Online top-ups are not live yet</h2>
            <p className="muted section-desc">
              Credit packages and automated payment handling are still under construction.
              For now, use the app to schedule sessions only.
            </p>
          </div>
        </div>

        <div className="empty-state" style={{ padding: '1rem 0 0' }}>
          <p className="muted">
            No purchase options are shown here because online billing has not been launched yet.
          </p>
        </div>

        <div className="topup-actions">
          <button className="btn-primary" onClick={() => navigate('/calendar')}>
            Go to calendar
          </button>
          <button className="btn-secondary" onClick={() => navigate('/bookings')}>
            View my bookings
          </button>
        </div>
      </section>
    </div>
  );
}

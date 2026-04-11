import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';

export default function WalletPage() {
  const { currentUser } = useApp();
  const navigate = useNavigate();

  if (!currentUser) return null;

  return (
    <div className="page-wallet">
      <section className="card wallet-balance-card">
        <p className="eyebrow">Billing Status</p>
        <div className="wallet-balance-value">Not live</div>
        <span className="muted">online credits and payments are still being built</span>
      </section>

      <section className="card">
        <h3>Scheduling-first launch</h3>
        <p className="muted" style={{ padding: '1rem 0 0', margin: 0 }}>
          This app is currently live for scheduling only. Online wallet balances, package purchases,
          and automatic credit charging are not active yet, so this page is intentionally disabled.
        </p>
        <div className="session-step-actions compact" style={{ marginTop: '1rem' }}>
          <button className="btn-primary" onClick={() => navigate('/calendar')}>
            View calendar
          </button>
          <button className="btn-secondary" onClick={() => navigate('/bookings')}>
            View my bookings
          </button>
        </div>
      </section>
    </div>
  );
}

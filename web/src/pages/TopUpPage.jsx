import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';

export default function TopUpPage() {
  const { currentUser, walletBalance, handleTopUp, appState } = useApp();
  const navigate = useNavigate();

  if (!currentUser) return null;

  function onTopUp(pkg) {
    handleTopUp(pkg);
  }

  return (
    <div className="page-topup">
      <section className="card">
        <div className="topup-header">
          <div>
            <p className="eyebrow">Add Credits</p>
            <h2>Top Up Your Wallet</h2>
            <p className="muted section-desc">
              1 credit = $1 equivalent. Choose a package to add credits instantly.
            </p>
          </div>
          <div className="topup-current-balance">
            <span className="muted">Current Balance</span>
            <strong>{walletBalance} cr</strong>
          </div>
        </div>

        <div className="topup-packages">
          {appState.packages.map((pkg) => {
            const savings = pkg.credits - pkg.cash;
            const hasSavings = savings > 0;
            return (
              <button
                key={pkg.id}
                className="topup-package"
                onClick={() => onTopUp(pkg)}
              >
                <div className="pkg-header">
                  <strong className="pkg-name">{pkg.label}</strong>
                  {hasSavings && <span className="pkg-save">Save ${savings}</span>}
                </div>
                <div className="pkg-credits">+{pkg.credits} credits</div>
                <div className="pkg-price">${pkg.cash}</div>
                <div className="pkg-cta">Purchase →</div>
              </button>
            );
          })}
        </div>

        <div className="topup-actions">
          <button className="btn-secondary" onClick={() => navigate('/wallet')}>
            ← Back to Wallet
          </button>
        </div>
      </section>
    </div>
  );
}

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { toTitleCase, abbreviateWallet } from '../lib/helpers';

export default function AccountPage() {
  const { currentUser, signOut } = useApp();
  const navigate = useNavigate();

  if (!currentUser) return null;

  const authProviders = Array.isArray(currentUser.authProviders)
    ? currentUser.authProviders
    : [];

  return (
    <div className="page-account">
      {/* Profile Section */}
      <section className="card">
        <h3>Profile</h3>
        <div className="account-fields">
          <div className="account-field">
            <span className="field-label">Name</span>
            <span className="field-value">{currentUser.name}</span>
          </div>
          {currentUser.email && (
            <div className="account-field">
              <span className="field-label">Email</span>
              <span className="field-value">{currentUser.email}</span>
            </div>
          )}
          {currentUser.phone && (
            <div className="account-field">
              <span className="field-label">Phone</span>
              <span className="field-value">{currentUser.phone}</span>
            </div>
          )}
          {currentUser.walletAddress && (
            <div className="account-field">
              <span className="field-label">Wallet</span>
              <span className="field-value">
                {abbreviateWallet(currentUser.walletAddress)}
              </span>
            </div>
          )}
          {currentUser.memberSince && (
            <div className="account-field">
              <span className="field-label">Member since</span>
              <span className="field-value">
                {new Date(currentUser.memberSince).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Auth Methods */}
      <section className="card">
        <h3>Authentication Methods</h3>
        {authProviders.length > 0 ? (
          <div className="auth-providers-list">
            {authProviders.map((provider) => (
              <div key={provider} className="auth-provider-row">
                <span className="auth-provider-icon">
                  {provider === 'passkey'
                    ? '🗝️'
                    : provider === 'google'
                      ? '🔑'
                      : provider === 'ethereum'
                        ? '⬡'
                        : provider === 'phone'
                          ? '📱'
                          : '✉️'}
                </span>
                <span>{toTitleCase(provider)}</span>
                <span className="badge badge-active">Connected</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">No authentication methods linked.</p>
        )}
      </section>

      {/* Waiver / Liability */}
      <section className="card">
        <h3>Waiver & Liability</h3>
        <p className="muted section-desc">
          You accepted the liability waiver and terms of service when you created your account.
        </p>
        <div className="waiver-status">
          <span className="badge badge-active">✓ Accepted</span>
          <span className="muted" style={{ fontSize: '0.82rem' }}>
            Covers all sessions at Pelayo Wellness
          </span>
        </div>
      </section>

      {/* Preferences */}
      <section className="card">
        <h3>Preferences</h3>
        <p className="muted section-desc">
          Session preferences and notification settings.
        </p>
        <div className="account-fields">
          <div className="account-field">
            <span className="field-label">Default duration</span>
            <span className="field-value">60 min</span>
          </div>
          <div className="account-field">
            <span className="field-label">Preferred workout</span>
            <span className="field-value">Strength</span>
          </div>
          <div className="account-field">
            <span className="field-label">Notifications</span>
            <span className="field-value">Email reminders</span>
          </div>
        </div>
      </section>

      {/* Sign Out */}
      <section className="card">
        <button
          className="btn-danger"
          style={{ width: '100%' }}
          onClick={() => {
            signOut();
            navigate('/');
          }}
        >
          Sign Out
        </button>
      </section>
    </div>
  );
}

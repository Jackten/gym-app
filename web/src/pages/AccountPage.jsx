import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { toTitleCase, abbreviateWallet } from '../lib/helpers';

export default function AccountPage() {
  const {
    currentUser,
    signOut,
    passkeySupported,
    passkeyFactors,
    passkeyLoading,
    passkeyActionState,
    passkeyActionError,
    loadPasskeyFactors,
    registerPasskey,
    removePasskey,
  } = useApp();
  const navigate = useNavigate();
  const [passkeyName, setPasskeyName] = useState('');

  useEffect(() => {
    if (currentUser) {
      loadPasskeyFactors();
    }
  }, [currentUser]);

  if (!currentUser) return null;

  const authProviders = Array.isArray(currentUser.authProviders)
    ? currentUser.authProviders
    : [];

  const hasVerifiedPasskey = (passkeyFactors || []).some((factor) => factor.status === 'verified');
  const effectiveProviders = (() => {
    const unique = new Set(authProviders.filter((provider) => provider !== 'passkey'));
    if (hasVerifiedPasskey) {
      unique.add('passkey');
    }
    return [...unique];
  })();

  const hasPasskeys = passkeyFactors.length > 0;

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
        {effectiveProviders.length > 0 ? (
          <div className="auth-providers-list">
            {effectiveProviders.map((provider) => (
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

      {/* Passkeys */}
      <section className="card">
        <h3>Passkeys</h3>
        {!passkeySupported ? (
          <p className="muted">This browser doesn&apos;t support passkeys/WebAuthn.</p>
        ) : (
          <>
            <p className="muted section-desc" style={{ marginBottom: '0.65rem' }}>
              Register passkeys to enable one-tap sign-in on supported devices.
            </p>

            <label>
              Passkey name (optional)
              <input
                type="text"
                value={passkeyName}
                onChange={(e) => setPasskeyName(e.target.value)}
                placeholder="e.g. Jack's MacBook"
              />
            </label>

            <div className="row" style={{ marginTop: '0.5rem', marginBottom: '0.75rem' }}>
              <button
                type="button"
                onClick={() => registerPasskey(passkeyName)}
                disabled={passkeyLoading || passkeyActionState !== 'idle'}
              >
                {passkeyActionState === 'enrolling'
                  ? 'Enrolling…'
                  : passkeyActionState === 'challenging'
                    ? 'Waiting for passkey…'
                    : passkeyActionState === 'verifying'
                      ? 'Verifying…'
                      : 'Register new passkey'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => loadPasskeyFactors()}
                disabled={passkeyLoading || passkeyActionState !== 'idle'}
              >
                Refresh
              </button>
            </div>

            {passkeyActionError && (
              <p style={{ margin: '0 0 0.75rem', color: '#fca5a5', fontSize: '0.82rem' }}>
                {passkeyActionError}
              </p>
            )}

            {passkeyLoading ? (
              <p className="muted">Loading passkeys…</p>
            ) : hasPasskeys ? (
              <div className="auth-providers-list">
                {passkeyFactors.map((factor) => (
                  <div key={factor.id} className="auth-provider-row">
                    <span className="auth-provider-icon">🗝️</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                      <span>{factor.friendly_name || 'Passkey'}</span>
                      <span className="muted" style={{ fontSize: '0.72rem' }}>
                        {factor.status === 'verified' ? 'Verified' : 'Pending verification'}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ marginLeft: 'auto' }}
                      onClick={() => removePasskey(factor.id)}
                      disabled={passkeyActionState !== 'idle'}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">No passkeys registered yet.</p>
            )}
          </>
        )}
      </section>

      {/* Waiver / Liability */}
      <section className="card">
        <h3>Waiver & Liability</h3>
        <p className="muted section-desc">
          Signed waiver records are still handled outside this app during the scheduling-first launch.
        </p>
        <div className="waiver-status">
          <span className="badge">Handled offline</span>
          <span className="muted" style={{ fontSize: '0.82rem' }}>
            Staff should confirm your waiver before in-person sessions when needed
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

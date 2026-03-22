import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { AUTH_METHODS, AUTH_VIEW_COPY, EMPTY_AUTH_FORM } from '../lib/constants';
import { abbreviateWallet } from '../lib/helpers';

export default function AuthPage() {
  const location = useLocation();
  const authMode = location.pathname === '/register' ? 'register' : 'signin';
  const navigate = useNavigate();
  const {
    currentUser,
    authMethod,
    setAuthMethod,
    authPending,
    otpSent,
    setOtpSent,
    resetAuthState,
    handleAuthSubmit,
    sendOtp,
    connectWallet,
    setNotice,
  } = useApp();

  const [authForm, setAuthForm] = useState(EMPTY_AUTH_FORM);

  // Redirect if already logged in
  useEffect(() => {
    if (currentUser) {
      navigate('/home', { replace: true });
    }
  }, [currentUser, navigate]);

  // Reset state when switching modes
  useEffect(() => {
    resetAuthState();
    setAuthForm(EMPTY_AUTH_FORM);
  }, [authMode]);

  const copy = AUTH_VIEW_COPY[authMode];
  const actionLabel = authMode === 'register' ? 'Create account' : 'Sign in';

  async function onSubmit(e) {
    e?.preventDefault();
    const result = await handleAuthSubmit(authForm, authMode);
    if (result?.redirect) {
      navigate(result.redirect, { replace: true });
    }
  }

  function onMethodChange(id) {
    setAuthMethod(id);
    resetAuthState();
    setAuthForm((prev) => ({ ...prev, code: '' }));
  }

  return (
    <div className="page-auth">
      <section className="card auth-card">
        <div className="auth-header">
          <div>
            <p className="eyebrow">{copy.eyebrow}</p>
            <h2>{copy.title}</h2>
            <p>{copy.blurb}</p>
          </div>
          <button onClick={() => navigate('/')}>← Back</button>
        </div>

        <div className="auth-methods">
          {AUTH_METHODS.map((method) => (
            <button
              key={method.id}
              className={`auth-method${authMethod === method.id ? ' active' : ''}`}
              onClick={() => onMethodChange(method.id)}
            >
              <strong>
                {method.icon} {method.title}
              </strong>
              <span>{method.subtitle}</span>
            </button>
          ))}
        </div>

        <form className="auth-form" onSubmit={onSubmit}>
          {authMode === 'register' && (
            <label>
              Full name
              <input
                type="text"
                value={authForm.name}
                onChange={(e) => setAuthForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Maria Pelayo"
              />
            </label>
          )}

          {authMethod === 'passkey' && (
            <>
              <label>
                Account email
                <input
                  type="email"
                  value={authForm.email}
                  onChange={(e) => setAuthForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="you@example.com"
                />
              </label>
              <p className="muted" style={{ margin: 0, fontSize: '0.8rem' }}>
                Prototype note: passkey flow is mocked and uses email identity.
              </p>
            </>
          )}

          {authMethod === 'google' && (
            <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>
              You&apos;ll continue with Google in a secure Supabase popup.
            </p>
          )}

          {authMethod === 'ethereum' && (
            <>
              <label>
                Wallet address
                <input
                  type="text"
                  value={authForm.walletAddress}
                  onChange={(e) => setAuthForm((p) => ({ ...p, walletAddress: e.target.value }))}
                  placeholder="0x..."
                />
              </label>
              <div className="row">
                <button
                  type="button"
                  onClick={() => connectWallet(authForm, setAuthForm, authMode)}
                  disabled={authPending}
                >
                  {authPending ? 'Connecting…' : 'Connect Wallet'}
                </button>
                {authForm.walletAddress && (
                  <span className="muted" style={{ fontSize: '0.82rem' }}>
                    Connected: {abbreviateWallet(authForm.walletAddress)}
                  </span>
                )}
              </div>
              <label>
                Recovery email (recommended)
                <input
                  type="email"
                  value={authForm.email}
                  onChange={(e) => setAuthForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="you@example.com"
                />
              </label>
            </>
          )}

          {authMethod === 'phone' && (
            <>
              <label>
                Mobile number
                <input
                  type="tel"
                  value={authForm.phone}
                  onChange={(e) => setAuthForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="+1 787 555 0199"
                />
              </label>
              {otpSent && (
                <label>
                  SMS code
                  <input
                    type="text"
                    value={authForm.code}
                    onChange={(e) => setAuthForm((p) => ({ ...p, code: e.target.value }))}
                    placeholder="6-digit code"
                    autoFocus
                  />
                </label>
              )}
              <label>
                Backup email (optional)
                <input
                  type="email"
                  value={authForm.email}
                  onChange={(e) => setAuthForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="you@example.com"
                />
              </label>
            </>
          )}

          {authMethod === 'email' && (
            <>
              <label>
                Email address
                <input
                  type="email"
                  value={authForm.email}
                  onChange={(e) => setAuthForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="you@example.com"
                />
              </label>
              {otpSent && (
                <label>
                  Magic code
                  <input
                    type="text"
                    value={authForm.code}
                    onChange={(e) => setAuthForm((p) => ({ ...p, code: e.target.value }))}
                    placeholder="Enter verification code"
                    autoFocus
                  />
                </label>
              )}
            </>
          )}

          {/* Waiver for registration */}
          {authMode === 'register' && (
            <label className="waiver-check">
              <input
                type="checkbox"
                checked={authForm.waiverAccepted}
                onChange={(e) => setAuthForm((p) => ({ ...p, waiverAccepted: e.target.checked }))}
              />
              <span>
                I acknowledge the inherent risks of physical training and accept the{' '}
                <strong>liability waiver</strong> and <strong>terms of service</strong> for Pelayo
                Wellness.
              </span>
            </label>
          )}

          <div className="auth-actions">
            {(authMethod === 'phone' || authMethod === 'email') && !otpSent && (
              <button type="button" disabled={authPending} onClick={() => sendOtp(authForm)}>
                {`Send ${authMethod === 'phone' ? 'SMS' : 'Email'} Code`}
              </button>
            )}
            <button
              type="submit"
              className="btn-primary"
              disabled={authPending || (authMode === 'register' && !authForm.waiverAccepted)}
            >
              {authPending ? 'Processing…' : actionLabel}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate(authMode === 'signin' ? '/register' : '/signin')}
            >
              {copy.switchText}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

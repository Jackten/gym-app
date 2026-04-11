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
    otpCooldownSeconds,
    resetAuthState,
    handleAuthSubmit,
    sendOtp,
    connectWallet,
    passkeySupported,
    passkeyActionState,
    passkeyActionError,
  } = useApp();

  const [authForm, setAuthForm] = useState(EMPTY_AUTH_FORM);
  const requestedPath = location.state?.from?.pathname;
  const postAuthRedirect = requestedPath && !['/', '/signin', '/register'].includes(requestedPath)
    ? requestedPath
    : '/home';

  // Redirect if already logged in
  useEffect(() => {
    if (currentUser) {
      navigate(postAuthRedirect, { replace: true });
    }
  }, [currentUser, navigate, postAuthRedirect]);

  // Reset state when switching modes
  useEffect(() => {
    resetAuthState();
    setAuthMethod('');
    setAuthForm(EMPTY_AUTH_FORM);
  }, [authMode]);

  const copy = AUTH_VIEW_COPY[authMode];
  const actionLabel = authMethod === 'passkey'
    ? 'Sign in with passkey'
    : authMode === 'register'
      ? 'Create account'
      : 'Sign in';
  const isEmailSignupFlow = authMethod === 'email' && authMode === 'register';
  const emailCodeButtonLabel = otpCooldownSeconds > 0
    ? `${isEmailSignupFlow ? 'Send signup link' : 'Send email code'} (${otpCooldownSeconds}s)`
    : isEmailSignupFlow
      ? 'Send signup link'
      : 'Send Email Code';
  const resendEmailCodeLabel = otpCooldownSeconds > 0
    ? `${isEmailSignupFlow ? 'Resend signup link' : 'Resend email code'} (${otpCooldownSeconds}s)`
    : isEmailSignupFlow
      ? 'Resend signup link'
      : 'Resend email code';

  async function onSubmit(e) {
    e?.preventDefault();
    if (isEmailSignupFlow) {
      await sendOtp(authForm, authMode);
      return;
    }
    const result = await handleAuthSubmit(authForm, authMode);
    if (result?.redirect) {
      navigate(result.redirect === '/home' ? postAuthRedirect : result.redirect, { replace: true });
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
          {AUTH_METHODS.map((method) => {
            const disabled = method.comingSoon
              || (method.id === 'passkey' && (!passkeySupported || authMode === 'register'));

            return (
            <button
              key={method.id}
              type="button"
              className={`auth-method${authMethod === method.id ? ' active' : ''}${disabled ? ' disabled' : ''}`}
              onClick={() => onMethodChange(method.id)}
              disabled={disabled}
              aria-disabled={disabled}
            >
              <strong>
                {method.icon} {method.title}
              </strong>
              <span>{method.subtitle}</span>
            </button>
            );
          })}
        </div>

        <form className="auth-form" onSubmit={onSubmit}>
          {!authMethod && (
            <p className="muted" style={{ margin: 0 }}>
              Select a sign-in method above to continue.
            </p>
          )}

          {authMethod && authMode === 'register' && (
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


          {authMethod === 'google' && (
            <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>
              You&apos;ll continue with Google in a secure Supabase popup.
            </p>
          )}

          {authMethod === 'passkey' && (
            <>
              <p className="muted" style={{ margin: 0, fontSize: '0.82rem' }}>
                One tap. No email code. Authenticate with your saved passkey.
              </p>
              {passkeyActionState !== 'idle' && (
                <p className="muted" style={{ margin: 0, fontSize: '0.82rem' }}>
                  {passkeyActionState === 'challenging' && 'Waiting for your passkey…'}
                  {passkeyActionState === 'verifying' && 'Verifying passkey…'}
                </p>
              )}
              {passkeyActionError && (
                <p style={{ margin: 0, color: '#fca5a5', fontSize: '0.82rem' }}>{passkeyActionError}</p>
              )}
            </>
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
                <>
                  {authMode === 'signin' && (
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
                  {authMode === 'register' ? (
                    <p className="muted" style={{ margin: 0, fontSize: '0.82rem' }}>
                      Check your email and open the signup link in the same browser/device you used here so the app can finish signing you in automatically.
                    </p>
                  ) : null}
                </>
              )}
            </>
          )}

          {authMethod && authMode === 'register' && (
            <p className="muted" style={{ margin: 0, fontSize: '0.82rem' }}>
              Waiver paperwork is handled separately before in-person sessions when needed.
            </p>
          )}

          <div className="auth-actions">
            {authMethod === 'email' && !otpSent && (
              <button
                type="button"
                disabled={authPending || otpCooldownSeconds > 0}
                onClick={() => sendOtp(authForm, authMode)}
              >
                {emailCodeButtonLabel}
              </button>
            )}
            {authMethod === 'email' && otpSent && (
              <button
                type="button"
                className="btn-secondary"
                disabled={authPending || otpCooldownSeconds > 0}
                onClick={() => sendOtp(authForm, authMode)}
              >
                {resendEmailCodeLabel}
              </button>
            )}
            {!isEmailSignupFlow && (
              <button
                type="submit"
                className="btn-primary"
                disabled={authPending || !authMethod}
              >
                {authPending ? 'Processing…' : actionLabel}
              </button>
            )}
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate(authMode === 'signin' ? '/register' : '/signin', { state: location.state })}
            >
              {copy.switchText}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

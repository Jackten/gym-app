import React, { useEffect, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { consumeAuthRedirect } from '../lib/authRedirect';

function friendlyAuthError(search, hash) {
  const query = new URLSearchParams(search);
  const fragment = new URLSearchParams(hash.replace(/^#/, ''));
  const code = query.get('error_code') || fragment.get('error_code') || '';
  const description = query.get('error_description') || fragment.get('error_description') || '';

  if (!code && !description) return '';
  if (code === 'otp_expired') {
    return 'That email link is invalid or has expired. Request a fresh link and try again.';
  }
  return description || 'Unable to finish sign-in from that link.';
}

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, authReady, setNotice, handleAuthCallback } = useApp();
  const errorMessage = useMemo(
    () => friendlyAuthError(location.search, location.hash),
    [location.search, location.hash],
  );
  const authCode = useMemo(
    () => new URLSearchParams(location.search).get('code') || '',
    [location.search],
  );

  useEffect(() => {
    if (errorMessage) {
      setNotice(errorMessage);
    }
  }, [errorMessage, setNotice]);

  useEffect(() => {
    if (errorMessage || !authCode || currentUser) return undefined;

    let cancelled = false;

    handleAuthCallback(authCode).then((result) => {
      if (cancelled || result?.ok) return;
      if (result?.message) {
        setNotice(result.message);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [authCode, currentUser, errorMessage, handleAuthCallback, setNotice]);

  useEffect(() => {
    if (!authReady || !currentUser) return;
    navigate(consumeAuthRedirect(), { replace: true });
  }, [authReady, currentUser, navigate]);

  if (errorMessage) {
    return (
      <section className="card auth-card">
        <div className="auth-header">
          <div>
            <p className="eyebrow">Auth Link Error</p>
            <h2>We couldn&apos;t finish sign-in</h2>
            <p>{errorMessage}</p>
          </div>
        </div>

        <div className="auth-actions">
          <Link to="/signin" className="btn-primary">Back to sign in</Link>
          <Link to="/register" className="btn-secondary">Create account</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="card auth-card">
      <div className="auth-header">
        <div>
          <p className="eyebrow">Finishing Sign-in</p>
          <h2>One moment</h2>
          <p>We&apos;re finishing your sign-in and will send you back into the app automatically.</p>
        </div>
      </div>
    </section>
  );
}

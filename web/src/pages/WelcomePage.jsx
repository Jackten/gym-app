import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { toTitleCase } from '../lib/helpers';

export default function WelcomePage() {
  const { registrationResult, currentUser } = useApp();
  const navigate = useNavigate();

  if (!registrationResult || !currentUser) {
    return (
      <div className="page-welcome">
        <section className="card account-ready">
          <div className="success-icon">✓</div>
          <h2>Welcome</h2>
          <p className="muted">Let's get you started.</p>
          <div className="row action-row" style={{ justifyContent: 'center' }}>
            <button className="btn-primary" onClick={() => navigate('/home')}>
              Go to Dashboard →
            </button>
          </div>
        </section>
      </div>
    );
  }

  const methodLabel = toTitleCase(registrationResult.method);

  return (
    <div className="page-welcome">
      <section className="card account-ready">
        <div className="success-icon">✓</div>
        <h2>You're in.</h2>
        <p className="muted">
          {registrationResult.user.name}, your account was created via{' '}
          <strong>{methodLabel}</strong>. You're ready to book your first session.
        </p>
        <div className="row action-row" style={{ justifyContent: 'center' }}>
          <button className="btn-primary" onClick={() => navigate('/session')}>
            Book your first session →
          </button>
          <button onClick={() => navigate('/home')}>Go to Dashboard</button>
        </div>
      </section>
    </div>
  );
}

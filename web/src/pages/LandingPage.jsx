import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';

export default function LandingPage() {
  const { currentUser } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) {
      navigate('/home', { replace: true });
    }
  }, [currentUser, navigate]);

  return (
    <div className="page-landing-auth">
      <section className="card landing-auth-card">
        <p className="eyebrow">Pelayo Wellness</p>
        <h2>Welcome</h2>
        <p className="muted">Sign in or create an account to access the schedule and manage bookings.</p>
        <div className="landing-auth-actions">
          <button className="btn-primary btn-lg" onClick={() => navigate('/signin')}>Sign in</button>
          <button className="btn-secondary btn-lg" onClick={() => navigate('/register')}>Create account</button>
        </div>
      </section>
    </div>
  );
}

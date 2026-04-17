import React from 'react';
import { Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { useApp } from './contexts/AppContext';
import BottomNav from './components/BottomNav';
import Notice from './components/Notice';

import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import HubPage from './pages/HubPage';
import SessionPage from './pages/SessionPage';
import CalendarPage from './pages/CalendarPage';
import BookingsPage from './pages/BookingsPage';
import AccountPage from './pages/AccountPage';
import AdminPage from './pages/AdminPage';

function RequireAuth({ children }) {
  const { currentUser, authReady } = useApp();
  const location = useLocation();

  if (!authReady) {
    return null;
  }

  if (!currentUser) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  return children;
}

function RequireAdmin({ children }) {
  const { currentUser, isAdmin, authReady } = useApp();
  const location = useLocation();

  if (!authReady) {
    return null;
  }

  if (!currentUser) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/home" replace />;
  }

  return children;
}

function AppHeader() {
  const { currentUser, signOut } = useApp();
  const location = useLocation();

  // Hide header on auth pages and landing
  const hiddenPaths = ['/signin', '/register', '/'];
  if (hiddenPaths.includes(location.pathname)) return null;

  return (
    <header className="topbar">
      <div className="topbar-brand">
        <p className="eyebrow">Pelayo Studio Platform</p>
        <h1>Pelayo Wellness</h1>
      </div>
      {currentUser && (
        <div className="topbar-actions">
          <div className="member-pill">
            <strong>{currentUser.name}</strong>
          </div>
        </div>
      )}
    </header>
  );
}

export default function App() {
  const { currentUser } = useApp();
  const location = useLocation();

  // Determine if we're on a flow page (session steps, top-up) where we might want minimal chrome
  const isFlowPage = location.pathname.startsWith('/session');
  // Landing renders its own full-bleed chrome — skip the legacy app shell.
  const isLanding = location.pathname === '/';

  // Show bottom nav only for authenticated users on app pages
  const showBottomNav =
    currentUser &&
    !['/signin', '/register', '/auth/callback', '/'].includes(location.pathname) &&
    !isFlowPage;

  if (isLanding) {
    return (
      <div className="min-h-screen bg-onyx">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="*" element={<Navigate to={currentUser ? '/home' : '/'} replace />} />
        </Routes>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <main className={`app${showBottomNav ? ' has-bottom-nav' : ''}`}>
        {/* Inner page header */}
        {location.pathname !== '/signin' &&
          location.pathname !== '/register' &&
          location.pathname !== '/auth/callback' && (
            <header className="topbar topbar-inner">
              <div className="topbar-brand">
                <h1>
                  <Link to="/home" className="topbar-home-link">Pelayo Wellness</Link>
                </h1>
              </div>
              {currentUser && (
                <div className="topbar-actions">
                  <div className="member-pill">
                    <strong>{currentUser.name}</strong>
                  </div>
                </div>
              )}
            </header>
          )}

        <Notice />

        <div className="page-content">
          <Routes>
            {/* Public */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/signin" element={<AuthPage />} />
            <Route path="/register" element={<AuthPage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />

            {/* Protected */}
            <Route
              path="/home"
              element={
                <RequireAuth>
                  <HubPage />
                </RequireAuth>
              }
            />
            <Route
              path="/session"
              element={
                <RequireAuth>
                  <SessionPage />
                </RequireAuth>
              }
            />
            <Route
              path="/calendar"
              element={
                <RequireAuth>
                  <CalendarPage />
                </RequireAuth>
              }
            />
            <Route
              path="/wallet"
              element={
                <RequireAuth>
                  <Navigate to="/calendar" replace />
                </RequireAuth>
              }
            />
            <Route
              path="/wallet/topup"
              element={
                <RequireAuth>
                  <Navigate to="/calendar" replace />
                </RequireAuth>
              }
            />
            <Route
              path="/bookings"
              element={
                <RequireAuth>
                  <BookingsPage />
                </RequireAuth>
              }
            />
            <Route
              path="/account"
              element={
                <RequireAuth>
                  <AccountPage />
                </RequireAuth>
              }
            />
            <Route
              path="/admin"
              element={
                <RequireAdmin>
                  <AdminPage />
                </RequireAdmin>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to={currentUser ? '/home' : '/'} replace />} />
          </Routes>
        </div>

        <footer className="muted app-footer">
          <p>Pelayo Wellness · Premium Private Training</p>
        </footer>
      </main>

      {showBottomNav && <BottomNav />}
    </div>
  );
}

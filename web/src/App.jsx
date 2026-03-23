import React from 'react';
import { Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { useApp } from './contexts/AppContext';
import BottomNav from './components/BottomNav';
import Notice from './components/Notice';

import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import HubPage from './pages/HubPage';
import SessionPage from './pages/SessionPage';
import CalendarPage from './pages/CalendarPage';
import WalletPage from './pages/WalletPage';
import TopUpPage from './pages/TopUpPage';
import BookingsPage from './pages/BookingsPage';
import AccountPage from './pages/AccountPage';
import AdminPage from './pages/AdminPage';

function RequireAuth({ children }) {
  const { currentUser } = useApp();
  const location = useLocation();

  if (!currentUser) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
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

  // Show bottom nav only for authenticated users on app pages
  const showBottomNav =
    currentUser &&
    !['/signin', '/register', '/'].includes(location.pathname);

  // Determine if we're on a flow page (session steps, top-up) where we might want minimal chrome
  const isFlowPage = location.pathname.startsWith('/session');

  return (
    <div className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <main className={`app${showBottomNav ? ' has-bottom-nav' : ''}`}>
        {/* Show full topbar on landing, simplified on inner pages */}
        {location.pathname === '/' && (
          <header className="topbar">
            <div className="topbar-brand">
              <p className="eyebrow">Pelayo Studio Platform</p>
              <h1>Pelayo Wellness</h1>
            </div>
            {currentUser ? (
              <div className="topbar-actions">
                <div className="member-pill">
                  <strong>{currentUser.name}</strong>
                </div>
              </div>
            ) : (
              <div className="topbar-actions">
                <Link to="/signin" className="topbar-link">Sign in</Link>
                <Link to="/register" className="btn-primary topbar-btn">Get started</Link>
              </div>
            )}
          </header>
        )}

        {/* Inner page header */}
        {location.pathname !== '/' &&
          location.pathname !== '/signin' &&
          location.pathname !== '/register' && (
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
                  <WalletPage />
                </RequireAuth>
              }
            />
            <Route
              path="/wallet/topup"
              element={
                <RequireAuth>
                  <TopUpPage />
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
                <RequireAuth>
                  <AdminPage />
                </RequireAuth>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
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

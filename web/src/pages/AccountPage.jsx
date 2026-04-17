import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Mail, Smartphone, Wallet, Fingerprint, LogOut } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { toTitleCase, abbreviateWallet } from '../lib/helpers';
import { WAIVER_SECTIONS, emptyWaiverForm } from '../lib/waiver';
import { Button, Eyebrow } from '../components/ui';

function ProviderIcon({ provider }) {
  const map = {
    passkey: Fingerprint,
    google: KeyRound,
    ethereum: Wallet,
    phone: Smartphone,
    email: Mail,
  };
  const Icon = map[provider] || Mail;
  return <Icon size={18} strokeWidth={1.5} />;
}

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
    waiverAcceptance,
    waiverLoading,
    waiverSaving,
    waiverError,
    saveWaiverAcceptance,
  } = useApp();
  const navigate = useNavigate();
  const [passkeyName, setPasskeyName] = useState('');
  const [waiverForm, setWaiverForm] = useState(() => emptyWaiverForm(currentUser));

  useEffect(() => {
    if (currentUser) {
      loadPasskeyFactors();
    }
  }, [currentUser]);

  useEffect(() => {
    if (waiverAcceptance) {
      setWaiverForm({
        legalName: waiverAcceptance.legal_name || currentUser?.name || '',
        emergencyContactName: waiverAcceptance.emergency_contact_name || '',
        emergencyContactPhone: waiverAcceptance.emergency_contact_phone || '',
        signatureName: waiverAcceptance.signature_name || currentUser?.name || '',
        agreed: true,
      });
      return;
    }

    setWaiverForm(emptyWaiverForm(currentUser));
  }, [waiverAcceptance, currentUser]);

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
  const waiverAcceptedAt = waiverAcceptance?.accepted_at
    ? new Date(waiverAcceptance.accepted_at).toLocaleString()
    : '';
  const describePasskeySite = (rpId) => {
    if (rpId === 'pelayowellness.com') return 'Ready for pelayowellness.com';
    if (rpId === 'gym-app-navy-nine.vercel.app') return 'Legacy passkey from the old Vercel site';
    return rpId ? `Registered for ${rpId}` : 'Registered passkey';
  };

  return (
    <div className="page-account pb-8 animate-fade-up">
      {/* Header */}
      <section className="mb-8">
        <Eyebrow className="mb-2">Account</Eyebrow>
        <h2 className="font-display font-light text-h1 leading-tight tracking-tight text-ivory">
          {currentUser.name}
        </h2>
        {currentUser.email && (
          <p className="mt-2 text-body text-oat">{currentUser.email}</p>
        )}
      </section>

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
                <span className="auth-provider-icon" style={{ color: 'var(--accent)' }}>
                  <ProviderIcon provider={provider} />
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
      {passkeySupported && (
        <section className="card">
          <h3>Passkeys</h3>
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
                    <span className="auth-provider-icon" style={{ color: 'var(--accent)' }}>
                      <Fingerprint size={18} strokeWidth={1.5} />
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                      <span>{factor.friendly_name || 'Passkey'}</span>
                      <span className="muted" style={{ fontSize: '0.72rem' }}>
                        {factor.status === 'verified' ? 'Verified' : 'Pending verification'}
                      </span>
                      <span className="muted" style={{ fontSize: '0.72rem' }}>
                        {describePasskeySite(factor.rp_id)}
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
        </section>
      )}

      {/* Waiver / Liability */}
      <section className="card">
        <h3>Waiver & Liability</h3>
        <p className="muted section-desc">
          Complete your digital waiver once, then the account will show it as signed.
        </p>
        <div className="waiver-status" style={{ marginBottom: '0.9rem' }}>
          <span className="badge">{waiverAcceptance ? 'Signed digitally' : 'Needs signature'}</span>
          <span className="muted" style={{ fontSize: '0.82rem' }}>
            {waiverAcceptance
              ? `Accepted ${waiverAcceptedAt}`
              : 'Sign this before your first in-person session.'}
          </span>
        </div>

        {WAIVER_SECTIONS.map((section) => (
          <div key={section.heading} style={{ marginBottom: '0.85rem' }}>
            <strong style={{ display: 'block', marginBottom: '0.2rem' }}>{section.heading}</strong>
            <p className="muted" style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.5 }}>
              {section.body}
            </p>
          </div>
        ))}

        <label>
          Full legal name
          <input
            type="text"
            value={waiverForm.legalName}
            onChange={(e) => setWaiverForm((prev) => ({ ...prev, legalName: e.target.value }))}
            placeholder="Your legal name"
            disabled={waiverSaving}
          />
        </label>

        <label style={{ marginTop: '0.75rem' }}>
          Emergency contact name
          <input
            type="text"
            value={waiverForm.emergencyContactName}
            onChange={(e) => setWaiverForm((prev) => ({ ...prev, emergencyContactName: e.target.value }))}
            placeholder="Who should we contact?"
            disabled={waiverSaving}
          />
        </label>

        <label style={{ marginTop: '0.75rem' }}>
          Emergency contact phone
          <input
            type="tel"
            value={waiverForm.emergencyContactPhone}
            onChange={(e) => setWaiverForm((prev) => ({ ...prev, emergencyContactPhone: e.target.value }))}
            placeholder="Phone number"
            disabled={waiverSaving}
          />
        </label>

        <label style={{ marginTop: '0.75rem' }}>
          Signature
          <input
            type="text"
            value={waiverForm.signatureName}
            onChange={(e) => setWaiverForm((prev) => ({ ...prev, signatureName: e.target.value }))}
            placeholder="Type your full name"
            disabled={waiverSaving}
          />
        </label>

        <label className="waiver-check" style={{ marginTop: '0.75rem' }}>
          <input
            type="checkbox"
            checked={waiverForm.agreed}
            onChange={(e) => setWaiverForm((prev) => ({ ...prev, agreed: e.target.checked }))}
            disabled={waiverSaving}
          />
          <span>
            I have read this waiver, understand it, and agree to sign it electronically.
          </span>
        </label>

        {waiverError && (
          <p style={{ marginTop: '0.75rem', color: '#fca5a5', fontSize: '0.82rem' }}>
            {waiverError}
          </p>
        )}

        {waiverLoading && (
          <p className="muted" style={{ marginTop: '0.75rem' }}>Loading waiver status…</p>
        )}

        <div className="row" style={{ marginTop: '0.9rem' }}>
          <button
            type="button"
            onClick={() => saveWaiverAcceptance(waiverForm)}
            disabled={waiverSaving}
          >
            {waiverSaving ? 'Saving…' : waiverAcceptance ? 'Update waiver' : 'Sign waiver'}
          </button>
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
            <span className="field-value">30 min</span>
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
      <section className="mt-4">
        <Button
          variant="tertiary"
          size="md"
          className="w-full"
          onClick={() => {
            signOut();
            navigate('/');
          }}
        >
          <LogOut size={16} strokeWidth={1.5} />
          Sign out
        </Button>
      </section>
    </div>
  );
}

import React from 'react';
import { useApp } from '../contexts/AppContext';
import { formatDateTime } from '../lib/helpers';

export default function AdminPage() {
  const {
    appState,
    allBookings,
    resetDemo,
    setClockOffset,
    applyAdminOverrideRefund,
  } = useApp();

  return (
    <div className="page-admin">
      <section className="card">
        <p className="eyebrow">Staff Only</p>
        <h2>Operations Panel</h2>
        <p className="muted section-desc">
          Demo controls for testing pricing and booking mechanics.
        </p>

        <div className="row" style={{ marginBottom: '1.25rem' }}>
          <label>
            Clock offset (minutes)
            <input
              type="number"
              value={appState.clockOffsetMinutes || 0}
              onChange={(e) => setClockOffset(e.target.value)}
            />
          </label>
          <button onClick={resetDemo}>Reset Demo Data</button>
        </div>

        <h3>All Bookings</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>User</th>
                <th>Start</th>
                <th>Status</th>
                <th>Price</th>
                <th>Refund</th>
                <th>Admin</th>
              </tr>
            </thead>
            <tbody>
              {allBookings.map((booking) => {
                const user = appState.users.find((u) => u.id === booking.userId);
                const canOverride =
                  booking.status === 'cancelled' &&
                  (booking.refundCredits || 0) < (booking.pricing?.finalCredits || 0);

                return (
                  <tr key={booking.id}>
                    <td>{booking.id}</td>
                    <td>{user?.name || booking.userId}</td>
                    <td>{formatDateTime(booking.startISO)}</td>
                    <td>{booking.status}</td>
                    <td>{booking.pricing?.finalCredits || '-'} cr</td>
                    <td>{booking.refundCredits || 0} cr</td>
                    <td>
                      {canOverride ? (
                        <button onClick={() => applyAdminOverrideRefund(booking.id)}>
                          Override
                        </button>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

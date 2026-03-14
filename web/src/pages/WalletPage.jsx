import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { formatDateTime } from '../lib/helpers';

export default function WalletPage() {
  const { currentUser, walletBalance, appState } = useApp();
  const navigate = useNavigate();

  if (!currentUser) return null;

  const myTransactions = appState.transactions
    .filter((t) => t.userId === currentUser.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return (
    <div className="page-wallet">
      {/* Balance Card */}
      <section className="card wallet-balance-card">
        <p className="eyebrow">Credit Balance</p>
        <div className="wallet-balance-value">{walletBalance}</div>
        <span className="muted">credits available</span>
        <button
          className="btn-primary btn-lg"
          style={{ marginTop: '1.25rem' }}
          onClick={() => navigate('/wallet/topup')}
        >
          Top Up Credits
        </button>
      </section>

      {/* Recent Transactions */}
      <section className="card">
        <h3>Transaction History</h3>
        {myTransactions.length === 0 ? (
          <p className="muted" style={{ padding: '1rem 0' }}>
            No transactions yet.
          </p>
        ) : (
          <div className="tx-list">
            {myTransactions.map((tx) => {
              const isCredit = tx.credits > 0;
              return (
                <div key={tx.id} className="tx-row">
                  <div className="tx-info">
                    <span className={`tx-type ${tx.type}`}>{tx.type}</span>
                    <span className="tx-note">{tx.note}</span>
                  </div>
                  <div className="tx-amount-col">
                    <span className={`tx-amount ${isCredit ? 'positive' : 'negative'}`}>
                      {isCredit ? '+' : ''}
                      {tx.credits} cr
                    </span>
                    <span className="tx-date">{formatDateTime(tx.createdAt)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

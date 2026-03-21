import React from 'react';

export default function RecurrenceReview({ summary, sessions }) {
  return (
    <div className="recurrence-review">
      <div className="review-summary">
        <div className="review-row">
          <span className="review-label">Summary</span>
          <strong>{summary}</strong>
        </div>
      </div>

      <details>
        <summary>View generated session list ({sessions.length})</summary>
        <div className="generated-session-list">
          {sessions.map((session) => (
            <div key={`${session.dateInput}-${session.timeInput}`} className="generated-session-item">
              <strong>{session.dateInput}</strong>
              <span>{session.timeInput}</span>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}

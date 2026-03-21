import React, { useMemo } from 'react';

export default function RecurrenceReview({ summary, sessions }) {
  const groupedSessions = useMemo(() => {
    const grouped = {};
    sessions.forEach((session) => {
      if (!grouped[session.dateInput]) grouped[session.dateInput] = [];
      grouped[session.dateInput].push(session);
    });

    Object.values(grouped).forEach((items) => {
      items.sort((a, b) => a.timeInput.localeCompare(b.timeInput));
    });

    return grouped;
  }, [sessions]);

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
        <div className="generated-session-list grouped">
          {Object.entries(groupedSessions).map(([dateInput, sessionsForDay]) => (
            <div key={dateInput} className="generated-session-day-group">
              <h4>{dateInput}</h4>
              {sessionsForDay.map((session) => (
                <div key={`${session.dateInput}-${session.timeInput}`} className="generated-session-item">
                  <strong>{session.timeInput}</strong>
                  <span>{session.durationMinutes} min</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}

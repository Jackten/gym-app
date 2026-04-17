import React, { useMemo } from 'react';

export default function RecurrenceReview({ summary, sessions }) {
  function formatSessionRange(session) {
    const [hoursRaw = '0', minutesRaw = '0'] = String(session.timeInput || '00:00').split(':');
    const totalStartMinutes = Number(hoursRaw) * 60 + Number(minutesRaw);
    const totalEndMinutes = totalStartMinutes + Number(session.durationMinutes || 0);

    const formatMinutes = (totalMinutes) => {
      const minutesInDay = ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);
      const hours24 = Math.floor(minutesInDay / 60);
      const minutes = minutesInDay % 60;
      const suffix = hours24 >= 12 ? 'PM' : 'AM';
      const hours12 = hours24 % 12 || 12;
      return `${hours12}:${String(minutes).padStart(2, '0')} ${suffix}`;
    };

    return `${formatMinutes(totalStartMinutes)} - ${formatMinutes(totalEndMinutes)}`;
  }

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
                  <strong>{formatSessionRange(session)}</strong>
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

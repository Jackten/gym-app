import React from 'react';

export default function TwoWeekCalendar({ days, selectedDay, onSelectDay, daysWithSelections = {} }) {
  return (
    <div className="calendar-strip" role="tablist" aria-label="2-week calendar">
      {days.map((day) => {
        const isActive = selectedDay === day.id;
        const hasSelections = daysWithSelections[day.id]?.length > 0;
        return (
          <button
            key={day.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`calendar-day-chip${isActive ? ' active' : ''}${hasSelections ? ' has-selections' : ''}`}
            onClick={() => onSelectDay(day.id)}
          >
            <span>{day.dayName}</span>
            <strong>{day.monthDay}</strong>
            {hasSelections && <span className="day-chip-badge">{daysWithSelections[day.id].length}</span>}
          </button>
        );
      })}
    </div>
  );
}

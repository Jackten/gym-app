import React from 'react';

export default function TwoWeekCalendar({ days, selectedDay, onSelectDay }) {
  return (
    <div className="calendar-strip" role="tablist" aria-label="2-week calendar">
      {days.map((day) => {
        const isActive = selectedDay === day.id;
        return (
          <button
            key={day.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`calendar-day-chip${isActive ? ' active' : ''}`}
            onClick={() => onSelectDay(day.id)}
          >
            <span>{day.dayName}</span>
            <strong>{day.monthDay}</strong>
          </button>
        );
      })}
    </div>
  );
}

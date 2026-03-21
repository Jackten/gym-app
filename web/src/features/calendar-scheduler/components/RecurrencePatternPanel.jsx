import React from 'react';
import { RECURRENCE_FREQUENCIES, WEEKDAY_OPTIONS } from '../config';

export default function RecurrencePatternPanel({ recurrence, onChange, onToggleWeekday, onAddSkipDate, onRemoveSkipDate }) {
  return (
    <div className="recurrence-panel">
      <label>
        Repeat frequency
        <select
          value={recurrence.frequency}
          onChange={(event) => onChange('frequency', event.target.value)}
        >
          {RECURRENCE_FREQUENCIES.map((option) => (
            <option key={option.id} value={option.id}>{option.label}</option>
          ))}
        </select>
      </label>

      {recurrence.frequency !== 'none' && (
        <>
          <label>
            End date
            <input
              type="date"
              value={recurrence.endDate}
              onChange={(event) => onChange('endDate', event.target.value)}
            />
          </label>

          <div>
            <p className="muted">Weekdays</p>
            <div className="weekday-row">
              {WEEKDAY_OPTIONS.map((day) => (
                <button
                  key={day.id}
                  type="button"
                  className={`weekday-chip${recurrence.weekdays.includes(day.id) ? ' on' : ''}`}
                  onClick={() => onToggleWeekday(day.id)}
                >
                  {day.short}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="muted">Skip specific dates</p>
            <div className="row">
              <input
                type="date"
                value={recurrence.skipDateInput}
                onChange={(event) => onChange('skipDateInput', event.target.value)}
              />
              <button type="button" onClick={onAddSkipDate}>Add skip date</button>
            </div>
            {recurrence.skipDates.length > 0 && (
              <div className="skip-chip-row">
                {recurrence.skipDates.map((dateInput) => (
                  <button
                    key={dateInput}
                    type="button"
                    className="skip-date-chip"
                    onClick={() => onRemoveSkipDate(dateInput)}
                  >
                    {dateInput} ✕
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <div>
        <p className="muted">Edit scope</p>
        <div className="row">
          <label className="scope-option">
            <input
              type="radio"
              checked={recurrence.editScope === 'one'}
              onChange={() => onChange('editScope', 'one')}
            />
            Edit this session only
          </label>
          <label className="scope-option">
            <input
              type="radio"
              checked={recurrence.editScope === 'all'}
              onChange={() => onChange('editScope', 'all')}
            />
            Edit all in this series
          </label>
        </div>
      </div>
    </div>
  );
}

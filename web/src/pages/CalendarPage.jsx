import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { formatDateInput, formatDateTime } from '../lib/helpers';
import { getTwoWeekRange } from '../features/calendar-scheduler/utils';

export default function CalendarPage() {
  const { now, appState, currentUser, getSlotAvailabilityForDay, upcomingBookings } = useApp();
  const navigate = useNavigate();

  const twoWeekDays = useMemo(() => getTwoWeekRange(now), [now]);
  const [selectedDay, setSelectedDay] = useState(twoWeekDays[0]?.id || formatDateInput(now));

  if (!currentUser) return null;

  const daySummaries = twoWeekDays.map((day) => {
    const slots = getSlotAvailabilityForDay(day.id);
    const openSlots = slots.filter((slot) => !slot.isPast && !slot.isFull).length;
    const fullSlots = slots.filter((slot) => slot.isFull).length;
    const myBookingsCount = upcomingBookings.filter((booking) => booking.startISO.startsWith(day.id)).length;

    return {
      ...day,
      openSlots,
      fullSlots,
      myBookingsCount,
    };
  });

  const selectedSlots = getSlotAvailabilityForDay(selectedDay);
  const selectedDayBookings = appState.bookings
    .filter((booking) => booking.status === 'confirmed' && booking.startISO.startsWith(selectedDay))
    .sort((a, b) => new Date(a.startISO) - new Date(b.startISO));

  const mySelectedDayBookings = selectedDayBookings.filter((booking) => booking.userId === currentUser.id);

  return (
    <div className="page-calendar">
      <section className="card">
        <p className="eyebrow">2-week schedule view</p>
        <h2>View calendar</h2>
        <p className="muted section-desc">
          Browse bookings and availability at a glance. Use Book a session when you&apos;re ready to reserve.
        </p>

        <div className="calendar-grid-2w">
          {daySummaries.map((day) => {
            const isActive = day.id === selectedDay;
            return (
              <button
                key={day.id}
                type="button"
                className={`calendar-day-card${isActive ? ' active' : ''}`}
                onClick={() => setSelectedDay(day.id)}
              >
                <div>
                  <p className="calendar-day-name">{day.dayName}</p>
                  <strong>{day.monthDay}</strong>
                </div>
                <div className="calendar-day-metrics">
                  <span>Open: {day.openSlots}</span>
                  <span>Full: {day.fullSlots}</span>
                  <span>Mine: {day.myBookingsCount}</span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="session-step-actions compact left">
          <button type="button" className="btn-primary" onClick={() => navigate('/session')}>
            Book a session
          </button>
        </div>
      </section>

      <section className="card">
        <h3>{selectedDay} details</h3>
        <div className="slot-card-grid">
          {selectedSlots.map((slot) => (
            <div key={slot.id} className={`slot-card static${slot.isFull ? ' full' : ''}`}>
              <strong>{slot.label}</strong>
              <span>
                {slot.isPast ? 'Past' : slot.isFull ? `Full · ${slot.reserved} booked` : `${slot.remaining} spots left`}
              </span>
            </div>
          ))}
        </div>

        <h4 style={{ marginTop: '1rem' }}>Booked sessions</h4>
        {selectedDayBookings.length === 0 ? (
          <p className="muted">No confirmed bookings on this day yet.</p>
        ) : (
          <div className="generated-session-list">
            {selectedDayBookings.map((booking) => (
              <div key={booking.id} className="generated-session-item">
                <span>{formatDateTime(booking.startISO)}</span>
                <strong>{booking.userId === currentUser.id ? 'Your booking' : 'Booked'}</strong>
              </div>
            ))}
          </div>
        )}

        {mySelectedDayBookings.length > 0 && (
          <p className="muted" style={{ marginTop: '0.65rem', marginBottom: 0 }}>
            You have {mySelectedDayBookings.length} booking{mySelectedDayBookings.length > 1 ? 's' : ''} on this day.
          </p>
        )}
      </section>
    </div>
  );
}

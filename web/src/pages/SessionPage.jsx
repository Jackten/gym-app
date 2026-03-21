import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { formatDateInput, createLocalDate, equipmentLabel } from '../lib/helpers';
import TwoWeekCalendar from '../features/calendar-scheduler/components/TwoWeekCalendar';
import SlotCardList from '../features/calendar-scheduler/components/SlotCardList';
import EquipmentSelector from '../features/calendar-scheduler/components/EquipmentSelector';
import RecurrencePatternPanel from '../features/calendar-scheduler/components/RecurrencePatternPanel';
import RecurrenceReview from '../features/calendar-scheduler/components/RecurrenceReview';
import { EQUIPMENT_FLOW_CATEGORIES } from '../features/calendar-scheduler/config';
import {
  getTwoWeekRange,
  generateRecurringSessions,
  buildSeriesSummary,
  normalizeSkipDates,
} from '../features/calendar-scheduler/utils';

export default function SessionPage() {
  const {
    now,
    currentUser,
    getSlotAvailabilityForDay,
    getBusyEquipment,
    createManualBookings,
    setNotice,
  } = useApp();

  const navigate = useNavigate();
  const twoWeekDays = useMemo(() => getTwoWeekRange(now), [now]);
  const [selectedDay, setSelectedDay] = useState(twoWeekDays[0]?.id || formatDateInput(now));
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [step, setStep] = useState('slot');

  const [equipmentSelection, setEquipmentSelection] = useState({ categories: ['dont-know'], items: [] });
  const [equipmentNote, setEquipmentNote] = useState('');

  const [recurrence, setRecurrence] = useState({
    frequency: 'none',
    weekdays: [new Date().getDay()],
    endDate: twoWeekDays[13]?.id || formatDateInput(now),
    skipDateInput: '',
    skipDates: [],
    editScope: 'all',
  });

  const [generatedSessions, setGeneratedSessions] = useState([]);

  const slots = useMemo(() => getSlotAvailabilityForDay(selectedDay), [selectedDay, getSlotAvailabilityForDay]);

  const equipmentConflicts = useMemo(() => {
    if (selectedSlots.length === 0) return [];

    const busyAcrossSelectedSlots = selectedSlots.reduce((busySet, slot) => {
      const start = createLocalDate(selectedDay, slot.id);
      const end = new Date(start.getTime() + 60 * 60_000);
      const busy = getBusyEquipment(start, end);
      busy.forEach((item) => busySet.add(item));
      return busySet;
    }, new Set());

    return equipmentSelection.items.filter((item) => busyAcrossSelectedSlots.has(item));
  }, [selectedSlots, selectedDay, getBusyEquipment, equipmentSelection.items]);

  if (!currentUser) return null;

  function handleSelectDay(dayId) {
    setSelectedDay(dayId);
    setSelectedSlots([]);
  }

  function handleToggleSlot(slot) {
    setSelectedSlots((prev) => {
      const exists = prev.some((candidate) => candidate.id === slot.id);
      if (exists) {
        return prev.filter((candidate) => candidate.id !== slot.id);
      }
      return [...prev, slot].sort((a, b) => a.id.localeCompare(b.id));
    });
  }

  function handleToggleCategory(categoryId) {
    setEquipmentSelection((prev) => {
      const categories = prev.categories || [];

      if (categoryId === 'dont-know') {
        return { categories: ['dont-know'], items: [] };
      }

      const exists = categories.includes(categoryId);
      const withoutDefault = categories.filter((category) => category !== 'dont-know');
      const nextCategories = exists
        ? withoutDefault.filter((category) => category !== categoryId)
        : [...withoutDefault, categoryId];

      if (nextCategories.length === 0) {
        return { categories: ['dont-know'], items: [] };
      }

      const allowedItems = new Set(
        EQUIPMENT_FLOW_CATEGORIES
          .filter((category) => nextCategories.includes(category.id))
          .flatMap((category) => category.items.map((item) => item.id)),
      );

      return {
        categories: nextCategories,
        items: prev.items.filter((item) => allowedItems.has(item)),
      };
    });
  }

  function handleToggleEquipment(itemId) {
    setEquipmentSelection((prev) => ({
      ...prev,
      items: prev.items.includes(itemId)
        ? prev.items.filter((item) => item !== itemId)
        : [...prev.items, itemId],
    }));
  }

  function handleRecurrenceChange(field, value) {
    setRecurrence((prev) => ({ ...prev, [field]: value }));
  }

  function handleToggleWeekday(dayId) {
    setRecurrence((prev) => {
      const exists = prev.weekdays.includes(dayId);
      const weekdays = exists ? prev.weekdays.filter((d) => d !== dayId) : [...prev.weekdays, dayId];
      return { ...prev, weekdays: weekdays.length > 0 ? weekdays : [dayId] };
    });
  }

  function addSkipDate() {
    if (!recurrence.skipDateInput) return;
    setRecurrence((prev) => ({
      ...prev,
      skipDates: normalizeSkipDates([...prev.skipDates, prev.skipDateInput]),
      skipDateInput: '',
    }));
  }

  function removeSkipDate(dateInput) {
    setRecurrence((prev) => ({
      ...prev,
      skipDates: prev.skipDates.filter((date) => date !== dateInput),
    }));
  }

  function proceedToEquipment() {
    if (selectedSlots.length === 0) {
      setNotice('Select at least one slot card first.');
      return;
    }
    setStep('equipment');
  }

  function proceedToRecurrence() {
    if (selectedSlots.length === 0) return;
    setStep('recurrence');
  }

  function generateSeriesReview() {
    if (selectedSlots.length === 0) return;

    const slotDate = createLocalDate(selectedDay, '00:00');
    const selectedWeekday = slotDate.getDay();
    const effectiveWeekdays = recurrence.frequency === 'none'
      ? [selectedWeekday]
      : recurrence.weekdays.length > 0
        ? recurrence.weekdays
        : [selectedWeekday];

    const uniqueSessions = new Map();

    selectedSlots.forEach((slot) => {
      const sessionsForSlot = generateRecurringSessions({
        selectedDate: selectedDay,
        time: slot.id,
        durationMinutes: 60,
        recurrence: {
          ...recurrence,
          weekdays: effectiveWeekdays,
        },
      });

      sessionsForSlot.forEach((session) => {
        uniqueSessions.set(`${session.dateInput}-${session.timeInput}`, session);
      });
    });

    const sessions = [...uniqueSessions.values()].sort((a, b) => {
      const aKey = `${a.dateInput}T${a.timeInput}`;
      const bKey = `${b.dateInput}T${b.timeInput}`;
      return aKey.localeCompare(bKey);
    });

    if (sessions.length === 0) {
      setNotice('No sessions generated. Check end date and selected weekdays.');
      return;
    }

    setGeneratedSessions(sessions);
    setStep('review');
  }

  function confirmBooking() {
    const result = createManualBookings({
      sessions: generatedSessions,
      equipmentSelection,
      note: equipmentNote.trim(),
      recurrence,
    });

    if (!result.ok) return;
    navigate('/bookings');
  }

  return (
    <div className="page-session">
      <section className="card">
        <p className="eyebrow">Manual calendar scheduler</p>
        <h2>Book a session</h2>
        <p className="muted section-desc">Select one or more slot cards, then confirm your booking in one action.</p>

        <TwoWeekCalendar days={twoWeekDays} selectedDay={selectedDay} onSelectDay={handleSelectDay} />

        <h4 style={{ marginTop: '1rem' }}>Available times</h4>
        <SlotCardList
          slots={slots}
          selectedSlotIds={selectedSlots.map((slot) => slot.id)}
          onToggle={handleToggleSlot}
        />

        {selectedSlots.length > 0 && (
          <p className="muted" style={{ margin: '0.65rem 0 0' }}>
            Selected slots: {selectedSlots.map((slot) => slot.label).join(', ')}
          </p>
        )}

        {step === 'slot' && (
          <div className="session-step-actions compact">
            <button type="button" className="btn-primary" onClick={proceedToEquipment}>Continue</button>
          </div>
        )}
      </section>

      {step !== 'slot' && (
        <section className="card">
          <h3>Equipment (optional)</h3>
          <p className="muted">Pick one or more equipment categories. Exact equipment picks are optional.</p>

          <EquipmentSelector
            selection={equipmentSelection}
            onToggleCategory={handleToggleCategory}
            onToggleItem={handleToggleEquipment}
          />

          <label>
            Notes (optional)
            <input
              value={equipmentNote}
              onChange={(event) => setEquipmentNote(event.target.value)}
              placeholder="Any special setup notes"
            />
          </label>

          {equipmentConflicts.length > 0 && (
            <p className="equipment-conflict-note">
              Heads up: {equipmentConflicts.map((item) => equipmentLabel(item)).join(', ')} is already reserved in at least one selected slot.
              You can still book this time.
            </p>
          )}

          {step === 'equipment' && (
            <div className="session-step-actions compact">
              <button type="button" className="btn-secondary" onClick={() => setStep('slot')}>Back</button>
              <button type="button" className="btn-primary" onClick={proceedToRecurrence}>Set repeat pattern</button>
            </div>
          )}
        </section>
      )}

      {(step === 'recurrence' || step === 'review') && (
        <section className="card">
          <h3>Recurring pattern</h3>
          <p className="muted">Set frequency, weekdays, end date, and skip dates before review.</p>

          <RecurrencePatternPanel
            recurrence={recurrence}
            onChange={handleRecurrenceChange}
            onToggleWeekday={handleToggleWeekday}
            onAddSkipDate={addSkipDate}
            onRemoveSkipDate={removeSkipDate}
          />

          {step === 'recurrence' && (
            <div className="session-step-actions compact">
              <button type="button" className="btn-secondary" onClick={() => setStep('equipment')}>Back</button>
              <button type="button" className="btn-primary" onClick={generateSeriesReview}>Review generated sessions</button>
            </div>
          )}
        </section>
      )}

      {step === 'review' && (
        <section className="card">
          <h3>Review and confirm</h3>
          <RecurrenceReview
            summary={buildSeriesSummary(generatedSessions, recurrence)}
            sessions={generatedSessions}
          />

          <div className="review-summary" style={{ marginTop: '0.75rem' }}>
            <div className="review-row">
              <span className="review-label">Edit mode for recurring changes</span>
              <strong>{recurrence.editScope === 'all' ? 'Edit all sessions in series' : 'Edit one session at a time'}</strong>
            </div>
          </div>

          <div className="session-step-actions compact">
            <button type="button" className="btn-secondary" onClick={() => setStep('recurrence')}>Back</button>
            <button type="button" className="btn-primary" onClick={confirmBooking}>Confirm booking</button>
          </div>
        </section>
      )}
    </div>
  );
}

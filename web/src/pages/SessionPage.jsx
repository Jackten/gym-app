import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import {
  AGENT_OPENING_MESSAGE,
  CATEGORY_DEFAULT_EQUIPMENT,
  EQUIPMENT_BY_CATEGORY,
  EQUIPMENT_CATEGORIES,
} from '../features/scheduling-agent/config';
import { buildRecommendations, planFromIntake } from '../features/scheduling-agent/logic';
import { equipmentLabel, formatDuration, formatDateTime, toTitleCase, createLocalDate } from '../lib/helpers';

function resolveEquipmentSelection({ categoryId, selectedExact, freeText }) {
  if (categoryId === 'no-preference') {
    return {
      equipment: ['general'],
      summary: freeText?.trim()
        ? `No specific equipment (note: ${freeText.trim()})`
        : 'No equipment preference yet',
    };
  }

  const explicit = selectedExact.filter(Boolean);
  const fallback = CATEGORY_DEFAULT_EQUIPMENT[categoryId] || [];
  const equipment = explicit.length > 0 ? explicit : fallback;

  const summaryBase = equipment.length > 0
    ? equipment.map((id) => equipmentLabel(id)).join(', ')
    : 'No specific equipment selected';

  return {
    equipment: equipment.length > 0 ? equipment : ['general'],
    summary: freeText?.trim() ? `${summaryBase} (note: ${freeText.trim()})` : summaryBase,
  };
}

function AgentBubble({ role, children }) {
  return <div className={`agent-bubble ${role}`}>{children}</div>;
}

export default function SessionPage() {
  const {
    currentUser,
    now,
    buildQuote,
    confirmQuote,
    getSlotInfo,
    getBusyEquipment,
    setNotice,
  } = useApp();
  const navigate = useNavigate();

  const [stage, setStage] = useState('intake');
  const [requestText, setRequestText] = useState('');
  const [agentMessages, setAgentMessages] = useState([{ role: 'assistant', text: AGENT_OPENING_MESSAGE }]);
  const [plan, setPlan] = useState(null);
  const [options, setOptions] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);
  const [equipmentCategory, setEquipmentCategory] = useState('no-preference');
  const [selectedExactEquipment, setSelectedExactEquipment] = useState([]);
  const [equipmentFreeText, setEquipmentFreeText] = useState('');
  const [advisoryConflicts, setAdvisoryConflicts] = useState([]);
  const [equipmentSummary, setEquipmentSummary] = useState('No equipment preference yet');
  const [isLocking, setIsLocking] = useState(false);
  const [lockError, setLockError] = useState('');

  const exactEquipmentOptions = useMemo(
    () => (equipmentCategory === 'no-preference' ? [] : EQUIPMENT_BY_CATEGORY[equipmentCategory] || []),
    [equipmentCategory],
  );

  if (!currentUser) return null;

  function addMessage(role, text) {
    setAgentMessages((prev) => [...prev, { role, text }]);
  }

  function handlePlanRequest(event) {
    event.preventDefault();
    setLockError('');

    const trimmed = requestText.trim();
    if (!trimmed) return;

    addMessage('user', trimmed);

    const nextPlan = planFromIntake(trimmed, now);
    if (nextPlan.blocked) {
      addMessage('assistant', nextPlan.blockerMessage);
      setRequestText('');
      return;
    }

    const recs = buildRecommendations({ plan: nextPlan, getSlotInfo, now });
    if (recs.length < 3) {
      addMessage(
        'assistant',
        'I need a bit more range to find 3 strong options. Try a wider window like “tomorrow afternoon” or “Saturday morning”.',
      );
      setRequestText('');
      return;
    }

    addMessage(
      'assistant',
      `Got it. I inferred ${formatDuration(nextPlan.durationMinutes).toLowerCase()} ${toTitleCase(nextPlan.workoutType).toLowerCase()} and picked the top 3 options. Tap one to continue.`,
    );

    setPlan(nextPlan);
    setOptions(recs);
    setSelectedOption(null);
    setEquipmentCategory('no-preference');
    setSelectedExactEquipment([]);
    setEquipmentFreeText('');
    setAdvisoryConflicts([]);
    setStage('recommendations');
    setRequestText('');
  }

  function handleSelectOption(option) {
    setLockError('');
    setSelectedOption(option);
    addMessage('assistant', `Perfect — ${option.windowLabel} works. Quick equipment check before I lock this slot.`);
    setStage('equipment');
  }

  function toggleExactEquipment(itemId) {
    setSelectedExactEquipment((prev) => (
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    ));
  }

  function handleEquipmentContinue() {
    if (!selectedOption) return;
    setLockError('');

    const resolved = resolveEquipmentSelection({
      categoryId: equipmentCategory,
      selectedExact: selectedExactEquipment,
      freeText: equipmentFreeText,
    });

    const start = createLocalDate(selectedOption.dateInput, selectedOption.timeInput);
    const end = new Date(start.getTime() + selectedOption.durationMinutes * 60_000);
    const busyEquipment = getBusyEquipment(start, end);
    const conflicts = resolved.equipment.filter((id) => busyEquipment.has(id));

    setEquipmentSummary(resolved.summary);
    setAdvisoryConflicts(conflicts);
    setStage('confirm');
  }

  async function handleLockSlot() {
    if (!selectedOption || !plan || isLocking) return;

    setLockError('');

    const resolved = resolveEquipmentSelection({
      categoryId: equipmentCategory,
      selectedExact: selectedExactEquipment,
      freeText: equipmentFreeText,
    });

    setIsLocking(true);

    const quote = buildQuote({
      date: selectedOption.dateInput,
      time: selectedOption.timeInput,
      durationMinutes: selectedOption.durationMinutes,
      workoutType: plan.workoutType,
      equipment: resolved.equipment,
      equipmentMode: equipmentCategory === 'no-preference' ? 'dont-know' : 'exact',
      selectedCategories: equipmentCategory === 'no-preference' ? [] : [equipmentCategory],
    });

    if (!quote) {
      setIsLocking(false);
      setLockError('That slot changed while we were confirming. Pick another recommendation and try again.');
      setNotice('That slot just changed. Pick another recommendation and I’ll refresh.');
      setStage('recommendations');
      return;
    }

    const success = confirmQuote({
      quoteOverride: quote,
      skipWalletCheck: true,
      skipWalletCharge: true,
      source: 'agent-led-prototype',
      bookingNote: equipmentFreeText.trim() || undefined,
    });

    setIsLocking(false);

    if (!success) {
      setLockError('I couldn’t lock this slot right now. Please try again or choose another recommendation.');
      return;
    }

    addMessage('assistant', 'Locked. You are booked — I added your slot and saved your equipment note.');
    setStage('success');
  }

  function resetFlow() {
    setStage('intake');
    setRequestText('');
    setPlan(null);
    setOptions([]);
    setSelectedOption(null);
    setEquipmentCategory('no-preference');
    setSelectedExactEquipment([]);
    setEquipmentFreeText('');
    setAdvisoryConflicts([]);
    setEquipmentSummary('No equipment preference yet');
    setLockError('');
    setAgentMessages([{ role: 'assistant', text: AGENT_OPENING_MESSAGE }]);
  }

  return (
    <div className="page-session page-session-agent">
      <section className="card scheduling-intake-card">
        <p className="eyebrow">Agent-led Scheduling Prototype</p>
        <h2>Book with the Pelayo scheduling agent</h2>
        <p className="muted section-desc">
          Signed in as <strong>{currentUser.name}</strong>. I infer details, suggest strong times, then lock once you confirm the slot.
        </p>

        <div className="agent-chat-log">
          {agentMessages.map((message, index) => (
            <AgentBubble key={`${message.role}-${index}`} role={message.role}>
              {message.text}
            </AgentBubble>
          ))}
        </div>

        {stage === 'intake' && (
          <form className="agent-intake-form" onSubmit={handlePlanRequest}>
            <label>
              Describe your request
              <textarea
                value={requestText}
                onChange={(event) => setRequestText(event.target.value)}
                placeholder="Tomorrow evening strength. About an hour."
                rows={3}
              />
            </label>
            <div className="session-step-actions compact">
              <button type="submit" className="btn-primary btn-lg">Suggest 3 options</button>
            </div>
          </form>
        )}
      </section>

      {stage === 'recommendations' && (
        <section className="card">
          <h3>Recommended options</h3>
          <p className="muted">Friendly windows + exact starts. Pick one and I’ll confirm before locking.</p>

          <div className="agent-options-grid">
            {options.map((option) => (
              <button type="button"
                key={option.id}
                className="agent-option-card"
                onClick={() => handleSelectOption(option)}
              >
                <span className="agent-option-window">{option.windowLabel}</span>
                <strong className="agent-option-time">{option.exactTimeLabel}</strong>
                <span className="agent-option-meta">
                  {formatDuration(option.durationMinutes)} · {toTitleCase(option.workoutType)}
                </span>
                <span className="agent-option-note">{option.note}</span>
              </button>
            ))}
          </div>

          <div className="session-step-actions compact">
            <button type="button" className="btn-secondary" onClick={() => setStage('intake')}>Adjust request</button>
          </div>
        </section>
      )}

      {stage === 'equipment' && selectedOption && (
        <section className="card">
          <h3>Quick equipment check</h3>
          <p className="muted">Optional and lightweight. We only ask now that your slot is selected.</p>

          <div className="equipment-categories agent-equipment-categories">
            {EQUIPMENT_CATEGORIES.map((category) => (
              <button
                key={category.id}
                type="button"
                aria-pressed={equipmentCategory === category.id}
                className={`category-chip${equipmentCategory === category.id ? ' on' : ''}${equipmentCategory === category.id && category.id === 'no-preference' ? ' category-chip-default' : ''}`}
                onClick={() => {
                  setEquipmentCategory(category.id);
                  setSelectedExactEquipment([]);
                }}
              >
                {category.icon} {category.label}
              </button>
            ))}
          </div>

          {equipmentCategory === 'no-preference' && (
            <p className="muted equipment-default-note">Default selected: Don’t know / no preference.</p>
          )}

          {equipmentCategory !== 'no-preference' && exactEquipmentOptions.length > 0 && (
            <div className="equipment-items agent-equipment-items">
              {exactEquipmentOptions.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`eq-chip${selectedExactEquipment.includes(item.id) ? ' on' : ''}`}
                  onClick={() => toggleExactEquipment(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}

          <label>
            Optional note (open text)
            <input
              value={equipmentFreeText}
              onChange={(event) => setEquipmentFreeText(event.target.value)}
              placeholder="Anything specific I should account for?"
            />
          </label>

          <div className="session-step-actions compact">
            <button type="button" className="btn-secondary" onClick={() => setStage('recommendations')}>Back</button>
            <button type="button" className="btn-primary" onClick={handleEquipmentContinue}>Continue to lock</button>
          </div>
        </section>
      )}

      {stage === 'confirm' && selectedOption && (
        <section className="card">
          <h3>Confirm slot lock</h3>
          <p className="muted">Review the selected slot, then lock it.</p>

          <div className="review-summary">
            <div className="review-row">
              <span className="review-label">Slot</span>
              <strong>{formatDateTime(selectedOption.startISO)}</strong>
            </div>
            <div className="review-row">
              <span className="review-label">Duration</span>
              <strong>{formatDuration(selectedOption.durationMinutes)}</strong>
            </div>
            <div className="review-row">
              <span className="review-label">Equipment</span>
              <strong>{equipmentSummary}</strong>
            </div>
          </div>

          {advisoryConflicts.length > 0 && (
            <div className="equipment-advisory-card">
              <strong>Equipment advisory</strong>
              <p>
                The following equipment is already reserved in this time slot: {advisoryConflicts.map((id) => equipmentLabel(id)).join(', ')}.
                You can keep this slot, choose different equipment, or pick another time.
              </p>
              <div className="session-step-actions compact left">
                <button type="button" className="btn-secondary" onClick={() => setStage('equipment')}>Choose different equipment</button>
                <button type="button" className="btn-secondary" onClick={() => setStage('recommendations')}>Choose different time</button>
              </div>
            </div>
          )}

          {lockError && <p className="agent-lock-error" role="alert">{lockError}</p>}

          <div className="session-step-actions compact">
            <button type="button" className="btn-secondary" onClick={() => setStage('equipment')}>Back</button>
            <button type="button" className="btn-primary btn-lg" onClick={handleLockSlot} disabled={isLocking}>
              {isLocking ? 'Locking…' : 'Lock this slot'}
            </button>
          </div>
        </section>
      )}

      {stage === 'success' && selectedOption && (
        <section className="card confirmed-card">
          <div className="success-icon large">✓</div>
          <h2>Booked successfully</h2>
          <p className="muted confirmed-sub">Your slot is locked and saved in My Sessions.</p>
          <div className="confirmed-details">
            <div className="confirmed-row">
              <span>Slot</span>
              <strong>{formatDateTime(selectedOption.startISO)}</strong>
            </div>
            <div className="confirmed-row">
              <span>Duration</span>
              <strong>{formatDuration(selectedOption.durationMinutes)}</strong>
            </div>
            <div className="confirmed-row">
              <span>Equipment</span>
              <strong>{equipmentSummary}</strong>
            </div>
            <div className="confirmed-row">
              <span>Payment</span>
              <strong>Deferred in this prototype</strong>
            </div>
          </div>

          <div className="confirmed-actions">
            <button type="button" className="btn-primary" onClick={resetFlow}>Book another session</button>
            <button type="button" className="btn-secondary" onClick={() => navigate('/bookings')}>View my sessions</button>
            <button type="button" onClick={() => navigate('/home')}>Back to home</button>
          </div>
        </section>
      )}
    </div>
  );
}

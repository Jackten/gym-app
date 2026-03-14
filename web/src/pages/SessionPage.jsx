import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { DURATION_OPTIONS, WORKOUT_TYPES, EQUIPMENT_TAXONOMY } from '../lib/constants';
import {
  formatDateInput,
  startOfTomorrow,
  toTitleCase,
  equipmentLabel,
  formatDuration,
  getDayName,
  getDateNum,
  getMonthShort,
  createLocalDate,
} from '../lib/helpers';

const HOURS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];

function buildDateStrip() {
  const dates = [];
  const today = new Date();
  for (let i = 1; i <= 14; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    dates.push(d);
  }
  return dates;
}

export default function SessionPage() {
  const {
    currentUser,
    walletBalance,
    activeQuote,
    quoteSecondsLeft,
    buildQuote,
    confirmQuote,
    getSlotInfo,
    getBusyEquipment,
    handleTopUp,
    appState,
    setNotice,
  } = useApp();
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // 1: When, 2: What, 3: Review

  // Booking form state
  const [selectedDate, setSelectedDate] = useState(formatDateInput(startOfTomorrow()));
  const [selectedTime, setSelectedTime] = useState('18:00');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [workoutType, setWorkoutType] = useState('strength');
  const [equipmentMode, setEquipmentMode] = useState('exact'); // 'dont-know' | 'category' | 'exact'
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedEquipment, setSelectedEquipment] = useState(['barbell']);
  const [expandedCategories, setExpandedCategories] = useState(new Set());

  // Inline top-up state
  const [showTopUp, setShowTopUp] = useState(false);

  const dateStrip = useMemo(buildDateStrip, []);

  // Slot info for selected date
  const slotData = useMemo(() => {
    return HOURS.map((h) => getSlotInfo(selectedDate, h));
  }, [selectedDate, getSlotInfo]);

  // Busy equipment for selected time
  const busyEquipment = useMemo(() => {
    const start = createLocalDate(selectedDate, selectedTime);
    const end = new Date(start.getTime() + durationMinutes * 60_000);
    return getBusyEquipment(start, end);
  }, [selectedDate, selectedTime, durationMinutes, getBusyEquipment]);

  if (!currentUser) return null;

  function toggleCategory(catId) {
    setSelectedCategories((prev) =>
      prev.includes(catId) ? prev.filter((c) => c !== catId) : [...prev, catId],
    );
  }

  function toggleEquipment(itemId) {
    setSelectedEquipment((prev) =>
      prev.includes(itemId) ? prev.filter((x) => x !== itemId) : [...prev, itemId],
    );
  }

  function toggleExpandCategory(catId) {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  }

  function getEffectiveEquipment() {
    if (equipmentMode === 'dont-know') return [];
    if (equipmentMode === 'category') {
      // Get all items from selected categories
      return EQUIPMENT_TAXONOMY.filter((g) => selectedCategories.includes(g.id))
        .flatMap((g) => g.items.map((i) => i.id));
    }
    return selectedEquipment;
  }

  function handleGetQuote() {
    const equipment = getEffectiveEquipment();
    const quote = buildQuote({
      date: selectedDate,
      time: selectedTime,
      durationMinutes,
      workoutType,
      equipment: equipment.length > 0 ? equipment : ['general'],
      equipmentMode,
      selectedCategories,
    });
    if (quote) {
      setStep(3);
    }
  }

  function handleConfirm() {
    const success = confirmQuote();
    if (success) {
      navigate('/session/confirmed');
    }
  }

  function handleInlineTopUp(pkg) {
    handleTopUp(pkg);
    setShowTopUp(false);
  }

  // Step indicator
  const steps = ['When', 'What', 'Review'];

  return (
    <div className="page-session">
      {/* Progress Steps */}
      <div className="session-progress">
        {steps.map((label, i) => {
          const stepNum = i + 1;
          const isActive = step === stepNum;
          const isDone = step > stepNum;
          return (
            <div
              key={label}
              className={`progress-step${isActive ? ' active' : ''}${isDone ? ' done' : ''}`}
              onClick={() => isDone && setStep(stepNum)}
            >
              <div className="progress-dot">
                {isDone ? '✓' : stepNum}
              </div>
              <span className="progress-label">{label}</span>
            </div>
          );
        })}
        <div className="progress-line">
          <div
            className="progress-fill"
            style={{ width: `${((step - 1) / (steps.length - 1)) * 100}%` }}
          />
        </div>
      </div>

      {/* Step 1: When */}
      {step === 1 && (
        <section className="session-step card">
          <h2>When do you want to train?</h2>
          <p className="muted section-desc">
            Prices reflect live demand. Quieter slots = better rates.
          </p>

          {/* Date Strip */}
          <div className="date-strip-wrap">
            <div className="date-strip">
              {dateStrip.map((d) => {
                const dateStr = formatDateInput(d);
                const isSelected = dateStr === selectedDate;
                return (
                  <button
                    key={dateStr}
                    className={`date-pill${isSelected ? ' selected' : ''}`}
                    onClick={() => setSelectedDate(dateStr)}
                  >
                    <span className="date-pill-day">{getDayName(d)}</span>
                    <span className="date-pill-num">{getDateNum(d)}</span>
                    <span className="date-pill-month">{getMonthShort(d)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time Grid */}
          <div className="time-grid">
            {slotData.map((slot) => {
              const timeStr = `${String(slot.hour).padStart(2, '0')}:00`;
              const isSelected = selectedTime === timeStr;
              const tierClass = slot.demandTier.name.toLowerCase();

              return (
                <button
                  key={slot.hour}
                  className={`time-slot${isSelected ? ' selected' : ''} tier-${tierClass}${slot.isFull ? ' full' : ''}`}
                  onClick={() => !slot.isFull && setSelectedTime(timeStr)}
                  disabled={slot.isFull}
                >
                  <span className="time-slot-time">{timeStr}</span>
                  <span className="time-slot-occ">
                    {slot.maxExisting}/5
                  </span>
                  <span className="time-slot-price">~{slot.estCredits} cr</span>
                  {slot.isFull && <span className="time-slot-full">Full</span>}
                </button>
              );
            })}
          </div>

          <div className="session-step-actions">
            <button className="btn-primary btn-lg" onClick={() => setStep(2)}>
              Continue →
            </button>
          </div>
        </section>
      )}

      {/* Step 2: What */}
      {step === 2 && (
        <section className="session-step card">
          <h2>Plan your session</h2>

          {/* Duration */}
          <div className="form-section">
            <h4>How long are you training?</h4>
            <div className="duration-pills">
              {DURATION_OPTIONS.map((d) => (
                <button
                  key={d}
                  className={`duration-pill${durationMinutes === d ? ' selected' : ''}`}
                  onClick={() => setDurationMinutes(d)}
                >
                  {formatDuration(d)}
                </button>
              ))}
            </div>
          </div>

          {/* Workout Type */}
          <div className="form-section">
            <h4>What's on the menu today?</h4>
            <div className="workout-grid">
              {WORKOUT_TYPES.map((wt) => (
                <button
                  key={wt.id}
                  className={`workout-card${workoutType === wt.id ? ' selected' : ''}`}
                  onClick={() => setWorkoutType(wt.id)}
                >
                  <span className="workout-icon">{wt.icon}</span>
                  <span className="workout-label">{wt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Equipment */}
          <div className="form-section">
            <h4>What equipment will you use?</h4>
            <p className="muted" style={{ fontSize: '0.84rem', margin: '0 0 0.75rem' }}>
              Helps us minimize floor conflicts. Choose how specific you want to be.
            </p>

            {/* Equipment Mode Selector */}
            <div className="equipment-mode-selector">
              <button
                className={`eq-mode-btn${equipmentMode === 'dont-know' ? ' active' : ''}`}
                onClick={() => setEquipmentMode('dont-know')}
              >
                🤷 Don't know yet
              </button>
              <button
                className={`eq-mode-btn${equipmentMode === 'category' ? ' active' : ''}`}
                onClick={() => setEquipmentMode('category')}
              >
                📁 By category
              </button>
              <button
                className={`eq-mode-btn${equipmentMode === 'exact' ? ' active' : ''}`}
                onClick={() => setEquipmentMode('exact')}
              >
                🎯 Specific items
              </button>
            </div>

            {equipmentMode === 'dont-know' && (
              <div className="equipment-info-card">
                <p>
                  No problem! You can plan equipment later or just show up and use what's available.
                </p>
              </div>
            )}

            {equipmentMode === 'category' && (
              <div className="equipment-categories">
                {EQUIPMENT_TAXONOMY.map((group) => (
                  <button
                    key={group.id}
                    className={`category-chip${selectedCategories.includes(group.id) ? ' on' : ''}`}
                    onClick={() => toggleCategory(group.id)}
                  >
                    {group.icon} {group.title}
                  </button>
                ))}
              </div>
            )}

            {equipmentMode === 'exact' && (
              <div className="equipment-groups">
                {EQUIPMENT_TAXONOMY.map((group) => {
                  const isExpanded = expandedCategories.has(group.id);
                  const selectedCount = group.items.filter((i) =>
                    selectedEquipment.includes(i.id),
                  ).length;

                  return (
                    <div key={group.id} className="equipment-group">
                      <button
                        className="equipment-group-header"
                        onClick={() => toggleExpandCategory(group.id)}
                      >
                        <span>
                          {group.icon} <strong>{group.title}</strong>
                          {selectedCount > 0 && (
                            <span className="eq-count">{selectedCount}</span>
                          )}
                        </span>
                        <span className="eq-chevron">{isExpanded ? '▾' : '▸'}</span>
                      </button>

                      {isExpanded && (
                        <div className="equipment-items">
                          {group.items.map((item) => {
                            const isBusy = busyEquipment.has(item.id);
                            const isSelected = selectedEquipment.includes(item.id);
                            return (
                              <label
                                key={item.id}
                                className={`eq-chip${isSelected ? ' on' : ''}${isBusy ? ' busy' : ''}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleEquipment(item.id)}
                                />
                                {item.label}
                                {isBusy && (
                                  <span className="eq-busy-badge" title="In use during this time">
                                    ⚠️
                                  </span>
                                )}
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
                {busyEquipment.size > 0 && (
                  <p className="equipment-conflict-note">
                    ⚠️ Items marked with ⚠️ are reserved during your selected time.
                    You can still book — we'll do our best to accommodate.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="session-step-actions">
            <button className="btn-secondary" onClick={() => setStep(1)}>
              ← Back
            </button>
            <button className="btn-primary btn-lg" onClick={handleGetQuote}>
              Review Session →
            </button>
          </div>
        </section>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <section className="session-step card">
          <h2>Your session</h2>

          {activeQuote ? (
            <>
              {/* Session Summary */}
              <div className="review-summary">
                <div className="review-row">
                  <span className="review-label">Date & Time</span>
                  <strong>
                    {new Date(activeQuote.startISO).toLocaleDateString([], {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                    })}{' '}
                    ·{' '}
                    {new Date(activeQuote.startISO).toLocaleTimeString([], {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </strong>
                </div>
                <div className="review-row">
                  <span className="review-label">Duration</span>
                  <strong>{formatDuration(activeQuote.durationMinutes)}</strong>
                </div>
                <div className="review-row">
                  <span className="review-label">Workout</span>
                  <strong>{toTitleCase(activeQuote.workoutType)}</strong>
                </div>
                <div className="review-row">
                  <span className="review-label">Equipment</span>
                  <strong>
                    {activeQuote.equipmentMode === 'dont-know'
                      ? "I'll decide later"
                      : activeQuote.equipment
                          .map((e) => equipmentLabel(e))
                          .join(', ')}
                  </strong>
                </div>
              </div>

              {/* Pricing Breakdown */}
              <div className="pricing-breakdown">
                <h4>Price breakdown</h4>
                <p className="muted" style={{ fontSize: '0.82rem', margin: '0 0 0.75rem' }}>
                  Always transparent — here's how your price is calculated.
                </p>
                <div className="price-table">
                  <div className="price-row">
                    <span>Base price</span>
                    <span>{activeQuote.pricing.baseCredits} cr</span>
                  </div>
                  <div className="price-row">
                    <span>
                      Demand ({activeQuote.pricing.demandTier})
                    </span>
                    <span>{activeQuote.pricing.demandMultiplier.toFixed(2)}×</span>
                  </div>
                  <div className="price-row">
                    <span>
                      Occupancy (#{activeQuote.pricing.occupancyAtQuote})
                    </span>
                    <span>{activeQuote.pricing.occupancyMultiplier.toFixed(2)}×</span>
                  </div>
                  <div className="price-row total">
                    <span>Total</span>
                    <strong>{activeQuote.pricing.finalCredits} credits</strong>
                  </div>
                </div>
              </div>

              {/* Hold Timer */}
              <div className="hold-timer">
                <div className="hold-ring">
                  <svg viewBox="0 0 36 36">
                    <circle
                      cx="18"
                      cy="18"
                      r="16"
                      fill="none"
                      stroke="rgba(148,163,184,0.15)"
                      strokeWidth="2"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="16"
                      fill="none"
                      stroke={quoteSecondsLeft < 120 ? '#f59e0b' : 'var(--accent-bright)'}
                      strokeWidth="2"
                      strokeDasharray={`${(quoteSecondsLeft / 900) * 100.53} 100.53`}
                      strokeLinecap="round"
                      transform="rotate(-90 18 18)"
                    />
                  </svg>
                </div>
                <span>
                  Price locked for{' '}
                  <strong>
                    {Math.floor(quoteSecondsLeft / 60)}:{String(quoteSecondsLeft % 60).padStart(2, '0')}
                  </strong>
                </span>
              </div>

              {/* Wallet Status */}
              <div className="wallet-status">
                <div className="wallet-row">
                  <span>Current balance</span>
                  <strong>{walletBalance} cr</strong>
                </div>
                <div className="wallet-row">
                  <span>After booking</span>
                  <strong
                    className={
                      walletBalance >= activeQuote.pricing.finalCredits ? '' : 'insufficient'
                    }
                  >
                    {walletBalance - activeQuote.pricing.finalCredits} cr
                  </strong>
                </div>
              </div>

              {/* Insufficient Credits Inline Top-Up */}
              {walletBalance < activeQuote.pricing.finalCredits && (
                <div className="inline-topup">
                  <p className="topup-alert">
                    You need{' '}
                    <strong>
                      {activeQuote.pricing.finalCredits - walletBalance} more credits
                    </strong>{' '}
                    to book this session.
                  </p>
                  {!showTopUp ? (
                    <div className="topup-actions">
                      <button className="btn-primary" onClick={() => setShowTopUp(true)}>
                        Quick Top Up
                      </button>
                      <button
                        className="btn-secondary"
                        onClick={() => navigate('/wallet/topup')}
                      >
                        Go to Wallet →
                      </button>
                    </div>
                  ) : (
                    <div className="topup-packages-inline">
                      {appState.packages.map((pkg) => (
                        <button key={pkg.id} onClick={() => handleInlineTopUp(pkg)}>
                          <strong>{pkg.label}</strong>
                          <span>
                            +{pkg.credits} cr · ${pkg.cash}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="session-step-actions">
                <button className="btn-secondary" onClick={() => setStep(2)}>
                  ← Change Details
                </button>
                <button
                  className="btn-primary btn-lg"
                  onClick={handleConfirm}
                  disabled={walletBalance < activeQuote.pricing.finalCredits}
                >
                  Confirm & Book Session
                </button>
              </div>
            </>
          ) : (
            <div className="no-quote">
              <p className="muted">Quote expired or not available. Let's get a new one.</p>
              <button className="btn-primary" onClick={handleGetQuote}>
                Get New Quote
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

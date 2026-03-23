import React from 'react';

export default function SlotCardList({ slots, selectedSlotIds = [], onToggle }) {
  const visibleSlots = slots.filter((slot) => !slot.isPast);

  if (visibleSlots.length === 0) {
    return <p className="muted">No available slots remaining today.</p>;
  }

  return (
    <div className="slot-list-compact">
      {visibleSlots.map((slot) => {
        const isActive = selectedSlotIds.includes(slot.id);
        return (
          <button
            key={slot.id}
            type="button"
            className={`slot-row${isActive ? ' active' : ''}${slot.isFull ? ' full' : ''}`}
            onClick={() => onToggle(slot)}
            disabled={slot.isFull}
          >
            <span className="slot-row-time">{slot.label}</span>
            <span className="slot-row-status">
              {slot.isFull ? 'Full' : `${slot.remaining} open`}
            </span>
          </button>
        );
      })}
    </div>
  );
}

import React from 'react';

export default function SlotCardList({ slots, selectedSlotIds = [], onToggle }) {
  return (
    <div className="slot-list-compact">
      {slots.map((slot) => {
        const isActive = selectedSlotIds.includes(slot.id);
        const disabled = slot.isPast || slot.isFull;
        return (
          <button
            key={slot.id}
            type="button"
            className={`slot-row${isActive ? ' active' : ''}${slot.isFull ? ' full' : ''}${slot.isPast ? ' past' : ''}`}
            onClick={() => onToggle(slot)}
            disabled={disabled}
          >
            <span className="slot-row-time">{slot.label}</span>
            <span className="slot-row-status">
              {slot.isPast ? 'Past' : slot.isFull ? 'Full' : `${slot.remaining} open`}
            </span>
          </button>
        );
      })}
    </div>
  );
}

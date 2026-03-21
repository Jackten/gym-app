import React from 'react';

export default function SlotCardList({ slots, selectedSlot, onSelect }) {
  return (
    <div className="slot-card-grid">
      {slots.map((slot) => {
        const isActive = selectedSlot?.id === slot.id;
        return (
          <button
            key={slot.id}
            type="button"
            className={`slot-card${isActive ? ' active' : ''}${slot.isFull ? ' full' : ''}`}
            onClick={() => onSelect(slot)}
            disabled={slot.isPast || slot.isFull}
          >
            <strong>{slot.label}</strong>
            <span>{slot.isPast ? 'Past' : slot.isFull ? 'Full' : `${slot.remaining} spots left`}</span>
          </button>
        );
      })}
    </div>
  );
}

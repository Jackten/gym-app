import React from 'react';
import { EQUIPMENT_FLOW_CATEGORIES } from '../config';

export default function EquipmentSelector({ selection, onChangeCategory, onToggleItem }) {
  const selectedCategory = EQUIPMENT_FLOW_CATEGORIES.find((x) => x.id === selection.category);

  return (
    <div className="equipment-picker-v2">
      <div className="equipment-categories">
        {EQUIPMENT_FLOW_CATEGORIES.map((category) => (
          <button
            key={category.id}
            type="button"
            className={`category-chip${selection.category === category.id ? ' on' : ''}`}
            onClick={() => onChangeCategory(category.id)}
          >
            {category.icon} {category.label}
          </button>
        ))}
      </div>

      {selectedCategory?.items?.length > 0 && (
        <div className="equipment-items">
          {selectedCategory.items.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`eq-chip${selection.items.includes(item.id) ? ' on' : ''}`}
              onClick={() => onToggleItem(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

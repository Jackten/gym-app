import React, { useMemo } from 'react';
import { EQUIPMENT_FLOW_CATEGORIES } from '../config';

export default function EquipmentSelector({
  selection,
  onToggleCategory,
  onToggleItem,
  categories = EQUIPMENT_FLOW_CATEGORIES,
}) {
  const selectedCategories = selection.categories || [];

  const visibleCategories = useMemo(
    () => categories.filter((category) => selectedCategories.includes(category.id)),
    [selectedCategories, categories],
  );

  return (
    <div className="equipment-picker-v2">
      <div className="equipment-categories">
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            className={`category-chip${selectedCategories.includes(category.id) ? ' on' : ''}`}
            onClick={() => onToggleCategory(category.id)}
          >
            {category.icon} {category.label}
          </button>
        ))}
      </div>

      {visibleCategories
        .filter((category) => category.items.length > 0)
        .map((category) => (
          <div key={category.id} className="equipment-category-group">
            <p className="equipment-category-title">{category.label}</p>
            <div className="equipment-items">
              {category.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`eq-chip${selection.items.includes(item.id) ? ' on' : ''}`}
                  onClick={() => onToggleItem(item.id)}
                  disabled={item.isAvailable === false}
                  title={item.isAvailable === false ? 'Currently unavailable' : ''}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}

import React from 'react';

/**
 * Reusable Guided Choice Group — SmogGuard
 * Ensures EVERY choice group supports:
 * - Single-select (radio cards/chips) or multi-select (checkbox chips)
 * - "Other" option revealing a labeled input with validation
 * - "Not sure" option storing "unknown" and noting the conservative default
 */
export default function ChoiceGroup({
  id,
  label,
  options,
  value,
  otherValue = '',
  onChange,
  onOtherChange,
  multi = false,
  conservativeHint = '',
  error = '',
}) {
  const isSelected = (optVal) => {
    if (multi) {
      return Array.isArray(value) && value.includes(optVal);
    }
    return value === optVal;
  };

  const handleToggle = (optVal) => {
    if (!multi) {
      onChange(optVal);
      return;
    }
    const current = Array.isArray(value) ? value : [];
    if (optVal === 'unknown' || optVal === 'none') {
      onChange(current.includes(optVal) ? [] : [optVal]);
      return;
    }
    const cleaned = current.filter((x) => x !== 'unknown' && x !== 'none');
    if (cleaned.includes(optVal)) {
      onChange(cleaned.filter((x) => x !== optVal));
    } else {
      onChange([...cleaned, optVal]);
    }
  };

  const showOtherInput = isSelected('other');
  const showUnknownHint = isSelected('unknown') && conservativeHint;

  const fullOptions = [
    ...options,
    { value: 'other', label: 'Other', icon: '✏️' },
    { value: 'unknown', label: 'Not sure', icon: '❔' },
  ];

  return (
    <fieldset className="choice-fieldset">
      <legend className="field-label">{label}</legend>
      <div className="choice-grid" role={multi ? 'group' : 'radiogroup'} aria-label={label}>
        {fullOptions.map((opt) => {
          const active = isSelected(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              role={multi ? 'checkbox' : 'radio'}
              aria-checked={active}
              className={`choice-card ${active ? 'selected' : ''}`}
              onClick={() => handleToggle(opt.value)}
            >
              {opt.icon && <span aria-hidden="true">{opt.icon}</span>}
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>

      {showOtherInput && (
        <div className="other-input-wrap">
          <label htmlFor={`${id}-other`} className="field-label">
            Please specify ({label})
          </label>
          <input
            id={`${id}-other`}
            type="text"
            className="text-input"
            value={otherValue}
            onChange={(e) => onOtherChange(e.target.value)}
            placeholder="Enter details..."
          />
        </div>
      )}

      {showUnknownHint && (
        <p className="field-help">
          Conservative default applied: {conservativeHint}
        </p>
      )}

      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}

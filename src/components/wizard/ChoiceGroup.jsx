/**
 * @fileoverview Reusable guided choice group with built-in "Other" input and "Not sure" option.
 */

import React from 'react';

/**
 * Accessible radio or checkbox choice group supporting "Other" text entry and "Not sure" fallback.
 * @param {Object} props - Field metadata, options, value, and change handlers.
 * @returns {JSX.Element} Choice group fieldset.
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
  const isSelected = (optVal) =>
    multi ? Array.isArray(value) && value.includes(optVal) : value === optVal;

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
    onChange(cleaned.includes(optVal) ? cleaned.filter((x) => x !== optVal) : [...cleaned, optVal]);
  };

  const showOtherInput = isSelected('other');
  const showUnknownHint = isSelected('unknown') && conservativeHint;
  const errorId = `${id}-error`;

  const fullOptions = [
    ...options,
    { value: 'other', label: 'Other', icon: '✏️' },
    { value: 'unknown', label: 'Not sure', icon: '❔' },
  ];

  return (
    <fieldset
      className="choice-fieldset"
      aria-invalid={Boolean(error)}
      aria-describedby={error ? errorId : undefined}
    >
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
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
            placeholder="Enter details..."
          />
        </div>
      )}

      {showUnknownHint && (
        <p className="field-help">Conservative default applied: {conservativeHint}</p>
      )}
      {error && (
        <p id={errorId} className="field-error" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}

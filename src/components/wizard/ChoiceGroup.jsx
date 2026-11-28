/**
 * @fileoverview Reusable guided choice group with built-in "Other" input and "Not sure" option.
 */

import React from 'react';

const EXTRA_CHOICE_OPTIONS = [
  { value: 'other', label: 'Other', icon: '✏️' },
  { value: 'unknown', label: 'Not sure', icon: '❔' },
];

function toggleMultiChoice(value, optVal) {
  const current = Array.isArray(value) ? value : [];
  if (optVal === 'unknown' || optVal === 'none') {
    return current.includes(optVal) ? [] : [optVal];
  }
  const cleaned = current.filter((x) => x !== 'unknown' && x !== 'none');
  return cleaned.includes(optVal) ? cleaned.filter((x) => x !== optVal) : [...cleaned, optVal];
}

function ChoiceOptionButtons({ fullOptions, isSelected, multi, label, onSelect }) {
  return (
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
            onClick={() => onSelect(opt.value)}
          >
            {opt.icon && <span aria-hidden="true">{opt.icon}</span>}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function ChoiceExtraFeedback({
  id,
  label,
  otherValue,
  errorId,
  error,
  onOtherChange,
  showOther,
  hint,
}) {
  return (
    <>
      {showOther && (
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
      {hint && <p className="field-help">Conservative default applied: {hint}</p>}
      {error && (
        <p id={errorId} className="field-error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}

function checkChoiceSelected(value, optVal, multi) {
  return multi ? Array.isArray(value) && value.includes(optVal) : value === optVal;
}

/**
 * Accessible radio or checkbox choice group supporting "Other" text entry and "Not sure" fallback.
 * @param {Object} props - Field metadata, options, value, and change handlers.
 * @returns {JSX.Element} Choice group fieldset.
 */
export default function ChoiceGroup(props) {
  const { id, label, options, value, otherValue = '', onChange, onOtherChange } = props;
  const { multi = false, conservativeHint = '', error = '' } = props;
  const isSelected = (optVal) => checkChoiceSelected(value, optVal, multi);
  const errorId = `${id}-error`;

  return (
    <fieldset
      className="choice-fieldset"
      aria-invalid={Boolean(error)}
      aria-describedby={error ? errorId : undefined}
    >
      <legend className="field-label">{label}</legend>
      <ChoiceOptionButtons
        fullOptions={[...options, ...EXTRA_CHOICE_OPTIONS]}
        isSelected={isSelected}
        multi={multi}
        label={label}
        onSelect={(optVal) => onChange(multi ? toggleMultiChoice(value, optVal) : optVal)}
      />
      <ChoiceExtraFeedback
        id={id}
        label={label}
        otherValue={otherValue}
        errorId={errorId}
        error={error}
        onOtherChange={onOtherChange}
        showOther={isSelected('other')}
        hint={isSelected('unknown') ? conservativeHint : ''}
      />
    </fieldset>
  );
}

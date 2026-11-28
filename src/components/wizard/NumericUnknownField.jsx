/**
 * @fileoverview Reusable numeric wizard input paired with a "Not sure" conservative fallback chip.
 */

import React from 'react';
import { BOUNDS } from '@/constants';

function NumericUnknownControls({
  id,
  value,
  defaultVal,
  min,
  max,
  step,
  unitHint,
  error,
  errorId,
  onChange,
}) {
  const isUnknown = value === 'unknown';
  return (
    <div className="numeric-with-unknown">
      <input
        id={id}
        type="number"
        min={min}
        max={max}
        step={step}
        className="text-input"
        disabled={isUnknown}
        value={isUnknown ? '' : value}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
      />
      <button
        type="button"
        className={`choice-chip ${isUnknown ? 'selected' : ''}`}
        aria-pressed={isUnknown}
        onClick={() => onChange(isUnknown ? defaultVal : 'unknown')}
      >
        ❔ Not sure (default {defaultVal}
        {unitHint ? ` ${unitHint}` : ''})
      </button>
    </div>
  );
}

/**
 * Render a labeled numeric input alongside a "Not sure" toggle button and linked error.
 * @param {Object} props - Field properties and handlers.
 * @returns {JSX.Element} Numeric field group.
 */
export default function NumericUnknownField({
  id,
  label,
  value,
  defaultVal,
  min = 0,
  max = BOUNDS.MAX_MONTHLY_KWH,
  step = 1,
  unitHint = '',
  error = '',
  onChange,
}) {
  const errorId = `${id}-error`;
  return (
    <div className="numeric-field-group">
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <NumericUnknownControls
        id={id}
        value={value}
        defaultVal={defaultVal}
        min={min}
        max={max}
        step={step}
        unitHint={unitHint}
        error={error}
        errorId={errorId}
        onChange={onChange}
      />
      {error && (
        <p id={errorId} className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

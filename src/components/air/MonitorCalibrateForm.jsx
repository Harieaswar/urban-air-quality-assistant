/**
 * @fileoverview Accessible monitor calibration form for scaling forecasts or applying manual PM2.5.
 */

import React, { useState } from 'react';
import { BOUNDS } from '@/constants';
import { validateRange } from '@/utils/validate';

function MonitorUnitField({ calMode, setCalMode, aqiScale }) {
  return (
    <div>
      <label htmlFor="calibrate-mode" className="field-label">
        Monitor unit
      </label>
      <select
        id="calibrate-mode"
        className="text-input"
        value={calMode}
        onChange={(e) => setCalMode(e.target.value)}
      >
        <option value="pm25">PM2.5 (µg/m³)</option>
        <option value="aqi">{aqiScale === 'us_aqi' ? 'US AQI' : 'India NAQI'}</option>
      </select>
    </div>
  );
}

function MonitorReadingField({ calInput, setCalInput, calError, calMode }) {
  return (
    <div>
      <label htmlFor="calibrate-value" className="field-label">
        Your monitor reading right now
      </label>
      <input
        id="calibrate-value"
        type="number"
        step="0.1"
        className="text-input"
        value={calInput}
        onChange={(e) => setCalInput(e.target.value)}
        aria-invalid={Boolean(calError)}
        aria-describedby={calError ? 'calibrate-error' : 'calibrate-help'}
        placeholder={calMode === 'pm25' ? 'e.g. 165' : 'e.g. 320'}
      />
    </div>
  );
}

function CalibrationFieldsRow({ stateProps, actions }) {
  return (
    <div className="calibrate-row">
      <MonitorUnitField
        calMode={stateProps.calMode}
        setCalMode={stateProps.setCalMode}
        aqiScale={stateProps.aqiScale}
      />
      <MonitorReadingField
        calInput={stateProps.calInput}
        setCalInput={stateProps.setCalInput}
        calError={stateProps.calError}
        calMode={stateProps.calMode}
      />
      <button type="submit" className="btn btn--primary">
        Apply Calibration
      </button>
      {actions.showManualBtn && (
        <button type="button" className="btn btn--secondary" onClick={actions.onManualFallback}>
          Use as Manual Fallback
        </button>
      )}
      {actions.showReset && (
        <button type="button" className="btn btn--ghost" onClick={actions.onReset}>
          Reset Calibration
        </button>
      )}
    </div>
  );
}

function useCalibrationState(calibration, handlers) {
  const [calMode, setCalMode] = useState(calibration?.mode || 'pm25');
  const initialVal =
    calibration?.value !== null && calibration?.value !== undefined
      ? String(calibration.value)
      : '';
  const [calInput, setCalInput] = useState(initialVal);
  const [calError, setCalError] = useState('');

  const handleApply = (e) => {
    e.preventDefault();
    const maxAllowed = calMode === 'aqi' ? BOUNDS.MAX_AQI : BOUNDS.MAX_PM25;
    const label = calMode === 'aqi' ? 'Monitor AQI' : 'Monitor PM2.5 (µg/m³)';
    const check = validateRange(calInput, 0, maxAllowed, label);
    if (!check.valid) return setCalError(check.error);
    setCalError('');
    handlers.onCalibrate({
      enabled: true,
      mode: calMode,
      value: check.value,
      calibratedAt: new Date().toISOString(),
    });
    return handlers.onClose();
  };

  const handleManual = () => {
    const check = validateRange(calInput, 0, BOUNDS.MAX_PM25, 'Manual PM2.5 (µg/m³)');
    if (!check.valid) return setCalError(check.error);
    setCalError('');
    handlers.onApplyManualPm25(check.value);
    return handlers.onClose();
  };

  return { calMode, setCalMode, calInput, setCalInput, calError, handleApply, handleManual };
}

/**
 * Render the "Calibrate with monitor" form with aria-invalid/aria-describedby validation.
 * @param {Object} props - Form callbacks and current calibration state.
 * @returns {JSX.Element} Calibration form element.
 */
export default function MonitorCalibrateForm({
  calibration,
  aqiScale,
  onCalibrate,
  onClearCalibration,
  onApplyManualPm25,
  onClose,
}) {
  const form = useCalibrationState(calibration, { onCalibrate, onApplyManualPm25, onClose });
  const actions = {
    showManualBtn: Boolean(onApplyManualPm25 && form.calMode === 'pm25'),
    onManualFallback: form.handleManual,
    showReset: Boolean(calibration?.enabled),
    onReset: () => {
      onClearCalibration();
      form.setCalInput('');
      onClose();
    },
  };

  return (
    <form className="calibrate-panel" onSubmit={form.handleApply} noValidate>
      <CalibrationFieldsRow stateProps={{ ...form, aqiScale }} actions={actions} />
      {form.calError && (
        <p id="calibrate-error" className="field-error" role="alert">
          {form.calError}
        </p>
      )}
      <p id="calibrate-help" className="field-help">
        Calibrating scales the 24-hour curve to match your handheld/indoor sensor reading. Low-cost
        laser monitors can read higher when humidity exceeds 75%.
      </p>
    </form>
  );
}

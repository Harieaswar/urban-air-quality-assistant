/**
 * @fileoverview Accessible monitor calibration form for scaling forecasts or applying manual PM2.5.
 */

import React, { useState } from 'react';
import { API_CONFIG } from '@/data/constants';
import { validateRange } from '@/utils/validate';

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
  const [calMode, setCalMode] = useState(calibration?.mode || 'pm25');
  const [calInput, setCalInput] = useState(
    calibration?.value !== null && calibration?.value !== undefined ? String(calibration.value) : ''
  );
  const [calError, setCalError] = useState('');

  const handleApplyCalibrate = (e) => {
    e.preventDefault();
    const maxAllowed = calMode === 'aqi' ? API_CONFIG.MAX_AQI : API_CONFIG.MAX_PM25;
    const label = calMode === 'aqi' ? 'Monitor AQI' : 'Monitor PM2.5 (µg/m³)';
    const check = validateRange(calInput, 0, maxAllowed, label);
    if (!check.valid) {
      setCalError(check.error);
      return;
    }
    setCalError('');
    onCalibrate({
      enabled: true,
      mode: calMode,
      value: check.value,
      calibratedAt: new Date().toISOString(),
    });
    onClose();
  };

  const handleManualFallback = () => {
    const check = validateRange(calInput, 0, API_CONFIG.MAX_PM25, 'Manual PM2.5 (µg/m³)');
    if (!check.valid) {
      setCalError(check.error);
      return;
    }
    setCalError('');
    onApplyManualPm25(check.value);
    onClose();
  };

  return (
    <form className="calibrate-panel" onSubmit={handleApplyCalibrate} noValidate>
      <div className="calibrate-row">
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
        <button type="submit" className="btn btn--primary">
          Apply Calibration
        </button>
        {onApplyManualPm25 && calMode === 'pm25' && (
          <button type="button" className="btn btn--secondary" onClick={handleManualFallback}>
            Use as Manual Fallback
          </button>
        )}
        {calibration?.enabled && (
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => {
              onClearCalibration();
              setCalInput('');
              onClose();
            }}
          >
            Reset Calibration
          </button>
        )}
      </div>
      {calError && (
        <p id="calibrate-error" className="field-error" role="alert">
          {calError}
        </p>
      )}
      <p id="calibrate-help" className="field-help">
        Calibrating scales the 24-hour curve to match your handheld/indoor sensor reading. Low-cost
        laser monitors can read higher when humidity exceeds 75%.
      </p>
    </form>
  );
}

/**
 * @fileoverview Accessible manual latitude/longitude fallback form with validation.
 */

import React, { useState, useEffect } from 'react';
import { roundCoordinate } from '@/services/openMeteo';
import { validateCoordinates } from '@/utils/validate';

function CoordInput({ id, label, placeholder, value, coordError, onChange }) {
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <input
        id={id}
        type="number"
        step="0.1"
        className="text-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(coordError)}
        aria-describedby={coordError ? 'manual-coord-error' : undefined}
        placeholder={placeholder}
      />
    </div>
  );
}

function formatInitialCoord(value) {
  return value !== null && value !== undefined ? String(value) : '';
}

function useManualCoordsForm(lat, lon, onApply) {
  const [manualLat, setManualLat] = useState(() => formatInitialCoord(lat));
  const [manualLon, setManualLon] = useState(() => formatInitialCoord(lon));
  const [coordError, setCoordError] = useState('');

  useEffect(() => {
    if (lat !== null && lat !== undefined) setManualLat(String(lat));
    if (lon !== null && lon !== undefined) setManualLon(String(lon));
  }, [lat, lon]);

  const handleApplyCoords = () => {
    const check = validateCoordinates(manualLat, manualLon);
    if (!check.valid) return setCoordError(check.error);
    setCoordError('');
    const rLat = roundCoordinate(check.lat);
    const rLon = roundCoordinate(check.lon);
    return onApply({
      name: `Custom (${rLat.toFixed(1)}°, ${rLon.toFixed(1)}°)`,
      lat: rLat,
      lon: rLon,
    });
  };

  return { manualLat, setManualLat, manualLon, setManualLon, coordError, handleApplyCoords };
}

/**
 * Render manual latitude/longitude inputs for fallback coordinate entry.
 * @param {Object} props - Initial coords and callback.
 * @returns {JSX.Element} Manual coordinate entry box.
 */
export default function ManualCoordsBox({ lat, lon, onApply }) {
  const form = useManualCoordsForm(lat, lon, onApply);

  return (
    <div className="manual-coords-box">
      <div className="manual-coords-grid">
        <CoordInput
          id="manual-lat"
          label="Latitude (-90 to 90)"
          placeholder="e.g. 11.7"
          value={form.manualLat}
          coordError={form.coordError}
          onChange={form.setManualLat}
        />
        <CoordInput
          id="manual-lon"
          label="Longitude (-180 to 180)"
          placeholder="e.g. 78.1"
          value={form.manualLon}
          coordError={form.coordError}
          onChange={form.setManualLon}
        />
        <button type="button" className="btn btn--secondary" onClick={form.handleApplyCoords}>
          Use Coordinates
        </button>
      </div>
      {form.coordError && (
        <p id="manual-coord-error" className="field-error" role="alert">
          {form.coordError}
        </p>
      )}
    </div>
  );
}

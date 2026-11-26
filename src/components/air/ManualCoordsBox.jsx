/**
 * @fileoverview Accessible manual latitude/longitude fallback form with validation.
 */

import React, { useState, useEffect } from 'react';
import { roundCoordinate } from '@/services/openMeteo';
import { validateCoordinates } from '@/utils/validate';

/**
 * Render manual latitude/longitude inputs for fallback coordinate entry.
 * @param {Object} props - Initial coords and callback.
 * @returns {JSX.Element} Manual coordinate entry box.
 */
export default function ManualCoordsBox({ lat, lon, onApply }) {
  const [manualLat, setManualLat] = useState(lat != null ? String(lat) : '');
  const [manualLon, setManualLon] = useState(lon != null ? String(lon) : '');
  const [coordError, setCoordError] = useState('');

  useEffect(() => {
    if (lat != null) setManualLat(String(lat));
    if (lon != null) setManualLon(String(lon));
  }, [lat, lon]);

  const handleApplyCoords = () => {
    const check = validateCoordinates(manualLat, manualLon);
    if (!check.valid) {
      setCoordError(check.error);
      return;
    }
    setCoordError('');
    const rLat = roundCoordinate(check.lat);
    const rLon = roundCoordinate(check.lon);
    onApply({ name: `Custom (${rLat.toFixed(1)}°, ${rLon.toFixed(1)}°)`, lat: rLat, lon: rLon });
  };

  return (
    <div className="manual-coords-box">
      <div className="manual-coords-grid">
        <div>
          <label htmlFor="manual-lat" className="field-label">
            Latitude (-90 to 90)
          </label>
          <input
            id="manual-lat"
            type="number"
            step="0.1"
            className="text-input"
            value={manualLat}
            onChange={(e) => setManualLat(e.target.value)}
            aria-invalid={Boolean(coordError)}
            aria-describedby={coordError ? 'manual-coord-error' : undefined}
            placeholder="e.g. 11.7"
          />
        </div>
        <div>
          <label htmlFor="manual-lon" className="field-label">
            Longitude (-180 to 180)
          </label>
          <input
            id="manual-lon"
            type="number"
            step="0.1"
            className="text-input"
            value={manualLon}
            onChange={(e) => setManualLon(e.target.value)}
            aria-invalid={Boolean(coordError)}
            aria-describedby={coordError ? 'manual-coord-error' : undefined}
            placeholder="e.g. 78.1"
          />
        </div>
        <button type="button" className="btn btn--secondary" onClick={handleApplyCoords}>
          Use Coordinates
        </button>
      </div>
      {coordError && (
        <p id="manual-coord-error" className="field-error" role="alert">
          {coordError}
        </p>
      )}
    </div>
  );
}

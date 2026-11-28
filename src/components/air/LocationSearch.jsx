/**
 * @fileoverview ARIA combobox place search autocomplete powered by Open-Meteo Geocoding API.
 */

import React from 'react';
import ManualCoordsBox from './ManualCoordsBox';
import { useLocationSearch } from '@/hooks';

/**
 * Accessible Open-Meteo place autocomplete with 300ms debounce, AbortController,
 * keyboard Arrow/Enter/Escape navigation, and manual coordinate fallback.
 * @param {Object} props - Current location values and selection handler.
 * @returns {JSX.Element} Location search combobox component.
 */
export default function LocationSearch({
  locationName,
  lat,
  lon,
  onSelectLocation,
  errorId,
  hasError,
}) {
  const {
    query,
    setQuery,
    results,
    status,
    statusMsg,
    isOpen,
    setIsOpen,
    activeIndex,
    showManual,
    setShowManual,
    selectPlace,
    applyManualCoords,
    handleKeyDown,
  } = useLocationSearch({ initialName: locationName, onSelectLocation });

  const listId = 'location-autocomplete-listbox';

  return (
    <div className="location-search">
      <label htmlFor="place-search-input" className="field-label">
        Search your city, town, or neighborhood
      </label>
      <div className="autocomplete-wrap">
        <input
          id="place-search-input"
          type="text"
          className="text-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results.length > 0 || status === 'empty' || status === 'unavailable') {
              setIsOpen(true);
            }
          }}
          placeholder="Type any city or town (min 2 letters, e.g. Salem, Tambaram, Delhi)..."
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={listId}
          aria-activedescendant={activeIndex >= 0 ? `place-option-${activeIndex}` : undefined}
          aria-invalid={Boolean(hasError)}
          aria-describedby={hasError && errorId ? errorId : 'location-privacy-note'}
        />

        {isOpen && (
          <ul
            id={listId}
            role="listbox"
            className="autocomplete-dropdown"
            aria-label="Matching locations"
          >
            {status === 'loading' && (
              <li className="autocomplete-status">Searching Open-Meteo geocoding...</li>
            )}
            {status === 'empty' && (
              <li className="autocomplete-status">
                No matches — try another spelling or enter coordinates manually below.
              </li>
            )}
            {status === 'unavailable' && (
              <li className="autocomplete-status autocomplete-status--warn">
                Search unavailable, enter coordinates manually
              </li>
            )}
            {status === 'ok' &&
              results.map((place, idx) => (
                <li
                  key={place.id}
                  id={`place-option-${idx}`}
                  role="option"
                  aria-selected={idx === activeIndex}
                  tabIndex={-1}
                  className={`autocomplete-option ${idx === activeIndex ? 'active' : ''}`}
                  onClick={() => selectPlace(place)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') selectPlace(place);
                  }}
                >
                  <span>{place.displayName}</span>
                  <span className="autocomplete-coords">
                    {place.lat.toFixed(1)}°, {place.lon.toFixed(1)}°
                  </span>
                </li>
              ))}
          </ul>
        )}
      </div>

      <div role="status" aria-live="polite" className="sr-only">
        {statusMsg}
      </div>

      <div className="privacy-row">
        <p id="location-privacy-note" className="privacy-note">
          🔒 Privacy note: Coordinates are rounded to 0.1° (~11 km) before any Open-Meteo request
          and cached locally for 30 minutes.
        </p>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          aria-expanded={showManual}
          onClick={() => setShowManual((v) => !v)}
        >
          {showManual ? 'Hide manual coordinates' : 'Enter coordinates manually'}
        </button>
      </div>

      {showManual && <ManualCoordsBox lat={lat} lon={lon} onApply={applyManualCoords} />}
    </div>
  );
}

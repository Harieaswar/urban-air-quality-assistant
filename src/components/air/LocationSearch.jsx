/**
 * @fileoverview ARIA combobox place search autocomplete powered by Open-Meteo Geocoding API.
 */

import React from 'react';
import ManualCoordsBox from './ManualCoordsBox';
import { useLocationSearch } from '@/hooks';

const LISTBOX_ID = 'location-autocomplete-listbox';

function PlaceOptionItem({ place, idx, isActive, onSelect }) {
  return (
    <li
      id={`place-option-${idx}`}
      role="option"
      aria-selected={isActive}
      tabIndex={-1}
      className={`autocomplete-option ${isActive ? 'active' : ''}`}
      onClick={() => onSelect(place)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onSelect(place);
      }}
    >
      <span>{place.displayName}</span>
      <span className="autocomplete-coords">
        {place.lat.toFixed(1)}°, {place.lon.toFixed(1)}°
      </span>
    </li>
  );
}

function PlaceListbox({ status, results, activeIndex, onSelect }) {
  return (
    <ul
      id={LISTBOX_ID}
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
          <PlaceOptionItem
            key={place.id}
            place={place}
            idx={idx}
            isActive={idx === activeIndex}
            onSelect={onSelect}
          />
        ))}
    </ul>
  );
}

function ComboboxInput({ search, errorId, hasError }) {
  const canOpen =
    search.results.length > 0 || search.status === 'empty' || search.status === 'unavailable';
  return (
    <input
      id="place-search-input"
      type="text"
      className="text-input"
      value={search.query}
      onChange={(e) => search.setQuery(e.target.value)}
      onKeyDown={search.handleKeyDown}
      onFocus={() => canOpen && search.setIsOpen(true)}
      placeholder="Type any city or town (min 2 letters, e.g. Salem, Tambaram, Delhi)..."
      role="combobox"
      aria-autocomplete="list"
      aria-expanded={search.isOpen}
      aria-controls={LISTBOX_ID}
      aria-activedescendant={
        search.activeIndex >= 0 ? `place-option-${search.activeIndex}` : undefined
      }
      aria-invalid={Boolean(hasError)}
      aria-describedby={hasError && errorId ? errorId : 'location-privacy-note'}
    />
  );
}

function PrivacyFooter({ showManual, onToggleManual }) {
  return (
    <div className="privacy-row">
      <p id="location-privacy-note" className="privacy-note">
        🔒 Privacy note: Coordinates are rounded to 0.1° (~11 km) before any Open-Meteo request and
        cached locally for 30 minutes.
      </p>
      <button
        type="button"
        className="btn btn--ghost btn--sm"
        aria-expanded={showManual}
        onClick={onToggleManual}
      >
        {showManual ? 'Hide manual coordinates' : 'Enter coordinates manually'}
      </button>
    </div>
  );
}

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
  const search = useLocationSearch({ initialName: locationName, onSelectLocation });

  return (
    <div className="location-search">
      <label htmlFor="place-search-input" className="field-label">
        Search your city, town, or neighborhood
      </label>
      <div className="autocomplete-wrap">
        <ComboboxInput search={search} errorId={errorId} hasError={hasError} />
        {search.isOpen && (
          <PlaceListbox
            status={search.status}
            results={search.results}
            activeIndex={search.activeIndex}
            onSelect={search.selectPlace}
          />
        )}
      </div>
      <div role="status" aria-live="polite" className="sr-only">
        {search.statusMsg}
      </div>
      <PrivacyFooter
        showManual={search.showManual}
        onToggleManual={() => search.setShowManual((v) => !v)}
      />
      {search.showManual && (
        <ManualCoordsBox lat={lat} lon={lon} onApply={search.applyManualCoords} />
      )}
    </div>
  );
}

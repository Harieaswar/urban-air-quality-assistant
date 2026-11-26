/**
 * @fileoverview ARIA combobox place search autocomplete powered by Open-Meteo Geocoding API.
 */

import React, { useState, useEffect, useRef } from 'react';
import { searchPlaces } from '@/services/openMeteo';
import { API_CONFIG } from '@/data/constants';
import ManualCoordsBox from './ManualCoordsBox';

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
  const [query, setQuery] = useState(locationName || '');
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState('idle');
  const [statusMsg, setStatusMsg] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [showManual, setShowManual] = useState(false);

  const abortRef = useRef(null);
  const skipNextFetchRef = useRef(false);
  const listId = 'location-autocomplete-listbox';

  useEffect(() => {
    setQuery(locationName || '');
  }, [locationName]);

  useEffect(() => {
    if (skipNextFetchRef.current) {
      skipNextFetchRef.current = false;
      return undefined;
    }

    const trimmed = query.trim();
    if (trimmed.length < API_CONFIG.GEOCODING_MIN_CHARS) {
      if (abortRef.current) abortRef.current.abort();
      setResults([]);
      setStatus('idle');
      setStatusMsg('');
      setIsOpen(false);
      return undefined;
    }

    const timer = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setStatus('loading');
      setStatusMsg('Searching locations...');
      setIsOpen(true);

      try {
        const res = await searchPlaces(trimmed, { signal: controller.signal });
        if (controller.signal.aborted) return;

        if (res.status === 'ok') {
          setResults(res.results);
          setStatus('ok');
          setStatusMsg(
            `${res.results.length} matching place${res.results.length === 1 ? '' : 's'} available.`
          );
          setActiveIndex(-1);
        } else if (res.status === 'empty') {
          setResults([]);
          setStatus('empty');
          setStatusMsg('No matches found.');
        } else if (res.status === 'unavailable') {
          setResults([]);
          setStatus('unavailable');
          setStatusMsg('Search unavailable, enter coordinates manually');
          setShowManual(true);
        }
      } catch (err) {
        if (err?.name !== 'AbortError') {
          console.warn('Place search failed:', err);
          setStatus('unavailable');
          setStatusMsg('Search unavailable, enter coordinates manually');
          setShowManual(true);
        }
      }
    }, API_CONFIG.GEOCODING_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [query]);

  const selectPlace = (place) => {
    skipNextFetchRef.current = true;
    setQuery(place.displayName);
    setIsOpen(false);
    setActiveIndex(-1);
    setStatusMsg(`Selected ${place.displayName}`);
    onSelectLocation({ name: place.displayName, lat: place.lat, lon: place.lon });
  };

  const handleKeyDown = (e) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp') && results.length > 0) {
      setIsOpen(true);
      setActiveIndex(0);
      e.preventDefault();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (results.length === 0 ? -1 : (prev + 1) % results.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) =>
        results.length === 0 ? -1 : (prev - 1 + results.length) % results.length
      );
    } else if (e.key === 'Enter' && isOpen && activeIndex >= 0 && results[activeIndex]) {
      e.preventDefault();
      selectPlace(results[activeIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

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
            if (results.length > 0 || status === 'empty' || status === 'unavailable')
              setIsOpen(true);
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
                  className={`autocomplete-option ${idx === activeIndex ? 'active' : ''}`}
                  onClick={() => selectPlace(place)}
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

      {showManual && (
        <ManualCoordsBox
          lat={lat}
          lon={lon}
          onApply={(loc) => {
            skipNextFetchRef.current = true;
            setQuery(loc.name);
            setIsOpen(false);
            onSelectLocation(loc);
          }}
        />
      )}
    </div>
  );
}

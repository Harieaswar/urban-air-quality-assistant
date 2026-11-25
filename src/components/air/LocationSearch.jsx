import React, { useState, useEffect, useRef } from 'react';
import { searchPlaces, roundCoordinate } from '@/services/openMeteo';
import { validateCoordinates } from '@/utils/validate';

/**
 * Accessible Place Search Autocomplete (Open-Meteo Geocoding API)
 * - 300ms debounce, AbortController cancellation, minimum 2 characters
 * - Keyboard navigation: ArrowUp, ArrowDown, Enter, Escape
 * - Shows "No matches" and "Search unavailable, enter coordinates manually" states
 * - Manual coordinates fallback always accessible
 */
export default function LocationSearch({ locationName, lat, lon, onSelectLocation }) {
  const [query, setQuery] = useState(locationName || '');
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState('idle'); // idle | loading | ok | empty | unavailable
  const [statusMsg, setStatusMsg] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [showManual, setShowManual] = useState(false);
  const [manualLat, setManualLat] = useState(lat != null ? String(lat) : '');
  const [manualLon, setManualLon] = useState(lon != null ? String(lon) : '');
  const [coordError, setCoordError] = useState('');

  const abortRef = useRef(null);
  const skipNextFetchRef = useRef(false);
  const listId = 'location-autocomplete-listbox';

  useEffect(() => {
    setQuery(locationName || '');
    if (lat != null) setManualLat(String(lat));
    if (lon != null) setManualLon(String(lon));
  }, [locationName, lat, lon]);

  useEffect(() => {
    if (skipNextFetchRef.current) {
      skipNextFetchRef.current = false;
      return;
    }

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      if (abortRef.current) abortRef.current.abort();
      setResults([]);
      setStatus('idle');
      setStatusMsg('');
      setIsOpen(false);
      return;
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
          setStatusMsg(`${res.results.length} matching place${res.results.length === 1 ? '' : 's'}`);
          setActiveIndex(-1);
        } else if (res.status === 'empty') {
          setResults([]);
          setStatus('empty');
          setStatusMsg('No matches');
        } else if (res.status === 'unavailable') {
          setResults([]);
          setStatus('unavailable');
          setStatusMsg('Search unavailable, enter coordinates manually');
          setShowManual(true);
        }
      } catch (err) {
        if (err?.name !== 'AbortError') {
          setStatus('unavailable');
          setStatusMsg('Search unavailable, enter coordinates manually');
          setShowManual(true);
        }
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [query]);

  const selectPlace = (place) => {
    skipNextFetchRef.current = true;
    setQuery(place.displayName);
    setManualLat(String(place.lat));
    setManualLon(String(place.lon));
    setIsOpen(false);
    setActiveIndex(-1);
    onSelectLocation({
      name: place.displayName,
      lat: place.lat,
      lon: place.lon,
    });
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
      setActiveIndex((prev) => (results.length === 0 ? -1 : (prev - 1 + results.length) % results.length));
    } else if (e.key === 'Enter' && isOpen && activeIndex >= 0 && results[activeIndex]) {
      e.preventDefault();
      selectPlace(results[activeIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  const handleApplyCoords = () => {
    const check = validateCoordinates(manualLat, manualLon);
    if (!check.valid) {
      setCoordError(check.error);
      return;
    }
    setCoordError('');
    const rLat = roundCoordinate(check.lat);
    const rLon = roundCoordinate(check.lon);
    const label = `Custom (${rLat.toFixed(1)}°, ${rLon.toFixed(1)}°)`;
    skipNextFetchRef.current = true;
    setQuery(label);
    setIsOpen(false);
    onSelectLocation({ name: label, lat: rLat, lon: rLon });
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
        />

        {isOpen && (
          <div id={listId} role="listbox" className="autocomplete-dropdown" aria-label="Matching locations">
            {status === 'loading' && (
              <div className="autocomplete-status" role="status">
                Searching Open-Meteo geocoding...
              </div>
            )}
            {status === 'empty' && (
              <div className="autocomplete-status" role="status">
                No matches — try another spelling or enter coordinates manually below.
              </div>
            )}
            {status === 'unavailable' && (
              <div className="autocomplete-status autocomplete-status--warn" role="alert">
                Search unavailable, enter coordinates manually
              </div>
            )}
            {status === 'ok' &&
              results.map((place, idx) => (
                <button
                  key={place.id}
                  id={`place-option-${idx}`}
                  type="button"
                  role="option"
                  aria-selected={idx === activeIndex}
                  className={`autocomplete-option ${idx === activeIndex ? 'active' : ''}`}
                  onClick={() => selectPlace(place)}
                >
                  <span>{place.displayName}</span>
                  <span className="autocomplete-coords">
                    {place.lat.toFixed(1)}°, {place.lon.toFixed(1)}°
                  </span>
                </button>
              ))}
          </div>
        )}
      </div>

      <div aria-live="polite" className="sr-only">
        {statusMsg}
      </div>

      <div className="privacy-row">
        <p className="privacy-note">
          🔒 Privacy note: Coordinates are rounded to 0.1° (~11 km) before any Open-Meteo request and cached locally for 30 minutes.
        </p>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => setShowManual((v) => !v)}
        >
          {showManual ? 'Hide manual coordinates' : 'Enter coordinates manually'}
        </button>
      </div>

      {showManual && (
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
                placeholder="e.g. 78.1"
              />
            </div>
            <button type="button" className="btn btn--secondary" onClick={handleApplyCoords}>
              Use Coordinates
            </button>
          </div>
          {coordError && (
            <p className="field-error" role="alert">
              {coordError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

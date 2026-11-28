/**
 * @fileoverview Custom hook managing debounced Open-Meteo geocoding search and combobox keyboard state.
 */

import { useState, useEffect, useRef } from 'react';
import { API_CONFIG } from '@/constants';
import { searchPlaces } from '@/services';

const INITIAL_STATUS = 'idle';

function applySearchResult({ res, setResults, setStatus, setStatusMsg, setActiveIndex, setShowManual }) {
  if (res.status === 'ok') {
    setResults(res.results);
    setStatus('ok');
    setStatusMsg(`${res.results.length} matching place${res.results.length === 1 ? '' : 's'} available.`);
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
}

/**
 * Manage accessible autocomplete query, 300ms debounce, AbortController requests, and keyboard nav.
 * @param {{ initialName: string, onSelectLocation: function(Object): void }} params - Hook config.
 * @returns {Object} Combobox state and event handlers.
 */
export function useLocationSearch({ initialName, onSelectLocation }) {
  const [query, setQuery] = useState(initialName || '');
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState(INITIAL_STATUS);
  const [statusMsg, setStatusMsg] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [showManual, setShowManual] = useState(false);

  const abortRef = useRef(null);
  const skipNextFetchRef = useRef(false);

  useEffect(() => {
    setQuery(initialName || '');
  }, [initialName]);

  useEffect(() => {
    if (skipNextFetchRef.current) {
      skipNextFetchRef.current = false;
      return undefined;
    }

    const trimmed = query.trim();
    if (trimmed.length < API_CONFIG.GEOCODING_MIN_CHARS) {
      if (abortRef.current) abortRef.current.abort();
      setResults([]);
      setStatus(INITIAL_STATUS);
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
        if (!controller.signal.aborted) {
          applySearchResult({ res, setResults, setStatus, setStatusMsg, setActiveIndex, setShowManual });
        }
      } catch (err) {
        if (err?.name !== 'AbortError') {
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

  const applyManualCoords = (loc) => {
    skipNextFetchRef.current = true;
    setQuery(loc.name);
    setIsOpen(false);
    onSelectLocation(loc);
  };

  const handleKeyDown = (event) => {
    if (!isOpen && (event.key === 'ArrowDown' || event.key === 'ArrowUp') && results.length > 0) {
      setIsOpen(true);
      setActiveIndex(0);
      event.preventDefault();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((prev) => (results.length === 0 ? -1 : (prev + 1) % results.length));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((prev) => (results.length === 0 ? -1 : (prev - 1 + results.length) % results.length));
    } else if (event.key === 'Enter' && isOpen && activeIndex >= 0 && results[activeIndex]) {
      event.preventDefault();
      selectPlace(results[activeIndex]);
    } else if (event.key === 'Escape') {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  return {
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
  };
}

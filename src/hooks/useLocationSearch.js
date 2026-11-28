/**
 * @fileoverview Custom hook managing debounced Open-Meteo geocoding search and combobox keyboard state.
 */

import { useState, useEffect, useRef } from 'react';
import { API_CONFIG } from '@/constants';
import { searchPlaces } from '@/services';

function applySearchResult(res, setters) {
  const { setResults, setStatus, setStatusMsg, setActiveIndex, setShowManual } = setters;
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
}

function useDebouncedPlaceFetch({ query, skipNextFetchRef, setters }) {
  const abortRef = useRef(null);

  useEffect(() => {
    if (skipNextFetchRef.current) {
      skipNextFetchRef.current = false;
      return undefined;
    }
    const trimmed = query.trim();
    if (trimmed.length < API_CONFIG.GEOCODING_MIN_CHARS) {
      if (abortRef.current) abortRef.current.abort();
      setters.setResults([]);
      setters.setStatus('idle');
      setters.setStatusMsg('');
      setters.setIsOpen(false);
      return undefined;
    }
    const timer = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setters.setStatus('loading');
      setters.setStatusMsg('Searching locations...');
      setters.setIsOpen(true);
      try {
        const res = await searchPlaces(trimmed, { signal: controller.signal });
        if (!controller.signal.aborted) applySearchResult(res, setters);
      } catch (err) {
        if (err?.name !== 'AbortError') {
          setters.setStatus('unavailable');
          setters.setStatusMsg('Search unavailable, enter coordinates manually');
          setters.setShowManual(true);
        }
      }
    }, API_CONFIG.GEOCODING_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [query, skipNextFetchRef, setters]);
}

function nextIndexForKey(key, prev, total) {
  if (total === 0) return -1;
  return key === 'ArrowDown' ? (prev + 1) % total : (prev - 1 + total) % total;
}

function processComboboxKey(event, ctx) {
  const isArrow = event.key === 'ArrowDown' || event.key === 'ArrowUp';
  if (isArrow) {
    event.preventDefault();
    if (!ctx.isOpen && ctx.results.length > 0) {
      ctx.setIsOpen(true);
      ctx.setActiveIndex(0);
    } else {
      ctx.setActiveIndex((prev) => nextIndexForKey(event.key, prev, ctx.results.length));
    }
    return;
  }
  if (event.key === 'Enter' && ctx.isOpen && ctx.results[ctx.activeIndex]) {
    event.preventDefault();
    ctx.selectPlace(ctx.results[ctx.activeIndex]);
  } else if (event.key === 'Escape') {
    ctx.setIsOpen(false);
    ctx.setActiveIndex(-1);
  }
}

function useComboboxHandlers({ skipNextFetchRef, setters, onSelectLocation, stateSnapshot }) {
  const selectPlace = (place) => {
    skipNextFetchRef.current = true;
    setters.setQuery(place.displayName);
    setters.setIsOpen(false);
    setters.setActiveIndex(-1);
    setters.setStatusMsg(`Selected ${place.displayName}`);
    onSelectLocation({ name: place.displayName, lat: place.lat, lon: place.lon });
  };
  const applyManualCoords = (loc) => {
    skipNextFetchRef.current = true;
    setters.setQuery(loc.name);
    setters.setIsOpen(false);
    onSelectLocation(loc);
  };
  const handleKeyDown = (event) =>
    processComboboxKey(event, { ...stateSnapshot, ...setters, selectPlace });
  return { selectPlace, applyManualCoords, handleKeyDown };
}

function useComboboxState(initialName) {
  const [query, setQuery] = useState(initialName || '');
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState('idle');
  const [statusMsg, setStatusMsg] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [showManual, setShowManual] = useState(false);
  useEffect(() => setQuery(initialName || ''), [initialName]);
  return {
    values: { query, results, status, statusMsg, isOpen, activeIndex, showManual },
    setters: {
      setQuery,
      setResults,
      setStatus,
      setStatusMsg,
      setIsOpen,
      setActiveIndex,
      setShowManual,
    },
  };
}

/**
 * Manage accessible autocomplete query, 300ms debounce, AbortController requests, and keyboard nav.
 * @param {{ initialName: string, onSelectLocation: function(Object): void }} params - Hook config.
 * @returns {Object} Combobox state and event handlers.
 */
export function useLocationSearch({ initialName, onSelectLocation }) {
  const { values, setters } = useComboboxState(initialName);
  const skipNextFetchRef = useRef(false);
  useDebouncedPlaceFetch({ query: values.query, skipNextFetchRef, setters });
  const handlers = useComboboxHandlers({
    skipNextFetchRef,
    setters,
    onSelectLocation,
    stateSnapshot: values,
  });
  return {
    ...values,
    setQuery: setters.setQuery,
    setIsOpen: setters.setIsOpen,
    setShowManual: setters.setShowManual,
    ...handlers,
  };
}

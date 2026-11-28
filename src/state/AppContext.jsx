/**
 * @fileoverview React Context provider and hook exposing SmogGuard state and Open-Meteo actions.
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import {
  fetchAirAndWeather,
  buildSampleSevereSmogData,
  buildManualAirData,
  CACHE_KEY_PREFIX,
} from '../services/openMeteo.js';
import { appReducer, loadPersistedState, persistState, STORAGE_KEY } from './sessionStore.js';

const AppContext = createContext(null);

function clearAppStorageKeys() {
  localStorage.removeItem(STORAGE_KEY);
  const cacheKeys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(CACHE_KEY_PREFIX)) cacheKeys.push(k);
  }
  cacheKeys.forEach((k) => localStorage.removeItem(k));
}

/**
 * Application state provider managing persistence, theme synchronization, and Open-Meteo fetching.
 * @param {{ children: React.ReactNode }} props - Child tree.
 * @returns {JSX.Element} Provider element.
 */
export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, null, loadPersistedState);

  useEffect(() => {
    persistState(state);
  }, [state]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.preferences.theme || 'dark');
  }, [state.preferences.theme]);

  const loadLocationAir = useCallback(
    async ({ lat, lon, name, forceRefresh = false, manualPm25 = null }) => {
      dispatch({ type: 'SET_AIR_LOADING', loading: true, error: null });
      const data = await fetchAirAndWeather(lat, lon, {
        locationName: name,
        forceRefresh,
        manualPm25,
      });
      dispatch({ type: 'SET_AIR_DATA', data, error: data.isFallback ? data.notice : null });
      return data;
    },
    []
  );

  const loadSampleSevereSmog = useCallback(() => {
    const sample = buildSampleSevereSmogData();
    dispatch({
      type: 'UPDATE_LOCATION',
      payload: { name: sample.locationName, lat: sample.roundedLat, lon: sample.roundedLon },
    });
    dispatch({
      type: 'SET_CALIBRATION',
      payload: { enabled: false, value: null, calibratedAt: null },
    });
    dispatch({ type: 'SET_AIR_DATA', data: sample, error: null });
  }, []);

  const applyManualAirReading = useCallback(
    (pm25) => {
      const manual = buildManualAirData({
        pm25,
        locationName: state.location.name || 'Manual Reading',
        lat: state.location.lat,
        lon: state.location.lon,
      });
      dispatch({ type: 'SET_AIR_DATA', data: manual, error: null });
    },
    [state.location.name, state.location.lat, state.location.lon]
  );

  const deleteAllData = useCallback(() => {
    try {
      clearAppStorageKeys();
    } catch (err) {
      console.warn('Could not clear some localStorage keys:', err);
    }
    dispatch({ type: 'DELETE_ALL' });
  }, []);

  return (
    <AppContext.Provider
      value={{
        state,
        dispatch,
        loadLocationAir,
        loadSampleSevereSmog,
        applyManualAirReading,
        deleteAllData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

/**
 * Hook to access SmogGuard application state and dispatch helpers.
 * @returns {Object} Store context `{ state, dispatch, loadLocationAir, loadSampleSevereSmog, applyManualAirReading, deleteAllData }`.
 */
export function useAppStore() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppStore must be used inside AppProvider');
  return ctx;
}

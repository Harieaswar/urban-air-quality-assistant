import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import {
  appReducer,
  loadPersistedState,
  persistState,
  STORAGE_KEY,
} from './sessionStore.js';
import {
  fetchAirAndWeather,
  buildSampleSevereSmogData,
  buildManualAirData,
  CACHE_KEY_PREFIX,
} from '../services/openMeteo.js';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, null, loadPersistedState);

  // Persist to localStorage on change
  useEffect(() => {
    persistState(state);
  }, [state]);

  // Apply theme to document root
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
      dispatch({
        type: 'SET_AIR_DATA',
        data,
        error: data.isFallback ? data.notice : null,
      });
      return data;
    },
    []
  );

  const loadSampleSevereSmog = useCallback(() => {
    const sample = buildSampleSevereSmogData();
    dispatch({
      type: 'UPDATE_LOCATION',
      payload: {
        name: sample.locationName,
        lat: sample.roundedLat,
        lon: sample.roundedLon,
      },
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
      localStorage.removeItem(STORAGE_KEY);
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(CACHE_KEY_PREFIX)) keysToRemove.push(k);
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch {
      // ignore
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

export function useAppStore() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useAppStore must be used inside AppProvider');
  }
  return ctx;
}

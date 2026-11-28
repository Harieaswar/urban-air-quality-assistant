/**
 * @fileoverview Safe localStorage persistence and corruption-recovery helpers for SmogGuard state.
 */

import { StorageAccessError } from '../services/errors.js';
import { STORAGE_KEY, createInitialState } from './initialState.js';

function mergePersistedSections(parsed) {
  const base = createInitialState();
  const parsedRooms = parsed.rooms || {};
  const list =
    Array.isArray(parsedRooms.list) && parsedRooms.list.length > 0
      ? parsedRooms.list
      : base.rooms.list;
  return {
    ...base,
    ...parsed,
    location: { ...base.location, ...(parsed.location || {}) },
    family: { ...base.family, ...(parsed.family || {}) },
    rooms: { ...base.rooms, ...parsedRooms, list },
    routine: { ...base.routine, ...(parsed.routine || {}) },
    air: { ...base.air, ...(parsed.air || {}), loading: false },
    preferences: { ...base.preferences, ...(parsed.preferences || {}) },
  };
}

function discardCorruptedStorageKey() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (_removeErr) {
    // Ignore cleanup errors when storage itself is unavailable.
  }
}

/**
 * Load persisted SmogGuard state from localStorage with explicit corruption/error status.
 * @returns {{ state: Object, error: StorageAccessError|null }} Restored state and optional storage error.
 */
export function loadPersistedStateWithStatus() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { state: createInitialState(), error: null };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      discardCorruptedStorageKey();
      return {
        state: createInitialState(),
        error: new StorageAccessError('Saved profile format was invalid; reset to defaults.'),
      };
    }
    return { state: mergePersistedSections(parsed), error: null };
  } catch (err) {
    discardCorruptedStorageKey();
    return {
      state: createInitialState(),
      error: new StorageAccessError(
        'Corrupted saved profile found in localStorage; reset to defaults.',
        err
      ),
    };
  }
}

/**
 * Load persisted SmogGuard state from localStorage, falling back cleanly if corrupted.
 * @returns {Object} Restored or fresh initial state.
 */
export function loadPersistedState() {
  return loadPersistedStateWithStatus().state;
}

/**
 * Persist SmogGuard application state to localStorage with structured error status.
 * @param {Object} state - Current state tree.
 * @returns {{ ok: boolean, error: StorageAccessError|null }} Persistence outcome.
 */
export function persistState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return { ok: true, error: null };
  } catch (err) {
    return {
      ok: false,
      error: new StorageAccessError('Unable to persist profile to localStorage.', err),
    };
  }
}

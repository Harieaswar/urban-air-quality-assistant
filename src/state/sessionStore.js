/**
 * @fileoverview Reducer handlers for SmogGuard single-source application state.
 */

import { BOUNDS } from '../constants/index.js';
import { createDefaultRoom, createInitialState } from './initialState.js';
import {
  loadPersistedState,
  loadPersistedStateWithStatus,
  persistState,
} from './storagePersistence.js';

export { loadPersistedState, loadPersistedStateWithStatus, persistState };

const MIN_STEP = BOUNDS.MIN_STEPS;
const MAX_STEP = BOUNDS.MAX_STEPS;

function toggleSensitiveGroup(currentList, id) {
  const current = Array.isArray(currentList) ? currentList : [];
  if (id === 'none' || id === 'unknown') {
    return current.includes(id) ? [] : [id];
  }
  const cleaned = current.filter((x) => x !== 'none' && x !== 'unknown');
  return cleaned.includes(id) ? cleaned.filter((x) => x !== id) : [...cleaned, id];
}

const ACTION_HANDLERS = {
  SET_STEP: (state, action, now) => ({
    ...state,
    wizardStep: Math.min(MAX_STEP, Math.max(MIN_STEP, action.step)),
    lastUpdatedAt: now,
  }),
  COMPLETE_WIZARD: (state, _action, now) => ({
    ...state,
    wizardCompleted: true,
    lastUpdatedAt: now,
  }),
  UPDATE_LOCATION: (state, action, now) => ({
    ...state,
    location: { ...state.location, ...action.payload },
    lastUpdatedAt: now,
  }),
  UPDATE_FAMILY: (state, action, now) => ({
    ...state,
    family: { ...state.family, ...action.payload },
    lastUpdatedAt: now,
  }),
  TOGGLE_SENSITIVE_GROUP: (state, action, now) => ({
    ...state,
    family: {
      ...state.family,
      sensitiveGroups: toggleSensitiveGroup(state.family.sensitiveGroups, action.id),
    },
    lastUpdatedAt: now,
  }),
  UPDATE_ROOMS: (state, action, now) => ({
    ...state,
    rooms: { ...state.rooms, ...action.payload },
    lastUpdatedAt: now,
  }),
  ADD_ROOM: (state, _action, now) => ({
    ...state,
    rooms: {
      ...state.rooms,
      list: [...state.rooms.list, createDefaultRoom(state.rooms.list.length + 1)],
    },
    lastUpdatedAt: now,
  }),
  UPDATE_ROOM_ITEM: (state, action, now) => ({
    ...state,
    rooms: {
      ...state.rooms,
      list: state.rooms.list.map((r) => (r.id === action.id ? { ...r, ...action.payload } : r)),
    },
    lastUpdatedAt: now,
  }),
  REMOVE_ROOM: (state, action, now) =>
    state.rooms.list.length <= 1
      ? state
      : {
          ...state,
          rooms: { ...state.rooms, list: state.rooms.list.filter((r) => r.id !== action.id) },
          lastUpdatedAt: now,
        },
  UPDATE_ROUTINE: (state, action, now) => ({
    ...state,
    routine: { ...state.routine, ...action.payload },
    lastUpdatedAt: now,
  }),
  SET_AIR_LOADING: (state, action) => ({
    ...state,
    air: { ...state.air, loading: action.loading, error: action.error ?? null },
  }),
  SET_AIR_DATA: (state, action, now) => ({
    ...state,
    air: { ...state.air, data: action.data, loading: false, error: action.error ?? null },
    lastUpdatedAt: now,
  }),
  SET_CALIBRATION: (state, action, now) => ({
    ...state,
    air: { ...state.air, calibration: { ...state.air.calibration, ...action.payload } },
    lastUpdatedAt: now,
  }),
  UPDATE_PREFERENCES: (state, action, now) => ({
    ...state,
    preferences: { ...state.preferences, ...action.payload },
    lastUpdatedAt: now,
  }),
  TOGGLE_ACTION: (state, action, now) => {
    const exists = state.selectedActionIds.includes(action.id);
    return {
      ...state,
      selectedActionIds: exists
        ? state.selectedActionIds.filter((x) => x !== action.id)
        : [...state.selectedActionIds, action.id],
      lastUpdatedAt: now,
    };
  },
  IMPORT_STATE: (_state, action, now) => ({
    ...createInitialState(),
    ...action.payload,
    lastUpdatedAt: now,
  }),
  RESTART: (state, _action, now) => ({
    ...createInitialState(),
    preferences: state.preferences,
    lastUpdatedAt: now,
  }),
  DELETE_ALL: () => createInitialState(),
};

/**
 * Pure reducer handling all SmogGuard state transitions.
 * @param {Object} state - Current application state.
 * @param {Object} action - Dispatched action object `{ type, ... }`.
 * @returns {Object} Next state.
 */
export function appReducer(state, action) {
  const handler = ACTION_HANDLERS[action?.type];
  return handler ? handler(state, action, Date.now()) : state;
}

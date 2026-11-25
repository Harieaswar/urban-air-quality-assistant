/**
 * Single Source of Truth Store & Reducer — SmogGuard
 * Persists full household wizard profile, air context, monitor calibration,
 * and UI preferences in localStorage.
 */

import { buildSampleSevereSmogData } from '../services/openMeteo.js';

export const STORAGE_KEY = 'smogguard_state_v2';

export function createDefaultRoom(index = 1) {
  return {
    id: `room-${index}`,
    name: index === 1 ? 'Primary Bedroom' : `Room ${index}`,
    type: index === 1 ? 'bedroom' : 'living_room',
    typeOther: '',
    areaSqM: 16,
    areaUnit: 'sqm',
    ceilingHeightM: 2.8,
    ventilation: 'moderate',
    ventilationOther: '',
    hasSensitiveOccupant: index === 1,
  };
}

export function createInitialState() {
  return {
    version: '2.0.0',
    wizardStep: 1,
    wizardCompleted: false,
    location: {
      name: 'New Delhi (Sample Severe-Smog Demo)',
      lat: 28.6,
      lon: 77.2,
      homeType: 'apartment',
      homeTypeOther: '',
      cooling: 'ac',
      coolingOther: '',
      rentalLimits: true,
      rentalLimitsOther: '',
    },
    family: {
      householdSize: 4,
      sensitiveGroups: ['children'],
      sensitiveGroupsOther: '',
      goals: ['cleaner_air', 'cut_emissions'],
      goalsOther: '',
      budget: 'medium',
      budgetOther: '',
      effort: 'medium',
      effortOther: '',
    },
    rooms: {
      list: [createDefaultRoom(1)],
      cookingFuel: 'lpg',
      cookingFuelOther: '',
      hasChimney: 'exhaust_fan',
      hasChimneyOther: '',
      indoorSmokeSources: ['none'],
      indoorSmokeSourcesOther: '',
    },
    routine: {
      commuteMode: 'two_wheeler',
      commuteModeOther: '',
      commuteKm: 12,
      commuteDays: 5,
      monthlyKwh: 220,
      diet: 'vegetarian',
      dietOther: '',
      wasteHabits: 'basic_segregation',
      wasteHabitsOther: '',
      outdoorExerciseTiming: 'morning',
      outdoorExerciseTimingOther: '',
    },
    air: {
      data: buildSampleSevereSmogData(),
      loading: false,
      error: null,
      calibration: {
        enabled: false,
        mode: 'pm25',
        value: null,
        calibratedAt: null,
      },
    },
    preferences: {
      theme: 'dark',
      aqiScale: 'india_naqi',
      altRankBy: 'emissions',
    },
    selectedActionIds: ['ventilate_air_window', 'close_windows_high_pm', 'exhaust_fan_cooking'],
    lastUpdatedAt: Date.now(),
  };
}

/**
 * Flatten structured wizard state into calculator-compatible profile object.
 */
export function selectCalculatorProfile(state) {
  return {
    city: state.location.name,
    lat: state.location.lat,
    lon: state.location.lon,
    homeType: state.location.homeType,
    cooling: state.location.cooling,
    rentalLimits: state.location.rentalLimits,
    householdSize: state.family.householdSize,
    sensitiveGroups: state.family.sensitiveGroups,
    goals: state.family.goals,
    budget: state.family.budget,
    effort: state.family.effort,
    rooms: state.rooms.list,
    ventilation: state.rooms.list[0]?.ventilation || 'moderate',
    cookingFuel: state.rooms.cookingFuel,
    hasChimney: state.rooms.hasChimney,
    indoorSmokeSources: state.rooms.indoorSmokeSources,
    commuteMode: state.routine.commuteMode,
    commuteKm: state.routine.commuteKm,
    commuteDays: state.routine.commuteDays,
    monthlyKwh: state.routine.monthlyKwh,
    diet: state.routine.diet,
    wasteHabits: state.routine.wasteHabits,
    outdoorExerciseTiming: state.routine.outdoorExerciseTiming,
  };
}

export function appReducer(state, action) {
  const now = Date.now();
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, wizardStep: Math.min(4, Math.max(1, action.step)), lastUpdatedAt: now };

    case 'COMPLETE_WIZARD':
      return { ...state, wizardCompleted: true, lastUpdatedAt: now };

    case 'UPDATE_LOCATION':
      return { ...state, location: { ...state.location, ...action.payload }, lastUpdatedAt: now };

    case 'UPDATE_FAMILY':
      return { ...state, family: { ...state.family, ...action.payload }, lastUpdatedAt: now };

    case 'TOGGLE_SENSITIVE_GROUP': {
      const id = action.id;
      const current = Array.isArray(state.family.sensitiveGroups) ? state.family.sensitiveGroups : [];
      let next;
      if (id === 'none' || id === 'unknown') {
        next = current.includes(id) ? [] : [id];
      } else {
        const cleaned = current.filter((x) => x !== 'none' && x !== 'unknown');
        next = cleaned.includes(id) ? cleaned.filter((x) => x !== id) : [...cleaned, id];
      }
      return { ...state, family: { ...state.family, sensitiveGroups: next }, lastUpdatedAt: now };
    }

    case 'UPDATE_ROOMS':
      return { ...state, rooms: { ...state.rooms, ...action.payload }, lastUpdatedAt: now };

    case 'ADD_ROOM': {
      const nextIdx = state.rooms.list.length + 1;
      return {
        ...state,
        rooms: {
          ...state.rooms,
          list: [...state.rooms.list, createDefaultRoom(nextIdx)],
        },
        lastUpdatedAt: now,
      };
    }

    case 'UPDATE_ROOM_ITEM':
      return {
        ...state,
        rooms: {
          ...state.rooms,
          list: state.rooms.list.map((r) => (r.id === action.id ? { ...r, ...action.payload } : r)),
        },
        lastUpdatedAt: now,
      };

    case 'REMOVE_ROOM':
      if (state.rooms.list.length <= 1) return state;
      return {
        ...state,
        rooms: {
          ...state.rooms,
          list: state.rooms.list.filter((r) => r.id !== action.id),
        },
        lastUpdatedAt: now,
      };

    case 'UPDATE_ROUTINE':
      return { ...state, routine: { ...state.routine, ...action.payload }, lastUpdatedAt: now };

    case 'SET_AIR_LOADING':
      return { ...state, air: { ...state.air, loading: action.loading, error: action.error ?? null } };

    case 'SET_AIR_DATA':
      return {
        ...state,
        air: { ...state.air, data: action.data, loading: false, error: action.error ?? null },
        lastUpdatedAt: now,
      };

    case 'SET_CALIBRATION':
      return {
        ...state,
        air: {
          ...state.air,
          calibration: { ...state.air.calibration, ...action.payload },
        },
        lastUpdatedAt: now,
      };

    case 'UPDATE_PREFERENCES':
      return {
        ...state,
        preferences: { ...state.preferences, ...action.payload },
        lastUpdatedAt: now,
      };

    case 'TOGGLE_ACTION': {
      const exists = state.selectedActionIds.includes(action.id);
      return {
        ...state,
        selectedActionIds: exists
          ? state.selectedActionIds.filter((x) => x !== action.id)
          : [...state.selectedActionIds, action.id],
        lastUpdatedAt: now,
      };
    }

    case 'IMPORT_STATE':
      return {
        ...createInitialState(),
        ...action.payload,
        lastUpdatedAt: now,
      };

    case 'RESTART':
      return {
        ...createInitialState(),
        preferences: state.preferences,
        lastUpdatedAt: now,
      };

    case 'DELETE_ALL':
      return createInitialState();

    default:
      return state;
  }
}

export function loadPersistedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return createInitialState();
    const base = createInitialState();
    return {
      ...base,
      ...parsed,
      location: { ...base.location, ...(parsed.location || {}) },
      family: { ...base.family, ...(parsed.family || {}) },
      rooms: {
        ...base.rooms,
        ...(parsed.rooms || {}),
        list: Array.isArray(parsed.rooms?.list) && parsed.rooms.list.length > 0 ? parsed.rooms.list : base.rooms.list,
      },
      routine: { ...base.routine, ...(parsed.routine || {}) },
      air: {
        ...base.air,
        ...(parsed.air || {}),
        loading: false,
      },
      preferences: { ...base.preferences, ...(parsed.preferences || {}) },
    };
  } catch {
    return createInitialState();
  }
}

export function persistState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors
  }
}

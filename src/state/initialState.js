/**
 * @fileoverview Initial wizard state factory and calculator profile selector for SmogGuard.
 */

import { buildSampleSevereSmogData } from '../services/openMeteo.js';

export const STORAGE_KEY = 'smogguard_state_v2';

const SAMPLE_LAT = 28.6;
const SAMPLE_LON = 77.2;
const DEFAULT_ROOM_AREA_SQM = 16;
const DEFAULT_CEILING_M = 2.8;
const DEFAULT_HOUSEHOLD_SIZE = 4;
const DEFAULT_COMMUTE_KM = 12;
const DEFAULT_COMMUTE_DAYS = 5;
const DEFAULT_MONTHLY_KWH = 220;

/**
 * Create a default room configuration object.
 * @param {number} [index=1] - 1-based room index.
 * @returns {Object} Default room object.
 */
export function createDefaultRoom(index = 1) {
  return {
    id: `room-${index}`,
    name: index === 1 ? 'Primary Bedroom' : `Room ${index}`,
    type: index === 1 ? 'bedroom' : 'living_room',
    typeOther: '',
    areaSqM: DEFAULT_ROOM_AREA_SQM,
    areaUnit: 'sqm',
    ceilingHeightM: DEFAULT_CEILING_M,
    ventilation: 'moderate',
    ventilationOther: '',
    hasSensitiveOccupant: index === 1,
  };
}

function createLocationDefaults() {
  return {
    name: 'New Delhi (Sample Severe-Smog Demo)',
    lat: SAMPLE_LAT,
    lon: SAMPLE_LON,
    homeType: 'apartment',
    homeTypeOther: '',
    cooling: 'ac',
    coolingOther: '',
    rentalLimits: true,
    rentalLimitsOther: '',
  };
}

function createFamilyDefaults() {
  return {
    householdSize: DEFAULT_HOUSEHOLD_SIZE,
    sensitiveGroups: ['children'],
    sensitiveGroupsOther: '',
    goals: ['cleaner_air', 'cut_emissions'],
    goalsOther: '',
    budget: 'medium',
    budgetOther: '',
    effort: 'medium',
    effortOther: '',
  };
}

function createRoomsDefaults() {
  return {
    list: [createDefaultRoom(1)],
    cookingFuel: 'lpg',
    cookingFuelOther: '',
    hasChimney: 'exhaust_fan',
    hasChimneyOther: '',
    indoorSmokeSources: ['none'],
    indoorSmokeSourcesOther: '',
  };
}

function createRoutineDefaults() {
  return {
    commuteMode: 'two_wheeler',
    commuteModeOther: '',
    commuteKm: DEFAULT_COMMUTE_KM,
    commuteDays: DEFAULT_COMMUTE_DAYS,
    monthlyKwh: DEFAULT_MONTHLY_KWH,
    diet: 'vegetarian',
    dietOther: '',
    wasteHabits: 'basic_segregation',
    wasteHabitsOther: '',
    outdoorExerciseTiming: 'morning',
    outdoorExerciseTimingOther: '',
  };
}

/**
 * Create the initial SmogGuard single-source-of-truth application state.
 * @returns {Object} Initial state tree.
 */
export function createInitialState() {
  return {
    version: '2.0.0',
    wizardStep: 1,
    wizardCompleted: false,
    location: createLocationDefaults(),
    family: createFamilyDefaults(),
    rooms: createRoomsDefaults(),
    routine: createRoutineDefaults(),
    air: {
      data: buildSampleSevereSmogData(),
      loading: false,
      error: null,
      calibration: { enabled: false, mode: 'pm25', value: null, calibratedAt: null },
    },
    preferences: { theme: 'dark', aqiScale: 'india_naqi', altRankBy: 'emissions' },
    selectedActionIds: ['ventilate_air_window', 'close_windows_high_pm', 'exhaust_fan_cooking'],
    lastUpdatedAt: Date.now(),
  };
}

/**
 * Flatten structured wizard state into a profile object consumed by pure calculators.
 * @param {Object} state - Root application state.
 * @returns {Object} Flattened calculator profile.
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

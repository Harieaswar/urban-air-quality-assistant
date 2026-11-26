/**
 * @fileoverview Initial wizard state factory and calculator profile selector for SmogGuard.
 */

import { buildSampleSevereSmogData } from '../services/openMeteo.js';

export const STORAGE_KEY = 'smogguard_state_v2';

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
    areaSqM: 16,
    areaUnit: 'sqm',
    ceilingHeightM: 2.8,
    ventilation: 'moderate',
    ventilationOther: '',
    hasSensitiveOccupant: index === 1,
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

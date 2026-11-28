/**
 * @fileoverview Step-by-step plain-language validation rules for the 4-step SmogGuard wizard.
 */

import { validateChoiceWithOther, validateRange, validatePositiveNumber } from '@/utils/validate';

const MAX_HOUSEHOLD_SIZE = 25;
const MIN_ROOM_AREA = 3;
const MAX_ROOM_AREA = 250;
const MIN_CEILING_M = 2;
const MAX_CEILING_M = 6;
const MAX_COMMUTE_KM = 250;
const MAX_COMMUTE_DAYS = 7;
const MAX_MONTHLY_KWH = 5000;

function validateLocationStep(state) {
  const errs = {};
  if (
    !state.location.name ||
    state.location.lat === null ||
    state.location.lat === undefined ||
    state.location.lon === null ||
    state.location.lon === undefined
  ) {
    errs.location = 'Please select a place from the search box or enter coordinates manually.';
  }
  const ht = validateChoiceWithOther(
    state.location.homeType,
    state.location.homeTypeOther,
    'Home type'
  );
  if (!ht.valid) errs.homeType = ht.error;
  const cl = validateChoiceWithOther(
    state.location.cooling,
    state.location.coolingOther,
    'Cooling / heating'
  );
  if (!cl.valid) errs.cooling = cl.error;
  const rentalVal =
    state.location.rentalLimits === true
      ? 'rent'
      : state.location.rentalLimits === false
        ? 'own'
        : state.location.rentalLimits;
  const rl = validateChoiceWithOther(rentalVal, state.location.rentalLimitsOther, 'Rental status');
  if (!rl.valid) errs.rentalLimits = rl.error;
  return errs;
}

function validateFamilyStep(state) {
  const errs = {};
  if (state.family.householdSize !== 'unknown') {
    const hs = validateRange(state.family.householdSize, 1, MAX_HOUSEHOLD_SIZE, 'Household size');
    if (!hs.valid) errs.householdSize = hs.error;
  }
  const sg = validateChoiceWithOther(
    state.family.sensitiveGroups,
    state.family.sensitiveGroupsOther,
    'Family members needing extra protection'
  );
  if (!sg.valid) errs.sensitiveGroups = sg.error;
  const gl = validateChoiceWithOther(
    state.family.goals,
    state.family.goalsOther,
    'Household goals'
  );
  if (!gl.valid) errs.goals = gl.error;
  const bg = validateChoiceWithOther(state.family.budget, state.family.budgetOther, 'Budget');
  if (!bg.valid) errs.budget = bg.error;
  const ef = validateChoiceWithOther(state.family.effort, state.family.effortOther, 'Effort level');
  if (!ef.valid) errs.effort = ef.error;
  return errs;
}

function validateRoomsStep(state) {
  const errs = {};
  state.rooms.list.forEach((room, idx) => {
    const label = room.name || `Room ${idx + 1}`;
    if (!room.name || !room.name.trim())
      errs[`room_name_${room.id}`] = `Please name Room ${idx + 1}.`;
    if (room.areaSqM !== 'unknown') {
      const a = validateRange(room.areaSqM, MIN_ROOM_AREA, MAX_ROOM_AREA, `${label} area (m²)`);
      if (!a.valid) errs[`room_area_${room.id}`] = a.error;
    }
    if (room.ceilingHeightM !== 'unknown') {
      const h = validateRange(
        room.ceilingHeightM,
        MIN_CEILING_M,
        MAX_CEILING_M,
        `${label} ceiling height (m)`
      );
      if (!h.valid) errs[`room_height_${room.id}`] = h.error;
    }
    const v = validateChoiceWithOther(
      room.ventilation,
      room.ventilationOther,
      `${label} ventilation`
    );
    if (!v.valid) errs[`room_vent_${room.id}`] = v.error;
  });
  const cf = validateChoiceWithOther(
    state.rooms.cookingFuel,
    state.rooms.cookingFuelOther,
    'Cooking fuel'
  );
  if (!cf.valid) errs.cookingFuel = cf.error;
  const ch = validateChoiceWithOther(
    state.rooms.hasChimney,
    state.rooms.hasChimneyOther,
    'Kitchen exhaust'
  );
  if (!ch.valid) errs.hasChimney = ch.error;
  const sm = validateChoiceWithOther(
    state.rooms.indoorSmokeSources,
    state.rooms.indoorSmokeSourcesOther,
    'Indoor smoke sources'
  );
  if (!sm.valid) errs.indoorSmokeSources = sm.error;
  return errs;
}

function validateRoutineStep(state) {
  const errs = {};
  const cm = validateChoiceWithOther(
    state.routine.commuteMode,
    state.routine.commuteModeOther,
    'Commute mode'
  );
  if (!cm.valid) errs.commuteMode = cm.error;
  if (!['wfh', 'walk', 'bicycle'].includes(state.routine.commuteMode)) {
    if (state.routine.commuteKm !== 'unknown') {
      const km = validatePositiveNumber(
        state.routine.commuteKm,
        'One-way commute distance (km)',
        MAX_COMMUTE_KM
      );
      if (!km.valid) errs.commuteKm = km.error;
    }
    if (state.routine.commuteDays !== 'unknown') {
      const d = validateRange(
        state.routine.commuteDays,
        0,
        MAX_COMMUTE_DAYS,
        'Commute days per week'
      );
      if (!d.valid) errs.commuteDays = d.error;
    }
  }
  if (state.routine.monthlyKwh !== 'unknown') {
    const k = validatePositiveNumber(
      state.routine.monthlyKwh,
      'Monthly electricity (kWh)',
      MAX_MONTHLY_KWH
    );
    if (!k.valid) errs.monthlyKwh = k.error;
  }
  const dt = validateChoiceWithOther(state.routine.diet, state.routine.dietOther, 'Diet pattern');
  if (!dt.valid) errs.diet = dt.error;
  const ws = validateChoiceWithOther(
    state.routine.wasteHabits,
    state.routine.wasteHabitsOther,
    'Waste habits'
  );
  if (!ws.valid) errs.wasteHabits = ws.error;
  const ex = validateChoiceWithOther(
    state.routine.outdoorExerciseTiming,
    state.routine.outdoorExerciseTimingOther,
    'Outdoor activity timing'
  );
  if (!ex.valid) errs.outdoorExerciseTiming = ex.error;
  return errs;
}

const VALIDATORS = {
  1: validateLocationStep,
  2: validateFamilyStep,
  3: validateRoomsStep,
  4: validateRoutineStep,
};

/**
 * Validate a given wizard step (1–4) and return field-keyed plain-language error messages.
 * @param {number} step - Active wizard step number (1–4).
 * @param {Object} state - Root application state.
 * @returns {Object<string, string>} Field error map (empty when valid).
 */
export function validateWizardStep(step, state) {
  const fn = VALIDATORS[step];
  return fn ? fn(state) : {};
}

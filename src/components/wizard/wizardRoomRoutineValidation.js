/**
 * @fileoverview Step 3 and Step 4 validation helpers for rooms, kitchen, commute, and routine fields.
 */

import { BOUNDS } from '@/constants';
import { validateChoiceWithOther, validateRange, validatePositiveNumber } from '@/utils/validate';

/**
 * Validate a choice group with "Other" text and assign error key on failure.
 * @param {Object<string, string>} errs - Mutable error map.
 * @param {string} key - Field error key.
 * @param {{ value: *, otherValue: string, label: string }} spec - Choice value & label spec.
 * @returns {void}
 */
export function checkChoice(errs, key, { value, otherValue, label }) {
  const result = validateChoiceWithOther(value, otherValue, label);
  if (!result.valid) errs[key] = result.error;
}

function validateSingleRoom(errs, room, idx) {
  const label = room.name || `Room ${idx + 1}`;
  if (!room.name || !room.name.trim()) {
    errs[`room_name_${room.id}`] = `Please name Room ${idx + 1}.`;
  }
  if (room.areaSqM !== 'unknown') {
    const areaRes = validateRange(
      room.areaSqM,
      BOUNDS.MIN_ROOM_AREA_SQM,
      BOUNDS.MAX_ROOM_AREA_SQM,
      `${label} area (m²)`
    );
    if (!areaRes.valid) errs[`room_area_${room.id}`] = areaRes.error;
  }
  if (room.ceilingHeightM !== 'unknown') {
    const heightRes = validateRange(
      room.ceilingHeightM,
      BOUNDS.MIN_CEILING_HEIGHT_M,
      BOUNDS.MAX_CEILING_HEIGHT_M,
      `${label} ceiling height (m)`
    );
    if (!heightRes.valid) errs[`room_height_${room.id}`] = heightRes.error;
  }
  checkChoice(errs, `room_vent_${room.id}`, {
    value: room.ventilation,
    otherValue: room.ventilationOther,
    label: `${label} ventilation`,
  });
}

/**
 * Validate Step 3 (Rooms, cooking fuel, chimney, indoor smoke sources).
 * @param {Object} state - Root application state.
 * @returns {Object<string, string>} Field error map.
 */
export function validateRoomsStep(state) {
  const errs = {};
  state.rooms.list.forEach((room, idx) => validateSingleRoom(errs, room, idx));
  checkChoice(errs, 'cookingFuel', {
    value: state.rooms.cookingFuel,
    otherValue: state.rooms.cookingFuelOther,
    label: 'Cooking fuel',
  });
  checkChoice(errs, 'hasChimney', {
    value: state.rooms.hasChimney,
    otherValue: state.rooms.hasChimneyOther,
    label: 'Kitchen exhaust',
  });
  checkChoice(errs, 'indoorSmokeSources', {
    value: state.rooms.indoorSmokeSources,
    otherValue: state.rooms.indoorSmokeSourcesOther,
    label: 'Indoor smoke sources',
  });
  return errs;
}

function validateCommuteNumbers(errs, routine) {
  if (['wfh', 'walk', 'bicycle'].includes(routine.commuteMode)) return;
  if (routine.commuteKm !== 'unknown') {
    const km = validatePositiveNumber(
      routine.commuteKm,
      'One-way commute distance (km)',
      BOUNDS.MAX_COMMUTE_KM
    );
    if (!km.valid) errs.commuteKm = km.error;
  }
  if (routine.commuteDays !== 'unknown') {
    const days = validateRange(
      routine.commuteDays,
      0,
      BOUNDS.MAX_COMMUTE_DAYS,
      'Commute days per week'
    );
    if (!days.valid) errs.commuteDays = days.error;
  }
}

/**
 * Validate Step 4 (Commute, electricity, diet, waste, outdoor timing).
 * @param {Object} state - Root application state.
 * @returns {Object<string, string>} Field error map.
 */
export function validateRoutineStep(state) {
  const errs = {};
  const { routine } = state;
  checkChoice(errs, 'commuteMode', {
    value: routine.commuteMode,
    otherValue: routine.commuteModeOther,
    label: 'Commute mode',
  });
  validateCommuteNumbers(errs, routine);
  if (routine.monthlyKwh !== 'unknown') {
    const kwh = validatePositiveNumber(
      routine.monthlyKwh,
      'Monthly electricity (kWh)',
      BOUNDS.MAX_MONTHLY_KWH
    );
    if (!kwh.valid) errs.monthlyKwh = kwh.error;
  }
  checkChoice(errs, 'diet', {
    value: routine.diet,
    otherValue: routine.dietOther,
    label: 'Diet pattern',
  });
  checkChoice(errs, 'wasteHabits', {
    value: routine.wasteHabits,
    otherValue: routine.wasteHabitsOther,
    label: 'Waste habits',
  });
  checkChoice(errs, 'outdoorExerciseTiming', {
    value: routine.outdoorExerciseTiming,
    otherValue: routine.outdoorExerciseTimingOther,
    label: 'Outdoor activity timing',
  });
  return errs;
}

/**
 * @fileoverview Step-by-step plain-language validation dispatcher for the 4-step SmogGuard wizard.
 */

import { checkChoice, validateRoomsStep, validateRoutineStep } from './wizardRoomRoutineValidation';
import { BOUNDS } from '@/constants';
import { validateRange } from '@/utils/validate';

const RENTAL_MAP = new Map([
  [true, 'rent'],
  [false, 'own'],
]);

function validateLocationStep(state) {
  const errs = {};
  const {
    name,
    lat,
    lon,
    homeType,
    homeTypeOther,
    cooling,
    coolingOther,
    rentalLimits,
    rentalLimitsOther,
  } = state.location;
  if (!name || lat === null || lat === undefined || lon === null || lon === undefined) {
    errs.location = 'Please select a place from the search box or enter coordinates manually.';
  }
  checkChoice(errs, 'homeType', { value: homeType, otherValue: homeTypeOther, label: 'Home type' });
  checkChoice(errs, 'cooling', {
    value: cooling,
    otherValue: coolingOther,
    label: 'Cooling / heating',
  });
  const rentalVal = RENTAL_MAP.has(rentalLimits) ? RENTAL_MAP.get(rentalLimits) : rentalLimits;
  checkChoice(errs, 'rentalLimits', {
    value: rentalVal,
    otherValue: rentalLimitsOther,
    label: 'Rental status',
  });
  return errs;
}

function validateFamilyStep(state) {
  const errs = {};
  const { family } = state;
  if (family.householdSize !== 'unknown') {
    const hs = validateRange(
      family.householdSize,
      BOUNDS.MIN_HOUSEHOLD_SIZE,
      BOUNDS.MAX_HOUSEHOLD_SIZE,
      'Household size'
    );
    if (!hs.valid) errs.householdSize = hs.error;
  }
  checkChoice(errs, 'sensitiveGroups', {
    value: family.sensitiveGroups,
    otherValue: family.sensitiveGroupsOther,
    label: 'Family members needing extra protection',
  });
  checkChoice(errs, 'goals', {
    value: family.goals,
    otherValue: family.goalsOther,
    label: 'Household goals',
  });
  checkChoice(errs, 'budget', {
    value: family.budget,
    otherValue: family.budgetOther,
    label: 'Budget',
  });
  checkChoice(errs, 'effort', {
    value: family.effort,
    otherValue: family.effortOther,
    label: 'Effort level',
  });
  return errs;
}

const VALIDATORS = {
  [BOUNDS.STEP_LOCATION]: validateLocationStep,
  [BOUNDS.STEP_FAMILY]: validateFamilyStep,
  [BOUNDS.STEP_ROOMS]: validateRoomsStep,
  [BOUNDS.STEP_ROUTINE]: validateRoutineStep,
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

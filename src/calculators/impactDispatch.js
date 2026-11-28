/**
 * @fileoverview Context normalization and per-action formula dispatch registry.
 */

import { DEFAULTS, CONSERVATIVE_UNKNOWNS, IMPACT_FACTORS } from '../constants/index.js';
import { resolveWithFallback } from '../utils/resolve.js';
import {
  impactMetro,
  impactCarpool,
  impactWfh,
  impactAcSetpoint,
  impactLedSwitch,
  impactSolarWaterHeater,
} from './impactMobilityEnergy.js';
import {
  impactInduction,
  impactPressureCooking,
  impactDietShift,
  impactWasteChange,
} from './impactHomeConsumption.js';

const ACTION_DISPATCH = {
  switch_to_metro: impactMetro,
  carpool: impactCarpool,
  wfh_days: impactWfh,
  ac_setpoint_26: impactAcSetpoint,
  led_switch: impactLedSwitch,
  switch_to_induction: impactInduction,
  pressure_cooking: impactPressureCooking,
  plant_forward_meals: impactDietShift,
  waste_segregation: (ctx, factors) =>
    ctx.wasteHabits === 'no_segregation'
      ? impactWasteChange(ctx, factors, 'waste_basic_segregation', 0)
      : { formula: 'Already segregating waste' },
  home_composting: (ctx, factors) =>
    impactWasteChange(ctx, factors, 'waste_composting', DEFAULTS.compostingAnnualSavingsINR),
  solar_water_heater: impactSolarWaterHeater,
};

const DEFAULT_NON_IAQ_SAVINGS = {
  low: IMPACT_FACTORS.DEFAULT_ACTION_CO2_LOW,
  central: IMPACT_FACTORS.DEFAULT_ACTION_CO2_CENTRAL,
  high: IMPACT_FACTORS.DEFAULT_ACTION_CO2_HIGH,
};
const ZERO_CO2 = { low: 0, central: 0, high: 0 };

function defaultActionPatch(action) {
  if (action.id === 'hepa_purifier') {
    return {
      exposureChange: 'Reduces clean-room indoor PM2.5 by 50–80% when sized for ≥5 ACH',
      formula: `CADR ≥ Room Volume (m³) × ${DEFAULTS.targetACH} ACH`,
      inputs: { targetACH: DEFAULTS.targetACH },
      sources: ['Cochrane Review — Chen et al. (2021)', 'Barn et al. (2018)'],
      assumptions: ['Continuous operation with clean-room doors/windows closed'],
    };
  }
  if (action.id === 'diy_box_fan_filter') {
    return {
      exposureChange: '60–70% indoor PM2.5 reduction in room-scale UC Davis / PNAS tests',
      formula: 'MERV-13 filter cube + box fan recirculation',
      sources: ['Dal Porto et al., PNAS (2022)'],
      assumptions: ['Sealed filter edges; replace filters every 3–6 months during smog season'],
    };
  }
  const isIaqOnly = action.category === 'iaq' || action.category === 'product';
  return {
    co2SavedKg: isIaqOnly ? ZERO_CO2 : DEFAULT_NON_IAQ_SAVINGS,
    formula: action.whyItWorks || 'Evidence-based household exposure / emissions practice',
    sources: ['Curated action & evidence registry (see Methodology)'],
    assumptions: ['Applies consistently across household daily routine'],
  };
}

/**
 * Normalize raw profile inputs with conservative fallbacks for action formula evaluators.
 * @param {Object} profile - Flattened household profile.
 * @returns {Object} Normalized numeric and categorical context.
 */
export function buildActionContext(profile) {
  return {
    km:
      Number(resolveWithFallback(profile.commuteKm, CONSERVATIVE_UNKNOWNS.commuteKm)) ||
      IMPACT_FACTORS.DEFAULT_FALLBACK_KM,
    days:
      Number(resolveWithFallback(profile.commuteDays, CONSERVATIVE_UNKNOWNS.commuteDays)) ||
      IMPACT_FACTORS.DEFAULT_FALLBACK_DAYS,
    monthlyKwh:
      Number(resolveWithFallback(profile.monthlyKwh, CONSERVATIVE_UNKNOWNS.monthlyKwh)) ||
      IMPACT_FACTORS.DEFAULT_FALLBACK_KWH,
    members:
      Number(resolveWithFallback(profile.householdSize, CONSERVATIVE_UNKNOWNS.householdSize)) ||
      IMPACT_FACTORS.DEFAULT_FALLBACK_MEMBERS,
    commuteMode: resolveWithFallback(profile.commuteMode, CONSERVATIVE_UNKNOWNS.commuteMode),
    cookingFuel: resolveWithFallback(profile.cookingFuel, CONSERVATIVE_UNKNOWNS.cookingFuel),
    diet: resolveWithFallback(profile.diet, CONSERVATIVE_UNKNOWNS.diet),
    wasteHabits: resolveWithFallback(profile.wasteHabits, CONSERVATIVE_UNKNOWNS.wasteHabits),
  };
}

/**
 * Resolve the impact patch for a specific action entry using dispatched or fallback formulas.
 * @param {Object} action - Action entry from `actions.json`.
 * @param {Object} ctx - Normalized context from `buildActionContext`.
 * @param {Array<Object>} factors - Emission factor registry.
 * @returns {Object} Impact patch fields.
 */
export function resolveActionPatch(action, ctx, factors) {
  const handler = ACTION_DISPATCH[action.id];
  return handler ? handler(ctx, factors) : defaultActionPatch(action);
}

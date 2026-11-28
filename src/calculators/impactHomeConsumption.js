/**
 * @fileoverview Per-action impact formulas for kitchen fuel, pressure cooking, diet shifts, and household waste.
 */

import { DEFAULTS, IMPACT_FACTORS, TIME_UNITS } from '@/constants';
import { getFactorById } from '@/utils';

function computeInductionDelta(lpgEm, lpgUsage, grid) {
  const annualLpgKg = lpgUsage.value * TIME_UNITS.MONTHS_PER_YEAR;
  const inductionKwh =
    annualLpgKg *
    DEFAULTS.inductionKwhPerKgLpg *
    (DEFAULTS.gasThermalEfficiency / DEFAULTS.inductionThermalEfficiency);
  const netCentral = Math.max(0, Math.round(annualLpgKg * lpgEm.value - inductionKwh * grid.value));
  const lpgAnnualINR = (annualLpgKg / DEFAULTS.lpgCylinderKg) * DEFAULTS.lpgCylinderPrice;
  const indAnnualINR = inductionKwh * DEFAULTS.electricityRatePerKwh;
  return {
    co2SavedKg: {
      low: Math.max(0, Math.round(annualLpgKg * lpgEm.low - inductionKwh * grid.high)),
      central: netCentral > 0 ? netCentral : IMPACT_FACTORS.INDUCTION_NET_CO2_FLOOR_KG,
      high: Math.max(
        IMPACT_FACTORS.INDUCTION_HIGH_CO2_FLOOR_KG,
        Math.round(
          annualLpgKg * lpgEm.high -
            inductionKwh * grid.low * IMPACT_FACTORS.INDUCTION_GRID_LOW_SENSITIVITY
        )
      ),
    },
    moneySavedINR: Math.max(
      0,
      Math.round((lpgAnnualINR - indAnnualINR) * IMPACT_FACTORS.INDUCTION_COST_SPLIT_FACTOR)
    ),
  };
}

/**
 * Compute net CO₂e, kitchen air quality gain, and cost difference for switching cooking to induction.
 * @param {Object} ctx - Normalized household context.
 * @param {Array<Object>} factors - Emission factor entries.
 * @returns {Object} Impact patch for switch_to_induction.
 */
export function impactInduction(ctx, factors) {
  const lpgEm = getFactorById(factors, 'lpg_cooking');
  const lpgUsage = getFactorById(factors, 'lpg_monthly_kg');
  const grid = getFactorById(factors, 'grid_electricity_india');
  const base = {
    exposureChange: 'Eliminates kitchen gas combustion NO2 & cuts cooking PM2.5 by 50–70%',
    formula: 'Partial LPG combustion avoided − equivalent grid electricity for induction',
    inputs: { cookingFuel: ctx.cookingFuel },
    assumptions: [
      'Thermal efficiency 85% (induction) vs 40% (gas)',
      'Requires flat ferromagnetic cookware',
    ],
  };
  if (!lpgEm || !lpgUsage || !grid || ctx.cookingFuel === 'induction') return base;
  return {
    ...base,
    ...computeInductionDelta(lpgEm, lpgUsage, grid),
    sources: [
      `${lpgEm.source} (${lpgEm.year})`,
      `${grid.source} (${grid.year})`,
      'Kashtan et al. (2023)',
    ],
  };
}

/**
 * Compute CO₂e and LPG cylinder savings from routine pressure cooking.
 * @param {Object} ctx - Normalized household context.
 * @param {Array<Object>} factors - Emission factor entries.
 * @returns {Object} Impact patch for pressure_cooking.
 */
export function impactPressureCooking(ctx, factors) {
  const lpgEm = getFactorById(factors, 'lpg_cooking');
  const lpgUsage = getFactorById(factors, 'lpg_monthly_kg');
  if (!lpgEm || !lpgUsage) return {};
  const annualKgSaved =
    lpgUsage.value * TIME_UNITS.MONTHS_PER_YEAR * DEFAULTS.pressureCookerFuelSavingRatio;
  return {
    co2SavedKg: {
      low: Math.round(annualKgSaved * lpgEm.low * IMPACT_FACTORS.PRESSURE_LOW_MULTIPLIER),
      central: Math.round(annualKgSaved * lpgEm.value),
      high: Math.round(annualKgSaved * lpgEm.high * IMPACT_FACTORS.PRESSURE_HIGH_MULTIPLIER),
    },
    moneySavedINR: Math.round((annualKgSaved / DEFAULTS.lpgCylinderKg) * DEFAULTS.lpgCylinderPrice),
    exposureChange: 'Halves stove-on time for staples, lowering kitchen PM2.5 & NO2 build-up',
    formula: '20% household cooking fuel reduction × fuel factor',
    inputs: { cookingFuel: ctx.cookingFuel },
    sources: [`${lpgEm.source}`, 'Pohekar & Ramachandran (2006)'],
    assumptions: [
      'Used for dals, rice, and stews (~40% of cooking load, saving 50% fuel on those dishes)',
    ],
  };
}

/**
 * Compute CO₂e and grocery savings from shifting meat-heavy meals toward plant-based options.
 * @param {Object} ctx - Normalized household context.
 * @param {Array<Object>} factors - Emission factor entries.
 * @returns {Object} Impact patch for plant_forward_meals.
 */
export function impactDietShift(ctx, factors) {
  const currentF = getFactorById(factors, `diet_${ctx.diet}`);
  const vegF = getFactorById(factors, 'diet_vegetarian');
  if (!currentF || !vegF || ctx.diet === 'vegetarian' || ctx.diet === 'vegan') return {};
  return {
    co2SavedKg: {
      low: Math.max(
        0,
        Math.round((currentF.low - vegF.high) * DEFAULTS.plantForwardMealShiftRatio * ctx.members)
      ),
      central: Math.max(
        0,
        Math.round(
          (currentF.value - vegF.value) * DEFAULTS.plantForwardMealShiftRatio * ctx.members
        )
      ),
      high: Math.max(
        0,
        Math.round((currentF.high - vegF.low) * DEFAULTS.plantForwardMealShiftRatio * ctx.members)
      ),
    },
    moneySavedINR: Math.round(DEFAULTS.plantForwardAnnualSavingsPerMemberINR * ctx.members),
    formula: '(Current diet factor − vegetarian factor) × 30% meal shift × household size',
    inputs: { diet: ctx.diet, members: ctx.members },
    sources: [`${currentF.source} (${currentF.year})`],
    assumptions: ['Shifting 2–3 meat-heavy meals/week to plant-based meals'],
  };
}

/**
 * Compute CO₂e and optional fertilizer/savings delta for upgrading household waste segregation or composting.
 * @param {Object} ctx - Normalized household context.
 * @param {Array<Object>} factors - Emission factor entries.
 * @param {string} targetId - Target waste factor ID.
 * @param {number} [annualSavings=0] - Annual savings in INR.
 * @returns {Object} Impact patch for waste segregation / composting actions.
 */
export function impactWasteChange(ctx, factors, targetId, annualSavings = 0) {
  const curr = getFactorById(factors, `waste_${ctx.wasteHabits}`);
  const target = getFactorById(factors, targetId);
  if (!curr || !target) return {};
  return {
    co2SavedKg: {
      low: Math.max(0, curr.low - target.high),
      central: Math.max(0, curr.value - target.value),
      high: Math.max(0, curr.high - target.low),
    },
    moneySavedINR: annualSavings,
    formula: 'Current waste factor − improved waste factor',
    inputs: { wasteHabits: ctx.wasteHabits },
    sources: [`${curr.source} (${curr.year})`],
    assumptions: ['Assumes consistent household wet/dry waste separation'],
  };
}

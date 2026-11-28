/**
 * @fileoverview Pure annual household carbon footprint calculator with low/central/high ranges.
 */

import { DEFAULTS, CONSERVATIVE_UNKNOWNS, TIME_UNITS } from '../constants/index.js';
import { resolveWithFallback, getFactorById } from '../utils/resolve.js';

const ZERO_RANGE = { low: 0, central: 0, high: 0 };

const TRANSPORT_FACTOR_IDS = {
  two_wheeler: 'two_wheeler_petrol',
  car: 'car_petrol',
  car_petrol: 'car_petrol',
  car_diesel: 'car_diesel',
  bus: 'bus_public',
  metro: 'metro_rail',
  ev_two_wheeler: 'ev_two_wheeler',
  other: 'two_wheeler_petrol',
};

const COOKING_FACTOR_PAIRS = {
  lpg: { usageId: 'lpg_monthly_kg', emissionId: 'lpg_cooking' },
  other: { usageId: 'lpg_monthly_kg', emissionId: 'lpg_cooking' },
  png: { usageId: 'png_monthly_m3', emissionId: 'png_cooking' },
};

const DIET_FACTOR_IDS = {
  non_vegetarian: 'diet_non_vegetarian',
  eggetarian: 'diet_eggetarian',
  vegetarian: 'diet_vegetarian',
  vegan: 'diet_vegan',
  other: 'diet_vegetarian',
};

const WASTE_FACTOR_IDS = {
  no_segregation: 'waste_no_segregation',
  basic_segregation: 'waste_basic_segregation',
  composting: 'waste_composting',
  other: 'waste_basic_segregation',
};

function scaleFactorRange(factor, multiplier) {
  if (!factor) return ZERO_RANGE;
  return {
    low: Math.round(multiplier * factor.low),
    central: Math.round(multiplier * factor.value),
    high: Math.round(multiplier * factor.high),
  };
}

function calcTransport(profile, factors) {
  const mode = resolveWithFallback(profile.commuteMode, CONSERVATIVE_UNKNOWNS.commuteMode);
  if (mode === 'wfh' || mode === 'walk' || mode === 'bicycle') return ZERO_RANGE;

  const km = Number(resolveWithFallback(profile.commuteKm, CONSERVATIVE_UNKNOWNS.commuteKm)) || 0;
  const days =
    Number(resolveWithFallback(profile.commuteDays, CONSERVATIVE_UNKNOWNS.commuteDays)) || 0;
  const annualKm = Math.max(0, km) * 2 * Math.max(0, days) * DEFAULTS.weeksPerYear;
  const factor = getFactorById(factors, TRANSPORT_FACTOR_IDS[mode] || 'two_wheeler_petrol');
  return scaleFactorRange(factor, annualKm);
}

function calcElectricity(profile, factors) {
  const monthlyKwh = Math.max(
    0,
    Number(resolveWithFallback(profile.monthlyKwh, CONSERVATIVE_UNKNOWNS.monthlyKwh)) || 0
  );
  const annualKwh = monthlyKwh * TIME_UNITS.MONTHS_PER_YEAR;
  return scaleFactorRange(getFactorById(factors, 'grid_electricity_india'), annualKwh);
}

function calcCooking(profile, factors) {
  const fuel = resolveWithFallback(profile.cookingFuel, CONSERVATIVE_UNKNOWNS.cookingFuel);
  if (fuel === 'induction' || fuel === 'electric') return ZERO_RANGE;

  const pair = COOKING_FACTOR_PAIRS[fuel];
  if (pair) {
    const usage = getFactorById(factors, pair.usageId);
    const emission = getFactorById(factors, pair.emissionId);
    if (!usage || !emission) return ZERO_RANGE;
    return scaleFactorRange(emission, usage.value * TIME_UNITS.MONTHS_PER_YEAR);
  }
  if (fuel === 'biomass') {
    const emission = getFactorById(factors, 'biomass_cooking');
    return scaleFactorRange(emission, DEFAULTS.biomassDailyKg * DEFAULTS.daysPerYear);
  }
  return ZERO_RANGE;
}

function calcDiet(profile, factors) {
  const diet = resolveWithFallback(profile.diet, CONSERVATIVE_UNKNOWNS.diet);
  const members = Math.max(
    1,
    Number(resolveWithFallback(profile.householdSize, CONSERVATIVE_UNKNOWNS.householdSize)) || 1
  );
  const factor = getFactorById(factors, DIET_FACTOR_IDS[diet] || 'diet_vegetarian');
  return scaleFactorRange(factor, members);
}

function calcWaste(profile, factors) {
  const habits = resolveWithFallback(profile.wasteHabits, CONSERVATIVE_UNKNOWNS.wasteHabits);
  const factor = getFactorById(factors, WASTE_FACTOR_IDS[habits] || 'waste_no_segregation');
  if (!factor) return ZERO_RANGE;
  return { low: factor.low, central: factor.value, high: factor.high };
}

/**
 * Calculate annual household carbon footprint across 5 categories with low/central/high ranges.
 * @param {Object} [profile={}] - Household wizard profile.
 * @param {Array<Object>} [factors=[]] - Factor registry from `factors.json`.
 * @returns {Object} Category and total footprint ranges (kg CO₂e/year).
 */
export function calculateFootprint(profile = {}, factors = []) {
  const transport = calcTransport(profile, factors);
  const electricity = calcElectricity(profile, factors);
  const cooking = calcCooking(profile, factors);
  const diet = calcDiet(profile, factors);
  const waste = calcWaste(profile, factors);

  const total = {
    low: transport.low + electricity.low + cooking.low + diet.low + waste.low,
    central:
      transport.central + electricity.central + cooking.central + diet.central + waste.central,
    high: transport.high + electricity.high + cooking.high + diet.high + waste.high,
  };
  return { transport, electricity, cooking, diet, waste, total };
}

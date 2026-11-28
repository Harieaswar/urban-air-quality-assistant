/**
 * @fileoverview Pure annual household carbon footprint calculator with low/central/high ranges.
 */

import { DEFAULTS, CONSERVATIVE_UNKNOWNS } from '../constants/index.js';
import { resolveWithFallback, getFactorById } from '../utils/resolve.js';

const MONTHS_PER_YEAR = 12;

function calcTransport(profile, factors) {
  const mode = resolveWithFallback(profile.commuteMode, CONSERVATIVE_UNKNOWNS.commuteMode);
  if (mode === 'wfh' || mode === 'walk' || mode === 'bicycle')
    return { low: 0, central: 0, high: 0 };

  const km = Number(resolveWithFallback(profile.commuteKm, CONSERVATIVE_UNKNOWNS.commuteKm)) || 0;
  const days =
    Number(resolveWithFallback(profile.commuteDays, CONSERVATIVE_UNKNOWNS.commuteDays)) || 0;
  const annualKm = Math.max(0, km) * 2 * Math.max(0, days) * DEFAULTS.weeksPerYear;

  const modeFactorMap = {
    two_wheeler: 'two_wheeler_petrol',
    car: 'car_petrol',
    car_petrol: 'car_petrol',
    car_diesel: 'car_diesel',
    bus: 'bus_public',
    metro: 'metro_rail',
    ev_two_wheeler: 'ev_two_wheeler',
    other: 'two_wheeler_petrol',
  };
  const factor = getFactorById(factors, modeFactorMap[mode] || 'two_wheeler_petrol');
  if (!factor) return { low: 0, central: 0, high: 0 };
  return {
    low: Math.round(annualKm * factor.low),
    central: Math.round(annualKm * factor.value),
    high: Math.round(annualKm * factor.high),
  };
}

function calcElectricity(profile, factors) {
  const monthlyKwh = Math.max(
    0,
    Number(resolveWithFallback(profile.monthlyKwh, CONSERVATIVE_UNKNOWNS.monthlyKwh)) || 0
  );
  const annualKwh = monthlyKwh * MONTHS_PER_YEAR;
  const gridFactor = getFactorById(factors, 'grid_electricity_india');
  if (!gridFactor) return { low: 0, central: 0, high: 0 };
  return {
    low: Math.round(annualKwh * gridFactor.low),
    central: Math.round(annualKwh * gridFactor.value),
    high: Math.round(annualKwh * gridFactor.high),
  };
}

function calcCooking(profile, factors) {
  const fuel = resolveWithFallback(profile.cookingFuel, CONSERVATIVE_UNKNOWNS.cookingFuel);
  if (fuel === 'induction' || fuel === 'electric') return { low: 0, central: 0, high: 0 };
  if (fuel === 'lpg' || fuel === 'other') {
    const usage = getFactorById(factors, 'lpg_monthly_kg');
    const em = getFactorById(factors, 'lpg_cooking');
    if (!usage || !em) return { low: 0, central: 0, high: 0 };
    return {
      low: Math.round(usage.value * MONTHS_PER_YEAR * em.low),
      central: Math.round(usage.value * MONTHS_PER_YEAR * em.value),
      high: Math.round(usage.value * MONTHS_PER_YEAR * em.high),
    };
  }
  if (fuel === 'png') {
    const usage = getFactorById(factors, 'png_monthly_m3');
    const em = getFactorById(factors, 'png_cooking');
    if (!usage || !em) return { low: 0, central: 0, high: 0 };
    return {
      low: Math.round(usage.value * MONTHS_PER_YEAR * em.low),
      central: Math.round(usage.value * MONTHS_PER_YEAR * em.value),
      high: Math.round(usage.value * MONTHS_PER_YEAR * em.high),
    };
  }
  if (fuel === 'biomass') {
    const em = getFactorById(factors, 'biomass_cooking');
    if (!em) return { low: 0, central: 0, high: 0 };
    const annualKg = DEFAULTS.biomassDailyKg * DEFAULTS.daysPerYear;
    return {
      low: Math.round(annualKg * em.low),
      central: Math.round(annualKg * em.value),
      high: Math.round(annualKg * em.high),
    };
  }
  return { low: 0, central: 0, high: 0 };
}

function calcDiet(profile, factors) {
  const diet = resolveWithFallback(profile.diet, CONSERVATIVE_UNKNOWNS.diet);
  const members = Math.max(
    1,
    Number(resolveWithFallback(profile.householdSize, CONSERVATIVE_UNKNOWNS.householdSize)) || 1
  );
  const map = {
    non_vegetarian: 'diet_non_vegetarian',
    eggetarian: 'diet_eggetarian',
    vegetarian: 'diet_vegetarian',
    vegan: 'diet_vegan',
    other: 'diet_vegetarian',
  };
  const factor = getFactorById(factors, map[diet] || 'diet_vegetarian');
  if (!factor) return { low: 0, central: 0, high: 0 };
  return {
    low: Math.round(factor.low * members),
    central: Math.round(factor.value * members),
    high: Math.round(factor.high * members),
  };
}

function calcWaste(profile, factors) {
  const habits = resolveWithFallback(profile.wasteHabits, CONSERVATIVE_UNKNOWNS.wasteHabits);
  const map = {
    no_segregation: 'waste_no_segregation',
    basic_segregation: 'waste_basic_segregation',
    composting: 'waste_composting',
    other: 'waste_basic_segregation',
  };
  const factor = getFactorById(factors, map[habits] || 'waste_no_segregation');
  if (!factor) return { low: 0, central: 0, high: 0 };
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

/**
 * @fileoverview Per-action impact formulas for transport, energy, cooking, diet, waste, and IAQ.
 */

import { DEFAULTS } from '../data/constants.js';
import { getFactorById } from '../utils/resolve.js';

const MONTHS_PER_YEAR = 12;

export function impactMetro(ctx, factors) {
  const annualKm = ctx.km * 2 * ctx.days * DEFAULTS.weeksPerYear;
  const fId =
    ctx.commuteMode === 'car' || ctx.commuteMode === 'car_petrol'
      ? 'car_petrol'
      : ctx.commuteMode === 'car_diesel'
        ? 'car_diesel'
        : 'two_wheeler_petrol';
  const curr = getFactorById(factors, fId);
  const metro = getFactorById(factors, 'metro_rail');
  if (!curr || !metro) return {};
  const kmPerL = fId.startsWith('car') ? DEFAULTS.carKmPerLitre : DEFAULTS.twoWheelerKmPerLitre;
  const fuelSaving = Math.round((annualKm / kmPerL) * DEFAULTS.petrolRatePerLitre);
  const metroFare = Math.round(ctx.days * DEFAULTS.weeksPerYear * DEFAULTS.metroReturnFareINR);
  return {
    co2SavedKg: {
      low: Math.max(0, Math.round(annualKm * (curr.low - metro.high))),
      central: Math.max(0, Math.round(annualKm * (curr.value - metro.value))),
      high: Math.max(0, Math.round(annualKm * (curr.high - metro.low))),
    },
    moneySavedINR: Math.max(0, fuelSaving - metroFare),
    exposureChange: 'Lower roadside exhaust dose if metro stations replace open two-wheeler rides',
    formula: 'Annual km × (current factor − metro factor)',
    inputs: { commuteKm: ctx.km, commuteDays: ctx.days, commuteMode: ctx.commuteMode, annualKm },
    sources: [`${curr.source} (${curr.version}, ${curr.year})`],
    assumptions: [
      'Assumes metro corridor covers commute',
      `Includes ~₹${DEFAULTS.metroReturnFareINR}/day metro fare offset vs fuel`,
    ],
  };
}

export function impactCarpool(ctx, factors) {
  const annualKm = ctx.km * 2 * ctx.days * DEFAULTS.weeksPerYear;
  const factor = getFactorById(factors, 'car_petrol');
  if (!factor) return {};
  return {
    co2SavedKg: {
      low: Math.round(annualKm * factor.low * 0.5),
      central: Math.round(annualKm * factor.value * 0.67),
      high: Math.round(annualKm * factor.high * 0.75),
    },
    moneySavedINR: Math.round(
      (annualKm / DEFAULTS.carKmPerLitre) * DEFAULTS.petrolRatePerLitre * 0.67
    ),
    exposureChange: 'Reduces urban corridor tailpipe contribution',
    formula: 'Annual km × car factor × (1 − 1/3 occupants)',
    inputs: { commuteKm: ctx.km, commuteDays: ctx.days },
    sources: [`${factor.source} (${factor.year})`],
    assumptions: ['3-person carpool assumed with minimal detour'],
  };
}

export function impactWfh(ctx, factors) {
  const annualKmSaved = ctx.km * 2 * Math.min(2, ctx.days) * DEFAULTS.weeksPerYear;
  const fId =
    ctx.commuteMode === 'car' || ctx.commuteMode === 'car_petrol'
      ? 'car_petrol'
      : ctx.commuteMode === 'bus'
        ? 'bus_public'
        : 'two_wheeler_petrol';
  const factor = getFactorById(factors, fId);
  if (!factor || ['wfh', 'walk', 'bicycle'].includes(ctx.commuteMode))
    return { formula: 'Skipped for zero-commute mode' };
  const kmPerL = fId.startsWith('car') ? DEFAULTS.carKmPerLitre : DEFAULTS.twoWheelerKmPerLitre;
  return {
    co2SavedKg: {
      low: Math.round(annualKmSaved * factor.low),
      central: Math.round(annualKmSaved * factor.value),
      high: Math.round(annualKmSaved * factor.high),
    },
    moneySavedINR:
      ctx.commuteMode === 'bus'
        ? 0
        : Math.round((annualKmSaved / kmPerL) * DEFAULTS.petrolRatePerLitre),
    exposureChange: 'Eliminates traffic-corridor PM2.5 inhalation on 1–2 high-smog days/week',
    formula: 'Saved annual commute km (2 days/wk) × mode factor',
    inputs: { commuteKm: ctx.km, commuteMode: ctx.commuteMode, wfhDays: Math.min(2, ctx.days) },
    sources: [`${factor.source} (${factor.year})`],
    assumptions: ['Replaces up to 2 commute days/week during smog episodes'],
  };
}

export function impactAcSetpoint(ctx, factors) {
  const annualSavingKwh =
    ctx.monthlyKwh *
    DEFAULTS.acElectricityShare *
    DEFAULTS.acSetpointSavingsRatio *
    DEFAULTS.acCoolingMonthsPerYear;
  const grid = getFactorById(factors, 'grid_electricity_india');
  if (!grid) return {};
  return {
    co2SavedKg: {
      low: Math.round(annualSavingKwh * grid.low),
      central: Math.round(annualSavingKwh * grid.value),
      high: Math.round(annualSavingKwh * grid.high),
    },
    moneySavedINR: Math.round(annualSavingKwh * DEFAULTS.electricityRatePerKwh),
    exposureChange: 'Recirculation keeps outdoor smog out while lowering grid coal demand',
    formula: 'Monthly kWh × 40% AC share × 24% saving × 6 months × grid factor',
    inputs: { monthlyKwh: ctx.monthlyKwh },
    sources: [`${grid.source} (${grid.version}, ${grid.year})`, 'BEE India (6% per °C)'],
    assumptions: [
      '6% electricity reduction per °C from 22°C to 26°C (BEE India)',
      '6 cooling months/year',
    ],
  };
}

export function impactLedSwitch(_ctx, factors) {
  const bulbs = DEFAULTS.ledBulbsReplacedDefault;
  const saving = getFactorById(factors, 'led_vs_cfl_saving_per_bulb');
  const grid = getFactorById(factors, 'grid_electricity_india');
  if (!saving || !grid) return {};
  return {
    co2SavedKg: {
      low: Math.round(bulbs * saving.low * grid.low),
      central: Math.round(bulbs * saving.value * grid.value),
      high: Math.round(bulbs * saving.high * grid.high),
    },
    moneySavedINR: Math.round(bulbs * saving.value * DEFAULTS.electricityRatePerKwh),
    formula: `${bulbs} bulbs × ${saving.value} kWh/bulb/yr × ${grid.value} kgCO₂e/kWh`,
    inputs: { bulbsReplaced: bulbs },
    sources: [`${saving.source} (${saving.year})`, `${grid.source} (${grid.year})`],
    assumptions: [`Assumes ${bulbs} remaining CFL/incandescent fixtures replaced with LEDs`],
  };
}

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
  const annualLpgKg = lpgUsage.value * MONTHS_PER_YEAR;
  const inductionKwh =
    annualLpgKg *
    DEFAULTS.inductionKwhPerKgLpg *
    (DEFAULTS.gasThermalEfficiency / DEFAULTS.inductionThermalEfficiency);
  const netCentral = Math.max(0, Math.round(annualLpgKg * lpgEm.value - inductionKwh * grid.value));
  const lpgAnnualINR = (annualLpgKg / DEFAULTS.lpgCylinderKg) * DEFAULTS.lpgCylinderPrice;
  const indAnnualINR = inductionKwh * DEFAULTS.electricityRatePerKwh;
  return {
    ...base,
    co2SavedKg: {
      low: Math.max(0, Math.round(annualLpgKg * lpgEm.low - inductionKwh * grid.high)),
      central: netCentral > 0 ? netCentral : 45,
      high: Math.max(60, Math.round(annualLpgKg * lpgEm.high - inductionKwh * grid.low * 0.7)),
    },
    moneySavedINR: Math.max(0, Math.round((lpgAnnualINR - indAnnualINR) * 0.5)),
    sources: [
      `${lpgEm.source} (${lpgEm.year})`,
      `${grid.source} (${grid.year})`,
      'Kashtan et al. (2023)',
    ],
  };
}

export function impactPressureCooking(ctx, factors) {
  const lpgEm = getFactorById(factors, 'lpg_cooking');
  const lpgUsage = getFactorById(factors, 'lpg_monthly_kg');
  if (!lpgEm || !lpgUsage) return {};
  const annualKgSaved = lpgUsage.value * MONTHS_PER_YEAR * DEFAULTS.pressureCookerFuelSavingRatio;
  return {
    co2SavedKg: {
      low: Math.round(annualKgSaved * lpgEm.low * 0.7),
      central: Math.round(annualKgSaved * lpgEm.value),
      high: Math.round(annualKgSaved * lpgEm.high * 1.3),
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

export function impactSolarWaterHeater(_ctx, factors) {
  const grid = getFactorById(factors, 'grid_electricity_india');
  const geyser = getFactorById(factors, 'geyser');
  if (!grid || !geyser) return {};
  const kwhSaved = Math.round(geyser.value * DEFAULTS.solarHeaterOffsetRatio);
  return {
    co2SavedKg: {
      low: Math.round(geyser.low * 0.8 * grid.low),
      central: Math.round(kwhSaved * grid.value),
      high: Math.round(geyser.high * 0.9 * grid.high),
    },
    moneySavedINR: Math.round(kwhSaved * DEFAULTS.electricityRatePerKwh),
    formula: '85% of electric geyser kWh × grid factor',
    sources: [`${geyser.source} (${geyser.year})`, `${grid.source} (${grid.year})`],
    assumptions: ['Owner-occupied roof access with adequate sunlight'],
  };
}

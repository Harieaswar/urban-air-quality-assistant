/**
 * @fileoverview Per-action impact formulas for mobility (metro, carpool, WFH) and household electricity (AC, LED, solar).
 */

import { DEFAULTS, IMPACT_FACTORS } from '@/constants';
import { getFactorById } from '@/utils';

const METRO_MODE_FACTOR = {
  car: 'car_petrol',
  car_petrol: 'car_petrol',
  car_diesel: 'car_diesel',
};

const WFH_MODE_FACTOR = {
  car: 'car_petrol',
  car_petrol: 'car_petrol',
  bus: 'bus_public',
};

/**
 * Compute CO₂e, fuel/fare savings, and formula metadata for switching commute to metro.
 * @param {Object} ctx - Normalized household context.
 * @param {Array<Object>} factors - Emission factor entries.
 * @returns {Object} Impact patch for switch_to_metro.
 */
export function impactMetro(ctx, factors) {
  const annualKm = ctx.km * 2 * ctx.days * DEFAULTS.weeksPerYear;
  const fId = METRO_MODE_FACTOR[ctx.commuteMode] || 'two_wheeler_petrol';
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

/**
 * Compute CO₂e and fuel savings for 3-person carpooling.
 * @param {Object} ctx - Normalized household context.
 * @param {Array<Object>} factors - Emission factor entries.
 * @returns {Object} Impact patch for carpool.
 */
export function impactCarpool(ctx, factors) {
  const annualKm = ctx.km * 2 * ctx.days * DEFAULTS.weeksPerYear;
  const factor = getFactorById(factors, 'car_petrol');
  if (!factor) return {};
  return {
    co2SavedKg: {
      low: Math.round(annualKm * factor.low * IMPACT_FACTORS.CARPOOL_LOW_SHARE),
      central: Math.round(annualKm * factor.value * IMPACT_FACTORS.CARPOOL_CENTRAL_SHARE),
      high: Math.round(annualKm * factor.high * IMPACT_FACTORS.CARPOOL_HIGH_SHARE),
    },
    moneySavedINR: Math.round(
      (annualKm / DEFAULTS.carKmPerLitre) *
        DEFAULTS.petrolRatePerLitre *
        IMPACT_FACTORS.CARPOOL_CENTRAL_SHARE
    ),
    exposureChange: 'Reduces urban corridor tailpipe contribution',
    formula: 'Annual km × car factor × (1 − 1/3 occupants)',
    inputs: { commuteKm: ctx.km, commuteDays: ctx.days },
    sources: [`${factor.source} (${factor.year})`],
    assumptions: ['3-person carpool assumed with minimal detour'],
  };
}

/**
 * Compute CO₂e and fuel savings from working from home during high-smog commute days.
 * @param {Object} ctx - Normalized household context.
 * @param {Array<Object>} factors - Emission factor entries.
 * @returns {Object} Impact patch for wfh_days.
 */
export function impactWfh(ctx, factors) {
  const wfhDays = Math.min(2, ctx.days);
  const annualKmSaved = ctx.km * 2 * wfhDays * DEFAULTS.weeksPerYear;
  const fId = WFH_MODE_FACTOR[ctx.commuteMode] || 'two_wheeler_petrol';
  const factor = getFactorById(factors, fId);
  if (!factor || ['wfh', 'walk', 'bicycle'].includes(ctx.commuteMode)) {
    return { formula: 'Skipped for zero-commute mode' };
  }
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
    inputs: { commuteKm: ctx.km, commuteMode: ctx.commuteMode, wfhDays },
    sources: [`${factor.source} (${factor.year})`],
    assumptions: ['Replaces up to 2 commute days/week during smog episodes'],
  };
}

/**
 * Compute electricity CO₂e and bill savings from setting AC to 26°C.
 * @param {Object} ctx - Normalized household context.
 * @param {Array<Object>} factors - Emission factor entries.
 * @returns {Object} Impact patch for ac_setpoint_26.
 */
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

/**
 * Compute annual electricity CO₂e and bill savings from switching CFL/incandescent bulbs to LEDs.
 * @param {Object} _ctx - Unused household context.
 * @param {Array<Object>} factors - Emission factor entries.
 * @returns {Object} Impact patch for led_switch.
 */
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

/**
 * Compute CO₂e and bill savings from replacing an electric geyser with a solar water heater.
 * @param {Object} _ctx - Unused household context.
 * @param {Array<Object>} factors - Emission factor entries.
 * @returns {Object} Impact patch for solar_water_heater.
 */
export function impactSolarWaterHeater(_ctx, factors) {
  const grid = getFactorById(factors, 'grid_electricity_india');
  const geyser = getFactorById(factors, 'geyser');
  if (!grid || !geyser) return {};
  const kwhSaved = Math.round(geyser.value * DEFAULTS.solarHeaterOffsetRatio);
  return {
    co2SavedKg: {
      low: Math.round(geyser.low * IMPACT_FACTORS.SOLAR_LOW_OFFSET_RATIO * grid.low),
      central: Math.round(kwhSaved * grid.value),
      high: Math.round(geyser.high * IMPACT_FACTORS.SOLAR_HIGH_OFFSET_RATIO * grid.high),
    },
    moneySavedINR: Math.round(kwhSaved * DEFAULTS.electricityRatePerKwh),
    formula: '85% of electric geyser kWh × grid factor',
    sources: [`${geyser.source} (${geyser.year})`, `${grid.source} (${grid.year})`],
    assumptions: ['Owner-occupied roof access with adequate sunlight'],
  };
}

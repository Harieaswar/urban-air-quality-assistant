/**
 * Impact & Payback Calculator — SmogGuard
 * Computes personal exposure effect, annual CO₂e savings (with low/high uncertainty),
 * annual INR savings, payback period, formula, inputs, factor sources, and overlap guard.
 */

import { DEFAULTS, CONSERVATIVE_UNKNOWNS } from '../data/constants.js';

function getFactor(factors, id) {
  return factors.find((f) => f.id === id) || null;
}

function resolve(val, fallback) {
  return val == null || val === '' || val === 'unknown' ? fallback : val;
}

/**
 * Compute payback period in years/months from typical upfront INR cost and annual INR savings.
 */
export function computePayback(upfrontCostINR, annualSavingsINR) {
  const upfront = Number(upfrontCostINR?.typical ?? upfrontCostINR ?? 0);
  const annual = Number(annualSavingsINR ?? 0);
  if (upfront <= 0) {
    return { years: 0, label: 'Immediate (₹0 upfront)' };
  }
  if (annual <= 0) {
    return { years: null, label: 'Air/health benefit (no direct bill payback)' };
  }
  const years = Math.round((upfront / annual) * 10) / 10;
  if (years < 1) {
    const months = Math.max(1, Math.round(years * 12));
    return { years, label: `~${months} month${months > 1 ? 's' : ''}` };
  }
  return { years, label: `~${years} year${years > 1 ? 's' : ''}` };
}

/**
 * Calculate impact card details for an action tailored to user profile.
 */
export function calculateActionImpact(action, profile = {}, factors = []) {
  const km = Number(resolve(profile.commuteKm, CONSERVATIVE_UNKNOWNS.commuteKm)) || 10;
  const days = Number(resolve(profile.commuteDays, CONSERVATIVE_UNKNOWNS.commuteDays)) || 5;
  const monthlyKwh = Number(resolve(profile.monthlyKwh, CONSERVATIVE_UNKNOWNS.monthlyKwh)) || 200;
  const members = Number(resolve(profile.householdSize, CONSERVATIVE_UNKNOWNS.householdSize)) || 3;
  const commuteMode = resolve(profile.commuteMode, CONSERVATIVE_UNKNOWNS.commuteMode);
  const cookingFuel = resolve(profile.cookingFuel, CONSERVATIVE_UNKNOWNS.cookingFuel);
  const diet = resolve(profile.diet, CONSERVATIVE_UNKNOWNS.diet);
  const wasteHabits = resolve(profile.wasteHabits, CONSERVATIVE_UNKNOWNS.wasteHabits);

  const upfrontCost = action.upfrontCostINR || { min: 0, max: 0, typical: 0 };

  const result = {
    co2SavedKg: { low: 0, central: 0, high: 0 },
    moneySavedINR: 0,
    moneyRangeINR: { low: 0, central: 0, high: 0 },
    upfrontCostINR: upfrontCost,
    payback: { years: 0, label: 'Immediate (₹0 upfront)' },
    exposureChange: action.effectRange || 'Maintains cleaner indoor routine',
    formula: '',
    inputs: {},
    sources: [],
    assumptions: [],
    confidence: action.evidence || 'moderate',
  };

  switch (action.id) {
    case 'switch_to_metro': {
      const annualKm = km * 2 * days * 52;
      const factorId = commuteMode === 'car' || commuteMode === 'car_petrol' ? 'car_petrol' : commuteMode === 'car_diesel' ? 'car_diesel' : 'two_wheeler_petrol';
      const currentFactor = getFactor(factors, factorId);
      const metroFactor = getFactor(factors, 'metro_rail');
      if (currentFactor && metroFactor) {
        result.co2SavedKg = {
          low: Math.max(0, Math.round(annualKm * (currentFactor.low - metroFactor.high))),
          central: Math.max(0, Math.round(annualKm * (currentFactor.value - metroFactor.value))),
          high: Math.max(0, Math.round(annualKm * (currentFactor.high - metroFactor.low))),
        };
        const kmPerL = factorId.startsWith('car') ? 14 : 42;
        const fuelSaving = Math.round((annualKm / kmPerL) * DEFAULTS.petrolRatePerLitre);
        const metroFare = Math.round(days * 52 * 80); // ~₹80/day return metro pass benchmark
        result.moneySavedINR = Math.max(0, fuelSaving - metroFare);
        result.sources = [`${currentFactor.source} (${currentFactor.version}, ${currentFactor.year})`];
      }
      result.exposureChange = 'Lower roadside exhaust dose if metro stations replace open two-wheeler rides';
      result.formula = 'Annual km × (current factor − metro factor)';
      result.inputs = { commuteKm: km, commuteDays: days, commuteMode, annualKm };
      result.assumptions = ['Assumes metro corridor covers commute', 'Includes ~₹80/day metro fare offset vs fuel'];
      break;
    }

    case 'carpool': {
      const annualKm = km * 2 * days * 52;
      const factor = getFactor(factors, 'car_petrol');
      if (factor) {
        result.co2SavedKg = {
          low: Math.round(annualKm * factor.low * 0.5),
          central: Math.round(annualKm * factor.value * 0.67),
          high: Math.round(annualKm * factor.high * 0.75),
        };
        result.moneySavedINR = Math.round((annualKm / 14) * DEFAULTS.petrolRatePerLitre * 0.67);
        result.sources = [`${factor.source} (${factor.year})`];
      }
      result.exposureChange = 'Reduces urban corridor tailpipe contribution';
      result.formula = 'Annual km × car factor × (1 − 1/3 occupants)';
      result.inputs = { commuteKm: km, commuteDays: days };
      result.assumptions = ['3-person carpool assumed with minimal detour'];
      break;
    }

    case 'wfh_days': {
      const annualKmSaved = km * 2 * Math.min(2, days) * 52;
      const factorId = commuteMode === 'car' ? 'car_petrol' : commuteMode === 'bus' ? 'bus_public' : 'two_wheeler_petrol';
      const factor = getFactor(factors, factorId);
      if (factor && !['wfh', 'walk', 'bicycle'].includes(commuteMode)) {
        result.co2SavedKg = {
          low: Math.round(annualKmSaved * factor.low),
          central: Math.round(annualKmSaved * factor.value),
          high: Math.round(annualKmSaved * factor.high),
        };
        const kmPerL = commuteMode === 'car' ? 14 : 42;
        result.moneySavedINR = commuteMode === 'bus' ? 0 : Math.round((annualKmSaved / kmPerL) * DEFAULTS.petrolRatePerLitre);
        result.sources = [`${factor.source} (${factor.year})`];
      }
      result.exposureChange = 'Eliminates traffic-corridor PM2.5 inhalation on 1–2 high-smog days/week';
      result.formula = 'Saved annual commute km (2 days/wk) × mode factor';
      result.inputs = { commuteKm: km, commuteMode, wfhDays: Math.min(2, days) };
      result.assumptions = ['Replaces up to 2 commute days/week during smog episodes'];
      break;
    }

    case 'ac_setpoint_26': {
      const annualSavingKwh = monthlyKwh * 0.4 * 0.24 * 6;
      const grid = getFactor(factors, 'grid_electricity_india');
      if (grid) {
        result.co2SavedKg = {
          low: Math.round(annualSavingKwh * grid.low),
          central: Math.round(annualSavingKwh * grid.value),
          high: Math.round(annualSavingKwh * grid.high),
        };
        result.sources = [`${grid.source} (${grid.version}, ${grid.year})`, 'BEE India (6% per °C)'];
      }
      result.moneySavedINR = Math.round(annualSavingKwh * DEFAULTS.electricityRatePerKwh);
      result.exposureChange = 'Recirculation keeps outdoor smog out while lowering grid coal demand';
      result.formula = 'Monthly kWh × 40% AC share × 24% saving × 6 months × grid factor';
      result.inputs = { monthlyKwh };
      result.assumptions = ['6% electricity reduction per °C from 22°C to 26°C (BEE India)', '6 cooling months/year'];
      break;
    }

    case 'led_switch': {
      const bulbs = 6;
      const saving = getFactor(factors, 'led_vs_cfl_saving_per_bulb');
      const grid = getFactor(factors, 'grid_electricity_india');
      if (saving && grid) {
        result.co2SavedKg = {
          low: Math.round(bulbs * saving.low * grid.low),
          central: Math.round(bulbs * saving.value * grid.value),
          high: Math.round(bulbs * saving.high * grid.high),
        };
        result.moneySavedINR = Math.round(bulbs * saving.value * DEFAULTS.electricityRatePerKwh);
        result.sources = [`${saving.source} (${saving.year})`, `${grid.source} (${grid.year})`];
      }
      result.formula = '6 bulbs × 30 kWh/bulb/yr × 0.82 kgCO₂e/kWh';
      result.inputs = { bulbsReplaced: bulbs };
      result.assumptions = ['Assumes 6 remaining CFL/incandescent fixtures replaced with LEDs'];
      break;
    }

    case 'switch_to_induction': {
      const lpgEm = getFactor(factors, 'lpg_cooking');
      const lpgUsage = getFactor(factors, 'lpg_monthly_kg');
      const grid = getFactor(factors, 'grid_electricity_india');
      if (lpgEm && lpgUsage && grid && cookingFuel !== 'induction') {
        const annualLpgKg = lpgUsage.value * 12;
        const lpgCo2 = annualLpgKg * lpgEm.value;
        // Induction requires ~55% equivalent delivered kWh due to higher thermal efficiency (85% vs 40%)
        const inductionKwh = annualLpgKg * 12.8 * (0.4 / 0.85);
        const indCo2 = inductionKwh * grid.value;
        const netCentral = Math.max(0, Math.round(lpgCo2 - indCo2));
        // Still yields big indoor PM2.5 + NO2 drop; net CO2e depends on coal grid vs gas
        result.co2SavedKg = {
          low: Math.max(0, Math.round(annualLpgKg * lpgEm.low - inductionKwh * grid.high)),
          central: netCentral > 0 ? netCentral : 45,
          high: Math.max(60, Math.round(annualLpgKg * lpgEm.high - inductionKwh * grid.low * 0.7)),
        };
        const lpgAnnualINR = (annualLpgKg / DEFAULTS.lpgCylinderKg) * DEFAULTS.lpgCylinderPrice;
        const indAnnualINR = inductionKwh * DEFAULTS.electricityRatePerKwh;
        result.moneySavedINR = Math.max(0, Math.round((lpgAnnualINR - indAnnualINR) * 0.5));
        result.sources = [`${lpgEm.source} (${lpgEm.year})`, `${grid.source} (${grid.year})`, 'Kashtan et al. (2023)'];
      }
      result.exposureChange = 'Eliminates kitchen gas combustion NO2 & cuts cooking PM2.5 by 50–70%';
      result.formula = 'Partial LPG combustion avoided − equivalent grid electricity for induction';
      result.inputs = { cookingFuel };
      result.assumptions = ['Thermal efficiency 85% (induction) vs 40% (gas)', 'Requires flat ferromagnetic cookware'];
      break;
    }

    case 'pressure_cooking': {
      const lpgEm = getFactor(factors, 'lpg_cooking');
      const lpgUsage = getFactor(factors, 'lpg_monthly_kg');
      if (lpgEm && lpgUsage) {
        const annualKgSaved = lpgUsage.value * 12 * 0.2;
        result.co2SavedKg = {
          low: Math.round(annualKgSaved * lpgEm.low * 0.7),
          central: Math.round(annualKgSaved * lpgEm.value),
          high: Math.round(annualKgSaved * lpgEm.high * 1.3),
        };
        result.moneySavedINR = Math.round((annualKgSaved / DEFAULTS.lpgCylinderKg) * DEFAULTS.lpgCylinderPrice);
        result.sources = [`${lpgEm.source}`, 'Pohekar & Ramachandran (2006)'];
      }
      result.exposureChange = 'Halves stove-on time for staples, lowering kitchen PM2.5 & NO2 build-up';
      result.formula = '20% household cooking fuel reduction × fuel factor';
      result.inputs = { cookingFuel };
      result.assumptions = ['Used for dals, rice, and stews (~40% of cooking load, saving 50% fuel on those dishes)'];
      break;
    }

    case 'plant_forward_meals': {
      const currentF = getFactor(factors, `diet_${diet}`);
      const vegF = getFactor(factors, 'diet_vegetarian');
      if (currentF && vegF && diet !== 'vegetarian' && diet !== 'vegan') {
        result.co2SavedKg = {
          low: Math.max(0, Math.round((currentF.low - vegF.high) * 0.3 * members)),
          central: Math.max(0, Math.round((currentF.value - vegF.value) * 0.3 * members)),
          high: Math.max(0, Math.round((currentF.high - vegF.low) * 0.3 * members)),
        };
        result.moneySavedINR = Math.round(2400 * members);
        result.sources = [`${currentF.source} (${currentF.year})`];
      }
      result.formula = '(Current diet factor − vegetarian factor) × 30% meal shift × household size';
      result.inputs = { diet, members };
      result.assumptions = ['Shifting 2–3 meat-heavy meals/week to plant-based meals'];
      break;
    }

    case 'waste_segregation': {
      const curr = getFactor(factors, `waste_${wasteHabits}`);
      const target = getFactor(factors, 'waste_basic_segregation');
      if (curr && target && wasteHabits === 'no_segregation') {
        result.co2SavedKg = {
          low: Math.max(0, curr.low - target.high),
          central: Math.max(0, curr.value - target.value),
          high: Math.max(0, curr.high - target.low),
        };
        result.sources = [`${curr.source} (${curr.year})`];
      }
      result.formula = 'Unsorted waste factor − source-segregated factor';
      result.inputs = { wasteHabits };
      result.assumptions = ['Assumes municipal dry/wet waste collection'];
      break;
    }

    case 'home_composting': {
      const curr = getFactor(factors, `waste_${wasteHabits}`);
      const target = getFactor(factors, 'waste_composting');
      if (curr && target) {
        result.co2SavedKg = {
          low: Math.max(0, curr.low - target.high),
          central: Math.max(0, curr.value - target.value),
          high: Math.max(0, curr.high - target.low),
        };
        result.moneySavedINR = 600; // potting mix / fertilizer offset estimate
        result.sources = [`${curr.source} (${curr.year})`];
      }
      result.formula = 'Current waste factor − home composting factor';
      result.inputs = { wasteHabits };
      result.assumptions = ['Diverts 40–60% of kitchen wet waste from anaerobic landfills'];
      break;
    }

    case 'hepa_purifier': {
      result.exposureChange = 'Reduces clean-room indoor PM2.5 by 50–80% when sized for ≥5 ACH';
      result.formula = 'CADR ≥ Room Volume (m³) × 5 ACH';
      result.inputs = { targetACH: DEFAULTS.targetACH };
      result.sources = ['Cochrane Review — Chen et al. (2021)', 'Barn et al. (2018)'];
      result.assumptions = ['Continuous operation with clean-room doors/windows closed', 'Does not reduce CO2e (uses ~240 kWh/yr electricity)'];
      break;
    }

    case 'diy_box_fan_filter': {
      result.exposureChange = '60–70% indoor PM2.5 reduction in room-scale UC Davis / PNAS tests';
      result.formula = 'MERV-13 filter cube + box fan recirculation';
      result.sources = ['Dal Porto et al., PNAS (2022)'];
      result.assumptions = ['Sealed filter edges; replace filters every 3–6 months during smog season'];
      break;
    }

    case 'solar_water_heater': {
      const grid = getFactor(factors, 'grid_electricity_india');
      const geyser = getFactor(factors, 'geyser');
      if (grid && geyser) {
        const kwhSaved = Math.round(geyser.value * 0.85);
        result.co2SavedKg = {
          low: Math.round(geyser.low * 0.8 * grid.low),
          central: Math.round(kwhSaved * grid.value),
          high: Math.round(geyser.high * 0.9 * grid.high),
        };
        result.moneySavedINR = Math.round(kwhSaved * DEFAULTS.electricityRatePerKwh);
        result.sources = [`${geyser.source} (${geyser.year})`, `${grid.source} (${grid.year})`];
      }
      result.formula = '85% of electric geyser kWh × grid factor';
      result.assumptions = ['Owner-occupied roof access with adequate sunlight'];
      break;
    }

    default: {
      const isIaqOnly = action.category === 'iaq' || action.category === 'product';
      result.co2SavedKg = isIaqOnly ? { low: 0, central: 0, high: 0 } : { low: 10, central: 25, high: 45 };
      result.formula = action.whyItWorks || 'Evidence-based household exposure / emissions practice';
      result.sources = ['Curated action & evidence registry (see Methodology)'];
      result.assumptions = ['Applies consistently across household daily routine'];
      break;
    }
  }

  result.moneyRangeINR = {
    low: Math.round(result.moneySavedINR * 0.75),
    central: result.moneySavedINR,
    high: Math.round(result.moneySavedINR * 1.25),
  };
  result.payback = computePayback(upfrontCost, result.moneySavedINR);

  return result;
}

/**
 * Calculate cumulative impact with overlap guard (prevents double-counting in same category).
 */
export function calculateCumulativeImpact(actions, profile, factors) {
  const actionImpacts = actions.map((action) => ({
    action,
    impact: calculateActionImpact(action, profile, factors),
  }));

  const overlaps = [];
  const groups = {};
  for (const ai of actionImpacts) {
    const cat = ai.action.category;
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(ai);
  }

  for (const [cat, group] of Object.entries(groups)) {
    if (group.length > 1) {
      overlaps.push({
        category: cat,
        actions: group.map((g) => g.action.title),
        note: `Overlap guard applied across ${group.length} ${cat} actions (subsequent CO₂e/savings scaled by 0.8×).`,
      });
      for (let i = 1; i < group.length; i++) {
        group[i].impact.co2SavedKg = {
          low: Math.round(group[i].impact.co2SavedKg.low * 0.8),
          central: Math.round(group[i].impact.co2SavedKg.central * 0.8),
          high: Math.round(group[i].impact.co2SavedKg.high * 0.8),
        };
        group[i].impact.moneySavedINR = Math.round(group[i].impact.moneySavedINR * 0.8);
      }
    }
  }

  const totalCO2Saved = {
    low: actionImpacts.reduce((sum, ai) => sum + ai.impact.co2SavedKg.low, 0),
    central: actionImpacts.reduce((sum, ai) => sum + ai.impact.co2SavedKg.central, 0),
    high: actionImpacts.reduce((sum, ai) => sum + ai.impact.co2SavedKg.high, 0),
  };

  const totalMoneySaved = actionImpacts.reduce((sum, ai) => sum + ai.impact.moneySavedINR, 0);

  return { totalCO2Saved, totalMoneySaved, actionImpacts, overlaps };
}

/**
 * Rank sustainable alternatives by mode: 'emissions' | 'exposure' | 'payback' | 'effort'
 */
export function rankSustainableAlternatives(actions, profile, factors, rankBy = 'emissions') {
  const effortRank = { low: 1, medium: 2, high: 3 };
  const isRenting = profile.rentalLimits === true || profile.rentalLimits === 'unknown';

  const candidates = actions
    .filter((a) => (!isRenting || a.rentalFriendly) && a.id !== 'indoor_plants')
    .map((action) => ({
      action,
      impact: calculateActionImpact(action, profile, factors),
    }));

  return candidates.sort((a, b) => {
    if (rankBy === 'payback') {
      const pyA = a.impact.payback.years ?? 999;
      const pyB = b.impact.payback.years ?? 999;
      return pyA - pyB || b.impact.moneySavedINR - a.impact.moneySavedINR;
    }
    if (rankBy === 'effort') {
      return (effortRank[a.action.effort] || 2) - (effortRank[b.action.effort] || 2) || b.impact.co2SavedKg.central - a.impact.co2SavedKg.central;
    }
    if (rankBy === 'exposure') {
      const iaqA = a.action.category === 'iaq' || a.action.category === 'cooking' ? 1 : 0;
      const iaqB = b.action.category === 'iaq' || b.action.category === 'cooking' ? 1 : 0;
      return iaqB - iaqA || b.impact.co2SavedKg.central - a.impact.co2SavedKg.central;
    }
    return b.impact.co2SavedKg.central - a.impact.co2SavedKg.central;
  });
}

/**
 * @fileoverview Action impact, payback, overlap guard, and sustainable alternatives ranker.
 */

import { BOUNDS, DEFAULTS, IMPACT_FACTORS, TIME_UNITS } from '../constants/index.js';
import { roundToTenths } from '../utils/resolve.js';
import { buildActionContext, resolveActionPatch } from './impactDispatch.js';

const EFFORT_RANK = {
  low: 1,
  medium: IMPACT_FACTORS.MEDIUM_EFFORT_RANK,
  high: IMPACT_FACTORS.HIGH_EFFORT_RANK,
};

/**
 * Compute payback period from typical upfront INR cost and annual INR savings.
 * @param {Object|number} upfrontCostINR - Cost object `{ typical }` or number in INR.
 * @param {number} annualSavingsINR - Estimated annual savings in INR.
 * @returns {{ years: number|null, label: string }} Payback summary.
 */
export function computePayback(upfrontCostINR, annualSavingsINR) {
  const upfront = Number(upfrontCostINR?.typical ?? upfrontCostINR ?? 0);
  const annual = Number(annualSavingsINR ?? 0);
  if (upfront <= 0) return { years: 0, label: 'Immediate (₹0 upfront)' };
  if (annual <= 0) return { years: null, label: 'Air/health benefit (no direct bill payback)' };
  const years = roundToTenths(upfront / annual);
  if (years < 1) {
    const months = Math.max(1, Math.round(years * TIME_UNITS.MONTHS_PER_YEAR));
    return { years, label: `~${months} month${months > 1 ? 's' : ''}` };
  }
  return { years, label: `~${years} year${years > 1 ? 's' : ''}` };
}

const ZERO_RANGE = { low: 0, central: 0, high: 0 };
const ZERO_COST = { min: 0, max: 0, typical: 0 };

function buildFinancialSummary(action, moneySavedINR) {
  const upfrontCostINR = action.upfrontCostINR || ZERO_COST;
  return {
    moneySavedINR,
    moneyRangeINR: {
      low: Math.round(moneySavedINR * DEFAULTS.billSavingsLowRatio),
      central: moneySavedINR,
      high: Math.round(moneySavedINR * DEFAULTS.billSavingsHighRatio),
    },
    upfrontCostINR,
    payback: computePayback(upfrontCostINR, moneySavedINR),
  };
}

function formatImpactPayload(action, patch) {
  const moneySavedINR = patch.moneySavedINR ?? 0;
  return {
    co2SavedKg: patch.co2SavedKg ?? ZERO_RANGE,
    ...buildFinancialSummary(action, moneySavedINR),
    exposureChange:
      patch.exposureChange || action.effectRange || 'Maintains cleaner indoor routine',
    formula: patch.formula || '',
    inputs: patch.inputs || {},
    sources: patch.sources || [],
    assumptions: patch.assumptions || [],
    confidence: action.evidence || 'moderate',
  };
}

/**
 * Compute full impact details (exposure, CO₂e range, INR savings, payback, sources) for one action.
 * @param {Object} action - Entry from `actions.json`.
 * @param {Object} [profile={}] - Flattened household profile.
 * @param {Array<Object>} [factors=[]] - Factor registry from `factors.json`.
 * @returns {Object} Impact card payload.
 */
export function calculateActionImpact(action, profile = {}, factors = []) {
  const ctx = buildActionContext(profile);
  const patch = resolveActionPatch(action, ctx, factors);
  return formatImpactPayload(action, patch);
}

function applyCategoryOverlapGuard(actionImpacts) {
  const groups = {};
  for (const item of actionImpacts) {
    const cat = item.action.category;
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(item);
  }

  const overlaps = [];
  const scale = DEFAULTS.overlapScaleFactor;
  for (const [cat, group] of Object.entries(groups)) {
    if (group.length <= 1) continue;
    overlaps.push({
      category: cat,
      actions: group.map((g) => g.action.title),
      note: `Overlap guard applied across ${group.length} ${cat} actions (subsequent CO₂e/savings scaled by ${scale}×).`,
    });
    for (let i = 1; i < group.length; i++) {
      const prev = group[i].impact.co2SavedKg;
      group[i].impact.co2SavedKg = {
        low: Math.round(prev.low * scale),
        central: Math.round(prev.central * scale),
        high: Math.round(prev.high * scale),
      };
      group[i].impact.moneySavedINR = Math.round(group[i].impact.moneySavedINR * scale);
    }
  }
  return overlaps;
}

/**
 * Compute combined CO₂e and INR savings across selected actions with same-category overlap scaling.
 * @param {Array<Object>} actions - Selected action entries.
 * @param {Object} [profile={}] - Household profile.
 * @param {Array<Object>} [factors=[]] - Factor registry.
 * @returns {Object} Cumulative totals, per-action impacts, and overlap notes.
 */
export function calculateCumulativeImpact(actions, profile = {}, factors = []) {
  const actionImpacts = actions.map((action) => ({
    action,
    impact: calculateActionImpact(action, profile, factors),
  }));
  const overlaps = applyCategoryOverlapGuard(actionImpacts);

  return {
    totalCO2Saved: {
      low: actionImpacts.reduce((sum, ai) => sum + ai.impact.co2SavedKg.low, 0),
      central: actionImpacts.reduce((sum, ai) => sum + ai.impact.co2SavedKg.central, 0),
      high: actionImpacts.reduce((sum, ai) => sum + ai.impact.co2SavedKg.high, 0),
    },
    totalMoneySaved: actionImpacts.reduce((sum, ai) => sum + ai.impact.moneySavedINR, 0),
    actionImpacts,
    overlaps,
  };
}

const RANK_COMPARATORS = {
  payback: (a, b) =>
    (a.impact.payback.years ?? BOUNDS.UNRANKED_PAYBACK_YEARS) -
      (b.impact.payback.years ?? BOUNDS.UNRANKED_PAYBACK_YEARS) ||
    b.impact.moneySavedINR - a.impact.moneySavedINR,
  effort: (a, b) =>
    (EFFORT_RANK[a.action.effort] || IMPACT_FACTORS.MEDIUM_EFFORT_RANK) -
      (EFFORT_RANK[b.action.effort] || IMPACT_FACTORS.MEDIUM_EFFORT_RANK) ||
    b.impact.co2SavedKg.central - a.impact.co2SavedKg.central,
  exposure: (a, b) => {
    const iaqA = Number(a.action.category === 'iaq' || a.action.category === 'cooking');
    const iaqB = Number(b.action.category === 'iaq' || b.action.category === 'cooking');
    return iaqB - iaqA || b.impact.co2SavedKg.central - a.impact.co2SavedKg.central;
  },
  emissions: (a, b) => b.impact.co2SavedKg.central - a.impact.co2SavedKg.central,
};

/**
 * Rank sustainable alternatives by emissions cut, exposure reduction, fastest payback, or lowest effort.
 * @param {Array<Object>} actions - Full actions library.
 * @param {Object} [profile={}] - Household profile.
 * @param {Array<Object>} [factors=[]] - Factor registry.
 * @param {'emissions'|'exposure'|'payback'|'effort'} [rankBy='emissions'] - Ranking criterion.
 * @returns {Array<{ action: Object, impact: Object }>} Ranked alternatives list.
 */
export function rankSustainableAlternatives(
  actions,
  profile = {},
  factors = [],
  rankBy = 'emissions'
) {
  const isRenting = profile.rentalLimits === true || profile.rentalLimits === 'unknown';
  const compare = RANK_COMPARATORS[rankBy] || RANK_COMPARATORS.emissions;

  return actions
    .filter((a) => (!isRenting || a.rentalFriendly) && a.id !== 'indoor_plants')
    .map((action) => ({ action, impact: calculateActionImpact(action, profile, factors) }))
    .sort(compare);
}

/**
 * @fileoverview Action impact, payback, overlap guard, and sustainable alternatives ranker.
 */

import { DEFAULTS, TIME_UNITS } from '../constants/index.js';
import { buildActionContext, resolveActionPatch } from './impactDispatch.js';

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
  const years = Math.round((upfront / annual) * 10) / 10;
  if (years < 1) {
    const months = Math.max(1, Math.round(years * TIME_UNITS.MONTHS_PER_YEAR));
    return { years, label: `~${months} month${months > 1 ? 's' : ''}` };
  }
  return { years, label: `~${years} year${years > 1 ? 's' : ''}` };
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
  const upfrontCost = action.upfrontCostINR || { min: 0, max: 0, typical: 0 };
  const patch = resolveActionPatch(action, ctx, factors);

  const moneySavedINR = patch.moneySavedINR ?? 0;
  return {
    co2SavedKg: patch.co2SavedKg ?? { low: 0, central: 0, high: 0 },
    moneySavedINR,
    moneyRangeINR: {
      low: Math.round(moneySavedINR * DEFAULTS.billSavingsLowRatio),
      central: moneySavedINR,
      high: Math.round(moneySavedINR * DEFAULTS.billSavingsHighRatio),
    },
    upfrontCostINR: upfrontCost,
    payback: computePayback(upfrontCost, moneySavedINR),
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

  const overlaps = [];
  const groups = {};
  for (const ai of actionImpacts) {
    const cat = ai.action.category;
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(ai);
  }

  for (const [cat, group] of Object.entries(groups)) {
    if (group.length <= 1) continue;
    overlaps.push({
      category: cat,
      actions: group.map((g) => g.action.title),
      note: `Overlap guard applied across ${group.length} ${cat} actions (subsequent CO₂e/savings scaled by ${DEFAULTS.overlapScaleFactor}×).`,
    });
    for (let i = 1; i < group.length; i++) {
      const k = DEFAULTS.overlapScaleFactor;
      const c = group[i].impact.co2SavedKg;
      group[i].impact.co2SavedKg = {
        low: Math.round(c.low * k),
        central: Math.round(c.central * k),
        high: Math.round(c.high * k),
      };
      group[i].impact.moneySavedINR = Math.round(group[i].impact.moneySavedINR * k);
    }
  }

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
  const effortRank = { low: 1, medium: 2, high: 3 };
  const isRenting = profile.rentalLimits === true || profile.rentalLimits === 'unknown';

  const candidates = actions
    .filter((a) => (!isRenting || a.rentalFriendly) && a.id !== 'indoor_plants')
    .map((action) => ({ action, impact: calculateActionImpact(action, profile, factors) }));

  return candidates.sort((a, b) => {
    if (rankBy === 'payback') {
      return (
        (a.impact.payback.years ?? 999) - (b.impact.payback.years ?? 999) ||
        b.impact.moneySavedINR - a.impact.moneySavedINR
      );
    }
    if (rankBy === 'effort') {
      return (
        (effortRank[a.action.effort] || 2) - (effortRank[b.action.effort] || 2) ||
        b.impact.co2SavedKg.central - a.impact.co2SavedKg.central
      );
    }
    if (rankBy === 'exposure') {
      const iaqA = a.action.category === 'iaq' || a.action.category === 'cooking' ? 1 : 0;
      const iaqB = b.action.category === 'iaq' || b.action.category === 'cooking' ? 1 : 0;
      return iaqB - iaqA || b.impact.co2SavedKg.central - a.impact.co2SavedKg.central;
    }
    return b.impact.co2SavedKg.central - a.impact.co2SavedKg.central;
  });
}

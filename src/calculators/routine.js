/**
 * @fileoverview Pure builder for 4-tier prioritized preventive measures and hour-by-hour daily routines.
 */

import {
  BOUNDS,
  CONSERVATIVE_UNKNOWNS,
  IMPACT_FACTORS,
  PRIORITY_TIERS,
  ROUTINE_DEFAULTS,
} from '../constants/index.js';
import { resolveWithFallback } from '../utils/resolve.js';
import { buildMorningSlots, buildAfternoonSlot, buildPeakAndNightSlots } from './routineSlots.js';

const CONSTRAINT_RULES = {
  has_ac: (ctx) => ctx.cooling === 'ac',
  has_car_commute: (ctx) => ['car', 'car_petrol', 'car_diesel'].includes(ctx.commuteMode),
  has_exhaust_fan_or_chimney: (ctx) => ctx.hasChimney !== 'none',
  owns_home: (ctx) => !ctx.isRenting,
  trip_distance_under_5km: (ctx) => ctx.commuteKm <= BOUNDS.SHORT_TRIP_THRESHOLD_KM,
  wfh_possible: (ctx) => ctx.commuteMode !== 'wfh',
};

function isActionAllowed(action, ctx) {
  if (ctx.isRenting && !action.rentalFriendly) return false;
  for (const constraint of action.constraints || []) {
    const check = CONSTRAINT_RULES[constraint];
    if (check && !check(ctx)) return false;
  }
  return true;
}

function filterApplicableActions(actions, profile = {}) {
  const ctx = {
    isRenting: profile.rentalLimits === true || profile.rentalLimits === 'unknown',
    cooling: resolveWithFallback(profile.cooling, CONSERVATIVE_UNKNOWNS.cooling),
    commuteMode: resolveWithFallback(profile.commuteMode, CONSERVATIVE_UNKNOWNS.commuteMode),
    commuteKm:
      Number(resolveWithFallback(profile.commuteKm, CONSERVATIVE_UNKNOWNS.commuteKm)) ||
      IMPACT_FACTORS.DEFAULT_FALLBACK_KM,
    hasChimney: resolveWithFallback(profile.hasChimney, CONSERVATIVE_UNKNOWNS.hasChimney),
  };
  return actions.filter((action) => isActionAllowed(action, ctx));
}

/**
 * Group applicable preventive measures into the four priority tiers.
 * @param {Array<Object>} actions - Full actions array.
 * @param {Object} [profile={}] - Household profile.
 * @returns {Array<Object>} Tier sections sorted from "Do now (free)" to "Later (investment)".
 */
export function buildPrioritizedMeasures(actions, profile = {}) {
  const applicable = filterApplicableActions(actions, profile);
  const grouped = { do_now: [], today: [], this_week: [], later: [] };

  for (const action of applicable) {
    const tier = grouped[action.priorityTier] ? action.priorityTier : 'today';
    grouped[tier].push(action);
  }

  return Object.entries(PRIORITY_TIERS)
    .sort((a, b) => a[1].order - b[1].order)
    .map(([tierId, meta]) => ({
      tierId,
      label: meta.label,
      icon: meta.icon,
      badge: meta.badge,
      items: grouped[tierId] || [],
    }));
}

function resolveRoutineContext(profile, airWindow, cleanRoom) {
  const avgPm25 = airWindow.averagePm25 ?? ROUTINE_DEFAULTS.AVG_PM25_FALLBACK;
  const sensitive =
    Array.isArray(profile.sensitiveGroups) &&
    profile.sensitiveGroups.length > 0 &&
    !profile.sensitiveGroups.includes('none');

  return {
    bestStart: airWindow.bestWindowStart ?? ROUTINE_DEFAULTS.BEST_START_HOUR,
    bestEnd: airWindow.bestWindowEnd ?? ROUTINE_DEFAULTS.BEST_END_HOUR,
    avoidStart: airWindow.avoidWindowStart ?? ROUTINE_DEFAULTS.AVOID_START_HOUR,
    avoidEnd: airWindow.avoidWindowEnd ?? ROUTINE_DEFAULTS.AVOID_END_HOUR,
    bestPm25: airWindow.bestPm25,
    avoidPm25: airWindow.avoidPm25 ?? airWindow.worstPm25,
    commuteMode: resolveWithFallback(profile.commuteMode, CONSERVATIVE_UNKNOWNS.commuteMode),
    cookingFuel: resolveWithFallback(profile.cookingFuel, CONSERVATIVE_UNKNOWNS.cookingFuel),
    hasChimney: resolveWithFallback(profile.hasChimney, CONSERVATIVE_UNKNOWNS.hasChimney),
    cooling: resolveWithFallback(profile.cooling, CONSERVATIVE_UNKNOWNS.cooling),
    roomName: cleanRoom?.name || 'Primary Bedroom',
    cleanRoom,
    highSmogDay: avgPm25 > ROUTINE_DEFAULTS.HIGH_SMOG_AVG_THRESHOLD,
    sensitive,
  };
}

/**
 * Build a 7-slot hour-by-hour daily routine adapted to forecast best/avoid windows.
 * @param {Object} [profile={}] - Household profile.
 * @param {Object} [airWindow={}] - Output from `calculateAirWindow`.
 * @param {Object|null} [cleanRoom=null] - Designated clean room from `buildRoomByRoomPlan`.
 * @returns {Array<Object>} Ordered timeline entries for today.
 */
export function buildHourlyRoutine(profile = {}, airWindow = {}, cleanRoom = null) {
  const ctx = resolveRoutineContext(profile, airWindow, cleanRoom);
  return [...buildMorningSlots(ctx), buildAfternoonSlot(ctx), ...buildPeakAndNightSlots(ctx)];
}

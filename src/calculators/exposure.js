/**
 * @fileoverview Pure indoor exposure heuristic and ranked pollution source breakdown.
 */

import { BOUNDS, DEFAULTS, CONSERVATIVE_UNKNOWNS } from '../constants/index.js';
import { resolveWithFallback } from '../utils/resolve.js';

const WEIGHTS = DEFAULTS.exposureWeights;

const INDOOR_SMOKE_SPECS = [
  {
    key: 'mosquito_coil',
    pts: WEIGHTS.smokePoints.mosquito_coil,
    impact: 'high',
    source: 'Mosquito coil smoke',
    detail:
      'Mosquito coils emit intense indoor PM2.5 (~100 µg/m³+ in closed rooms) and formaldehyde.',
  },
  {
    key: 'tobacco',
    pts: WEIGHTS.smokePoints.tobacco,
    impact: 'high',
    source: 'Indoor tobacco / secondhand smoke',
    detail: 'Smoking indoors creates persistent fine particulates absorbed by furnishings.',
  },
  {
    key: 'incense',
    pts: WEIGHTS.smokePoints.incense,
    impact: 'moderate',
    source: 'Incense / agarbatti / dhoop smoke',
    detail: 'Incense burning adds ~60 µg/m³ PM2.5 plus benzene/VOCs in poorly ventilated rooms.',
  },
];

function classifyLevel(value, highThreshold, moderateThreshold) {
  if (value >= highThreshold) return 'high';
  if (value >= moderateThreshold) return 'moderate';
  return 'low';
}

function classifyExposureBand(score) {
  const { moderate, elevated, high } = WEIGHTS.levelThresholds;
  if (score > high) return 'High';
  if (score > elevated) return 'Elevated';
  if (score > moderate) return 'Moderate';
  return 'Low';
}

function evaluateOutdoorSource(outdoorPm25, ventQuality) {
  const mult = WEIGHTS.ventilationMultiplier[ventQuality] ?? WEIGHTS.ventilationMultiplier.moderate;
  const points = Math.min(
    WEIGHTS.outdoorPointsCap,
    Math.round((outdoorPm25 * mult) / WEIGHTS.outdoorInfiltrationDivisor)
  );
  return {
    points,
    entry: {
      id: 'outdoor_infiltration',
      scope: 'Outdoor',
      source: 'Ambient smog & traffic PM2.5 infiltration',
      scoreContribution: points,
      impact: classifyLevel(outdoorPm25, BOUNDS.OUTDOOR_HIGH_PM25, BOUNDS.OUTDOOR_MODERATE_PM25),
      detail: `Outdoor PM2.5 (~${Math.round(outdoorPm25)} µg/m³) entering via windows/door gaps (${ventQuality} ventilation).`,
    },
  };
}

function isMechanicalExhaustActive(hasChimney, cookingFuel) {
  const exhaustPresent =
    hasChimney === 'chimney' || hasChimney === 'exhaust_fan' || hasChimney === true;
  return exhaustPresent && cookingFuel !== 'induction' && cookingFuel !== 'electric';
}

function evaluateCookingSource(cookingFuel, hasChimney) {
  let points = WEIGHTS.cookingBase[cookingFuel] ?? WEIGHTS.cookingBase.other;
  const exhaustActive = isMechanicalExhaustActive(hasChimney, cookingFuel);
  if (exhaustActive) {
    points = Math.round(points * WEIGHTS.exhaustReductionFactor);
  }
  const fuelLabel = String(cookingFuel).toUpperCase();
  return {
    points,
    entry: {
      id: 'cooking_emissions',
      scope: 'Indoor',
      source: exhaustActive
        ? `Cooking (${fuelLabel} with exhaust)`
        : `Cooking (${fuelLabel} without chimney/exhaust)`,
      scoreContribution: points,
      impact: classifyLevel(
        points,
        BOUNDS.HIGH_IMPACT_POINTS_THRESHOLD,
        BOUNDS.MODERATE_IMPACT_POINTS_THRESHOLD
      ),
      detail: exhaustActive
        ? 'Exhaust/chimney captures most combustion fumes; oil-smoke aerosols remain.'
        : 'Unvented gas/biomass combustion spikes kitchen PM2.5 and NO2 indoors.',
    },
  };
}

function collectIndoorSmokeSources(smokeSources) {
  const items = [];
  let points = 0;
  for (const spec of INDOOR_SMOKE_SPECS) {
    if (!smokeSources.includes(spec.key)) continue;
    points += spec.pts;
    items.push({
      id: spec.key,
      scope: 'Indoor',
      source: spec.source,
      scoreContribution: spec.pts,
      impact: spec.impact,
      detail: spec.detail,
    });
  }
  return { points, items };
}

function resolveSmokeSources(rawSources) {
  if (Array.isArray(rawSources)) return rawSources;
  if (rawSources === 'unknown') return CONSERVATIVE_UNKNOWNS.indoorSmokeSources;
  return [];
}

function resolveSensitiveGroups(profile) {
  if (Array.isArray(profile.sensitiveGroups)) return profile.sensitiveGroups;
  return profile.sensitiveGroup ? ['sensitive'] : [];
}

function evaluateDilutionPenalty(ventQuality, homeType, cookingPoints, smokeSources) {
  if (ventQuality !== 'poor') return null;
  if (cookingPoints <= BOUNDS.TRAPPING_COOKING_POINTS_MIN && smokeSources.length === 0) return null;
  const trapPts =
    homeType === 'apartment' ? WEIGHTS.poorVentTrappedApartment : WEIGHTS.poorVentTrappedOther;
  return {
    points: trapPts,
    entry: {
      id: 'low_dilution',
      scope: 'Indoor',
      source: 'Low indoor air dilution',
      scoreContribution: trapPts,
      impact: 'moderate',
      detail: 'Limited cross-ventilation slows clearance of cooking and dust particles.',
    },
  };
}

/**
 * Calculate transparent indoor exposure index (0–100) and rank top indoor/outdoor sources.
 * @param {Object} [profile={}] - Household wizard profile.
 * @param {{ outdoorPm25?: number }} [envContext={}] - Current outdoor PM2.5 context.
 * @returns {Object} Level, score, ranked contributing factors, and non-medical disclaimer.
 */
export function calculateExposure(profile = {}, envContext = {}) {
  const outdoorPm25 = Math.max(0, Number(envContext.outdoorPm25 ?? BOUNDS.FALLBACK_OUTDOOR_PM25));
  const ventQuality = resolveWithFallback(profile.ventilation, CONSERVATIVE_UNKNOWNS.ventilation);
  const homeType = resolveWithFallback(profile.homeType, CONSERVATIVE_UNKNOWNS.homeType);
  const cookingFuel = resolveWithFallback(profile.cookingFuel, CONSERVATIVE_UNKNOWNS.cookingFuel);
  const hasChimney = resolveWithFallback(profile.hasChimney, CONSERVATIVE_UNKNOWNS.hasChimney);
  const smokeSources = resolveSmokeSources(profile.indoorSmokeSources);
  const sensitiveGroups = resolveSensitiveGroups(profile);

  const outdoor = evaluateOutdoorSource(outdoorPm25, ventQuality);
  const cooking = evaluateCookingSource(cookingFuel, hasChimney);
  const smoke = collectIndoorSmokeSources(smokeSources);
  const dilution = evaluateDilutionPenalty(ventQuality, homeType, cooking.points, smokeSources);

  const rankedSources = [outdoor.entry, cooking.entry, ...smoke.items];
  let rawScore = outdoor.points + cooking.points + smoke.points;
  if (dilution) {
    rawScore += dilution.points;
    rankedSources.push(dilution.entry);
  }
  if (sensitiveGroups.length > 0 && !sensitiveGroups.includes('none')) {
    rawScore = Math.round(rawScore * WEIGHTS.sensitiveMultiplier);
  }

  const score = Math.max(0, Math.min(BOUNDS.PERCENT_SCALE, rawScore));
  const contributingFactors = [...rankedSources]
    .sort((a, b) => b.scoreContribution - a.scoreContribution)
    .map((item) => ({ ...item, factor: item.source }));

  return {
    level: classifyExposureBand(score),
    score,
    contributingFactors,
    disclaimer:
      'Simplified indoor exposure heuristic (0–100) based on ambient PM2.5 and home setup. Not a medical measurement or clinical risk score.',
  };
}

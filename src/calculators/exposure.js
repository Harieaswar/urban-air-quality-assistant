/**
 * @fileoverview Pure indoor exposure heuristic and ranked pollution source breakdown.
 */

import { DEFAULTS, CONSERVATIVE_UNKNOWNS } from '../data/constants.js';
import { resolveWithFallback } from '../utils/resolve.js';

const WEIGHTS = DEFAULTS.exposureWeights;

function evaluateOutdoorSource(outdoorPm25, ventQuality) {
  const mult = WEIGHTS.ventilationMultiplier[ventQuality] ?? WEIGHTS.ventilationMultiplier.moderate;
  const infiltration = outdoorPm25 * mult;
  const points = Math.min(
    WEIGHTS.outdoorPointsCap,
    Math.round(infiltration / WEIGHTS.outdoorInfiltrationDivisor)
  );
  return {
    points,
    entry: {
      id: 'outdoor_infiltration',
      scope: 'Outdoor',
      source: 'Ambient smog & traffic PM2.5 infiltration',
      scoreContribution: points,
      impact: outdoorPm25 > 90 ? 'high' : outdoorPm25 > 45 ? 'moderate' : 'low',
      detail: `Outdoor PM2.5 (~${Math.round(outdoorPm25)} µg/m³) entering via windows/door gaps (${ventQuality} ventilation).`,
    },
  };
}

function evaluateCookingSource(cookingFuel, hasChimney) {
  let points = WEIGHTS.cookingBase[cookingFuel] ?? WEIGHTS.cookingBase.other;
  const exhaustActive =
    hasChimney === 'chimney' || hasChimney === 'exhaust_fan' || hasChimney === true;
  if (exhaustActive && cookingFuel !== 'induction' && cookingFuel !== 'electric') {
    points = Math.round(points * WEIGHTS.exhaustReductionFactor);
  }
  return {
    points,
    entry: {
      id: 'cooking_emissions',
      scope: 'Indoor',
      source: exhaustActive
        ? `Cooking (${String(cookingFuel).toUpperCase()} with exhaust)`
        : `Cooking (${String(cookingFuel).toUpperCase()} without chimney/exhaust)`,
      scoreContribution: points,
      impact: points >= 14 ? 'high' : points >= 6 ? 'moderate' : 'low',
      detail: exhaustActive
        ? 'Exhaust/chimney captures most combustion fumes; oil-smoke aerosols remain.'
        : 'Unvented gas/biomass combustion spikes kitchen PM2.5 and NO2 indoors.',
    },
  };
}

function collectIndoorSmokeSources(smokeSources) {
  const items = [];
  let points = 0;
  const specs = [
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

  for (const s of specs) {
    if (smokeSources.includes(s.key)) {
      points += s.pts;
      items.push({
        id: s.key,
        scope: 'Indoor',
        source: s.source,
        scoreContribution: s.pts,
        impact: s.impact,
        detail: s.detail,
      });
    }
  }
  return { points, items };
}

/**
 * Calculate transparent indoor exposure index (0–100) and rank top indoor/outdoor sources.
 * @param {Object} [profile={}] - Household wizard profile.
 * @param {{ outdoorPm25?: number }} [envContext={}] - Current outdoor PM2.5 context.
 * @returns {Object} Level, score, ranked contributing factors, and non-medical disclaimer.
 */
export function calculateExposure(profile = {}, envContext = {}) {
  const outdoorPm25 = Math.max(0, Number(envContext.outdoorPm25 ?? 60));
  const ventQuality = resolveWithFallback(profile.ventilation, CONSERVATIVE_UNKNOWNS.ventilation);
  const homeType = resolveWithFallback(profile.homeType, CONSERVATIVE_UNKNOWNS.homeType);
  const cookingFuel = resolveWithFallback(profile.cookingFuel, CONSERVATIVE_UNKNOWNS.cookingFuel);
  const hasChimney = resolveWithFallback(profile.hasChimney, CONSERVATIVE_UNKNOWNS.hasChimney);
  const smokeSources = Array.isArray(profile.indoorSmokeSources)
    ? profile.indoorSmokeSources
    : profile.indoorSmokeSources === 'unknown'
      ? CONSERVATIVE_UNKNOWNS.indoorSmokeSources
      : [];
  const sensitiveGroups = Array.isArray(profile.sensitiveGroups)
    ? profile.sensitiveGroups
    : profile.sensitiveGroup
      ? ['sensitive']
      : [];

  const outdoor = evaluateOutdoorSource(outdoorPm25, ventQuality);
  const cooking = evaluateCookingSource(cookingFuel, hasChimney);
  const smoke = collectIndoorSmokeSources(smokeSources);
  const rankedSources = [outdoor.entry, cooking.entry, ...smoke.items];
  let score = outdoor.points + cooking.points + smoke.points;

  if (ventQuality === 'poor' && (cooking.points > 5 || smokeSources.length > 0)) {
    const trapPts =
      homeType === 'apartment' ? WEIGHTS.poorVentTrappedApartment : WEIGHTS.poorVentTrappedOther;
    score += trapPts;
    rankedSources.push({
      id: 'low_dilution',
      scope: 'Indoor',
      source: 'Low indoor air dilution',
      scoreContribution: trapPts,
      impact: 'moderate',
      detail: 'Limited cross-ventilation slows clearance of cooking and dust particles.',
    });
  }

  if (sensitiveGroups.length > 0 && !sensitiveGroups.includes('none')) {
    score = Math.round(score * WEIGHTS.sensitiveMultiplier);
  }

  score = Math.max(0, Math.min(100, score));
  const { moderate, elevated, high } = WEIGHTS.levelThresholds;
  const level =
    score > high ? 'High' : score > elevated ? 'Elevated' : score > moderate ? 'Moderate' : 'Low';

  const contributingFactors = [...rankedSources]
    .sort((a, b) => b.scoreContribution - a.scoreContribution)
    .map((item) => ({ ...item, factor: item.source }));

  return {
    level,
    score,
    contributingFactors,
    disclaimer:
      'Simplified indoor exposure heuristic (0–100) based on ambient PM2.5 and home setup. Not a medical measurement or clinical risk score.',
  };
}

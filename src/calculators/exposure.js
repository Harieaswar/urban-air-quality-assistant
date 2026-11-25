/**
 * Indoor Exposure & Ranked Pollution Sources Calculator — SmogGuard
 * Transparent heuristic (Low/Moderate/Elevated/High) + ranked indoor & outdoor sources.
 * NOT a medical metric.
 */

import { CONSERVATIVE_UNKNOWNS } from '../data/constants.js';

function resolveVal(val, fallback) {
  return val == null || val === '' || val === 'unknown' ? fallback : val;
}

/**
 * Calculate indoor exposure index and rank top indoor & outdoor sources.
 */
export function calculateExposure(profile = {}, envContext = {}) {
  let score = 0;
  const rankedSources = [];

  const outdoorPm25 = Math.max(0, Number(envContext.outdoorPm25 ?? 60));
  const ventQuality = resolveVal(profile.ventilation, CONSERVATIVE_UNKNOWNS.ventilation);
  const homeType = resolveVal(profile.homeType, CONSERVATIVE_UNKNOWNS.homeType);
  const cookingFuel = resolveVal(profile.cookingFuel, CONSERVATIVE_UNKNOWNS.cookingFuel);
  const hasChimney = resolveVal(profile.hasChimney, CONSERVATIVE_UNKNOWNS.hasChimney);
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

  // 1. Outdoor infiltration
  const ventMult = { good: 0.7, moderate: 0.5, poor: 0.3 };
  const infiltration = outdoorPm25 * (ventMult[ventQuality] ?? 0.5);
  const outdoorPoints = Math.min(35, Math.round(infiltration / 2.8));
  score += outdoorPoints;

  rankedSources.push({
    id: 'outdoor_infiltration',
    scope: 'Outdoor',
    source: 'Ambient smog & traffic PM2.5 infiltration',
    scoreContribution: outdoorPoints,
    impact: outdoorPm25 > 90 ? 'high' : outdoorPm25 > 45 ? 'moderate' : 'low',
    detail: `Outdoor PM2.5 (~${Math.round(outdoorPm25)} µg/m³) entering via windows/door gaps (${ventQuality} ventilation).`,
  });

  // 2. Cooking combustion
  const cookingBase = { biomass: 35, lpg: 16, png: 13, induction: 2, electric: 2, other: 12 };
  let cookingPoints = cookingBase[cookingFuel] ?? 14;
  const exhaustActive = hasChimney === 'chimney' || hasChimney === 'exhaust_fan' || hasChimney === true;
  if (exhaustActive && cookingFuel !== 'induction' && cookingFuel !== 'electric') {
    cookingPoints = Math.round(cookingPoints * 0.35);
  }
  score += cookingPoints;

  if (cookingPoints > 0) {
    rankedSources.push({
      id: 'cooking_emissions',
      scope: 'Indoor',
      source: exhaustActive
        ? `Cooking (${String(cookingFuel).toUpperCase()} with exhaust)`
        : `Cooking (${String(cookingFuel).toUpperCase()} without chimney/exhaust)`,
      scoreContribution: cookingPoints,
      impact: cookingPoints >= 14 ? 'high' : cookingPoints >= 6 ? 'moderate' : 'low',
      detail: exhaustActive
        ? 'Exhaust/chimney captures most combustion fumes; oil-smoke aerosols remain.'
        : 'Unvented gas/biomass combustion spikes kitchen PM2.5 and NO2 indoors.',
    });
  }

  // 3. Indoor smoke sources (incense, mosquito coils, tobacco)
  if (smokeSources.includes('mosquito_coil')) {
    score += 22;
    rankedSources.push({
      id: 'mosquito_coil',
      scope: 'Indoor',
      source: 'Mosquito coil smoke',
      scoreContribution: 22,
      impact: 'high',
      detail: 'Mosquito coils emit intense indoor PM2.5 (~100 µg/m³+ in closed rooms) and formaldehyde.',
    });
  }
  if (smokeSources.includes('tobacco')) {
    score += 25;
    rankedSources.push({
      id: 'tobacco',
      scope: 'Indoor',
      source: 'Indoor tobacco / secondhand smoke',
      scoreContribution: 25,
      impact: 'high',
      detail: 'Smoking indoors creates persistent fine particulates absorbed by furnishings.',
    });
  }
  if (smokeSources.includes('incense')) {
    score += 12;
    rankedSources.push({
      id: 'incense',
      scope: 'Indoor',
      source: 'Incense / agarbatti / dhoop smoke',
      scoreContribution: 12,
      impact: 'moderate',
      detail: 'Incense burning adds ~60 µg/m³ PM2.5 plus benzene/VOCs in poorly ventilated rooms.',
    });
  }

  // 4. Trapped indoor pollution in poorly ventilated spaces
  if (ventQuality === 'poor' && (cookingPoints > 5 || smokeSources.length > 0)) {
    const trapPts = homeType === 'apartment' ? 8 : 6;
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

  // 5. Sensitive-group vulnerability weight
  if (sensitiveGroups.length > 0 && !sensitiveGroups.includes('none')) {
    score = Math.round(score * 1.15);
  }

  score = Math.max(0, Math.min(100, score));

  let level = 'Low';
  if (score > 60) level = 'High';
  else if (score > 40) level = 'Elevated';
  else if (score > 20) level = 'Moderate';

  const contributingFactors = [...rankedSources]
    .sort((a, b) => b.scoreContribution - a.scoreContribution)
    .map((item) => ({
      ...item,
      factor: item.source,
    }));

  return {
    level,
    score,
    contributingFactors,
    disclaimer:
      'Simplified indoor exposure heuristic (0–100) based on ambient PM2.5 and home setup. Not a medical measurement or clinical risk score.',
  };
}

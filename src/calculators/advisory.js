/**
 * @fileoverview Pure MoHFW/NCDC health advisory and family-profile tailoring calculator.
 */

import advisoriesData from '../data/advisories.json';
import { pm25ToAqi } from './aqi.js';
import { getAqiCategory } from '../data/constants.js';

/**
 * Build MoHFW/NCDC health advisory text tailored to selected sensitive family profiles.
 * @param {number} pm25 - Current or peak PM2.5 concentration (µg/m³).
 * @param {string[]} [selectedFamilyIds=[]] - Selected family profile IDs.
 * @param {'india_naqi'|'us_aqi'} [scale='india_naqi'] - Active AQI scale.
 * @returns {Object} Structured advisory with tailored notes, citation, and disclaimer.
 */
export function getHealthAdvisory(pm25, selectedFamilyIds = [], scale = 'india_naqi') {
  const aqi = pm25ToAqi(pm25, scale);
  const cat = getAqiCategory(aqi, scale);
  const entry =
    advisoriesData.categories.find((c) => c.id === cat.id) ||
    advisoriesData.categories[advisoriesData.categories.length - 1];

  const validProfiles = advisoriesData.familyProfiles.filter((fp) =>
    selectedFamilyIds.includes(fp.id)
  );

  const tailoredNotes = validProfiles.map((fp) => ({
    id: fp.id,
    label: fp.label,
    icon: fp.icon,
    rationale: fp.rationale,
    advice: entry.familyAdvice[fp.id] || entry.generalAdvice,
  }));

  return {
    categoryId: entry.id,
    categoryLabel: cat.label,
    icon: cat.icon,
    color: cat.color,
    aqi,
    scale,
    generalAdvice: entry.generalAdvice,
    tailoredNotes,
    source: advisoriesData.source,
    year: advisoriesData.year,
    disclaimer: advisoriesData.disclaimer,
  };
}

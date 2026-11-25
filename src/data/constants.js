/**
 * SmogGuard Constants
 * Derived from versioned JSON data files (advisories.json, assumptions.json).
 */

import advisoriesData from './advisories.json';
import assumptionsData from './assumptions.json';

/** India National Air Quality Index categories (CPCB / MoHFW) */
export const INDIA_NAQI_CATEGORIES = [
  { id: 'good', range: [0, 50], label: 'Good', color: '#009966', icon: '🟢', advice: 'Air quality is satisfactory. Enjoy outdoor activities freely.' },
  { id: 'satisfactory', range: [51, 100], label: 'Satisfactory', color: '#FFDE33', icon: '🟡', advice: 'Acceptable. Sensitive individuals should limit prolonged outdoor exertion.' },
  { id: 'moderate', range: [101, 200], label: 'Moderate', color: '#FF9933', icon: '🟠', advice: 'May cause breathing discomfort to people with lung or heart conditions.' },
  { id: 'poor', range: [201, 300], label: 'Poor', color: '#CC0033', icon: '🔴', advice: 'May cause breathing discomfort on prolonged exposure. Limit outdoor activities.' },
  { id: 'very_poor', range: [301, 400], label: 'Very Poor', color: '#660099', icon: '🟣', advice: 'May cause respiratory illness on prolonged exposure. Avoid outdoor exertion.' },
  { id: 'severe', range: [401, 500], label: 'Severe', color: '#7E0023', icon: '⚫', advice: 'Health emergency conditions: stay indoors and prioritize clean-room filtration.' },
];

/** US AQI categories (EPA) */
export const US_AQI_CATEGORIES = [
  { id: 'good', range: [0, 50], label: 'Good', color: '#009966', icon: '🟢', advice: 'Air quality is satisfactory.' },
  { id: 'satisfactory', range: [51, 100], label: 'Moderate', color: '#FFDE33', icon: '🟡', advice: 'Acceptable. Sensitive individuals should reduce prolonged outdoor exertion.' },
  { id: 'moderate', range: [101, 150], label: 'Unhealthy for Sensitive Groups', color: '#FF9933', icon: '🟠', advice: 'Members of sensitive groups may experience health effects.' },
  { id: 'poor', range: [151, 200], label: 'Unhealthy', color: '#CC0033', icon: '🔴', advice: 'Everyone may begin to experience health effects.' },
  { id: 'very_poor', range: [201, 300], label: 'Very Unhealthy', color: '#660099', icon: '🟣', advice: 'Health alert: everyone may experience serious health effects.' },
  { id: 'severe', range: [301, 500], label: 'Hazardous', color: '#7E0023', icon: '⚫', advice: 'Health warning of emergency conditions.' },
];

export function getAqiCategory(aqi, scale = 'india_naqi') {
  const categories = scale === 'us_aqi' ? US_AQI_CATEGORIES : INDIA_NAQI_CATEGORIES;
  const val = Math.max(0, Math.round(Number(aqi) || 0));
  for (const cat of categories) {
    if (val >= cat.range[0] && val <= cat.range[1]) return cat;
  }
  return categories[categories.length - 1];
}

export const EVIDENCE_LEVELS = {
  strong: { label: 'Strong Evidence', color: 'green', icon: '✓✓', description: 'Supported by multiple peer-reviewed studies or reviews' },
  moderate: { label: 'Moderate Evidence', color: 'blue', icon: '✓', description: 'Supported by published studies and consensus guidance' },
  limited: { label: 'Limited Evidence', color: 'yellow', icon: '~', description: 'Weak or non-primary effect in real-world homes' },
  myth_busted: { label: 'Myth Busted', color: 'red', icon: '✗', description: 'Not supported by scientific evidence' },
};

export const EFFORT_LEVELS = {
  low: { label: 'Low Effort', color: 'green', icon: '⚡', description: 'Quick habit change' },
  medium: { label: 'Medium Effort', color: 'blue', icon: '⚡⚡', description: 'Requires planning or routine shift' },
  high: { label: 'High Effort', color: 'yellow', icon: '⚡⚡⚡', description: 'Major purchase or structural change' },
};

export const COST_TIERS = {
  free: { label: 'Free', color: 'green', icon: '₹0', description: 'No upfront spend' },
  under_500: { label: 'Under ₹500', color: 'green', icon: '₹', description: 'Low cost (estimate, verify locally)' },
  under_5000: { label: 'Under ₹5,000', color: 'blue', icon: '₹₹', description: 'Moderate cost (estimate, verify locally)' },
  above_5000: { label: '₹5,000+', color: 'yellow', icon: '₹₹₹', description: 'Higher investment (estimate, verify locally)' },
};

export const PRIORITY_TIERS = {
  do_now: { label: 'Do now (free)', order: 1, icon: '⚡', badge: 'green' },
  today: { label: 'Today', order: 2, icon: '🗓️', badge: 'teal' },
  this_week: { label: 'This week (low cost)', order: 3, icon: '🛠️', badge: 'blue' },
  later: { label: 'Later (investment)', order: 4, icon: '🏡', badge: 'yellow' },
};

export const WHO_GUIDELINES = assumptionsData.who2021;
export const DEFAULTS = assumptionsData.defaults;
export const CONSERVATIVE_UNKNOWNS = assumptionsData.defaults.conservativeUnknowns;
export const SAMPLE_SEVERE_SMOG = assumptionsData.sampleSevereSmog;
export const FAMILY_PROFILES = advisoriesData.familyProfiles;

export const PM25_THRESHOLDS = {
  good: 30,
  moderate: 60,
  elevated: 90,
  high: 120,
};

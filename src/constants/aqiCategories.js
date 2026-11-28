/**
 * @fileoverview AQI scales, CPCB India NAQI / US EPA breakpoints, and category lookup helper.
 */

/** CPCB India National Air Quality Index PM2.5 breakpoints (µg/m³ -> NAQI) */
export const INDIA_PM25_BREAKPOINTS = [
  [0, 30, 0, 50],
  [30.1, 60, 51, 100],
  [60.1, 90, 101, 200],
  [90.1, 120, 201, 300],
  [120.1, 250, 301, 400],
  [250.1, 500, 401, 500],
];

/** US EPA PM2.5 breakpoints (µg/m³ -> US AQI, updated 2024) */
export const US_PM25_BREAKPOINTS = [
  [0, 9.0, 0, 50],
  [9.1, 35.4, 51, 100],
  [35.5, 55.4, 101, 150],
  [55.5, 125.4, 151, 200],
  [125.5, 225.4, 201, 300],
  [225.5, 500.4, 301, 500],
];

const INDIA_NAQI_CATEGORIES = [
  {
    id: 'good',
    range: [0, 50],
    label: 'Good',
    color: '#009966',
    icon: '🟢',
    advice: 'Air quality is satisfactory. Enjoy outdoor activities freely.',
  },
  {
    id: 'satisfactory',
    range: [51, 100],
    label: 'Satisfactory',
    color: '#FFDE33',
    icon: '🟡',
    advice: 'Acceptable. Sensitive individuals should limit prolonged outdoor exertion.',
  },
  {
    id: 'moderate',
    range: [101, 200],
    label: 'Moderate',
    color: '#FF9933',
    icon: '🟠',
    advice: 'May cause breathing discomfort to people with lung or heart conditions.',
  },
  {
    id: 'poor',
    range: [201, 300],
    label: 'Poor',
    color: '#CC0033',
    icon: '🔴',
    advice: 'May cause breathing discomfort on prolonged exposure. Limit outdoor activities.',
  },
  {
    id: 'very_poor',
    range: [301, 400],
    label: 'Very Poor',
    color: '#660099',
    icon: '🟣',
    advice: 'May cause respiratory illness on prolonged exposure. Avoid outdoor exertion.',
  },
  {
    id: 'severe',
    range: [401, 500],
    label: 'Severe',
    color: '#7E0023',
    icon: '⚫',
    advice: 'Health emergency conditions: stay indoors and prioritize clean-room filtration.',
  },
];

const US_AQI_CATEGORIES = [
  {
    id: 'good',
    range: [0, 50],
    label: 'Good',
    color: '#009966',
    icon: '🟢',
    advice: 'Air quality is satisfactory.',
  },
  {
    id: 'satisfactory',
    range: [51, 100],
    label: 'Moderate',
    color: '#FFDE33',
    icon: '🟡',
    advice: 'Acceptable. Sensitive individuals should reduce prolonged outdoor exertion.',
  },
  {
    id: 'moderate',
    range: [101, 150],
    label: 'Unhealthy for Sensitive Groups',
    color: '#FF9933',
    icon: '🟠',
    advice: 'Members of sensitive groups may experience health effects.',
  },
  {
    id: 'poor',
    range: [151, 200],
    label: 'Unhealthy',
    color: '#CC0033',
    icon: '🔴',
    advice: 'Everyone may begin to experience health effects.',
  },
  {
    id: 'very_poor',
    range: [201, 300],
    label: 'Very Unhealthy',
    color: '#660099',
    icon: '🟣',
    advice: 'Health alert: everyone may experience serious health effects.',
  },
  {
    id: 'severe',
    range: [301, 500],
    label: 'Hazardous',
    color: '#7E0023',
    icon: '⚫',
    advice: 'Health warning of emergency conditions.',
  },
];

/**
 * Look up the AQI category metadata for a numeric AQI value.
 * @param {number} aqi - Numeric AQI reading.
 * @param {'india_naqi'|'us_aqi'} [scale='india_naqi'] - Active AQI scale.
 * @returns {Object} Matching AQI category object.
 */
export function getAqiCategory(aqi, scale = 'india_naqi') {
  const categories = scale === 'us_aqi' ? US_AQI_CATEGORIES : INDIA_NAQI_CATEGORIES;
  const clamped = Math.max(0, Math.round(Number(aqi) || 0));
  for (const cat of categories) {
    if (clamped >= cat.range[0] && clamped <= cat.range[1]) return cat;
  }
  return categories[categories.length - 1];
}

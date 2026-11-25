/**
 * Pure AQI & WHO Guideline Calculator — SmogGuard
 * Converts PM2.5 (µg/m³) to India NAQI (CPCB) and US AQI (EPA),
 * computes WHO 2021 24-hour guideline ratio, and calibrates hourly series
 * against a manual monitor reading.
 */

import { getAqiCategory, WHO_GUIDELINES } from '../data/constants.js';

/** CPCB India NAQI PM2.5 breakpoints (µg/m³ -> NAQI) */
const INDIA_PM25_BREAKPOINTS = [
  [0, 30, 0, 50],
  [30.1, 60, 51, 100],
  [60.1, 90, 101, 200],
  [90.1, 120, 201, 300],
  [120.1, 250, 301, 400],
  [250.1, 500, 401, 500],
];

/** US EPA PM2.5 breakpoints (µg/m³ -> US AQI, updated 2024) */
const US_PM25_BREAKPOINTS = [
  [0, 9.0, 0, 50],
  [9.1, 35.4, 51, 100],
  [35.5, 55.4, 101, 150],
  [55.5, 125.4, 151, 200],
  [125.5, 225.4, 201, 300],
  [225.5, 500.4, 301, 500],
];

function interpolateLinear(conc, breakpoints) {
  const c = Math.max(0, Number(conc) || 0);
  for (const [cLow, cHigh, iLow, iHigh] of breakpoints) {
    if (c <= cHigh) {
      const clamped = Math.max(cLow, c);
      return Math.round(((iHigh - iLow) / (cHigh - cLow)) * (clamped - cLow) + iLow);
    }
  }
  return 500;
}

/**
 * Convert PM2.5 (µg/m³) to India NAQI or US AQI.
 * @param {number} pm25
 * @param {'india_naqi'|'us_aqi'} scale
 * @returns {number}
 */
export function pm25ToAqi(pm25, scale = 'india_naqi') {
  const bps = scale === 'us_aqi' ? US_PM25_BREAKPOINTS : INDIA_PM25_BREAKPOINTS;
  return interpolateLinear(pm25, bps);
}

/**
 * Inverse estimate: convert AQI back to approximate PM2.5 (µg/m³).
 * Useful when calibrating with a monitor reporting AQI instead of raw PM2.5.
 */
export function aqiToApproxPm25(aqi, scale = 'india_naqi') {
  const i = Math.max(0, Math.min(500, Number(aqi) || 0));
  const bps = scale === 'us_aqi' ? US_PM25_BREAKPOINTS : INDIA_PM25_BREAKPOINTS;
  for (const [cLow, cHigh, iLow, iHigh] of bps) {
    if (i <= iHigh) {
      const clamped = Math.max(iLow, i);
      return Math.round((((clamped - iLow) / (iHigh - iLow)) * (cHigh - cLow) + cLow) * 10) / 10;
    }
  }
  return 350;
}

/**
 * Compute full AQI metrics for a PM2.5 reading.
 * @param {number} pm25
 * @param {'india_naqi'|'us_aqi'} scale
 */
export function evaluateAqi(pm25, scale = 'india_naqi') {
  const safePm25 = Math.max(0, Number(pm25) || 0);
  const aqi = pm25ToAqi(safePm25, scale);
  const category = getAqiCategory(aqi, scale);
  const whoGuideline24h = WHO_GUIDELINES.pm25_24h_ugm3; // 15 µg/m³
  const whoRatio = Math.round((safePm25 / whoGuideline24h) * 10) / 10;

  return {
    pm25: Math.round(safePm25 * 10) / 10,
    aqi,
    scale,
    category,
    whoGuideline24h,
    whoRatio,
  };
}

/**
 * Calibrate a 24-hour PM2.5 series using a user's manual monitor reading at the current hour.
 * Preserves diurnal shape while scaling smoothly (clamped to avoid absurd distortion).
 */
export function calibrateHourlyPm25(hourlyData, monitorPm25, referenceHour = 12) {
  if (!Array.isArray(hourlyData) || hourlyData.length === 0) return [];
  const target = Math.max(0, Number(monitorPm25));
  if (!Number.isFinite(target)) return hourlyData;

  const refEntry = hourlyData.find((d) => d.hour === referenceHour) || hourlyData[0];
  const baseAtHour = Math.max(1, Number(refEntry?.pm25) || 1);
  const ratio = Math.min(10, Math.max(0.1, target / baseAtHour));

  return hourlyData.map((d) => ({
    ...d,
    pm25: Math.round(d.pm25 * ratio * 10) / 10,
  }));
}

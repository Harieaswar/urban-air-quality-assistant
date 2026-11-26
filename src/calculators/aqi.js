/**
 * @fileoverview Pure AQI conversion, WHO 2021 guideline ratio, and monitor calibration helpers.
 */

import { getAqiCategory, WHO_GUIDELINES, DEFAULTS, API_CONFIG } from '../data/constants.js';

/** CPCB India NAQI PM2.5 breakpoints (µg/m³ -> NAQI) */
const INDIA_PM25_BREAKPOINTS = [
  [0, 30, 0, 50],
  [30.1, 60, 51, 100],
  [60.1, 90, 101, 200],
  [90.1, 120, 201, 300],
  [120.1, 250, 301, 400],
  [250.1, 500, 401, 500],
];

/** US EPA PM2.5 breakpoints (µg/m³ -> US AQI) */
const US_PM25_BREAKPOINTS = [
  [0, 9.0, 0, 50],
  [9.1, 35.4, 51, 100],
  [35.5, 55.4, 101, 150],
  [55.5, 125.4, 151, 200],
  [125.5, 225.4, 201, 300],
  [225.5, 500.4, 301, 500],
];

const SEVERE_FALLBACK_PM25 = 350;

function interpolateLinear(conc, breakpoints) {
  const c = Math.max(0, Number(conc) || 0);
  for (const [cLow, cHigh, iLow, iHigh] of breakpoints) {
    if (c <= cHigh) {
      const clamped = Math.max(cLow, c);
      return Math.round(((iHigh - iLow) / (cHigh - cLow)) * (clamped - cLow) + iLow);
    }
  }
  return API_CONFIG.MAX_AQI;
}

/**
 * Convert PM2.5 concentration (µg/m³) into India NAQI or US AQI.
 * @param {number} pm25 - Particulate matter 2.5 concentration.
 * @param {'india_naqi'|'us_aqi'} [scale='india_naqi'] - Target AQI scale.
 * @returns {number} Computed integer AQI.
 */
export function pm25ToAqi(pm25, scale = 'india_naqi') {
  const bps = scale === 'us_aqi' ? US_PM25_BREAKPOINTS : INDIA_PM25_BREAKPOINTS;
  return interpolateLinear(pm25, bps);
}

/**
 * Invert an AQI value back to an approximate PM2.5 concentration (µg/m³).
 * @param {number} aqi - Numeric AQI reading.
 * @param {'india_naqi'|'us_aqi'} [scale='india_naqi'] - Source AQI scale.
 * @returns {number} Estimated PM2.5 (µg/m³).
 */
export function aqiToApproxPm25(aqi, scale = 'india_naqi') {
  const i = Math.max(API_CONFIG.MIN_AQI, Math.min(API_CONFIG.MAX_AQI, Number(aqi) || 0));
  const bps = scale === 'us_aqi' ? US_PM25_BREAKPOINTS : INDIA_PM25_BREAKPOINTS;
  for (const [cLow, cHigh, iLow, iHigh] of bps) {
    if (i <= iHigh) {
      const clamped = Math.max(iLow, i);
      return Math.round((((clamped - iLow) / (iHigh - iLow)) * (cHigh - cLow) + cLow) * 10) / 10;
    }
  }
  return SEVERE_FALLBACK_PM25;
}

/**
 * Evaluate AQI, category metadata, and WHO 2021 24-hour guideline ratio for PM2.5.
 * @param {number} pm25 - PM2.5 concentration (µg/m³).
 * @param {'india_naqi'|'us_aqi'} [scale='india_naqi'] - Active AQI scale.
 * @returns {Object} Full AQI evaluation result.
 */
export function evaluateAqi(pm25, scale = 'india_naqi') {
  const safePm25 = Math.max(0, Number(pm25) || 0);
  const aqi = pm25ToAqi(safePm25, scale);
  const category = getAqiCategory(aqi, scale);
  const whoGuideline24h = WHO_GUIDELINES.pm25_24h_ugm3;
  const whoRatio = Math.round((safePm25 / whoGuideline24h) * 10) / 10;

  return { pm25: Math.round(safePm25 * 10) / 10, aqi, scale, category, whoGuideline24h, whoRatio };
}

/**
 * Scale a 24-hour PM2.5 curve using a handheld/indoor monitor reading at the reference hour.
 * @param {Array<{hour: number, pm25: number}>} hourlyData - 24-hour forecast points.
 * @param {number} monitorPm25 - Calibrated PM2.5 reading.
 * @param {number} [referenceHour=12] - Hour corresponding to the monitor reading.
 * @returns {Array<{hour: number, pm25: number}>} Calibrated 24-hour series.
 */
export function calibrateHourlyPm25(hourlyData, monitorPm25, referenceHour = 12) {
  if (!Array.isArray(hourlyData) || hourlyData.length === 0) return [];
  const target = Math.max(0, Number(monitorPm25));
  if (!Number.isFinite(target)) return hourlyData;

  const refEntry = hourlyData.find((d) => d.hour === referenceHour) || hourlyData[0];
  const baseAtHour = Math.max(1, Number(refEntry?.pm25) || 1);
  const ratio = Math.min(
    DEFAULTS.maxPm25CalibrationRatio,
    Math.max(DEFAULTS.minPm25CalibrationRatio, target / baseAtHour)
  );

  return hourlyData.map((d) => ({ ...d, pm25: Math.round(d.pm25 * ratio * 10) / 10 }));
}

/**
 * Resolve effective current PM2.5 and calibrated 24-hour series from air state + active scale.
 * Eliminates duplication across LandingPage, AqiHeroCard, and ReportPage.
 * @param {Object} airData - Stored air-quality payload.
 * @param {Object} calibration - Monitor calibration object `{ enabled, mode, value }`.
 * @param {'india_naqi'|'us_aqi'} aqiScale - Active AQI scale.
 * @param {number} [referenceHour] - Current clock hour (0–23).
 * @returns {{ effectiveHourly: Array, effectivePm25: number }} Resolved air metrics.
 */
export function resolveEffectiveAirSeries(
  airData,
  calibration,
  aqiScale,
  referenceHour = new Date().getHours()
) {
  const rawHourly = airData?.hourlyData || [];
  const calibratedPm25 =
    calibration?.enabled && calibration?.value != null
      ? calibration.mode === 'aqi'
        ? aqiToApproxPm25(calibration.value, aqiScale)
        : Number(calibration.value)
      : null;

  const effectiveHourly =
    calibratedPm25 != null
      ? calibrateHourlyPm25(rawHourly, calibratedPm25, referenceHour)
      : rawHourly;

  const effectivePm25 =
    calibratedPm25 != null
      ? calibratedPm25
      : (airData?.currentPm25 ?? effectiveHourly[0]?.pm25 ?? 0);

  return { effectiveHourly, effectivePm25 };
}

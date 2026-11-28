/**
 * @fileoverview Pure AQI conversion, WHO 2021 guideline ratio, and monitor calibration helpers.
 */

import {
  BOUNDS,
  DEFAULTS,
  INDIA_PM25_BREAKPOINTS,
  TIME_UNITS,
  US_PM25_BREAKPOINTS,
  WHO_GUIDELINES,
  getAqiCategory,
} from '../constants/index.js';
import { roundToTenths } from '../utils/resolve.js';

function interpolateLinear(conc, breakpoints) {
  const c = Math.max(0, Number(conc) || 0);
  for (const [cLow, cHigh, iLow, iHigh] of breakpoints) {
    if (c <= cHigh) {
      const clamped = Math.max(cLow, c);
      return Math.round(((iHigh - iLow) / (cHigh - cLow)) * (clamped - cLow) + iLow);
    }
  }
  return BOUNDS.MAX_AQI;
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
  const i = Math.max(BOUNDS.MIN_AQI, Math.min(BOUNDS.MAX_AQI, Number(aqi) || 0));
  const bps = scale === 'us_aqi' ? US_PM25_BREAKPOINTS : INDIA_PM25_BREAKPOINTS;
  for (const [cLow, cHigh, iLow, iHigh] of bps) {
    if (i <= iHigh) {
      const clamped = Math.max(iLow, i);
      return roundToTenths(((clamped - iLow) / (iHigh - iLow)) * (cHigh - cLow) + cLow);
    }
  }
  return BOUNDS.SEVERE_FALLBACK_PM25;
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
  const whoRatio = roundToTenths(safePm25 / whoGuideline24h);

  return { pm25: roundToTenths(safePm25), aqi, scale, category, whoGuideline24h, whoRatio };
}

/**
 * Scale a 24-hour PM2.5 curve using a handheld/indoor monitor reading at the reference hour.
 * @param {Array<{hour: number, pm25: number}>} hourlyData - 24-hour forecast points.
 * @param {number} monitorPm25 - Calibrated PM2.5 reading.
 * @param {number} [referenceHour=12] - Hour corresponding to the monitor reading.
 * @returns {Array<{hour: number, pm25: number}>} Calibrated 24-hour series.
 */
export function calibrateHourlyPm25(hourlyData, monitorPm25, referenceHour = TIME_UNITS.NOON_HOUR) {
  if (!Array.isArray(hourlyData) || hourlyData.length === 0) return [];
  const target = Math.max(0, Number(monitorPm25));
  if (!Number.isFinite(target)) return hourlyData;

  const refEntry = hourlyData.find((d) => d.hour === referenceHour) || hourlyData[0];
  const baseAtHour = Math.max(1, Number(refEntry?.pm25) || 1);
  const ratio = Math.min(
    DEFAULTS.maxPm25CalibrationRatio,
    Math.max(DEFAULTS.minPm25CalibrationRatio, target / baseAtHour)
  );

  return hourlyData.map((d) => ({ ...d, pm25: roundToTenths(d.pm25 * ratio) }));
}

function resolveMonitorTargetPm25(calibration, aqiScale) {
  if (!calibration?.enabled || calibration?.value === null || calibration?.value === undefined) {
    return null;
  }
  if (calibration.mode === 'aqi') {
    return aqiToApproxPm25(calibration.value, aqiScale);
  }
  return Number(calibration.value);
}

/**
 * Resolve effective current PM2.5 and calibrated 24-hour series from air state + active scale.
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
  const calibratedPm25 = resolveMonitorTargetPm25(calibration, aqiScale);
  const effectiveHourly =
    calibratedPm25 !== null
      ? calibrateHourlyPm25(rawHourly, calibratedPm25, referenceHour)
      : rawHourly;
  const effectivePm25 =
    calibratedPm25 !== null
      ? calibratedPm25
      : (airData?.currentPm25 ?? effectiveHourly[0]?.pm25 ?? 0);

  return { effectiveHourly, effectivePm25 };
}

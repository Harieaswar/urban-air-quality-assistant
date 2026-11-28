/**
 * @fileoverview LocalStorage caching and offline/manual fallback payload builders for Open-Meteo.
 */

import { API_CONFIG, SAMPLE_SEVERE_SMOG, TIME_UNITS } from '../constants/index.js';
import { StorageAccessError } from './errors.js';

export const CACHE_KEY_PREFIX = API_CONFIG.CACHE_KEY_PREFIX;
export const CACHE_TTL_MS = API_CONFIG.CACHE_TTL_MS;

const ROUND_DECIMALS = API_CONFIG.COORD_ROUND_SCALE;

/**
 * Round latitude or longitude to 0.1 degrees (~11 km) for privacy.
 * @param {number|string} value - Coordinate value.
 * @returns {number} Coordinate rounded to 0.1 degrees.
 */
export function roundCoordinate(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num * ROUND_DECIMALS) / ROUND_DECIMALS;
}

/**
 * Build deterministic cache key for a rounded coordinate pair.
 * @param {number} lat - Latitude.
 * @param {number} lon - Longitude.
 * @returns {string} Storage key.
 */
function getCacheKey(lat, lon) {
  return `${CACHE_KEY_PREFIX}${roundCoordinate(lat).toFixed(1)}_${roundCoordinate(lon).toFixed(1)}`;
}

/**
 * Format cache age into a human-readable relative label.
 * @param {number} timestampMs - Epoch timestamp when payload was fetched.
 * @returns {string} Relative age text.
 */
export function formatCacheAge(timestampMs) {
  const diffMin = Math.max(0, Math.round((Date.now() - timestampMs) / TIME_UNITS.MS_PER_MINUTE));
  if (diffMin < 1) return 'just now';
  if (diffMin === 1) return '1 min ago';
  if (diffMin < TIME_UNITS.MINUTES_PER_HOUR) return `${diffMin} mins ago`;
  const hours = Math.round(diffMin / TIME_UNITS.MINUTES_PER_HOUR);
  return `${hours} hr${hours > 1 ? 's' : ''} ago`;
}

/**
 * Read cached air-quality entry from localStorage (returns stale entries flagged with `isFresh: false`).
 * Returns structured `{ payload, error }` rather than throwing or failing silently.
 * @param {number} lat - Latitude.
 * @param {number} lon - Longitude.
 * @returns {Object|null} Cached payload with `isFresh`, `ageLabel`, or null if missing/corrupted.
 */
export function readCachedAirData(lat, lon) {
  const key = getCacheKey(lat, lon);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.hourlyData) || parsed.hourlyData.length === 0) {
      return null;
    }
    const ageMs = Date.now() - parsed.fetchedAt;
    return {
      ...parsed,
      isFresh: ageMs <= CACHE_TTL_MS,
      ageLabel: formatCacheAge(parsed.fetchedAt),
    };
  } catch (error) {
    localStorage.removeItem(key);
    return { corrupted: true, error: new StorageAccessError('Discarded unreadable cache', error) };
  }
}

/**
 * Persist an air-quality payload in localStorage under its rounded coordinate key.
 * @param {number} lat - Latitude.
 * @param {number} lon - Longitude.
 * @param {Object} payload - Air-quality data object.
 * @returns {{ ok: boolean, error: StorageAccessError|null }} Persistence status.
 */
export function writeCachedAirData(lat, lon, payload) {
  const key = getCacheKey(lat, lon);
  try {
    localStorage.setItem(key, JSON.stringify(payload));
    return { ok: true, error: null };
  } catch (error) {
    return {
      ok: false,
      error: new StorageAccessError('Browser storage quota prevented caching air data.', error),
    };
  }
}

/**
 * Build the illustrative Sample Severe-Smog Day fallback payload.
 * @returns {Object} Sample air-quality payload.
 */
export function buildSampleSevereSmogData() {
  const now = Date.now();
  const hourlyData = SAMPLE_SEVERE_SMOG.hourlyPm25.map((pm25, hour) => ({
    hour,
    pm25,
    timeLabel: `${String(hour).padStart(2, '0')}:00`,
  }));
  const currentHour = new Date().getHours();
  return {
    mode: 'sample_demo',
    locationName: SAMPLE_SEVERE_SMOG.locationName,
    roundedLat: SAMPLE_SEVERE_SMOG.lat,
    roundedLon: SAMPLE_SEVERE_SMOG.lon,
    hourlyData,
    currentPm25: hourlyData[currentHour]?.pm25 ?? hourlyData[0].pm25,
    weather: SAMPLE_SEVERE_SMOG.weather,
    source: SAMPLE_SEVERE_SMOG.source,
    fetchedAt: now,
    timestampIso: new Date(now).toISOString(),
    isFallback: true,
    notice: 'Showing Sample Severe-Smog Day demo dataset (illustrative winter smog episode).',
  };
}

/**
 * Build a user-entered manual PM2.5 fallback payload.
 * @param {{ pm25: number, locationName?: string, lat?: number|null, lon?: number|null }} params - Manual inputs.
 * @returns {Object} Manual air-quality payload.
 */
export function buildManualAirData({
  pm25,
  locationName = 'Manual Reading',
  lat = null,
  lon = null,
}) {
  const value = Math.max(0, Math.round(Number(pm25) || 0));
  const now = Date.now();
  const hourlyData = Array.from({ length: API_CONFIG.FORECAST_HOURS }, (_, hour) => ({
    hour,
    pm25: value,
    timeLabel: `${String(hour).padStart(2, '0')}:00`,
  }));
  return {
    mode: 'manual',
    locationName,
    roundedLat: lat !== null && lat !== undefined ? roundCoordinate(lat) : null,
    roundedLon: lon !== null && lon !== undefined ? roundCoordinate(lon) : null,
    hourlyData,
    currentPm25: value,
    weather: null,
    source: 'Manual PM2.5 / Monitor Entry (user-provided)',
    fetchedAt: now,
    timestampIso: new Date(now).toISOString(),
    isFallback: true,
    notice: `Using your manual PM2.5 reading (${value} µg/m³). Hourly curve reflects this steady manual baseline until live forecast is available.`,
  };
}

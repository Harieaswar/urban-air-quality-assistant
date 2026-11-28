/**
 * @fileoverview Keyless Open-Meteo Air Quality (CAMS) and Weather browser service with ordered fallbacks.
 */

import { API_CONFIG } from '../constants/index.js';
import {
  CACHE_KEY_PREFIX,
  roundCoordinate,
  readCachedAirData,
  writeCachedAirData,
  buildSampleSevereSmogData,
  buildManualAirData,
} from './airCache.js';
import { ApiRequestError } from './errors.js';
import { OPEN_METEO_HOSTS, fetchWithTimeout, searchPlaces } from './geocodingClient.js';

export {
  CACHE_KEY_PREFIX,
  searchPlaces,
  roundCoordinate,
  readCachedAirData,
  buildSampleSevereSmogData,
  buildManualAirData,
};

function normalizeHourlyResponse(aqRes) {
  const times = aqRes?.hourly?.time;
  const pm25Arr = aqRes?.hourly?.pm2_5;
  const pm10Arr = aqRes?.hourly?.pm10;
  if (!Array.isArray(pm25Arr) || pm25Arr.length === 0) {
    throw new ApiRequestError('Open-Meteo returned empty PM2.5 hourly data.', 'MALFORMED_DATA');
  }
  const scale = API_CONFIG.COORD_ROUND_SCALE;
  return pm25Arr.slice(0, API_CONFIG.FORECAST_HOURS).map((rawPm25, idx) => {
    const iso = Array.isArray(times) && times[idx] ? times[idx] : '';
    const parsedHour = iso
      ? Number(iso.slice(API_CONFIG.ISO_HOUR_START, API_CONFIG.ISO_HOUR_END))
      : idx;
    const hour = Number.isFinite(parsedHour) ? parsedHour : idx;
    const pm10Val = pm10Arr?.[idx];
    return {
      hour,
      pm25: Math.max(0, Math.round(Number(rawPm25 ?? 0) * scale) / scale),
      pm10: pm10Val !== null && pm10Val !== undefined ? Math.round(Number(pm10Val)) : null,
      timeLabel: `${String(hour).padStart(2, '0')}:00`,
    };
  });
}

function resolveFailureReason(error) {
  if (error?.code === 'RATE_LIMIT') return 'Open-Meteo rate limit reached.';
  if (error?.code === 'TIMEOUT' || error?.message?.includes('timed out')) {
    return 'Open-Meteo request timed out after 8 seconds.';
  }
  return 'Could not reach Open-Meteo (offline or service error).';
}

function isUsablePm25(value) {
  return (
    value !== null && value !== undefined && Number.isFinite(Number(value)) && Number(value) >= 0
  );
}

function selectFailureFallback(
  reason,
  { cached, manualPm25, locationName, roundedLat, roundedLon }
) {
  if (cached && !cached.corrupted) {
    return {
      ...cached,
      mode: 'cached_fallback',
      source: `${cached.source} (cached ${cached.ageLabel})`,
      isFallback: true,
      notice: `${reason} Showing previously cached forecast from ${cached.ageLabel}.`,
    };
  }
  if (isUsablePm25(manualPm25)) {
    const manual = buildManualAirData({
      pm25: manualPm25,
      locationName,
      lat: roundedLat,
      lon: roundedLon,
    });
    return {
      ...manual,
      notice: `${reason} Using your manual PM2.5 reading (${manual.currentPm25} µg/m³).`,
    };
  }
  const sample = buildSampleSevereSmogData();
  return {
    ...sample,
    notice: `${reason} Showing Sample Severe-Smog Day demo until live or manual data is entered.`,
  };
}

function extractWeatherSnapshot(wxRes) {
  if (!wxRes?.current) return null;
  return {
    temperatureC: wxRes.current.temperature_2m ?? null,
    humidityPct: wxRes.current.relative_humidity_2m ?? null,
    windSpeedKmh: wxRes.current.wind_speed_10m ?? null,
  };
}

function buildFreshCacheHit(cached, roundedLat, roundedLon) {
  return {
    ...cached,
    mode: 'cached_fresh',
    source: `${cached.source} (cached ${cached.ageLabel})`,
    isFallback: false,
    notice: `Loaded from 30-minute local cache (${cached.ageLabel}) for rounded coordinates (${roundedLat.toFixed(1)}°, ${roundedLon.toFixed(1)}°).`,
  };
}

async function fetchLiveBundle({ roundedLat, roundedLon, locationName, signal }) {
  const aqUrl = `${OPEN_METEO_HOSTS.airQuality}?latitude=${roundedLat}&longitude=${roundedLon}&hourly=pm2_5,pm10&forecast_days=1&timezone=auto`;
  const wxUrl = `${OPEN_METEO_HOSTS.weather}?latitude=${roundedLat}&longitude=${roundedLon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m&timezone=auto`;
  const [aqRes, wxOutcome] = await Promise.all([
    fetchWithTimeout(aqUrl, signal),
    fetchWithTimeout(wxUrl, signal).catch((wxErr) => ({ weatherError: wxErr })),
  ]);

  const hourlyData = normalizeHourlyResponse(aqRes);
  const currentEntry = hourlyData.find((e) => e.hour === new Date().getHours()) || hourlyData[0];
  const now = Date.now();
  return {
    mode: 'live',
    locationName,
    roundedLat,
    roundedLon,
    hourlyData,
    currentPm25: currentEntry?.pm25 ?? 0,
    weather: wxOutcome?.weatherError ? null : extractWeatherSnapshot(wxOutcome),
    source: 'Open-Meteo Air Quality (CAMS CC BY 4.0) & Open-Meteo Weather',
    fetchedAt: now,
    timestampIso: new Date(now).toISOString(),
    isFallback: false,
    notice: wxOutcome?.weatherError
      ? 'Live PM2.5 loaded; weather summary temporarily unavailable.'
      : null,
  };
}

/**
 * Fetch 24-hour CAMS PM2.5 forecast and current weather from Open-Meteo for rounded coordinates.
 * Falls back in order: cached data (with age) -> manual PM2.5 -> Sample Severe-Smog Day.
 * @param {number} lat - Latitude.
 * @param {number} lon - Longitude.
 * @param {{ locationName?: string, signal?: AbortSignal, forceRefresh?: boolean, manualPm25?: number|null }} [options={}] - Options.
 * @returns {Promise<Object>} Resolved air-quality and weather payload.
 */
export async function fetchAirAndWeather(lat, lon, options = {}) {
  const {
    locationName = 'Selected Location',
    signal,
    forceRefresh = false,
    manualPm25 = null,
  } = options;
  const roundedLat = roundCoordinate(lat);
  const roundedLon = roundCoordinate(lon);
  const cached = readCachedAirData(roundedLat, roundedLon);

  if (cached && !cached.corrupted && cached.isFresh && !forceRefresh) {
    return buildFreshCacheHit(cached, roundedLat, roundedLon);
  }

  try {
    const payload = await fetchLiveBundle({ roundedLat, roundedLon, locationName, signal });
    writeCachedAirData(roundedLat, roundedLon, payload);
    return payload;
  } catch (error) {
    if (error?.name === 'AbortError' && signal?.aborted) throw error;
    return selectFailureFallback(resolveFailureReason(error), {
      cached,
      manualPm25,
      locationName,
      roundedLat,
      roundedLon,
    });
  }
}

/**
 * @fileoverview Keyless browser client for Open-Meteo Geocoding, Air Quality (CAMS), and Weather APIs.
 */

import { API_CONFIG } from '../data/constants.js';
import {
  CACHE_KEY_PREFIX,
  roundCoordinate,
  readCachedAirData,
  writeCachedAirData,
  buildSampleSevereSmogData,
  buildManualAirData,
} from './airCache.js';

export {
  CACHE_KEY_PREFIX,
  roundCoordinate,
  readCachedAirData,
  buildSampleSevereSmogData,
  buildManualAirData,
};

export const OPEN_METEO_HOSTS = {
  geocoding: 'https://geocoding-api.open-meteo.com/v1/search',
  airQuality: 'https://air-quality-api.open-meteo.com/v1/air-quality',
  weather: 'https://api.open-meteo.com/v1/forecast',
};

/**
 * Execute a fetch request with an 8-second timeout and external AbortSignal chaining.
 * @param {string} url - Target Open-Meteo URL.
 * @param {AbortSignal} [externalSignal] - Optional caller abort signal.
 * @param {number} [timeoutMs=8000] - Request timeout in milliseconds.
 * @returns {Promise<Object>} Parsed JSON response body.
 */
async function fetchWithTimeout(url, externalSignal, timeoutMs = API_CONFIG.REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(new Error('Request timed out after 8s')),
    timeoutMs
  );

  const onExternalAbort = () => controller.abort(externalSignal?.reason);
  if (externalSignal) {
    if (externalSignal.aborted) {
      clearTimeout(timer);
      throw new DOMException('Aborted', 'AbortError');
    }
    externalSignal.addEventListener('abort', onExternalAbort, { once: true });
  }

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (response.status === 429) {
      const err = new Error('Open-Meteo rate limit reached (HTTP 429).');
      err.code = 'RATE_LIMIT';
      throw err;
    }
    if (!response.ok) {
      const err = new Error(`Open-Meteo HTTP error ${response.status}`);
      err.code = 'HTTP_ERROR';
      throw err;
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
    if (externalSignal) externalSignal.removeEventListener('abort', onExternalAbort);
  }
}

/**
 * Search places via Open-Meteo Geocoding API (minimum 2 characters).
 * @param {string} query - Search query string.
 * @param {{ signal?: AbortSignal }} [options={}] - Optional abort signal.
 * @returns {Promise<{ status: string, results: Array, message?: string }>} Search outcome.
 */
export async function searchPlaces(query, { signal } = {}) {
  const cleaned = String(query || '').trim();
  if (cleaned.length < API_CONFIG.GEOCODING_MIN_CHARS) {
    return { status: 'too_short', results: [] };
  }

  const url = `${OPEN_METEO_HOSTS.geocoding}?name=${encodeURIComponent(cleaned)}&count=${API_CONFIG.GEOCODING_LIMIT}&language=en&format=json`;
  try {
    const data = await fetchWithTimeout(url, signal);
    const raw = Array.isArray(data?.results) ? data.results : [];
    if (raw.length === 0) {
      return { status: 'empty', results: [], message: 'No matches' };
    }
    const results = raw.map((item) => ({
      id: item.id || `${item.latitude}_${item.longitude}`,
      name: item.name,
      admin1: item.admin1 || '',
      country: item.country || '',
      lat: roundCoordinate(item.latitude),
      lon: roundCoordinate(item.longitude),
      displayName: [item.name, item.admin1, item.country].filter(Boolean).join(', '),
    }));
    return { status: 'ok', results };
  } catch (err) {
    if (err?.name === 'AbortError' && signal?.aborted) {
      throw err;
    }
    return {
      status: 'unavailable',
      results: [],
      message: 'Search unavailable, enter coordinates manually',
    };
  }
}

function normalizeHourlyResponse(aqRes) {
  const times = aqRes?.hourly?.time;
  const pm25Arr = aqRes?.hourly?.pm2_5;
  const pm10Arr = aqRes?.hourly?.pm10;
  if (!Array.isArray(pm25Arr) || pm25Arr.length === 0) {
    throw new Error('Open-Meteo returned empty PM2.5 hourly data');
  }
  return pm25Arr.slice(0, API_CONFIG.FORECAST_HOURS).map((val, idx) => {
    const iso = Array.isArray(times) && times[idx] ? times[idx] : '';
    const parsedHour = iso ? Number(iso.slice(11, 13)) : idx;
    const hour = Number.isFinite(parsedHour) ? parsedHour : idx;
    return {
      hour,
      pm25: Math.max(0, Math.round(Number(val ?? 0) * 10) / 10),
      pm10:
        Array.isArray(pm10Arr) && pm10Arr[idx] != null ? Math.round(Number(pm10Arr[idx])) : null,
      timeLabel: `${String(hour).padStart(2, '0')}:00`,
    };
  });
}

function selectFailureFallback(reason, { cached, manualPm25, locationName, rLat, rLon }) {
  if (cached) {
    return {
      ...cached,
      mode: 'cached_fallback',
      source: `${cached.source} (cached ${cached.ageLabel})`,
      isFallback: true,
      notice: `${reason} Showing previously cached forecast from ${cached.ageLabel}.`,
    };
  }
  if (manualPm25 != null && Number.isFinite(Number(manualPm25)) && Number(manualPm25) >= 0) {
    const manual = buildManualAirData({ pm25: manualPm25, locationName, lat: rLat, lon: rLon });
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

/**
 * Fetch 24-hour CAMS PM2.5 forecast and current weather from Open-Meteo for rounded coordinates.
 * Falls back in order: cached data (with age) -> manual PM2.5 -> Sample Severe-Smog Day.
 * @param {number} lat - Latitude.
 * @param {number} lon - Longitude.
 * @param {{ locationName?: string, signal?: AbortSignal, forceRefresh?: boolean, manualPm25?: number|null }} [options={}] - Options.
 * @returns {Promise<Object>} Air-quality and weather payload.
 */
export async function fetchAirAndWeather(lat, lon, options = {}) {
  const {
    locationName = 'Selected Location',
    signal,
    forceRefresh = false,
    manualPm25 = null,
  } = options;
  const rLat = roundCoordinate(lat);
  const rLon = roundCoordinate(lon);

  const cached = readCachedAirData(rLat, rLon);
  if (cached && cached.isFresh && !forceRefresh) {
    return {
      ...cached,
      mode: 'cached_fresh',
      source: `${cached.source} (cached ${cached.ageLabel})`,
      isFallback: false,
      notice: `Loaded from 30-minute local cache (${cached.ageLabel}) for rounded coordinates (${rLat.toFixed(1)}°, ${rLon.toFixed(1)}°).`,
    };
  }

  const aqUrl = `${OPEN_METEO_HOSTS.airQuality}?latitude=${rLat}&longitude=${rLon}&hourly=pm2_5,pm10&forecast_days=1&timezone=auto`;
  const wxUrl = `${OPEN_METEO_HOSTS.weather}?latitude=${rLat}&longitude=${rLon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m&timezone=auto`;

  try {
    const [aqRes, wxRes] = await Promise.all([
      fetchWithTimeout(aqUrl, signal),
      fetchWithTimeout(wxUrl, signal).catch((wxErr) => {
        console.warn('Weather context fetch failed; continuing with AQ data:', wxErr);
        return null;
      }),
    ]);

    const hourlyData = normalizeHourlyResponse(aqRes);
    const currentHour = new Date().getHours();
    const currentEntry = hourlyData.find((d) => d.hour === currentHour) || hourlyData[0];
    const weather = wxRes?.current
      ? {
          temperatureC: wxRes.current.temperature_2m ?? null,
          humidityPct: wxRes.current.relative_humidity_2m ?? null,
          windSpeedKmh: wxRes.current.wind_speed_10m ?? null,
        }
      : null;

    const now = Date.now();
    const payload = {
      mode: 'live',
      locationName,
      roundedLat: rLat,
      roundedLon: rLon,
      hourlyData,
      currentPm25: currentEntry?.pm25 ?? 0,
      weather,
      source: 'Open-Meteo Air Quality (CAMS CC BY 4.0) & Open-Meteo Weather',
      fetchedAt: now,
      timestampIso: new Date(now).toISOString(),
      isFallback: false,
      notice: null,
    };

    writeCachedAirData(rLat, rLon, payload);
    return payload;
  } catch (err) {
    if (err?.name === 'AbortError' && signal?.aborted) {
      throw err;
    }
    const reason =
      err?.code === 'RATE_LIMIT'
        ? 'Open-Meteo rate limit reached.'
        : err?.message?.includes('timed out')
          ? 'Open-Meteo request timed out after 8 seconds.'
          : 'Could not reach Open-Meteo (offline or service error).';
    return selectFailureFallback(reason, { cached, manualPm25, locationName, rLat, rLon });
  }
}

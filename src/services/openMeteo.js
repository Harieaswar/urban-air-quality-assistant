/**
 * Open-Meteo Browser Client — SmogGuard
 * Public, keyless browser calls ONLY to:
 * - https://geocoding-api.open-meteo.com
 * - https://air-quality-api.open-meteo.com
 * - https://api.open-meteo.com
 *
 * Includes 0.1° coordinate rounding (privacy), 30-min localStorage caching,
 * 8-second AbortController timeouts, HTTP/429 handling, and ordered fallback chain:
 *   1. Live Open-Meteo API
 *   2. Cached data (labeled with age)
 *   3. Manual PM2.5 / AQI entry
 *   4. Sample severe-smog day demo
 */

import { SAMPLE_SEVERE_SMOG } from '../data/constants.js';

export const OPEN_METEO_HOSTS = {
  geocoding: 'https://geocoding-api.open-meteo.com/v1/search',
  airQuality: 'https://air-quality-api.open-meteo.com/v1/air-quality',
  weather: 'https://api.open-meteo.com/v1/forecast',
};

export const CACHE_KEY_PREFIX = 'smogguard_aq_cache_v1_';
export const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
export const REQUEST_TIMEOUT_MS = 8000; // 8 seconds

/**
 * Round latitude or longitude to 0.1 degrees (~11 km) before any API request.
 * @param {number} value
 * @returns {number}
 */
export function roundCoordinate(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num * 10) / 10;
}

/**
 * Build cache key from rounded coordinates.
 */
export function getCacheKey(lat, lon) {
  return `${CACHE_KEY_PREFIX}${roundCoordinate(lat).toFixed(1)}_${roundCoordinate(lon).toFixed(1)}`;
}

/**
 * Format age in human-readable form.
 * @param {number} timestampMs
 * @returns {string}
 */
export function formatCacheAge(timestampMs) {
  const diffMin = Math.max(0, Math.round((Date.now() - timestampMs) / 60000));
  if (diffMin < 1) return 'just now';
  if (diffMin === 1) return '1 min ago';
  if (diffMin < 60) return `${diffMin} mins ago`;
  const hrs = Math.round(diffMin / 60);
  return `${hrs} hr${hrs > 1 ? 's' : ''} ago`;
}

/**
 * Fetch helper with 8-second AbortController timeout and external signal support.
 */
async function fetchWithTimeout(url, externalSignal, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('Request timed out after 8s')), timeoutMs);

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
      const err = new Error('Rate limit reached. Using fallback air data.');
      err.code = 'RATE_LIMIT';
      throw err;
    }
    if (!response.ok) {
      const err = new Error(`HTTP error ${response.status}`);
      err.code = 'HTTP_ERROR';
      throw err;
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
    if (externalSignal) {
      externalSignal.removeEventListener('abort', onExternalAbort);
    }
  }
}

/**
 * Search places via Open-Meteo Geocoding API.
 * Minimum 2 characters. Supports AbortController signal from caller.
 * @param {string} query
 * @param {{ signal?: AbortSignal }} options
 * @returns {Promise<{ status: 'ok'|'empty'|'too_short'|'unavailable', results: Array, message?: string }>}
 */
export async function searchPlaces(query, { signal } = {}) {
  const cleaned = String(query || '').trim();
  if (cleaned.length < 2) {
    return { status: 'too_short', results: [] };
  }

  const url = `${OPEN_METEO_HOSTS.geocoding}?name=${encodeURIComponent(cleaned)}&count=8&language=en&format=json`;
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
      countryCode: item.country_code || '',
      lat: roundCoordinate(item.latitude),
      lon: roundCoordinate(item.longitude),
      timezone: item.timezone || 'auto',
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

/**
 * Read cached entry from localStorage (returns even if expired, with isFresh flag).
 */
export function readCachedAirData(lat, lon) {
  try {
    const key = getCacheKey(lat, lon);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.hourlyData) || parsed.hourlyData.length === 0) return null;
    const ageMs = Date.now() - parsed.fetchedAt;
    return {
      ...parsed,
      isFresh: ageMs <= CACHE_TTL_MS,
      ageLabel: formatCacheAge(parsed.fetchedAt),
    };
  } catch {
    return null;
  }
}

/**
 * Write air data entry to localStorage.
 */
function writeCachedAirData(lat, lon, payload) {
  try {
    const key = getCacheKey(lat, lon);
    localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // Ignore storage quota errors cleanly
  }
}

/**
 * Build sample severe-smog fallback payload.
 */
export function buildSampleSevereSmogData() {
  const nowIso = new Date().toISOString();
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
    fetchedAt: Date.now(),
    timestampIso: nowIso,
    isFallback: true,
    notice: 'Showing Sample Severe-Smog Day demo dataset (illustrative winter smog episode).',
  };
}

/**
 * Build manual PM2.5 / AQI fallback payload (24-hour flat or diurnal-anchored curve is NOT invented:
 * clearly marks manual single-reading entry across current hour or uniform baseline if no forecast exists).
 */
export function buildManualAirData({ pm25, locationName = 'Manual Reading', lat = null, lon = null }) {
  const val = Math.max(0, Math.round(Number(pm25) || 0));
  const now = Date.now();
  const hourlyData = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    pm25: val,
    timeLabel: `${String(hour).padStart(2, '0')}:00`,
  }));
  return {
    mode: 'manual',
    locationName,
    roundedLat: lat != null ? roundCoordinate(lat) : null,
    roundedLon: lon != null ? roundCoordinate(lon) : null,
    hourlyData,
    currentPm25: val,
    weather: null,
    source: 'Manual PM2.5 / Monitor Entry (user-provided)',
    fetchedAt: now,
    timestampIso: new Date(now).toISOString(),
    isFallback: true,
    notice: `Using your manual PM2.5 reading (${val} µg/m³). Hourly curve reflects this steady manual baseline until live forecast is available.`,
  };
}

/**
 * Fetch 24-hour air quality (CAMS PM2.5) and weather from Open-Meteo for rounded coords.
 * Fallback order on failure:
 *   1. Cached data (labeled with its age)
 *   2. Manual PM2.5 entry (if provided)
 *   3. Sample severe-smog day
 *
 * @param {number} lat
 * @param {number} lon
 * @param {{ locationName?: string, signal?: AbortSignal, forceRefresh?: boolean, manualPm25?: number|null }} options
 */
export async function fetchAirAndWeather(lat, lon, options = {}) {
  const { locationName = 'Selected Location', signal, forceRefresh = false, manualPm25 = null } = options;
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
      fetchWithTimeout(wxUrl, signal).catch(() => null),
    ]);

    const times = aqRes?.hourly?.time;
    const pm25Arr = aqRes?.hourly?.pm2_5;
    const pm10Arr = aqRes?.hourly?.pm10;

    if (!Array.isArray(pm25Arr) || pm25Arr.length === 0) {
      throw new Error('Open-Meteo returned empty PM2.5 hourly data');
    }

    const hourlyData = pm25Arr.slice(0, 24).map((val, idx) => {
      const iso = Array.isArray(times) && times[idx] ? times[idx] : '';
      const parsedHour = iso ? Number(iso.slice(11, 13)) : idx;
      const hour = Number.isFinite(parsedHour) ? parsedHour : idx;
      return {
        hour,
        pm25: Math.max(0, Math.round(Number(val ?? 0) * 10) / 10),
        pm10: Array.isArray(pm10Arr) && pm10Arr[idx] != null ? Math.round(Number(pm10Arr[idx])) : null,
        timeLabel: `${String(hour).padStart(2, '0')}:00`,
      };
    });

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

    // Fallback 1: Cached data (even if stale, labeled with exact age)
    if (cached) {
      return {
        ...cached,
        mode: 'cached_fallback',
        source: `${cached.source} (cached ${cached.ageLabel})`,
        isFallback: true,
        notice: `${reason} Showing previously cached forecast from ${cached.ageLabel}.`,
      };
    }

    // Fallback 2: Manual PM2.5 entry if provided
    if (manualPm25 != null && Number.isFinite(Number(manualPm25)) && Number(manualPm25) >= 0) {
      const manual = buildManualAirData({ pm25: manualPm25, locationName, lat: rLat, lon: rLon });
      return {
        ...manual,
        notice: `${reason} Using your manual PM2.5 reading (${manual.currentPm25} µg/m³).`,
      };
    }

    // Fallback 3: Sample severe-smog day
    const sample = buildSampleSevereSmogData();
    return {
      ...sample,
      notice: `${reason} Showing Sample Severe-Smog Day demo until live or manual data is entered.`,
    };
  }
}

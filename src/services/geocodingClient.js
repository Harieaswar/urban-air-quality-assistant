/**
 * @fileoverview Shared fetch-with-timeout helper and Open-Meteo Geocoding client.
 */

import { API_CONFIG } from '../constants/index.js';
import { roundCoordinate } from './airCache.js';
import { ApiRequestError } from './errors.js';

export const OPEN_METEO_HOSTS = {
  geocoding: 'https://geocoding-api.open-meteo.com/v1/search',
  airQuality: 'https://air-quality-api.open-meteo.com/v1/air-quality',
  weather: 'https://api.open-meteo.com/v1/forecast',
};

/**
 * Execute a fetch request with an 8-second timeout and external AbortSignal chaining.
 * @param {string} url - Target Open-Meteo URL.
 * @param {AbortSignal} [externalSignal] - Optional caller abort signal.
 * @param {number} [timeoutMs] - Timeout duration in ms.
 * @returns {Promise<Object>} Parsed JSON payload.
 */
export async function fetchWithTimeout(
  url,
  externalSignal,
  timeoutMs = API_CONFIG.REQUEST_TIMEOUT_MS
) {
  const controller = new AbortController();
  const timeoutError = new ApiRequestError('Request timed out after 8s', 'TIMEOUT');
  const timer = setTimeout(() => controller.abort(timeoutError), timeoutMs);

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
    if (response.status === API_CONFIG.HTTP_TOO_MANY_REQUESTS) {
      throw new ApiRequestError(
        'Open-Meteo rate limit reached (HTTP 429).',
        'RATE_LIMIT',
        response.status
      );
    }
    if (!response.ok) {
      throw new ApiRequestError(
        `Open-Meteo HTTP error ${response.status}`,
        'HTTP_ERROR',
        response.status
      );
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
    if (externalSignal) externalSignal.removeEventListener('abort', onExternalAbort);
  }
}

/**
 * Search places via the keyless Open-Meteo Geocoding API (minimum 2 characters).
 * @param {string} query - Place search string.
 * @param {{ signal?: AbortSignal }} [options={}] - Optional AbortSignal wrapper.
 * @returns {Promise<{ status: string, results: Array<Object>, message?: string }>} Search outcome.
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
  } catch (error) {
    if (error?.name === 'AbortError' && signal?.aborted) {
      throw error;
    }
    return {
      status: 'unavailable',
      results: [],
      message: 'Search unavailable, enter coordinates manually',
    };
  }
}

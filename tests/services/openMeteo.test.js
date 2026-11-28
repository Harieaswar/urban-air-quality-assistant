/**
 * Open-Meteo Browser Client Tests (mocked fetch) — SmogGuard
 * Covers: Salem, Tambaram, Xyzville, HTTP 429 & 500, malformed JSON, 8s timeout,
 * abort, corrupted localStorage, cache TTL expiry, 0.1° rounding, and fallback chain.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  roundCoordinate,
  searchPlaces,
  fetchAirAndWeather,
  readCachedAirData,
  CACHE_KEY_PREFIX,
} from '@/services/openMeteo';
import { CACHE_TTL_MS, formatCacheAge, writeCachedAirData } from '@/services/airCache';

describe('Open-Meteo Client', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('rounds coordinates to 0.1 degrees and formats cache age', () => {
    expect(roundCoordinate(11.6643)).toBe(11.7);
    expect(roundCoordinate('invalid')).toBe(0);
    expect(formatCacheAge(Date.now())).toBe('just now');
    expect(formatCacheAge(Date.now() - 60000)).toBe('1 min ago');
    expect(formatCacheAge(Date.now() - 120 * 60000)).toBe('2 hrs ago');
  });

  it('handles corrupted localStorage cache entries explicitly', () => {
    localStorage.setItem(`${CACHE_KEY_PREFIX}11.7_78.1`, '{not-valid-json');
    const corruptedResult = readCachedAirData(11.66, 78.14);
    expect(corruptedResult?.corrupted).toBe(true);
    expect(corruptedResult?.error?.name).toBe('StorageAccessError');
    expect(localStorage.getItem(`${CACHE_KEY_PREFIX}11.7_78.1`)).toBeNull();

    localStorage.setItem(`${CACHE_KEY_PREFIX}11.7_78.1`, JSON.stringify({ hourlyData: [] }));
    expect(readCachedAirData(11.66, 78.14)).toBeNull();
  });

  it('enforces minimum 2 chars and handles AbortController cancellation in searchPlaces', async () => {
    const spy = vi.spyOn(globalThis, 'fetch');
    expect((await searchPlaces('S')).status).toBe('too_short');
    expect(spy).not.toHaveBeenCalled();

    const controller = new AbortController();
    controller.abort();
    await expect(searchPlaces('Salem', { signal: controller.signal })).rejects.toThrow();
  });

  it('finds Salem & Tambaram, returns No matches for Xyzville, and handles HTTP 500', async () => {
    globalThis.fetch = vi.fn(async (url) => {
      if (url.includes('Salem')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            results: [
              {
                id: 1,
                name: 'Salem',
                admin1: 'Tamil Nadu',
                country: 'India',
                latitude: 11.664,
                longitude: 78.146,
              },
            ],
          }),
        };
      }
      if (url.includes('Tambaram')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            results: [
              {
                id: 2,
                name: 'Tambaram',
                admin1: 'Tamil Nadu',
                country: 'India',
                latitude: 12.925,
                longitude: 80.127,
              },
            ],
          }),
        };
      }
      if (url.includes('FailCity')) {
        return { ok: false, status: 500 };
      }
      return { ok: true, status: 200, json: async () => ({ results: [] }) };
    });

    const salem = await searchPlaces('Salem');
    expect(salem.status).toBe('ok');
    expect(salem.results[0].lat).toBe(11.7);

    const tambaram = await searchPlaces('Tambaram');
    expect(tambaram.status).toBe('ok');

    const xyz = await searchPlaces('Xyzville');
    expect(xyz.status).toBe('empty');
    expect(xyz.message).toBe('No matches');

    const fail = await searchPlaces('FailCity');
    expect(fail.status).toBe('unavailable');
    expect(fail.message).toBe('Search unavailable, enter coordinates manually');
  });

  it('caches live responses for 30 minutes and re-fetches after TTL expires', async () => {
    const fetchMock = vi.fn(async (url) => {
      if (url.includes('air-quality-api.open-meteo.com')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            hourly: {
              time: Array.from(
                { length: 24 },
                (_, h) => `2026-11-26T${String(h).padStart(2, '0')}:00`
              ),
              pm2_5: Array.from({ length: 24 }, () => 48),
              pm10: Array.from({ length: 24 }, () => 70),
            },
          }),
        };
      }
      return { ok: false, status: 500 }; // weather failure should degrade cleanly
    });
    globalThis.fetch = fetchMock;

    const live = await fetchAirAndWeather(11.664, 78.146, { locationName: 'Salem' });
    expect(live.mode).toBe('live');
    expect(live.weather).toBeNull();
    expect(live.notice).toContain('weather summary temporarily unavailable');

    // Fresh cache hit (no extra fetch)
    const cached = await fetchAirAndWeather(11.664, 78.146, { locationName: 'Salem' });
    expect(cached.mode).toBe('cached_fresh');
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // Expired TTL triggers new fetch
    const expired = { ...live, fetchedAt: Date.now() - CACHE_TTL_MS - 1000 };
    writeCachedAirData(11.664, 78.146, expired);
    const refreshed = await fetchAirAndWeather(11.664, 78.146, { locationName: 'Salem' });
    expect(refreshed.mode).toBe('live');
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('handles 8s timeouts, HTTP 429, HTTP 500, malformed API JSON, and ordered fallback chain', async () => {
    // Malformed / empty hourly response -> Sample Severe-Smog fallback
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ hourly: {} }),
    }));
    const malformed = await fetchAirAndWeather(11.66, 78.14, { locationName: 'Salem' });
    expect(malformed.mode).toBe('sample_demo');

    // Timeout simulation
    vi.useFakeTimers();
    globalThis.fetch = vi.fn(
      (_url, { signal }) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () =>
            reject(signal.reason || new DOMException('Aborted', 'AbortError'))
          );
        })
    );
    const pending = fetchAirAndWeather(11.66, 78.14, { locationName: 'Salem', manualPm25: 95 });
    await vi.advanceTimersByTimeAsync(8500);
    const timedOut = await pending;
    expect(timedOut.mode).toBe('manual');
    expect(timedOut.notice).toContain('timed out after 8 seconds');
    vi.useRealTimers();

    // HTTP 429 rate limit -> falls back to stale cache with age label
    localStorage.setItem(
      `${CACHE_KEY_PREFIX}11.7_78.1`,
      JSON.stringify({
        locationName: 'Salem',
        roundedLat: 11.7,
        roundedLon: 78.1,
        hourlyData: Array.from({ length: 24 }, (_, hour) => ({ hour, pm25: 55 })),
        currentPm25: 55,
        source: 'Open-Meteo Air Quality (CAMS CC BY 4.0)',
        fetchedAt: Date.now() - 45 * 60 * 1000,
      })
    );
    globalThis.fetch = vi.fn(async () => ({ ok: false, status: 429 }));
    const rateLimited = await fetchAirAndWeather(11.66, 78.14, { locationName: 'Salem' });
    expect(rateLimited.mode).toBe('cached_fallback');
    expect(rateLimited.notice).toContain('rate limit');
  });
});

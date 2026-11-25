/**
 * Open-Meteo Browser Client Tests (with mocked fetch) — SmogGuard
 * Verifies:
 * - Geocoding for Salem, Tambaram, and Xyzville ("No matches")
 * - Search unavailable fallback message
 * - 0.1 degree coordinate rounding before request
 * - 30-minute localStorage caching
 * - Timeout / HTTP 429 / offline fallback chain (cache -> manual -> sample severe-smog day)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  roundCoordinate,
  searchPlaces,
  fetchAirAndWeather,
  CACHE_KEY_PREFIX,
} from '@/services/openMeteo';

describe('Open-Meteo Client', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('rounds coordinates to 0.1 degrees', () => {
    expect(roundCoordinate(11.6643)).toBe(11.7);
    expect(roundCoordinate(78.146)).toBe(78.1);
    expect(roundCoordinate(12.9226)).toBe(12.9);
  });

  it('enforces minimum 2 characters in place search', async () => {
    const spy = vi.spyOn(globalThis, 'fetch');
    const res = await searchPlaces('S');
    expect(res.status).toBe('too_short');
    expect(spy).not.toHaveBeenCalled();
  });

  it('finds cities not in static lists like Salem and Tambaram, and handles Xyzville', async () => {
    globalThis.fetch = vi.fn(async (url) => {
      if (url.includes('Salem')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            results: [{ id: 1, name: 'Salem', admin1: 'Tamil Nadu', country: 'India', latitude: 11.664, longitude: 78.146 }],
          }),
        };
      }
      if (url.includes('Tambaram')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            results: [{ id: 2, name: 'Tambaram', admin1: 'Tamil Nadu', country: 'India', latitude: 12.925, longitude: 80.127 }],
          }),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ results: [] }),
      };
    });

    const salem = await searchPlaces('Salem');
    expect(salem.status).toBe('ok');
    expect(salem.results[0].lat).toBe(11.7);
    expect(salem.results[0].lon).toBe(78.1);

    const tambaram = await searchPlaces('Tambaram');
    expect(tambaram.status).toBe('ok');
    expect(tambaram.results[0].name).toBe('Tambaram');

    const xyz = await searchPlaces('Xyzville');
    expect(xyz.status).toBe('empty');
    expect(xyz.message).toBe('No matches');
  });

  it('shows unavailable message when geocoding fetch fails', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network down'));
    const res = await searchPlaces('Salem');
    expect(res.status).toBe('unavailable');
    expect(res.message).toBe('Search unavailable, enter coordinates manually');
  });

  it('rounds coords before Open-Meteo fetch and caches for 30 minutes', async () => {
    const fetchMock = vi.fn(async (url) => {
      if (url.includes('air-quality-api.open-meteo.com')) {
        expect(url).toContain('latitude=11.7&longitude=78.1');
        return {
          ok: true,
          status: 200,
          json: async () => ({
            hourly: {
              time: Array.from({ length: 24 }, (_, h) => `2026-11-25T${String(h).padStart(2, '0')}:00`),
              pm2_5: Array.from({ length: 24 }, () => 48),
              pm10: Array.from({ length: 24 }, () => 70),
            },
          }),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          current: { temperature_2m: 28, relative_humidity_2m: 65, wind_speed_10m: 9 },
        }),
      };
    });
    globalThis.fetch = fetchMock;

    const live = await fetchAirAndWeather(11.664, 78.146, { locationName: 'Salem' });
    expect(live.mode).toBe('live');
    expect(live.roundedLat).toBe(11.7);
    expect(live.roundedLon).toBe(78.1);
    expect(live.source).toContain('Open-Meteo');
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // Repeat call uses 30-min localStorage cache without calling fetch
    const cached = await fetchAirAndWeather(11.664, 78.146, { locationName: 'Salem' });
    expect(cached.mode).toBe('cached_fresh');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('falls back in order: stale cache -> manual PM2.5 -> sample severe-smog on HTTP 429 / offline', async () => {
    // 1. Stale cache fallback
    const stalePayload = {
      locationName: 'Salem',
      roundedLat: 11.7,
      roundedLon: 78.1,
      hourlyData: Array.from({ length: 24 }, (_, hour) => ({ hour, pm25: 55 })),
      currentPm25: 55,
      source: 'Open-Meteo Air Quality (CAMS CC BY 4.0)',
      fetchedAt: Date.now() - 45 * 60 * 1000, // 45 mins old (expired)
      timestampIso: new Date().toISOString(),
    };
    localStorage.setItem(`${CACHE_KEY_PREFIX}11.7_78.1`, JSON.stringify(stalePayload));

    globalThis.fetch = vi.fn(async () => ({ ok: false, status: 429 }));
    const fromCache = await fetchAirAndWeather(11.66, 78.14, { locationName: 'Salem' });
    expect(fromCache.mode).toBe('cached_fallback');
    expect(fromCache.isFallback).toBe(true);
    expect(fromCache.notice).toContain('45 mins ago');

    // 2. Manual PM2.5 fallback when no cache exists
    localStorage.clear();
    const fromManual = await fetchAirAndWeather(11.66, 78.14, { locationName: 'Salem', manualPm25: 132 });
    expect(fromManual.mode).toBe('manual');
    expect(fromManual.currentPm25).toBe(132);

    // 3. Sample severe-smog fallback when neither cache nor manual reading exists
    const fromSample = await fetchAirAndWeather(11.66, 78.14, { locationName: 'Salem' });
    expect(fromSample.mode).toBe('sample_demo');
    expect(fromSample.hourlyData).toHaveLength(24);
  });
});

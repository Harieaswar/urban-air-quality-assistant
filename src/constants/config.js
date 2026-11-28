/**
 * @fileoverview Centralized configuration constants, data-backed defaults, and numeric bounds.
 */

import advisoriesData from '../data/advisories.json';
import assumptionsData from '../data/assumptions.json';

export const WHO_GUIDELINES = assumptionsData.who2021;
export const DEFAULTS = assumptionsData.defaults;
export const CONSERVATIVE_UNKNOWNS = assumptionsData.defaults.conservativeUnknowns;
export const SAMPLE_SEVERE_SMOG = assumptionsData.sampleSevereSmog;
export const FAMILY_PROFILES = advisoriesData.familyProfiles;

/** Time & calendar constants (units: ms, minutes, hours, months) */
export const TIME_UNITS = {
  MS_PER_MINUTE: 60000,
  MINUTES_PER_HOUR: 60,
  HOURS_PER_DAY: 24,
  NOON_HOUR: 12,
  MONTHS_PER_YEAR: 12,
  WINDOW_HOURS: 3,
};

/** Open-Meteo browser API parameters & cache TTL */
export const API_CONFIG = {
  CACHE_KEY_PREFIX: 'smogguard_aq_cache_v1_',
  CACHE_TTL_MS: 1800000, // 30 minutes
  REQUEST_TIMEOUT_MS: 8000, // 8 seconds
  HTTP_TOO_MANY_REQUESTS: 429,
  GEOCODING_MIN_CHARS: 2,
  GEOCODING_DEBOUNCE_MS: 300,
  GEOCODING_LIMIT: 8,
  FORECAST_HOURS: 24,
  ISO_HOUR_START: 11,
  ISO_HOUR_END: 13,
  COORD_ROUND_SCALE: 10,
};

/** Validation & UI numeric bounds */
export const BOUNDS = {
  MIN_AQI: 0,
  MAX_AQI: 500,
  MAX_PM25: 1000,
  SEVERE_FALLBACK_PM25: 350,
  MAX_STEPS: 4,
  MIN_STEPS: 1,
  DEFAULT_MAX_LEN: 200,
  SHORT_TEXT_MAX_LEN: 80,
  ROOM_NAME_MAX_LEN: 60,
  MIN_LAT: -90,
  MAX_LAT: 90,
  MIN_LON: -180,
  MAX_LON: 180,
  MAX_HOUSEHOLD_SIZE: 25,
  MIN_ROOM_AREA_SQM: 3,
  MAX_ROOM_AREA_SQM: 250,
  MIN_CEILING_HEIGHT_M: 2,
  MAX_CEILING_HEIGHT_M: 6,
  MAX_COMMUTE_KM: 250,
  MAX_COMMUTE_DAYS: 7,
  MAX_MONTHLY_KWH: 5000,
  MAX_ALTERNATIVES_REPORT: 8,
  MIN_BAR_PCT: 6,
  MIN_BAR_BASELINE: 100,
  UNRANKED_PAYBACK_YEARS: 999,
};

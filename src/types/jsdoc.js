/**
 * @fileoverview Shared JSDoc typedef definitions across SmogGuard modules.
 */

/**
 * @typedef {Object} HourlyPm25Point
 * @property {number} hour - Hour of day (0–23).
 * @property {number} pm25 - Particulate matter 2.5 concentration (µg/m³).
 * @property {number|null} [pm10] - Optional PM10 concentration (µg/m³).
 * @property {string} [timeLabel] - Formatted HH:00 label.
 */

/**
 * @typedef {Object} WeatherContext
 * @property {number|null} temperatureC - Ambient temperature (°C).
 * @property {number|null} humidityPct - Relative humidity (%).
 * @property {number|null} windSpeedKmh - Surface wind speed (km/h).
 */

/**
 * @typedef {Object} AirQualityPayload
 * @property {'live'|'cached_fresh'|'cached_fallback'|'manual'|'sample_demo'} mode - Source mode.
 * @property {string} locationName - Display name of location.
 * @property {number|null} roundedLat - Privacy-rounded latitude (0.1°).
 * @property {number|null} roundedLon - Privacy-rounded longitude (0.1°).
 * @property {HourlyPm25Point[]} hourlyData - 24-hour PM2.5 series.
 * @property {number} currentPm25 - Current-hour PM2.5 (µg/m³).
 * @property {WeatherContext|null} weather - Current weather summary.
 * @property {string} source - Attribution source string.
 * @property {number} fetchedAt - Epoch timestamp (ms).
 * @property {string} timestampIso - ISO 8601 timestamp.
 * @property {boolean} isFallback - Whether fallback data was used.
 * @property {string|null} notice - User-facing status/fallback notice.
 */

/**
 * @typedef {Object} CalibrationState
 * @property {boolean} enabled - Whether monitor calibration is active.
 * @property {'pm25'|'aqi'} mode - Monitor unit.
 * @property {number|null} value - Monitor reading value.
 * @property {string|null} calibratedAt - ISO timestamp of last calibration.
 */

/**
 * @typedef {Object} RoomConfig
 * @property {string} id - Unique room identifier.
 * @property {string} name - Room display name.
 * @property {string} type - Room type (`bedroom`, `kids_room`, `living_room`, `study`, etc.).
 * @property {number|'unknown'} areaSqM - Floor area in m².
 * @property {number|'unknown'} ceilingHeightM - Ceiling height in m.
 * @property {string} ventilation - Ventilation quality (`good`, `moderate`, `poor`, `other`, `unknown`).
 * @property {boolean} hasSensitiveOccupant - Whether a sensitive family member spends long hours here.
 */

/**
 * @typedef {Object} ServiceResult
 * @property {boolean} ok - Operation success flag.
 * @property {*} [data] - Resolved payload on success or fallback.
 * @property {string|null} [error] - User-friendly error or notice message.
 */

export {};

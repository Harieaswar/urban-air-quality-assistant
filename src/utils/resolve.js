/**
 * @fileoverview Shared resolution, rounding, and factor lookup helpers for pure calculators.
 */

const TENTHS_FACTOR = 10;

/**
 * Round a numeric value to one decimal place (tenths).
 * @param {number} value - Value to round.
 * @returns {number} Value rounded to 0.1 precision.
 */
export function roundToTenths(value) {
  return Math.round(value * TENTHS_FACTOR) / TENTHS_FACTOR;
}

/**
 * Resolve an optional or `'unknown'` wizard field using a conservative default.
 * @param {*} value - Raw field value from wizard state.
 * @param {*} fallback - Conservative fallback value.
 * @returns {*} Resolved value.
 */
export function resolveWithFallback(value, fallback) {
  return value === null || value === undefined || value === '' || value === 'unknown'
    ? fallback
    : value;
}

/**
 * Look up a factor entry by ID from the factor registry array.
 * @param {Array<Object>} factors - Registry entries from `factors.json`.
 * @param {string} id - Factor identifier.
 * @returns {Object|null} Matching factor entry or null.
 */
export function getFactorById(factors, id) {
  if (!Array.isArray(factors)) return null;
  return factors.find((f) => f.id === id) || null;
}

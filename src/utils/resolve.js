/**
 * @fileoverview Shared resolution and factor lookup helpers for pure calculators.
 */

export function isPresent(value) {
  return value !== null && value !== undefined;
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

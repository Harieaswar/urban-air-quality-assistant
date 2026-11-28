/**
 * @fileoverview Plain-language input validation helpers for wizard fields, coordinates, and JSON imports.
 */

import { BOUNDS } from '@/constants';

/**
 * Validate a non-negative number up to an upper bound.
 * @param {*} value - Input value.
 * @param {string} fieldName - Human-readable label.
 * @param {number} [max=Infinity] - Maximum allowed value.
 * @returns {{ valid: boolean, value: number, error: string|null }} Validation outcome.
 */
export function validatePositiveNumber(value, fieldName, max = Infinity) {
  const num = Number(value);
  if (value === '' || value === null || value === undefined || isNaN(num)) {
    return { valid: false, value: 0, error: `Please enter a valid number for ${fieldName}.` };
  }
  if (num < 0) {
    return {
      valid: false,
      value: 0,
      error: `${fieldName} cannot be negative. Please enter 0 or more.`,
    };
  }
  if (num > max) {
    return {
      valid: false,
      value: 0,
      error: `${fieldName} (${num}) seems unusually high — please enter a value up to ${max}.`,
    };
  }
  return { valid: true, value: num, error: null };
}

/**
 * Validate a numeric value inside an inclusive [min, max] range.
 * @param {*} value - Input value.
 * @param {number} min - Inclusive lower bound.
 * @param {number} max - Inclusive upper bound.
 * @param {string} fieldName - Human-readable label.
 * @returns {{ valid: boolean, value: number, error: string|null }} Validation outcome.
 */
export function validateRange(value, min, max, fieldName) {
  const num = Number(value);
  if (value === '' || value === null || value === undefined || isNaN(num)) {
    return { valid: false, value: min, error: `Please enter a number for ${fieldName}.` };
  }
  if (num < min || num > max) {
    return { valid: false, value: min, error: `${fieldName} must be between ${min} and ${max}.` };
  }
  return { valid: true, value: num, error: null };
}

/**
 * Validate geographic latitude and longitude coordinates.
 * @param {*} lat - Latitude value.
 * @param {*} lon - Longitude value.
 * @returns {{ valid: boolean, lat?: number, lon?: number, error: string|null }} Validation outcome.
 */
export function validateCoordinates(lat, lon) {
  const latRes = validateRange(lat, BOUNDS.MIN_LAT, BOUNDS.MAX_LAT, 'Latitude');
  if (!latRes.valid) return latRes;
  const lonRes = validateRange(lon, BOUNDS.MIN_LON, BOUNDS.MAX_LON, 'Longitude');
  if (!lonRes.valid) return lonRes;
  return { valid: true, lat: latRes.value, lon: lonRes.value, error: null };
}

function isEmptySelection(value) {
  if (value === null || value === undefined || value === '') return true;
  return Array.isArray(value) && value.length === 0;
}

/**
 * Validate a choice group supporting "Not sure" (`'unknown'`) and `"Other"` text.
 * @param {string|string[]} value - Selected value(s).
 * @param {string} otherText - Custom text when `'other'` is chosen.
 * @param {string} fieldLabel - Human-readable label.
 * @returns {{ valid: boolean, error: string|null }} Validation outcome.
 */
export function validateChoiceWithOther(value, otherText, fieldLabel) {
  if (value === 'unknown') {
    return { valid: true, error: null };
  }
  if (isEmptySelection(value)) {
    return {
      valid: false,
      error: `Please choose an option for ${fieldLabel} (or select "Not sure").`,
    };
  }
  const hasOther = value === 'other' || (Array.isArray(value) && value.includes('other'));
  if (hasOther && (!otherText || !String(otherText).trim())) {
    return { valid: false, error: `Please specify your "Other" answer for ${fieldLabel}.` };
  }
  return { valid: true, error: null };
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function hasValidRoomsField(rooms) {
  if (rooms === undefined) return true;
  if (!isPlainObject(rooms)) return false;
  return rooms.list === undefined || Array.isArray(rooms.list);
}

function validateImportedShape(parsed) {
  const imported = isPlainObject(parsed?.profile) ? parsed.profile : parsed;
  const hasCoreSection =
    isPlainObject(imported) && (isPlainObject(imported.location) || isPlainObject(imported.family));
  if (!hasCoreSection) {
    return {
      valid: false,
      data: null,
      error: 'Missing required location or family sections in JSON.',
    };
  }
  if (!hasValidRoomsField(imported.rooms)) {
    return { valid: false, data: null, error: 'Invalid rooms structure in imported JSON.' };
  }
  return { valid: true, data: imported, error: null };
}

/**
 * Parse and validate an exported SmogGuard profile or report JSON payload.
 * @param {string} rawText - Raw JSON file text.
 * @returns {{ valid: boolean, data: Object|null, error: string|null }} Structured import validation result.
 */
export function validateProfileImport(rawText) {
  if (typeof rawText !== 'string' || !rawText.trim()) {
    return { valid: false, data: null, error: 'Imported file is empty.' };
  }
  try {
    return validateImportedShape(JSON.parse(rawText));
  } catch (_err) {
    return { valid: false, data: null, error: 'Malformed JSON syntax in imported file.' };
  }
}

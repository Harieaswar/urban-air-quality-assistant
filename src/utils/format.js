/**
 * @fileoverview Display formatting utilities for CO₂e, Indian Rupees, ranges, hours, and timestamps.
 */

import { BOUNDS, TIME_UNITS } from '@/constants';

/**
 * Format kg CO₂e with appropriate unit (kg or tonnes).
 * @param {number} kg - Emissions value in kilograms.
 * @returns {string} Formatted CO₂e string.
 */
export function formatCO2(kg) {
  if (kg === null || kg === undefined || isNaN(kg)) return '0 kg CO₂e';
  if (kg >= BOUNDS.KG_PER_TONNE) return `${(kg / BOUNDS.KG_PER_TONNE).toFixed(1)} tonnes CO₂e`;
  return `${Math.round(kg)} kg CO₂e`;
}

const INR_REST_GROUP_SLICE = -2;

/**
 * Format an INR amount using the Indian numbering system (lakhs/thousands).
 * @param {number} amount - Amount in Indian Rupees.
 * @returns {string} Formatted currency string.
 */
export function formatINR(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return '₹0';
  const num = Math.round(amount);
  const str = Math.abs(num).toString();
  const groupLen = BOUNDS.INR_FIRST_GROUP_DIGITS;
  let result = '';
  if (str.length <= groupLen) {
    result = str;
  } else {
    result = str.slice(-groupLen);
    let remaining = str.slice(0, -groupLen);
    while (remaining.length > 2) {
      result = `${remaining.slice(INR_REST_GROUP_SLICE)},${result}`;
      remaining = remaining.slice(0, INR_REST_GROUP_SLICE);
    }
    if (remaining.length > 0) result = `${remaining},${result}`;
  }
  return `${num < 0 ? '-' : ''}₹${result}`;
}

/**
 * Format a central estimate with low–high uncertainty range.
 * @param {number} low - Lower bound.
 * @param {number} central - Central estimate.
 * @param {number} high - Upper bound.
 * @returns {string} Formatted range string.
 */
export function formatRange(low, central, high) {
  if (low === central && central === high) return `${Math.round(central)}`;
  return `${Math.round(central)} (${Math.round(low)}–${Math.round(high)})`;
}

/**
 * Format a 24-hour clock integer (0–23) into 12-hour AM/PM text.
 * @param {number} hour - Hour of day (0–23).
 * @returns {string} Formatted hour string.
 */
export function formatHour(hour) {
  const { HOURS_PER_DAY, NOON_HOUR } = TIME_UNITS;
  const h = ((Number(hour) % HOURS_PER_DAY) + HOURS_PER_DAY) % HOURS_PER_DAY;
  if (h === 0) return '12 AM';
  if (h === NOON_HOUR) return '12 PM';
  if (h < NOON_HOUR) return `${h} AM`;
  return `${h - NOON_HOUR} PM`;
}

/**
 * Format an epoch millisecond timestamp or ISO string for display.
 * @param {number|string} ts - Timestamp value.
 * @returns {string} Human-readable date/time string.
 */
export function formatTimestamp(ts) {
  if (!ts) return 'Unknown time';
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return String(ts);
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

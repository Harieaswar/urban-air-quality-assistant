/**
 * @fileoverview Display formatting utilities for CO₂e, Indian Rupees, ranges, hours, and timestamps.
 */

const KG_PER_TONNE = 1000;
const HOURS_PER_DAY = 24;
const NOON_HOUR = 12;

/**
 * Format kg CO₂e with appropriate unit (kg or tonnes).
 * @param {number} kg - Emissions value in kilograms.
 * @returns {string} Formatted CO₂e string.
 */
export function formatCO2(kg) {
  if (kg == null || isNaN(kg)) return '0 kg CO₂e';
  if (kg >= KG_PER_TONNE) return `${(kg / KG_PER_TONNE).toFixed(1)} tonnes CO₂e`;
  return `${Math.round(kg)} kg CO₂e`;
}

/**
 * Format an INR amount using the Indian numbering system (lakhs/thousands).
 * @param {number} amount - Amount in Indian Rupees.
 * @returns {string} Formatted currency string.
 */
export function formatINR(amount) {
  if (amount == null || isNaN(amount)) return '₹0';
  const num = Math.round(amount);
  const str = Math.abs(num).toString();
  let result = '';
  if (str.length <= 3) {
    result = str;
  } else {
    result = str.slice(-3);
    let remaining = str.slice(0, -3);
    while (remaining.length > 2) {
      result = `${remaining.slice(-2)},${result}`;
      remaining = remaining.slice(0, -2);
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

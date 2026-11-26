/**
 * @fileoverview Input sanitization helpers to strip markup and prevent injection.
 */

const DEFAULT_MAX_LEN = 200;

/**
 * Strip HTML tags/entities, trim whitespace, and enforce maximum length.
 * @param {string} text - Raw user input string.
 * @param {number} [maxLength=200] - Maximum allowed character count.
 * @returns {string} Sanitized text.
 */
export function sanitizeInput(text, maxLength = DEFAULT_MAX_LEN) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&[a-z0-9#]+;/gi, '')
    .trim()
    .slice(0, maxLength);
}

/**
 * Escape HTML special characters for plain-text rendering.
 * @param {string} text - Input string.
 * @returns {string} Escaped string.
 */
export function sanitizeForDisplay(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

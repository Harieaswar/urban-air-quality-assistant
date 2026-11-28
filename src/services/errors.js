/**
 * @fileoverview Typed service error classes for network, rate-limit, timeout, and storage failures.
 */

/**
 * Error raised when a public Open-Meteo API request fails, times out, or hits HTTP limits.
 */
export class ApiRequestError extends Error {
  /**
   * @param {string} message - Human-readable failure description.
   * @param {'RATE_LIMIT'|'TIMEOUT'|'HTTP_ERROR'|'MALFORMED_DATA'|'NETWORK_ERROR'} code - Machine-readable category.
   * @param {number|null} [status=null] - Optional HTTP status code.
   */
  constructor(message, code, status = null) {
    super(message);
    this.name = 'ApiRequestError';
    this.code = code;
    this.status = status;
  }
}

/**
 * Error wrapper describing browser storage read/write failures cleanly.
 */
export class StorageAccessError extends Error {
  /**
   * @param {string} message - User-friendly storage failure explanation.
   * @param {Error|null} [cause=null] - Underlying exception.
   */
  constructor(message, cause = null) {
    super(message);
    this.name = 'StorageAccessError';
    this.cause = cause;
  }
}

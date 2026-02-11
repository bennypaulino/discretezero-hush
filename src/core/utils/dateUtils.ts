/**
 * Date utility functions
 *
 * IMPORTANT: All date-based daily resets MUST use local time (not UTC)
 * to ensure users experience "today" as their local calendar day,
 * regardless of timezone (EST, PST, Tokyo, London, etc.)
 */

/**
 * Get local date string in YYYY-MM-DD format (NOT UTC)
 *
 * @param date - The date to convert
 * @returns Date string in YYYY-MM-DD format (e.g., "2026-01-30")
 *
 * @example
 * const today = getLocalDateString(new Date());
 * // Returns "2026-01-30" in local timezone, not UTC
 */
export const getLocalDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Get UTC date string in YYYY-MM-DD format
 *
 * @deprecated Use getLocalDateString() instead for daily resets
 * Only use this for server timestamps or logging purposes
 */
export const getUTCDateString = (): string => {
  return new Date().toISOString().split('T')[0];
};

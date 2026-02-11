/**
 * Date Utilities for Zustand Store Slices
 *
 * Shared date manipulation functions used across multiple slices.
 */

/**
 * Converts a Date object to local date string in YYYY-MM-DD format.
 *
 * Uses local time (not UTC) for daily resets, game unlocks, and streak tracking.
 * This ensures date boundaries match the user's local timezone.
 *
 * @param date - Date object to convert
 * @returns Date string in YYYY-MM-DD format (e.g., "2026-02-07")
 *
 * @example
 * ```ts
 * const today = getLocalDateString(new Date());
 * // Returns: "2026-02-07"
 * ```
 */
export const getLocalDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

import { parse, format, addMinutes } from 'date-fns';

/**
 * Utility functions for time calculations in schedule items.
 */

/**
 * Calculates end time from start time and duration in minutes.
 * Handles time overflow within the same day (e.g., 23:30 + 60 minutes = 00:30).
 * For schedule validation purposes, we assume all times are within the same day.
 *
 * NOTE: This utility uses `new Date()` and `setHours()` for time-only calculations (HH:mm format).
 * This is acceptable because:
 * - It operates on time strings, not full datetimes
 * - The reference date is only used for parsing/formatting, not for timezone-aware operations
 * - The result is a time string (HH:mm), not a datetime that needs timezone conversion
 * - This is a pure utility function for schedule item validation, not session creation
 *
 * For full datetime operations (like session startTime/endTime), use TimezoneService.toUtc() instead.
 *
 * @param startTime - Start time in HH:mm format (e.g., "17:00")
 * @param durationMinutes - Duration in minutes (e.g., 60 for 1 hour)
 * @returns End time in HH:mm format (e.g., "18:00")
 * @throws Error if startTime format is invalid
 */
export function calculateEndTime(
  startTime: string,
  durationMinutes: number,
): string {
  // Use a reference date (today at midnight) for parsing
  // NOTE: This is acceptable for time-only calculations - see function documentation above
  const referenceDate = new Date();
  referenceDate.setHours(0, 0, 0, 0);

  // Parse the time string using date-fns parse
  // This will throw an error if the format is invalid
  const startDate = parse(startTime, 'HH:mm', referenceDate);

  // Add duration using date-fns addMinutes
  const endDate = addMinutes(startDate, durationMinutes);

  // Format back to HH:mm using date-fns format
  // Note: If duration exceeds 24 hours, this will show the time on the next day
  // (e.g., 23:30 + 60 minutes = 00:30), which is handled gracefully
  return format(endDate, 'HH:mm');
}

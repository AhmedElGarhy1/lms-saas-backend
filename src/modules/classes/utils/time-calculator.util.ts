import { parse, format, addMinutes, isSameDay } from 'date-fns';

/**
 * Utility functions for time calculations in schedule items.
 */

/**
 * Calculates end time from start time and duration in minutes.
 * Handles time overflow within the same day (e.g., 23:30 + 60 minutes = 00:30).
 * For schedule validation purposes, we assume all times are within the same day.
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

/**
 * Validates that the calculated end time doesn't exceed 24:00 for same-day validation.
 * This ensures schedule items don't span across days.
 *
 * @param startTime - Start time in HH:mm format
 * @param durationMinutes - Duration in minutes
 * @returns true if end time is within the same day (before or at 24:00), false otherwise
 */
export function isEndTimeWithinSameDay(
  startTime: string,
  durationMinutes: number,
): boolean {
  // Use a reference date (today at midnight) for parsing
  const referenceDate = new Date();
  referenceDate.setHours(0, 0, 0, 0);

  // Parse the time string using date-fns parse
  const startDate = parse(startTime, 'HH:mm', referenceDate);

  // Add duration using date-fns addMinutes
  const endDate = addMinutes(startDate, durationMinutes);

  // Check if end time is still on the same day using date-fns isSameDay
  return isSameDay(referenceDate, endDate);
}

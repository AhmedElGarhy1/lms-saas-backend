/**
 * Timezone constants for the application
 */
export const DEFAULT_TIMEZONE = 'Africa/Cairo';

/**
 * Validates if a timezone string is a valid IANA timezone identifier
 * @param timezone - Timezone string to validate
 * @returns true if valid, false otherwise
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    // Try to create a date formatter with the timezone
    // This will throw if the timezone is invalid
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

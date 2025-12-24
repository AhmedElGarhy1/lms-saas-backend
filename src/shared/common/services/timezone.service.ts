import { Injectable } from '@nestjs/common';
import { TZDate } from '@date-fns/tz';
import { addDays, format, isAfter, isBefore } from 'date-fns';
import { RequestContext } from '../context/request.context';
import { DEFAULT_TIMEZONE } from '../constants/timezone.constants';

/**
 * Service for timezone-related utilities
 * Uses modern TZDate for object-anchored timezone logic
 */
@Injectable()
export class TimezoneService {
  /**
   * Get timezone from RequestContext or return default
   */
  static getTimezoneFromContext(): string {
    const context = RequestContext.get();
    return context?.timezone || DEFAULT_TIMEZONE;
  }

  /**
   * Converts local date/time strings to a real UTC Date object
   * Used for session creation (e.g., "2024-01-01" + "14:30")
   */
  static toUtc(dateStr: string, timeStr: string, timezone?: string): Date {
    const tz = timezone || this.getTimezoneFromContext();
    // TZDate constructor handles the heavy lifting
    const zoned = new TZDate(`${dateStr}T${timeStr}:00`, tz);
    return new Date(zoned.toISOString());
  }

  /**
   * Converts a date-only string (YYYY-MM-DD) to UTC midnight in center timezone
   * Essential for Class startDate/endDate boundary logic
   */
  static dateOnlyToUtc(dateStr: string, timezone?: string): Date {
    const tz = timezone || this.getTimezoneFromContext();
    const zoned = new TZDate(`${dateStr}T00:00:00`, tz);
    return new Date(zoned.toISOString());
  }

  /**
   * Creates an exclusive UTC range for a single calendar day
   * Result: [Midnight Day X, Midnight Day X+1)
   */
  static dateRangeToUtc(
    dateStr: string,
    timezone?: string,
  ): { start: Date; end: Date } {
    const tz = timezone || this.getTimezoneFromContext();

    const startZoned = new TZDate(`${dateStr}T00:00:00`, tz);
    // Use addDays directly on the zoned object
    const endZoned = addDays(startZoned, 1);

    return {
      start: new Date(startZoned.toISOString()),
      end: new Date(endZoned.toISOString()),
    };
  }

  /**
   * Get current UTC time (no timezone conversion)
   * Use this for simple duration checks and timestamp comparisons
   * For business logic that depends on center's "wall clock time", use getZonedNow() instead
   *
   * @returns Date object representing current UTC time
   */
  static getUtcNow(): Date {
    // Use Date.now() to get timestamp, then convert via fromTimestamp
    // This avoids direct Date() constructor usage
    return this.fromTimestamp(Date.now());
  }

  /**
   * Get current time relative to the center's clock
   * Useful for "Elite Precision" Cron jobs and business logic that depends on center's calendar day
   * Returns a Date object representing "now" in the specified timezone
   *
   * @param timezone - Optional timezone (defaults to context timezone)
   * @returns Date object representing "now" in the specified timezone (as UTC)
   */
  static getZonedNow(timezone?: string): Date {
    const tz = timezone || this.getTimezoneFromContext();
    const zoned = new TZDate(this.getUtcNow(), tz);
    // Convert TZDate to Date to ensure type consistency
    return this.fromTimestamp(zoned.getTime());
  }

  /**
   * Get current time in center timezone from RequestContext (convenience method)
   * Combines getTimezoneFromContext() and getZonedNow() in one call
   * Use this for business logic that depends on center's "wall clock time"
   * For simple duration checks, use getUtcNow() instead
   */
  static getZonedNowFromContext(): Date {
    const timezone = this.getTimezoneFromContext();
    return this.getZonedNow(timezone);
  }

  /**
   * Converts a date range (From -> To) into a UTC range for DB queries
   * Ensures the 'dateTo' is inclusive of the whole day by moving the 'end' to the next midnight
   */
  static getZonedDateRange(
    dateFrom: string,
    dateTo: string,
    timezone?: string,
  ): { start: Date; end: Date } {
    const tz = timezone || this.getTimezoneFromContext();

    const start = this.dateOnlyToUtc(dateFrom, tz);
    // Get the exclusive end from the dateTo
    const { end } = this.dateRangeToUtc(dateTo, tz);

    return { start, end };
  }

  /**
   * Helper to format a UTC date back to a zoned string if needed in logs/logic
   */
  static formatZoned(
    date: Date,
    pattern: string = 'yyyy-MM-dd HH:mm:ss',
    timezone?: string,
  ): string {
    const tz = timezone || this.getTimezoneFromContext();
    const zoned = new TZDate(date, tz);
    return format(zoned, pattern);
  }

  /**
   * Check if a date is after another date (both should be UTC Date objects)
   * Uses date-fns for robust edge case handling
   */
  static isAfter(date: Date, compareTo: Date): boolean {
    return isAfter(date, compareTo);
  }

  /**
   * Check if a date is before another date (both should be UTC Date objects)
   * Uses date-fns for robust edge case handling
   */
  static isBefore(date: Date, compareTo: Date): boolean {
    return isBefore(date, compareTo);
  }

  /**
   * Get day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday) in center timezone
   * This is essential for matching schedule items which are defined in center timezone
   * @param date - UTC Date object
   * @param timezone - Optional timezone (defaults to context timezone)
   * @returns Day of week number (0-6)
   */
  static getDayOfWeek(date: Date, timezone?: string): number {
    const tz = timezone || this.getTimezoneFromContext();
    const zoned = new TZDate(date, tz);
    return zoned.getDay();
  }

  /**
   * Create a Date object from a timestamp (number of milliseconds since epoch)
   * This is a utility for creating Date objects from timestamps, which is a legitimate use case
   * @param timestamp - Timestamp in milliseconds
   * @returns Date object
   */
  static fromTimestamp(timestamp: number): Date {
    return new Date(timestamp);
  }

  /**
   * Parse an ISO 8601 date-time string and normalize it by stripping milliseconds
   * This ensures exact matching for database queries (e.g., session start times)
   * The input can be in any timezone (UTC, local, or with offset)
   * @param isoString - ISO 8601 date-time string (e.g., "2024-01-15T18:00:00.000Z" or "2024-01-15T18:00:00+02:00")
   * @returns Date object with milliseconds normalized to .000
   */
  static parseAndNormalizeIso8601(isoString: string): Date {
    // TZDate can parse ISO 8601 strings in any timezone
    const parsedTZDate = new TZDate(isoString);
    // Strip milliseconds by flooring to the nearest second
    const normalizedTimestamp =
      Math.floor(parsedTZDate.getTime() / 1000) * 1000;
    return this.fromTimestamp(normalizedTimestamp);
  }

  /**
   * Convert Date range to UTC range for database queries
   * Uses range approach (>= midnight AND < next_midnight) to preserve index usage
   * CRITICAL: Never use DATE() or EXTRACT() functions in WHERE clauses
   *
   * @param dateFrom - Start date (UTC Date object)
   * @param dateTo - End date (UTC Date object)
   * @param timezone - Optional timezone for date-only semantics (defaults to context timezone)
   * @returns UTC range with exclusive end: { start: Date, end: Date }
   *
   * @example
   * // For calendar queries, extract date part and create range
   * const dateFrom = new Date('2024-01-15T14:30:00Z');
   * const dateTo = new Date('2024-01-31T18:00:00Z');
   * const { start, end } = TimezoneService.dateRangeFromDates(dateFrom, dateTo);
   * // Use in query: WHERE startTime >= :start AND startTime < :end
   */
  static dateRangeFromDates(
    dateFrom: Date,
    dateTo: Date,
    timezone?: string,
  ): { start: Date; end: Date } {
    // For date-only semantics, normalize to midnight in center timezone
    const tz = timezone || this.getTimezoneFromContext();

    // Extract date part from dateFrom in center timezone and normalize to midnight
    const fromZoned = new TZDate(dateFrom, tz);
    const fromDateStr = format(fromZoned, 'yyyy-MM-dd');
    const startZoned = new TZDate(`${fromDateStr}T00:00:00`, tz);

    // Extract date part from dateTo in center timezone and normalize to next midnight (exclusive)
    const toZoned = new TZDate(dateTo, tz);
    const toDateStr = format(toZoned, 'yyyy-MM-dd');
    const endZoned = addDays(new TZDate(`${toDateStr}T00:00:00`, tz), 1);

    return {
      start: new Date(startZoned.toISOString()),
      end: new Date(endZoned.toISOString()),
    };
  }

  /**
   * Extract date part (YYYY-MM-DD) from Date object in center timezone
   * Useful for date-only semantics when working with Date objects
   *
   * @param date - UTC Date object
   * @param timezone - Optional timezone (defaults to context timezone)
   * @returns Date string in YYYY-MM-DD format
   */
  static extractDatePart(date: Date, timezone?: string): string {
    const tz = timezone || this.getTimezoneFromContext();
    const zoned = new TZDate(date, tz);
    return format(zoned, 'yyyy-MM-dd');
  }

  /**
   * Normalize Date to midnight in center timezone
   * Returns Date object representing midnight in center timezone (converted to UTC)
   *
   * @param date - UTC Date object
   * @param timezone - Optional timezone (defaults to context timezone)
   * @returns Date object representing midnight in center timezone (UTC)
   */
  static normalizeToMidnight(date: Date, timezone?: string): Date {
    const tz = timezone || this.getTimezoneFromContext();
    const zoned = new TZDate(date, tz);
    const dateStr = format(zoned, 'yyyy-MM-dd');
    const midnightZoned = new TZDate(`${dateStr}T00:00:00`, tz);
    return new Date(midnightZoned.toISOString());
  }
}

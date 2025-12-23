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
   * Get current time relative to the center's clock
   * Useful for "Elite Precision" Cron jobs
   * Returns a Date object representing "now" in the specified timezone
   */
  static getZonedNow(timezone?: string): Date {
    const tz = timezone || this.getTimezoneFromContext();
    const zoned = new TZDate(new Date(), tz);
    // Convert TZDate to Date to ensure type consistency
    return new Date(zoned.toISOString());
  }

  /**
   * Get current time in center timezone from RequestContext (convenience method)
   * Combines getTimezoneFromContext() and getZonedNow() in one call
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
}

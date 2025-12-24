import { Injectable } from '@nestjs/common';
import { TZDate } from '@date-fns/tz';
import { format } from 'date-fns';
import { RequestContext } from '../context/request.context';
import { DEFAULT_TIMEZONE } from '../constants/timezone.constants';

/**
 * Service for UTC date utilities and minimal timezone support
 *
 * Architecture:
 * - DTO Layer: Validates ISO 8601 (any timezone) and converts → UTC Date objects
 * - Application Layer: Works with UTC Date objects only (no timezone conversions)
 * - This Service: Provides UTC utilities, display formatting, and minimal schedule support
 */
@Injectable()
export class TimezoneService {
  /**
   * Get timezone from RequestContext or return default
   * Used for display/logging purposes only
   */
  static getTimezoneFromContext(): string {
    const context = RequestContext.get();
    return context?.timezone || DEFAULT_TIMEZONE;
  }

  /**
   * Helper to format a UTC date back to a zoned string if needed in logs/logic
   * Used for display/logging purposes only
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
   * Legitimate conversion for Schedule Generation.
   * Takes a UTC Date (the day) and a Local Time string (the wall-clock time)
   * and returns the exact UTC moment for that specific center.
   *
   * This is the ONLY timezone conversion method needed in the application layer,
   * used specifically for schedule-based session generation where schedule times
   * are stored as HH:mm strings in center timezone.
   *
   * @param date - UTC Date object (the day)
   * @param timeStr - Time string in HH:mm format (the wall-clock time in center timezone)
   * @param timezone - Center timezone (e.g., 'Africa/Cairo')
   * @returns UTC Date object representing the exact moment
   *
   * @example
   * // Generate session for Jan 15, 2024 at 17:00 Cairo time
   * const date = new Date('2024-01-15T00:00:00Z'); // UTC date
   * const sessionTime = TimezoneService.combineDateAndTime(date, '17:00', 'Africa/Cairo');
   * // Returns: 2024-01-15T15:00:00Z (17:00 Cairo = 15:00 UTC)
   */
  static combineDateAndTime(
    date: Date,
    timeStr: string,
    timezone: string,
  ): Date {
    // 1. Get the year/month/day from the date in the TARGET timezone
    // (This prevents the 'one day off' bug if UTC midnight is different from Cairo midnight)
    // Use TZDate to format the date in the target timezone
    const zoned = new TZDate(date, timezone);
    const dateStr = format(zoned, 'yyyy-MM-dd');

    // 2. Create a new Zoned Date using the combined string
    const combined = new TZDate(`${dateStr}T${timeStr}:00`, timezone);

    // 3. Return as a native UTC Date
    return new Date(combined.getTime());
  }
}

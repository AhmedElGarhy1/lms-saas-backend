import { I18nContext } from 'nestjs-i18n';
import { I18nPath } from '@/generated/i18n.generated';
import { RequestContext } from '@/shared/common/context/request.context';

/**
 * ICU MessageFormat utility functions for advanced i18n features
 * Supports pluralization, number formatting, date formatting, and select statements
 */

/**
 * Translate with ICU MessageFormat support
 * ICU syntax is automatically detected by nestjs-i18n
 */
export function tICU(
  key: I18nPath,
  args?: Record<string, any>,
  options?: { lang?: string },
): string {
  const i18n = I18nContext.current();
  if (!i18n) return key;

  try {
    return i18n.translate(key, {
      args,
      lang: options?.lang ?? RequestContext.get()?.locale,
    });
  } catch {
    return key;
  }
}

/**
 * Translate with pluralization
 * @param key Translation key with ICU plural syntax: {count, plural, =0 {...} =1 {...} other {...}}
 * @param count Number to determine plural form
 * @param args Additional arguments for translation
 * @returns Translated string with proper plural form
 */
export function tPlural(
  key: I18nPath,
  count: number,
  args?: Record<string, any>,
): string {
  return tICU(key, { count, ...args });
}

/**
 * Translate with number formatting
 * @param key Translation key with ICU number syntax: {value, number} or {value, number, currency}
 * @param value Number to format
 * @param format Format type: 'number' | 'currency' | 'percent'
 * @param args Additional arguments for translation
 * @returns Translated string with formatted number
 */
export function tNumber(
  key: I18nPath,
  value: number,
  format: 'number' | 'currency' | 'percent' = 'number',
  args?: Record<string, any>,
): string {
  const formatKey = format === 'currency' ? 'currency' : 
                    format === 'percent' ? 'percent' : 'number';
  return tICU(key, { 
    [formatKey]: value,
    ...args 
  });
}

/**
 * Translate with date formatting
 * @param key Translation key with ICU date syntax: {date, date, short}
 * @param date Date to format
 * @param style Date style: 'short' | 'medium' | 'long' | 'full'
 * @param args Additional arguments for translation
 * @returns Translated string with formatted date
 */
export function tDate(
  key: I18nPath,
  date: Date,
  style: 'short' | 'medium' | 'long' | 'full' = 'medium',
  args?: Record<string, any>,
): string {
  return tICU(key, {
    date,
    ...args
  });
}

/**
 * Translate with select statement
 * @param key Translation key with ICU select syntax: {value, select, option1 {...} option2 {...} other {...}}
 * @param value Value to select from
 * @param args Additional arguments for translation
 * @returns Translated string based on select value
 */
export function tSelect(
  key: I18nPath,
  value: string,
  args?: Record<string, any>,
): string {
  return tICU(key, { value, ...args });
}

/**
 * Translate with time formatting
 * @param key Translation key with ICU time syntax: {time, time, short}
 * @param time Date/Time to format
 * @param style Time style: 'short' | 'medium' | 'long'
 * @param args Additional arguments for translation
 * @returns Translated string with formatted time
 */
export function tTime(
  key: I18nPath,
  time: Date,
  style: 'short' | 'medium' | 'long' = 'short',
  args?: Record<string, any>,
): string {
  return tICU(key, {
    time,
    ...args
  });
}


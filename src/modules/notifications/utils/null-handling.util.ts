import { RecipientInfo } from '../types/recipient-info.interface';

/**
 * Null handling utilities for the notifications module
 *
 * Strategy:
 * - Use `undefined` for optional values (TypeScript-friendly)
 * - Use `null` for database fields that can be explicitly null
 * - Normalize between null/undefined when needed for consistency
 */

/**
 * Get recipient identifier (email or phone) from RecipientInfo
 * Returns null if neither is available
 *
 * @param recipient - Recipient information
 * @returns Email or phone, or null if neither exists
 */
export function getRecipientIdentifier(
  recipient: RecipientInfo,
): string | null {
  return recipient.email ?? recipient.phone ?? null;
}

/**
 * Normalize value to null (for database fields)
 * Converts undefined to null, keeps null as null
 *
 * @param value - Value to normalize
 * @returns T | null
 */
export function normalizeToNull<T>(value: T | undefined | null): T | null {
  return value ?? null;
}

/**
 * Normalize value to undefined (for optional TypeScript fields)
 * Converts null to undefined, keeps undefined as undefined
 *
 * @param value - Value to normalize
 * @returns T | undefined
 */
export function normalizeToUndefined<T>(
  value: T | undefined | null,
): T | undefined {
  return value ?? undefined;
}

/**
 * Check if value is null or undefined
 *
 * @param value - Value to check
 * @returns True if value is null or undefined
 */
export function isNullOrUndefined(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * Check if value is not null and not undefined
 *
 * @param value - Value to check
 * @returns True if value is not null and not undefined
 */
export function isNotNullOrUndefined<T>(
  value: T | null | undefined,
): value is T {
  return value !== null && value !== undefined;
}

/**
 * Get value or default, handling both null and undefined
 *
 * @param value - Value that might be null or undefined
 * @param defaultValue - Default value to use if value is null/undefined
 * @returns Value or default
 */
export function getValueOrDefault<T>(
  value: T | null | undefined,
  defaultValue: T,
): T {
  return value ?? defaultValue;
}

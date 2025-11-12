import { NotificationPayload } from '../types/notification-payload.interface';
import { NotificationJobData } from '../types/notification-job-data.interface';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { NotificationType } from '../enums/notification-type.enum';

/**
 * Type guard to check if data is a NotificationPayload
 * Validates required fields for notification payload
 */
export function isNotificationPayload(
  data: unknown,
): data is NotificationPayload {
  return (
    typeof data === 'object' &&
    data !== null &&
    'channel' in data &&
    'type' in data &&
    'recipient' in data &&
    typeof (data as Record<string, unknown>).channel === 'string' &&
    typeof (data as Record<string, unknown>).type === 'string' &&
    typeof (data as Record<string, unknown>).recipient === 'string'
  );
}

/**
 * Type guard to check if data is a NotificationJobData
 * NotificationJobData extends NotificationPayload with retryCount
 */
export function isNotificationJobData(
  data: unknown,
): data is NotificationJobData {
  if (!isNotificationPayload(data)) {
    return false;
  }
  // NotificationPayload is a discriminated union, so we need to check it differently
  // We'll check if it has the required fields and retryCount
  const payload = data;
  return (
    'retryCount' in payload &&
    (typeof (payload as NotificationJobData).retryCount === 'number' ||
      (payload as NotificationJobData).retryCount === undefined)
  );
}

/**
 * Type guard to check if data is a Record<string, unknown>
 * Useful for safely accessing dynamic object properties
 */
export function isRecord(data: unknown): data is Record<string, unknown> {
  return (
    typeof data === 'object' &&
    data !== null &&
    !Array.isArray(data) &&
    Object.getPrototypeOf(data) === Object.prototype
  );
}

/**
 * Type guard to check if value is a string
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Type guard to check if value is a valid NotificationChannel
 */
export function isNotificationChannel(
  value: unknown,
): value is NotificationChannel {
  return (
    typeof value === 'string' &&
    Object.values(NotificationChannel).includes(value as NotificationChannel)
  );
}

/**
 * Type guard to check if value is a valid NotificationType
 */
export function isNotificationType(value: unknown): value is NotificationType {
  return (
    typeof value === 'string' &&
    Object.values(NotificationType).includes(value as NotificationType)
  );
}

/**
 * Safely get a string property from a record
 * Returns undefined if property doesn't exist or is not a string
 */
export function getStringProperty(
  record: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = record[key];
  return isString(value) ? value : undefined;
}

/**
 * Safely get a number property from a record
 * Returns undefined if property doesn't exist or is not a number
 */
export function getNumberProperty(
  record: Record<string, unknown>,
  key: string,
): number | undefined {
  const value = record[key];
  return typeof value === 'number' ? value : undefined;
}

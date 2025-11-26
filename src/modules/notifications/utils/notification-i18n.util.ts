import { NotificationType } from '../enums/notification-type.enum';

/**
 * Notification field names for i18n keys
 */
export const NOTIFICATION_FIELDS = {
  TITLE: 'title',
  MESSAGE: 'message',
} as const;

export type NotificationField = typeof NOTIFICATION_FIELDS[keyof typeof NOTIFICATION_FIELDS];

/**
 * Build i18n key for notification translation
 * Uses enum value directly (e.g., NotificationType.OTP → "OTP")
 *
 * @param type - Notification type enum value
 * @param field - Field name ('title' or 'message')
 * @returns i18n key like "notifications.OTP.title"
 *
 * @example
 * getNotificationI18nKey(NotificationType.OTP, 'title')
 * // Returns: "notifications.OTP.title"
 */
export function getNotificationI18nKey(
  type: NotificationType,
  field: NotificationField,
): string {
  return `notifications.${type}.${field}`;
}

/**
 * Extract variable names from i18n translation string
 * Supports i18n format: {variable} and nested properties: {object.property}
 *
 * @param str - Translation string with variables
 * @returns Array of variable names found in the string (includes base names for nested properties)
 *
 * @example
 * extractI18nVariables("Hello {name}, your code is {otpCode}")
 * // Returns: ["name", "otpCode"]
 *
 * @example
 * extractI18nVariables("Center {center.name} created by {creatorName}")
 * // Returns: ["center", "center.name", "creatorName"]
 */
export function extractI18nVariables(str: string): string[] {
  // Match both simple variables {var} and nested properties {obj.prop}
  const regex = /\{([\w.]+)\}/g;
  const matches: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(str)) !== null) {
    if (match[1]) {
      const variable = match[1];
      matches.push(variable);
      
      // If it's a nested property like "center.name", also add the base "center"
      // This allows validation to pass when "center" is required but "center.name" is used
      if (variable.includes('.')) {
        const baseVar = variable.split('.')[0];
        if (!matches.includes(baseVar)) {
          matches.push(baseVar);
        }
      }
    }
  }

  return matches;
}


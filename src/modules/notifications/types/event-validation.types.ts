import { NotificationType } from '../enums/notification-type.enum';
import { NotificationRegistry } from '../manifests/registry/notification-registry';

/**
 * Extract all required variables from all channels in a manifest
 * Returns union of all required variable names
 */
type ExtractRequiredVariables<T extends NotificationType> =
  (typeof NotificationRegistry)[T] extends { channels: infer C }
    ? C extends Record<string, { requiredVariables?: readonly string[] }>
      ? {
          [K in keyof C]: C[K]['requiredVariables'] extends readonly (infer V)[]
            ? V
            : never;
        }[keyof C]
      : never
    : never;

/**
 * Ensure event has all required properties for a notification type
 * If properties are missing, TypeScript will show an error with __missing property
 */
export type ValidateEventForNotification<
  TEvent,
  TNotificationType extends NotificationType,
> =
  ExtractRequiredVariables<TNotificationType> extends keyof TEvent
    ? TEvent // All required properties present
    : TEvent & {
        __missing: Exclude<
          ExtractRequiredVariables<TNotificationType>,
          keyof TEvent
        >;
      }; // Missing properties shown in __missing

/**
 * Helper to extract required variables as a type
 */
export type RequiredVariablesForNotification<T extends NotificationType> =
  ExtractRequiredVariables<T>;

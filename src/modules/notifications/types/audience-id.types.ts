import { NotificationType } from '../enums/notification-type.enum';
import { NotificationRegistry } from '../manifests/registry/notification-registry';

/**
 * Extract audience IDs from manifest audiences object
 * Returns union of all audience key strings
 */
type ExtractAudiences<TManifest> = TManifest extends {
  audiences: Record<infer K, any>;
}
  ? K & string
  : never;

/**
 * Type-safe audience ID for a notification type
 * Extracted from manifest.audiences keys at compile time
 *
 * Example:
 * - NotificationType.CENTER_CREATED manifest has audiences: { OWNER: ..., ADMIN: ... }
 * - AudienceIdForNotification<NotificationType.CENTER_CREATED> = 'OWNER' | 'ADMIN'
 */
export type AudienceIdForNotification<T extends NotificationType> =
  T extends keyof typeof NotificationRegistry
    ? ExtractAudiences<typeof NotificationRegistry[T]>
    : never;


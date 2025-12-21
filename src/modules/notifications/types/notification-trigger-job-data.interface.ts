import { NotificationType } from '../enums/notification-type.enum';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { IntentForNotification } from './notification-intent.map';

/**
 * Job data for triggering a notification (enqueues the entire trigger process)
 * This is different from NotificationJobData which is for individual channel sends
 *
 * Uses intent-based architecture:
 * - Intent contains only minimal IDs needed (centerId, actorId, userId, etc.)
 * - Intent Resolver enriches intent with full data (fetches from DB, resolves recipients, builds template variables)
 * - This keeps payloads tiny and enables proper handling of large audiences
 *
 * Uses generic type parameter to maintain type safety between notification type and intent structure
 */
export interface NotificationTriggerJobData<
  T extends NotificationType = NotificationType,
> {
  /**
   * Notification type to trigger
   */
  type: T;

  /**
   * Notification intent - minimal DTO containing only IDs needed to resolve recipients and template variables
   * Type-safe: TypeScript enforces correct intent structure based on notification type
   */
  intent: IntentForNotification<T>;

  /**
   * Optional channel override
   * If not provided, channels are determined from manifest configuration
   */
  channels?: NotificationChannel[];

  /**
   * Correlation ID for end-to-end tracing
   * Generated at enqueue time
   */
  correlationId?: string;
}

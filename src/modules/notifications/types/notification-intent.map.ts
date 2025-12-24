import { NotificationType } from '../enums/notification-type.enum';

/**
 * Type mapping from NotificationType to its intent structure
 * Intents contain only the minimal IDs needed to resolve recipients and template variables
 *
 * Intents are tiny DTOs that represent "what happened" in notification language,
 * not full domain events. The Intent Resolver will enrich these with full data.
 */
export type NotificationIntentMap = {
  [NotificationType.CENTER_CREATED]: {
    centerId: string;
    actorId: string;
  };
  [NotificationType.CENTER_UPDATED]: {
    centerId: string;
    actorId: string;
  };
  [NotificationType.OTP]: {
    userId: string;
    otpCode: string;
    expiresIn: number;
  };
  [NotificationType.PHONE_VERIFIED]: {
    userId: string;
  };
  // Add more notification types as needed
};

/**
 * Extract the intent type for a given notification type
 */
export type IntentForNotification<T extends NotificationType> =
  T extends keyof NotificationIntentMap ? NotificationIntentMap[T] : never;

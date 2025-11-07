import {
  NotificationPayload,
  EmailNotificationPayload,
  SmsNotificationPayload,
  WhatsAppNotificationPayload,
  InAppNotificationPayload,
  PushNotificationPayload,
} from '../../types/notification-payload.interface';

/**
 * Base interface for all notification adapters
 * Each adapter implementation should use a specific channel payload type
 */
export interface NotificationAdapter<
  T extends NotificationPayload = NotificationPayload,
> {
  send(payload: T): Promise<void>;
}

/**
 * Type-specific adapter interfaces for better type safety
 * These are not strictly required but provide better type hints
 */
export interface EmailNotificationAdapter
  extends NotificationAdapter<EmailNotificationPayload> {}

export interface SmsNotificationAdapter
  extends NotificationAdapter<SmsNotificationPayload> {}

export interface WhatsAppNotificationAdapter
  extends NotificationAdapter<WhatsAppNotificationPayload> {}

export interface InAppNotificationAdapter
  extends NotificationAdapter<InAppNotificationPayload> {}

export interface PushNotificationAdapter
  extends NotificationAdapter<PushNotificationPayload> {}

import { NotificationChannel } from '../enums/notification-channel.enum';
import { NotificationType } from '../enums/notification-type.enum';
import { NotificationGroup } from '../enums/notification-group.enum';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { CorrelationId, UserId } from './branded-types';

/**
 * Base payload interface with common fields shared across all notification channels
 */
export interface BaseNotificationPayload {
  type: NotificationType;
  group: NotificationGroup;
  locale?: string;
  centerId?: string;
  userId?: UserId;
  profileType?: ProfileType | null;
  profileId?: string | null;
  correlationId?: CorrelationId;
}

/**
 * Email-specific notification payload
 */
export interface EmailNotificationPayload extends BaseNotificationPayload {
  channel: NotificationChannel.EMAIL;
  recipient: string; // email address
  subject: string;
  data: {
    html: string;
    content?: string;
    [key: string]: unknown;
  };
}

/**
 * SMS-specific notification payload
 */
export interface SmsNotificationPayload extends BaseNotificationPayload {
  channel: NotificationChannel.SMS;
  recipient: string; // phone number
  data: {
    content: string;
    message?: string;
    html?: string;
    [key: string]: unknown;
  };
}

/**
 * WhatsApp-specific notification payload
 */
export interface WhatsAppNotificationPayload extends BaseNotificationPayload {
  channel: NotificationChannel.WHATSAPP;
  recipient: string; // phone number
  data: {
    content: string;
    message?: string;
    html?: string;
    [key: string]: unknown;
  };
}

/**
 * In-App notification payload
 */
export interface InAppNotificationPayload extends BaseNotificationPayload {
  channel: NotificationChannel.IN_APP;
  recipient?: string; // Not required for in-app, uses userId
  title: string;
  data: {
    message: string;
    content?: string;
    html?: string;
    priority?: number;
    expiresAt?: Date;
    [key: string]: unknown;
  };
}

/**
 * Push notification payload (reserved for future use)
 */
export interface PushNotificationPayload extends BaseNotificationPayload {
  channel: NotificationChannel.PUSH;
  recipient: string; // device token
  title: string;
  data: {
    message: string;
    [key: string]: unknown;
  };
}

/**
 * Discriminated union type for all notification payloads
 * The `channel` field acts as the discriminator
 */
export type NotificationPayload =
  | EmailNotificationPayload
  | SmsNotificationPayload
  | WhatsAppNotificationPayload
  | InAppNotificationPayload
  | PushNotificationPayload;

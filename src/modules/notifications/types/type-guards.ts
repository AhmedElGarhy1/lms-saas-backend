import {
  NotificationPayload,
  EmailNotificationPayload,
  SmsNotificationPayload,
  WhatsAppNotificationPayload,
  InAppNotificationPayload,
  PushNotificationPayload,
} from './notification-payload.interface';
import { NotificationChannel } from '../enums/notification-channel.enum';

/**
 * Type guard for Email notification payload
 */
export function isEmailPayload(
  payload: NotificationPayload,
): payload is EmailNotificationPayload {
  return payload.channel === NotificationChannel.EMAIL;
}

/**
 * Type guard for SMS notification payload
 */
export function isSmsPayload(
  payload: NotificationPayload,
): payload is SmsNotificationPayload {
  return payload.channel === NotificationChannel.SMS;
}

/**
 * Type guard for WhatsApp notification payload
 */
export function isWhatsAppPayload(
  payload: NotificationPayload,
): payload is WhatsAppNotificationPayload {
  return payload.channel === NotificationChannel.WHATSAPP;
}

/**
 * Type guard for In-App notification payload
 */
export function isInAppPayload(
  payload: NotificationPayload,
): payload is InAppNotificationPayload {
  return payload.channel === NotificationChannel.IN_APP;
}

/**
 * Type guard for Push notification payload
 */
export function isPushPayload(
  payload: NotificationPayload,
): payload is PushNotificationPayload {
  return payload.channel === NotificationChannel.PUSH;
}


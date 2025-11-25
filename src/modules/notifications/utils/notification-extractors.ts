import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { RecipientInfo } from '../types/recipient-info.interface';

/**
 * Extract recipient based on target channel
 * Channel-driven extraction - the channel determines what we need, not the event type
 *
 * @param recipientInfo - Recipient information object containing all needed data
 * @param channel - Target notification channel
 * @returns Recipient value appropriate for the channel, or null if not found
 */
export function extractRecipient(
  recipientInfo: RecipientInfo,
  channel: NotificationChannel,
): string | null {
  switch (channel) {
    case NotificationChannel.SMS:
    case NotificationChannel.WHATSAPP:
      return recipientInfo.phone || null;
    case NotificationChannel.EMAIL:
      return recipientInfo.email || null;
    case NotificationChannel.IN_APP:
    case NotificationChannel.PUSH:
      return recipientInfo.userId || null;
    default:
      return null;
  }
}

/**
 * Extract userId from recipient information
 * @param recipientInfo - Recipient information object
 * @returns User ID
 */
export function extractUserId(recipientInfo: RecipientInfo): string {
  return recipientInfo.userId;
}

/**
 * Extract centerId from recipient information
 * @param recipientInfo - Recipient information object
 * @returns Center ID or undefined if not found
 */
export function extractCenterId(
  recipientInfo: RecipientInfo,
): string | undefined {
  return recipientInfo.centerId || undefined;
}

/**
 * Extract profileType and profileId from recipient information
 * @param recipientInfo - Recipient information object
 * @returns Object with profileType and profileId, or null values if not found
 */
export function extractProfileInfo(recipientInfo: RecipientInfo): {
  profileType?: ProfileType | null;
  profileId?: string | null;
} {
  return {
    profileType: recipientInfo.profileType,
    profileId: recipientInfo.profileId,
  };
}

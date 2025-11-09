import { Injectable } from '@nestjs/common';
import { NotificationChannel } from '../enums/notification-channel.enum';
import {
  isValidEmail,
  isValidE164,
  normalizePhone,
} from '../utils/recipient-validator.util';

/**
 * Pure service for recipient validation
 * No side effects, only validation logic
 *
 * Determines the appropriate recipient value for a given channel
 * and validates its format according to channel requirements.
 */
@Injectable()
export class RecipientValidationService {
  /**
   * Determine and validate recipient for channel
   * Pure function - no side effects
   *
   * @param channel - Notification channel
   * @param recipient - General recipient (email or phone)
   * @param phone - Phone number (if available)
   * @param userId - User ID (for IN_APP/PUSH channels)
   * @returns Validated recipient string or null if invalid/missing
   */
  determineAndValidateRecipient(
    channel: NotificationChannel,
    recipient: string | undefined,
    phone: string | undefined,
    userId: string,
  ): string | null {
    let channelRecipient: string | null = null;

    // Determine recipient based on channel type
    if (channel === NotificationChannel.EMAIL) {
      const email = recipient?.includes('@') ? recipient : null;
      if (!email) {
        return null;
      }
      channelRecipient = email;
    } else if (
      channel === NotificationChannel.SMS ||
      channel === NotificationChannel.WHATSAPP
    ) {
      // For SMS/WhatsApp, MUST use phone, never fallback to recipient or userId
      if (!phone) {
        return null;
      }
      // Validate phone is actually a phone number (not userId or email)
      if (phone === userId || phone.includes('@')) {
        return null;
      }
      channelRecipient = phone;
    } else if (channel === NotificationChannel.IN_APP) {
      // For IN_APP, use userId as recipient
      channelRecipient = userId || '';
    } else {
      // PUSH or other channels - use appropriate fallback
      channelRecipient = recipient || phone || null;
    }

    if (!channelRecipient) {
      return null;
    }

    // Validate recipient format
    if (channel === NotificationChannel.EMAIL) {
      if (!isValidEmail(channelRecipient)) {
        return null;
      }
    } else if (
      channel === NotificationChannel.SMS ||
      channel === NotificationChannel.WHATSAPP
    ) {
      // Normalize and validate phone number
      const normalized = normalizePhone(channelRecipient);
      if (!normalized || !isValidE164(normalized)) {
        return null;
      }
      channelRecipient = normalized;
    }

    return channelRecipient;
  }

  /**
   * Check if recipient is valid for channel (without normalization)
   * Useful for quick validation checks
   */
  isValidRecipientForChannel(
    channel: NotificationChannel,
    recipient: string,
  ): boolean {
    if (channel === NotificationChannel.EMAIL) {
      return isValidEmail(recipient);
    }
    if (
      channel === NotificationChannel.SMS ||
      channel === NotificationChannel.WHATSAPP
    ) {
      return isValidE164(recipient);
    }
    // IN_APP and PUSH don't require format validation
    return true;
  }
}

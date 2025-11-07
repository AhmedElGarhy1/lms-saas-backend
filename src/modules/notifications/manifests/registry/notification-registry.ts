import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationManifest } from '../types/manifest.types';

// Import manifests for verification notifications and center updates
import { otpManifest } from '../auth/otp.manifest';
import { passwordResetManifest } from '../auth/password-reset.manifest';
import { emailVerificationManifest } from '../auth/email-verification.manifest';
import { phoneVerifiedManifest } from '../auth/phone-verified.manifest';
import { centerUpdatedManifest } from '../center/center-updated.manifest';
import { centerCreatedManifest } from '../center/center-created.manifest';

/**
 * Central registry of notification manifests
 *
 * All notification types are now migrated to the manifest system:
 * - Verification notifications (OTP, PASSWORD_RESET, EMAIL_VERIFICATION)
 * - Center notifications (CENTER_CREATED, CENTER_UPDATED)
 *
 * Using Record<NotificationType, NotificationManifest> ensures all types are required at compile time.
 * TypeScript will error if any NotificationType is missing a manifest.
 */
export const NotificationRegistry: Record<
  NotificationType,
  NotificationManifest
> = {
  // Verification notifications
  [NotificationType.OTP]: otpManifest,
  [NotificationType.PASSWORD_RESET]: passwordResetManifest,
  [NotificationType.EMAIL_VERIFICATION]: emailVerificationManifest,
  [NotificationType.PHONE_VERIFIED]: phoneVerifiedManifest,

  // Center notifications
  [NotificationType.CENTER_CREATED]: centerCreatedManifest,
  [NotificationType.CENTER_UPDATED]: centerUpdatedManifest,
} as const;

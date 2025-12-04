import { NotificationType } from '../enums/notification-type.enum';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { NotificationManifest } from '../manifests/types/manifest.types';
import { otpManifest } from '../manifests/auth/otp.manifest';
import { passwordResetManifest } from '../manifests/auth/password-reset.manifest';
import { phoneVerifiedManifest } from '../manifests/auth/phone-verified.manifest';
import { centerCreatedManifest } from '../manifests/center/center-created.manifest';
import { centerUpdatedManifest } from '../manifests/center/center-updated.manifest';

/**
 * Extract channels directly from manifest constants (preserves literal types from `as const`)
 *
 * The key insight: with `as const satisfies`, TypeScript preserves the exact structure.
 * We need to extract the actual keys that exist, not use `keyof` on the Record type.
 *
 * This works by checking each NotificationChannel to see if it exists as a key
 * in the channels object. Since manifests use `as const`, the keys are preserved
 * as literal types.
 */
type ExtractChannelsFromManifestConst<TManifest extends NotificationManifest> =
  {
    [AudienceKey in keyof TManifest['audiences']]: {
      [K in NotificationChannel]: K extends keyof TManifest['audiences'][AudienceKey]['channels']
        ? K
        : never;
    }[NotificationChannel];
  }[keyof TManifest['audiences']];

/**
 * Map NotificationType to its available channels using explicit manifest constants
 * This approach directly uses the manifest constants to preserve literal types
 *
 * Note: This requires maintaining the mapping manually, but ensures type safety
 */
export type AvailableChannels<TType extends NotificationType> =
  TType extends NotificationType.OTP
    ? ExtractChannelsFromManifestConst<typeof otpManifest>
    : TType extends NotificationType.PASSWORD_RESET
      ? ExtractChannelsFromManifestConst<typeof passwordResetManifest>
      : TType extends NotificationType.PHONE_VERIFIED
        ? ExtractChannelsFromManifestConst<typeof phoneVerifiedManifest>
        : TType extends NotificationType.CENTER_CREATED
          ? ExtractChannelsFromManifestConst<typeof centerCreatedManifest>
          : TType extends NotificationType.CENTER_UPDATED
            ? ExtractChannelsFromManifestConst<typeof centerUpdatedManifest>
            : never;

/**
 * Type-safe channels array for a specific notification type
 * Only allows channels that exist in the manifest
 * Supports both single channel and multiple channels
 */
export type TypedChannels<TType extends NotificationType> =
  | readonly [AvailableChannels<TType>, ...AvailableChannels<TType>[]]
  | readonly AvailableChannels<TType>[];

/**
 * Helper type for listener options with type-safe channels
 * Ensures channels parameter only accepts channels defined in the manifest
 */
export interface TypedNotificationOptions<TType extends NotificationType> {
  channels?: TypedChannels<TType>;
  context?: Record<string, unknown>;
}

/**
 * Type-safe version of validateAndTriggerNotification options
 * Ensures channels match the manifest for the given notification type
 */
export type ValidateAndTriggerOptions<TType extends NotificationType> = {
  channels?: TypedChannels<TType>;
  context?: Record<string, unknown>;
};

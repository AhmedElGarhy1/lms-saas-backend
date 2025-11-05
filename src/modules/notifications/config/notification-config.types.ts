import { NotificationType } from '../enums/notification-type.enum';
import { NotificationChannel } from '../enums/notification-channel.enum';
import {
  NotificationEventsMap,
  NotificationEventMapping,
} from './notifications.map';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';

/**
 * Extract all channels from a channels definition (flattening profile-scoped)
 * Handles both array format and profile-scoped object format
 * For profile-scoped, creates a union of all channels from all profiles
 */
type FlattenChannels<T> = T extends NotificationChannel[]
  ? T[number]
  : T extends Partial<Record<ProfileType, NotificationChannel[]>>
    ?
        | (T[ProfileType.ADMIN] extends NotificationChannel[]
            ? T[ProfileType.ADMIN][number]
            : never)
        | (T[ProfileType.STAFF] extends NotificationChannel[]
            ? T[ProfileType.STAFF][number]
            : never)
        | (T[ProfileType.TEACHER] extends NotificationChannel[]
            ? T[ProfileType.TEACHER][number]
            : never)
        | (T[ProfileType.PARENT] extends NotificationChannel[]
            ? T[ProfileType.PARENT][number]
            : never)
        | (T[ProfileType.STUDENT] extends NotificationChannel[]
            ? T[ProfileType.STUDENT][number]
            : never)
    : never;

/**
 * Create a record mapping each NotificationType to its used channels
 * Extracts from NotificationEventsMap
 * Only includes entries that exist in NotificationEventsMap (non-undefined)
 */
type NotificationTypeChannels = {
  [K in keyof typeof NotificationEventsMap]: (typeof NotificationEventsMap)[K] extends NotificationEventMapping
    ? {
        type: (typeof NotificationEventsMap)[K]['type'];
        channels: FlattenChannels<
          (typeof NotificationEventsMap)[K]['channels']
        >;
      }
    : never;
};

/**
 * Get channels for a specific NotificationType
 */
type ChannelsForType<T extends NotificationType> = Extract<
  NotificationTypeChannels[keyof NotificationTypeChannels],
  { type: T }
>['channels'];

/**
 * Get all NotificationTypes that use a specific channel
 * This is used to ensure config completeness
 */
type TypesUsingChannel<Channel extends NotificationChannel> = {
  [K in NotificationType]: Channel extends ChannelsForType<K> ? K : never;
}[NotificationType];

/**
 * Template configuration structure
 */
export interface TemplateConfig {
  readonly templatePath: string;
  readonly subject?: string; // For EMAIL, this will be required in EmailTemplateConfig
  readonly defaultLocale?: string;
  readonly requiredVariables?: readonly string[];
}

/**
 * Type-safe EMAIL configuration
 * TypeScript will error if any NotificationType using EMAIL is missing
 * Subject is required for EMAIL templates
 */
export type EmailTemplateConfig = {
  readonly [K in TypesUsingChannel<NotificationChannel.EMAIL>]: TemplateConfig & {
    readonly subject: string;
  };
};

/**
 * Type-safe SMS configuration
 * TypeScript will error if any NotificationType using SMS is missing
 */
export type SmsTemplateConfig = {
  readonly [K in TypesUsingChannel<NotificationChannel.SMS>]: TemplateConfig;
};

/**
 * Type-safe WhatsApp configuration
 * TypeScript will error if any NotificationType using WHATSAPP is missing
 */
export type WhatsAppTemplateConfig = {
  readonly [K in TypesUsingChannel<NotificationChannel.WHATSAPP>]: TemplateConfig;
};

/**
 * Generic channel template config type
 * Used to reduce code duplication and make system extensible
 */
export type ChannelTemplateConfig<Channel extends NotificationChannel> = {
  readonly [K in TypesUsingChannel<Channel>]: TemplateConfig &
    (Channel extends NotificationChannel.EMAIL
      ? { readonly subject: string }
      : {});
};

/**
 * Type-safe PUSH configuration
 * TypeScript will error if any NotificationType using PUSH is missing
 * Currently empty as no notification types use PUSH yet
 */
export type PushTemplateConfig = {
  readonly [K in TypesUsingChannel<NotificationChannel.PUSH>]: TemplateConfig;
};

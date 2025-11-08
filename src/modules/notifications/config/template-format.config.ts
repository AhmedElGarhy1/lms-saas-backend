import { NotificationChannel } from '../enums/notification-channel.enum';

/**
 * File extension mapping for each notification channel
 */
export const CHANNEL_EXTENSIONS: Record<NotificationChannel, string> = {
  [NotificationChannel.EMAIL]: '.hbs',
  [NotificationChannel.SMS]: '.txt',
  [NotificationChannel.WHATSAPP]: '.txt',
  [NotificationChannel.IN_APP]: '.json',
  [NotificationChannel.PUSH]: '.txt', // Reserved for future use
} as const;

/**
 * Folder name mapping for each notification channel
 */
export const CHANNEL_FOLDERS: Record<NotificationChannel, string> = {
  [NotificationChannel.EMAIL]: 'email',
  [NotificationChannel.SMS]: 'sms',
  [NotificationChannel.WHATSAPP]: 'whatsapp',
  [NotificationChannel.IN_APP]: 'in-app',
  [NotificationChannel.PUSH]: 'push', // Reserved for future use
} as const;

/**
 * Get file extension for a notification channel
 */
export function getChannelExtension(channel: NotificationChannel): string {
  return CHANNEL_EXTENSIONS[channel];
}

/**
 * Get folder name for a notification channel
 */
export function getChannelFolder(channel: NotificationChannel): string {
  return CHANNEL_FOLDERS[channel];
}

/**
 * Fallback hierarchy for template resolution
 * Order: channel-specific → whatsapp → default
 */
export enum TemplateFallbackStrategy {
  /** Try channel-specific template only */
  CHANNEL_ONLY = 'channel-only',
  /** Try channel-specific, then fallback to whatsapp template */
  CHANNEL_OR_WHATSAPP = 'channel-or-whatsapp',
  /** Try channel-specific, whatsapp, then default template */
  FULL = 'full',
  /** @deprecated Use CHANNEL_OR_WHATSAPP instead. Kept for backward compatibility */
  CHANNEL_OR_EMAIL = 'channel-or-email',
}

/**
 * Default fallback strategy
 */
export const DEFAULT_FALLBACK_STRATEGY =
  TemplateFallbackStrategy.CHANNEL_OR_WHATSAPP;

/**
 * Get fallback channels for a given channel
 * Returns array of channels to try in order
 */
export function getFallbackChannels(
  channel: NotificationChannel,
  strategy: TemplateFallbackStrategy = DEFAULT_FALLBACK_STRATEGY,
): NotificationChannel[] {
  const channels: NotificationChannel[] = [channel];

  if (strategy === TemplateFallbackStrategy.CHANNEL_ONLY) {
    return channels;
  }

  // Add whatsapp as fallback (if not already whatsapp)
  // Also handle deprecated CHANNEL_OR_EMAIL for backward compatibility
  if (
    strategy === TemplateFallbackStrategy.CHANNEL_OR_WHATSAPP ||
    strategy === TemplateFallbackStrategy.CHANNEL_OR_EMAIL
  ) {
    if (channel !== NotificationChannel.WHATSAPP) {
      channels.push(NotificationChannel.WHATSAPP);
    }
  }

  // Note: Default template is handled separately (not a channel)
  return channels;
}

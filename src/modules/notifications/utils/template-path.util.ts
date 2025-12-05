import { join } from 'path';
import { existsSync } from 'fs';
import { NotificationTemplatePath } from '../types/templates.generated';
import { NotificationChannel } from '../enums/notification-channel.enum';
import {
  getChannelExtension,
  getChannelFolder,
} from '../config/template-format.config';

/**
 * Get full path to a template file with channel support
 * @param template - Template path (can include channel prefix like 'email/auth/otp-sent' or just 'auth/otp-sent')
 * @param locale - Locale code (default: 'en')
 * @param channel - Notification channel (required for channel-specific paths)
 * @returns Full path to template file
 * @note For WhatsApp channel, templates are reference-only and located in whatsapp-templates/ at project root
 */
export function getTemplatePath(
  template: NotificationTemplatePath | string,
  locale: string = 'en',
  channel?: NotificationChannel,
): string {
  // WhatsApp templates are reference-only and located at project root
  if (channel === NotificationChannel.WHATSAPP) {
    const extension = getChannelExtension(channel);
    const templateStr =
      typeof template === 'string' ? template : String(template);
    return join(
      process.cwd(),
      'whatsapp-templates',
      locale,
      `${templateStr}${extension}`,
    );
  }

  // If template already includes channel prefix (e.g., 'email/auth/otp-sent'), use it directly
  if (channel) {
    const channelFolder = getChannelFolder(channel);
    const extension = getChannelExtension(channel);
    const templateStr =
      typeof template === 'string' ? template : String(template);
    // Check if template already has channel prefix
    if (templateStr.startsWith(`${channelFolder}/`)) {
      return join(
        process.cwd(),
        'src/i18n/notifications',
        locale,
        `${templateStr}${extension}`,
      );
    }
    // Otherwise, construct path with channel folder
    return join(
      process.cwd(),
      'src/i18n/notifications',
      locale,
      channelFolder,
      `${templateStr}${extension}`,
    );
  }

  // Fallback: assume .hbs extension if no channel specified
  const templateStr =
    typeof template === 'string' ? template : String(template);
  return join(
    process.cwd(),
    'src/i18n/notifications',
    locale,
    `${templateStr}.hbs`,
  );
}

/**
 * Check if a template file exists
 * @param template - Template path
 * @param locale - Locale code (default: 'en')
 * @param channel - Notification channel (optional, for channel-specific paths)
 * @returns True if template exists, false otherwise
 */
export function templateExists(
  template: NotificationTemplatePath | string,
  locale: string = 'en',
  channel?: NotificationChannel,
): boolean {
  // WhatsApp templates are reference-only, not used for rendering
  if (channel === NotificationChannel.WHATSAPP) {
    return false;
  }

  const templatePath: string = getTemplatePath(template, locale, channel);
  return existsSync(templatePath);
}

/**
 * Resolve template path with simplified fallback strategy
 * Simplified to 2 levels: primary template → default template
 * @param template - Base template path (e.g., 'auth/otp-sent')
 * @param locale - Locale code
 * @param channel - Notification channel
 * @param strategy - Fallback strategy (kept for backward compat, but simplified logic)
 * @returns Full path to template file, or null if not found
 */
export function resolveTemplatePathWithFallback(
  template: string,
  locale: string = 'en',
  channel: NotificationChannel,
): string | null {
  // WhatsApp templates are reference-only, not used for rendering
  if (channel === NotificationChannel.WHATSAPP) {
    return null;
  }

  // Level 1: Try primary template (channel-specific)
  const primaryPath = getTemplatePath(template, locale, channel);
  if (existsSync(primaryPath)) {
    return primaryPath;
  }

  // Level 2: Try default template in channel folder
  const channelFolder = getChannelFolder(channel);
  const defaultExtension = getChannelExtension(channel);
  const defaultPath = join(
    process.cwd(),
    'src/i18n/notifications',
    locale,
    channelFolder,
    `default${defaultExtension}`,
  );
  if (existsSync(defaultPath)) {
    return defaultPath;
  }

  return null;
}

import { NotificationEventsMap } from './notifications.map';
import { NotificationType } from '../enums/notification-type.enum';
import { emailTemplateConfig } from './email.config';
import { smsTemplateConfig } from './sms.config';
import { whatsappTemplateConfig } from './whatsapp.config';
import { pushTemplateConfig } from './push.config';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { TemplateConfig } from './notification-config.types';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';

/**
 * Validation result for template path validation
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Validation error details
 */
export interface ValidationError {
  notificationType: NotificationType;
  channel: NotificationChannel;
  expectedTemplatePath: string;
  actualTemplatePath?: string;
  message: string;
}

/**
 * Get template path from NotificationEventsMap for a given NotificationType
 * @param notificationType - The notification type to look up
 * @returns Template path or undefined if not found
 */
export function getTemplatePathForType(
  notificationType: NotificationType,
): string | undefined {
  // Find the event mapping that uses this notification type
  for (const [eventType, mapping] of Object.entries(NotificationEventsMap)) {
    if (mapping && mapping.type === notificationType) {
      return mapping.template;
    }
  }
  return undefined;
}

/**
 * Validate that template paths in configs match NotificationEventsMap
 * @returns Validation result with any errors found
 */
export function validateTemplatePaths(): ValidationResult {
  const errors: ValidationError[] = [];

  // Validate email configs
  for (const notificationTypeStr of Object.keys(emailTemplateConfig)) {
    const notificationType = notificationTypeStr as NotificationType;
    const config = (
      emailTemplateConfig as Record<
        string,
        TemplateConfig & { subject: string }
      >
    )[notificationTypeStr];
    if (!config) continue;
    const expectedPath = getTemplatePathForType(notificationType);
    if (expectedPath && config.templatePath !== expectedPath) {
      errors.push({
        notificationType,
        channel: NotificationChannel.EMAIL,
        expectedTemplatePath: expectedPath,
        actualTemplatePath: config.templatePath,
        message: `Email template path mismatch for ${notificationType}: expected "${expectedPath}", got "${config.templatePath}"`,
      });
    }
  }

  // Validate SMS configs
  for (const notificationTypeStr of Object.keys(smsTemplateConfig)) {
    const notificationType = notificationTypeStr as NotificationType;
    const config = (smsTemplateConfig as Record<string, TemplateConfig>)[
      notificationTypeStr
    ];
    if (!config) continue;
    const expectedPath = getTemplatePathForType(notificationType);
    if (expectedPath && config.templatePath !== expectedPath) {
      errors.push({
        notificationType,
        channel: NotificationChannel.SMS,
        expectedTemplatePath: expectedPath,
        actualTemplatePath: config.templatePath,
        message: `SMS template path mismatch for ${notificationType}: expected "${expectedPath}", got "${config.templatePath}"`,
      });
    }
  }

  // Validate WhatsApp configs
  for (const notificationTypeStr of Object.keys(whatsappTemplateConfig)) {
    const notificationType = notificationTypeStr as NotificationType;
    const config = (whatsappTemplateConfig as Record<string, TemplateConfig>)[
      notificationTypeStr
    ];
    if (!config) continue;
    const expectedPath = getTemplatePathForType(notificationType);
    if (expectedPath && config.templatePath !== expectedPath) {
      errors.push({
        notificationType,
        channel: NotificationChannel.WHATSAPP,
        expectedTemplatePath: expectedPath,
        actualTemplatePath: config.templatePath,
        message: `WhatsApp template path mismatch for ${notificationType}: expected "${expectedPath}", got "${config.templatePath}"`,
      });
    }
  }

  // Validate Push configs (if any exist)
  for (const notificationTypeStr of Object.keys(pushTemplateConfig)) {
    const notificationType = notificationTypeStr as NotificationType;
    const config = (pushTemplateConfig as Record<string, TemplateConfig>)[
      notificationTypeStr
    ];
    if (!config) continue;
    const expectedPath = getTemplatePathForType(notificationType);
    if (expectedPath && config.templatePath !== expectedPath) {
      errors.push({
        notificationType,
        channel: NotificationChannel.PUSH,
        expectedTemplatePath: expectedPath,
        actualTemplatePath: config.templatePath,
        message: `Push template path mismatch for ${notificationType}: expected "${expectedPath}", got "${config.templatePath}"`,
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Get all notification types that use a specific channel
 * @param channel - The channel to check
 * @returns Array of notification types that use the channel
 */
export function getNotificationTypesForChannel(
  channel: NotificationChannel,
): NotificationType[] {
  const types: NotificationType[] = [];

  for (const mapping of Object.values(NotificationEventsMap)) {
    if (!mapping) continue;

    // Check if channels is an array
    if (Array.isArray(mapping.channels)) {
      if (mapping.channels.includes(channel)) {
        types.push(mapping.type);
      }
    } else {
      // Check if channels is profile-scoped
      for (const profileChannels of Object.values(mapping.channels)) {
        if (profileChannels && profileChannels.includes(channel)) {
          types.push(mapping.type);
          break; // Already found for this mapping
        }
      }
    }
  }

  return Array.from(new Set(types)); // Remove duplicates
}

/**
 * Get channels for a specific profile type from a profile-scoped mapping
 * @param mapping - The notification event mapping
 * @param profileType - The profile type to check
 * @returns Array of channels for the profile, or empty array if not found
 */
export function getChannelsForProfile(
  mapping: {
    channels:
      | NotificationChannel[]
      | Partial<Record<ProfileType, NotificationChannel[]>>;
  },
  profileType: ProfileType,
): NotificationChannel[] {
  // If channels is an array, it's not profile-scoped, return empty
  if (Array.isArray(mapping.channels)) {
    return [];
  }

  // If channels is profile-scoped, get channels for the specific profile
  return mapping.channels[profileType] || [];
}

/**
 * Validate that profile-scoped channels have corresponding configs
 * Checks that all notification types using a channel at any profile level have configs
 * @returns Validation result with any errors found
 */
export function validateProfileScopedChannels(): ValidationResult {
  const errors: ValidationError[] = [];

  // Check each mapping in NotificationEventsMap
  for (const mapping of Object.values(NotificationEventsMap)) {
    if (!mapping) continue;

    // Skip if not profile-scoped
    if (Array.isArray(mapping.channels)) {
      continue;
    }

    // For profile-scoped mappings, check all channels used by any profile
    const allChannels = new Set<NotificationChannel>();

    // Collect all channels from all profiles
    for (const profileType of Object.values(ProfileType)) {
      const profileChannels = mapping.channels[profileType];
      if (profileChannels) {
        profileChannels.forEach((channel) => allChannels.add(channel));
      }
    }

    // Verify configs exist for each channel used
    for (const channel of allChannels) {
      let configExists = false;

      switch (channel) {
        case NotificationChannel.EMAIL:
          configExists = !!(emailTemplateConfig as Record<string, unknown>)[
            mapping.type
          ];
          break;
        case NotificationChannel.SMS:
          configExists = !!(smsTemplateConfig as Record<string, unknown>)[
            mapping.type
          ];
          break;
        case NotificationChannel.WHATSAPP:
          configExists = !!(whatsappTemplateConfig as Record<string, unknown>)[
            mapping.type
          ];
          break;
        case NotificationChannel.PUSH:
          configExists = !!(pushTemplateConfig as Record<string, unknown>)[
            mapping.type
          ];
          break;
        default:
          // IN_APP, etc. don't need configs
          configExists = true;
      }

      if (!configExists) {
        errors.push({
          notificationType: mapping.type,
          channel,
          expectedTemplatePath: mapping.template,
          message: `Profile-scoped notification ${mapping.type} uses ${channel} channel but config is missing`,
        });
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

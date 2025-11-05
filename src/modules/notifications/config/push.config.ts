import { PushTemplateConfig } from './notification-config.types';
import { NotificationType } from '../enums/notification-type.enum';

/**
 * Push notification template configuration
 * TypeScript will error if any NotificationType using PUSH is missing
 * 
 * Currently empty as no notification types use PUSH channel yet.
 * This file is ready for future use when push notifications are implemented.
 * 
 * Example entry (commented out for reference):
 * [NotificationType.USER_REGISTERED]: {
 *   templatePath: 'user-registered',
 *   defaultLocale: 'en',
 *   requiredVariables: ['userName'] as const,
 * },
 */
export const pushTemplateConfig: PushTemplateConfig = {
  // Empty for now - will be populated when notification types use PUSH channel
} as PushTemplateConfig;


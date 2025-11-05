import { WhatsAppTemplateConfig } from './notification-config.types';
import { NotificationType } from '../enums/notification-type.enum';

/**
 * WhatsApp template configuration
 * TypeScript will error if any NotificationType using WHATSAPP is missing
 * 
 * This configuration ensures all WhatsApp templates exist for notification types
 * that use the WHATSAPP channel as defined in NotificationEventsMap.
 * 
 * Note: Some notification types use WHATSAPP only for specific profile types
 * (e.g., CENTER_UPDATED uses WHATSAPP only for STAFF profile), but we still
 * need to configure templates for all types that use WHATSAPP at any profile level.
 */
export const whatsappTemplateConfig: WhatsAppTemplateConfig = {
  [NotificationType.USER_REGISTERED]: {
    templatePath: 'user-registered',
    defaultLocale: 'en',
    requiredVariables: ['userName', 'userEmail'] as const,
  },
  [NotificationType.USER_ACTIVATED]: {
    templatePath: 'user-activated',
    defaultLocale: 'en',
    requiredVariables: ['userName'] as const,
  },
  [NotificationType.CENTER_CREATED]: {
    templatePath: 'center-created',
    defaultLocale: 'en',
    requiredVariables: ['centerName', 'centerEmail'] as const,
  },
  [NotificationType.CENTER_UPDATED]: {
    templatePath: 'center-updated',
    defaultLocale: 'en',
    requiredVariables: ['centerName', 'updatedFields'] as const,
  },
  [NotificationType.CENTER_DELETED]: {
    templatePath: 'center-deleted',
    defaultLocale: 'en',
    requiredVariables: ['centerName'] as const,
  },
  [NotificationType.CENTER_RESTORED]: {
    templatePath: 'center-restored',
    defaultLocale: 'en',
    requiredVariables: ['centerName'] as const,
  },
  [NotificationType.BRANCH_CREATED]: {
    templatePath: 'branch-created',
    defaultLocale: 'en',
    requiredVariables: ['branchName', 'centerName'] as const,
  },
  [NotificationType.BRANCH_UPDATED]: {
    templatePath: 'branch-updated',
    defaultLocale: 'en',
    requiredVariables: ['branchName', 'updatedFields'] as const,
  },
  [NotificationType.BRANCH_DELETED]: {
    templatePath: 'branch-deleted',
    defaultLocale: 'en',
    requiredVariables: ['branchName'] as const,
  },
} as const;


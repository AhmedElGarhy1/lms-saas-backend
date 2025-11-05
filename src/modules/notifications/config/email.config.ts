import { EmailTemplateConfig } from './notification-config.types';
import { NotificationType } from '../enums/notification-type.enum';

/**
 * Email template configuration
 * TypeScript will error if any NotificationType using EMAIL is missing
 * 
 * This configuration ensures all email templates exist for notification types
 * that use the EMAIL channel as defined in NotificationEventsMap.
 */
export const emailTemplateConfig: EmailTemplateConfig = {
  [NotificationType.CENTER_CREATED]: {
    templatePath: 'center-created',
    subject: 'New Center Created',
    defaultLocale: 'en',
    requiredVariables: ['centerName', 'centerEmail'] as const,
  },
  [NotificationType.PASSWORD_RESET]: {
    templatePath: 'auth/password-reset',
    subject: 'Password Reset Request',
    defaultLocale: 'en',
    requiredVariables: ['resetUrl', 'expiresIn'] as const,
  },
  [NotificationType.EMAIL_VERIFICATION]: {
    templatePath: 'auth/email-verification',
    subject: 'Verify Your Email',
    defaultLocale: 'en',
    requiredVariables: ['verificationUrl'] as const,
  },
} as const;


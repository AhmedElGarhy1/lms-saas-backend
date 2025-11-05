import { SmsTemplateConfig } from './notification-config.types';
import { NotificationType } from '../enums/notification-type.enum';

/**
 * SMS template configuration
 * TypeScript will error if any NotificationType using SMS is missing
 * 
 * This configuration ensures all SMS templates exist for notification types
 * that use the SMS channel as defined in NotificationEventsMap.
 */
export const smsTemplateConfig: SmsTemplateConfig = {
  [NotificationType.PASSWORD_RESET]: {
    templatePath: 'auth/password-reset',
    defaultLocale: 'en',
    requiredVariables: ['resetUrl', 'expiresIn'] as const,
  },
  [NotificationType.OTP_SENT]: {
    templatePath: 'auth/otp-sent',
    defaultLocale: 'en',
    requiredVariables: ['otp', 'expiresIn'] as const,
  },
} as const;


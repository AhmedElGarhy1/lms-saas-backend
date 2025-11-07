import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import { NotificationGroup } from '../../enums/notification-group.enum';
import {
  NotificationTemplatePath,
  TemplateBasePath,
} from '../../types/templates.generated';
import { AudienceId } from '../../types/audience.types';

/**
 * Configuration for a single notification channel
 * Defines template and required variables
 *
 * Note: Variables must match exactly what the template expects.
 * Event data transformations (e.g., resetUrl → link) are handled by ensureTemplateData.
 */
export interface ChannelManifest {
  /**
   * Template path relative to src/i18n/notifications/{locale}/{channel}/ (without extension)
   * Should be from generated NotificationTemplatePath type for type safety.
   * If not provided, will be derived from NotificationManifest.templateBase (resolved at runtime as string)
   * Note: When explicitly set, use NotificationTemplatePath. When derived from templateBase, it's a string.
   */
  template?: NotificationTemplatePath;
  /** Email subject (required for EMAIL channel) */
  subject?: string;
  /** Required template variables that must be present in template data (after ensureTemplateData transformation) */
  requiredVariables?: readonly string[];
}

/**
 * Configuration for a single audience
 * Defines channels and configurations specific to this audience
 */
export interface AudienceManifest {
  /** Channel-specific configurations for this audience */
  channels: {
    [NotificationChannel.EMAIL]?: ChannelManifest;
    [NotificationChannel.SMS]?: ChannelManifest;
    [NotificationChannel.WHATSAPP]?: ChannelManifest;
    [NotificationChannel.IN_APP]?: ChannelManifest;
    [NotificationChannel.PUSH]?: ChannelManifest;
  };
}

/**
 * Complete manifest for a notification type
 * Uses multi-audience format where different audiences can have different channels and configurations
 */
export interface NotificationManifest {
  /** Notification type identifier */
  type: NotificationType;
  /** Notification group for categorization */
  group: NotificationGroup;
  /**
   * Base template path (without channel prefix or extension)
   * Must be from generated TemplateBasePath type for type safety.
   * Example: 'auth/otp' will resolve to:
   * - email/auth/otp.hbs (for EMAIL)
   * - sms/auth/otp.txt (for SMS)
   * - whatsapp/auth/otp.txt (for WHATSAPP)
   * - in-app/auth/otp.json (for IN_APP)
   *
   * If not provided, each channel must specify its own template path
   */
  templateBase?: TemplateBasePath;
  /** Priority level (1-10, higher = more urgent) */
  priority?: number;
  /** Whether to use i18n localization */
  localized?: boolean;
  /** Whether this notification requires audit logging */
  requiresAudit?: boolean;
  /** Audience-specific configurations */
  audiences: {
    [audienceId: string]: AudienceManifest;
  };
}

/**
 * Result of rendering a notification template
 */
export interface RenderedNotification {
  /** Notification type */
  type: NotificationType;
  /** Channel used for rendering */
  channel: NotificationChannel;
  /** Email subject (for EMAIL channel) */
  subject?: string;
  /**
   * Rendered template content
   * - string for HTML/text templates (EMAIL, SMS, WHATSAPP)
   * - object for JSON templates (IN_APP)
   */
  content: string | object;
  /** Metadata about the rendering */
  metadata: {
    /** Template path used */
    template: string;
    /** Locale used */
    locale: string;
    /** Whether fallback template was used */
    usedFallback?: boolean;
  };
}

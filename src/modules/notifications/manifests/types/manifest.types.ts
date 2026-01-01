import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import { NotificationGroup } from '../../enums/notification-group.enum';

/**
 * Configuration for a single notification channel
 * Defines template path/name for the channel
 *
 * Note: For EMAIL, SMS: template is a file path (e.g., 'email/auth/otp')
 * Note: For WHATSAPP: template is a Meta template name (e.g., 'otp_verification')
 * Note: For IN_APP: template is optional - translations come from notifications.json using NotificationType enum value
 */
export interface ChannelManifest {
  /**
   * Template configuration:
   * - For EMAIL, SMS: File path relative to src/i18n/notifications/{locale}/{channel}/
   * - For WHATSAPP: Meta Business API template name (pre-approved template name)
   *   Must match exactly what is approved in your WhatsApp Business account.
   * - For IN_APP: Optional - if not provided, uses i18n system with NotificationType enum value as key
   */
  template?: string;
  /** Email subject (required for EMAIL channel) */
  subject?: string;
}

/**
 * Configuration for a single audience
 * Defines channels and configurations specific to this audience
 *
 * Note: Using Record<string, ChannelManifest> allows manifests to define only
 * the channels they actually use. The `as const` assertion on manifest objects
 * preserves the exact channel keys for type inference.
 */
export interface AudienceManifest {
  /** Channel-specific configurations for this audience */
  channels: Record<string, ChannelManifest>;
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
   * All required template variables needed by ANY audience in this manifest
   * TypeScript ensures all variables are provided in event data
   * Each audience/channel uses only the variables it needs
   */
  requiredVariables: readonly string[];
  /** Priority level (1-10, higher = more urgent) */
  priority?: number;
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

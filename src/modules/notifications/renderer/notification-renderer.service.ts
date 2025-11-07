import { Injectable } from '@nestjs/common';
import { NotificationType } from '../enums/notification-type.enum';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { NotificationManifestResolver } from '../manifests/registry/notification-manifest-resolver.service';
import { NotificationTemplateService } from '../services/notification-template.service';
import { LoggerService } from '@/shared/services/logger.service';
import {
  RenderedNotification,
  NotificationManifest,
} from '../manifests/types/manifest.types';
import { MissingTemplateVariablesException } from '../exceptions/notification.exceptions';
import { TemplateRenderingException } from '../exceptions/notification.exceptions';
import { AudienceId } from '../types/audience.types';

/**
 * Service responsible for rendering notifications based on manifests
 *
 * Handles:
 * - Resolving manifests and channel configurations
 * - Validating required variables (variables must match template exactly)
 * - Rendering templates with proper error context
 *
 * Note: Variable names must match template variables exactly.
 * Event data transformations (e.g., resetUrl → link) are handled by ensureTemplateData before rendering.
 */
@Injectable()
export class NotificationRenderer {
  constructor(
    private readonly manifestResolver: NotificationManifestResolver,
    private readonly templateService: NotificationTemplateService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Render a notification template based on manifest configuration
   * @param notificationType - Notification type
   * @param channel - Notification channel
   * @param eventData - Event data to render
   * @param locale - Locale for rendering (defaults to 'en')
   * @param audience - Optional audience identifier for multi-audience notifications
   * @returns Rendered notification with content and metadata
   */
  async render(
    notificationType: NotificationType,
    channel: NotificationChannel,
    eventData: Record<string, unknown>,
    locale: string = 'en',
    audience?: AudienceId,
  ): Promise<RenderedNotification> {
    // 1. Get manifest via resolver
    const manifest = this.manifestResolver.getManifest(notificationType);

    // 2. Get channel config via resolver (with audience if provided)
    // If no audience provided, use first available audience as fallback
    const resolvedAudience = audience || this.getDefaultAudience(manifest);
    const config = this.manifestResolver.getChannelConfig(
      manifest,
      resolvedAudience,
      channel,
    );

    // 3. Validate required variables (variables must match template exactly)
    this.validateRequiredVariables(
      config.requiredVariables || [],
      eventData,
      notificationType,
      channel,
    );

    // 4. Use provided locale (must come from RecipientInfo)
    const finalLocale = locale;

    // 5. Extract base template path (remove channel prefix if present)
    // Template path from config may be like "email/auth/otp-sent" or just "auth/otp-sent"
    const templatePath = config.template!;

    // 6. Render template with channel support (supports .hbs, .txt, .json)
    // Try primary template first, fallback to default template on error
    let renderedContent: string | object;
    let usedFallback = false;
    try {
      renderedContent = await this.templateService.renderTemplateWithChannel(
        templatePath,
        eventData,
        finalLocale,
        channel,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to render template: ${templatePath} for ${notificationType}:${channel}, attempting fallback`,
        'NotificationRenderer',
        {
          notificationType,
          channel,
          template: templatePath,
          locale: finalLocale,
          error: errorMessage,
        },
      );

      // Try fallback to default template
      try {
        const fallbackTemplate = 'default';
        renderedContent = await this.templateService.renderTemplateWithChannel(
          fallbackTemplate,
          eventData,
          finalLocale,
          channel,
        );
        usedFallback = true;
        this.logger.warn(
          `Using fallback template '${fallbackTemplate}' for ${notificationType}:${channel}`,
          'NotificationRenderer',
          {
            notificationType,
            channel,
            originalTemplate: templatePath,
            fallbackTemplate,
            locale: finalLocale,
          },
        );
        // Track fallback usage in metrics (if metrics service is available)
        // Note: Metrics service would need to be injected if we want to track this
        // For now, we log it and can add metrics later if needed
      } catch (fallbackError) {
        const fallbackErrorMessage =
          fallbackError instanceof Error
            ? fallbackError.message
            : String(fallbackError);
        this.logger.error(
          `Failed to render both primary and fallback templates for ${notificationType}:${channel}`,
          fallbackError instanceof Error ? fallbackError.stack : undefined,
          'NotificationRenderer',
          {
            notificationType,
            channel,
            originalTemplate: templatePath,
            originalError: errorMessage,
            fallbackError: fallbackErrorMessage,
            locale: finalLocale,
          },
        );
        throw new TemplateRenderingException(
          templatePath,
          `Failed to render ${notificationType}:${channel}: ${errorMessage}. Fallback also failed: ${fallbackErrorMessage}`,
        );
      }
    }

    return {
      type: notificationType,
      channel,
      subject: config.subject,
      content: renderedContent,
      metadata: {
        template: usedFallback ? 'default' : templatePath,
        locale: finalLocale,
        usedFallback,
      },
    };
  }

  /**
   * Get default audience from manifest (first available audience)
   * Used as fallback when audience is not provided
   * @param manifest - Notification manifest
   * @returns First audience ID or throws error if no audiences
   */
  private getDefaultAudience(manifest: NotificationManifest): AudienceId {
    const audiences = Object.keys(manifest.audiences || {});
    if (audiences.length === 0) {
      throw new Error(
        `No audiences defined in manifest for type ${manifest.type}`,
      );
    }
    return audiences[0];
  }

  /**
   * Validate that all required variables are present in data
   * @param required - Required variable names
   * @param data - Data to validate
   * @param type - Notification type (for error messages)
   * @param channel - Notification channel (for error messages)
   * @throws MissingTemplateVariablesException if variables are missing
   */
  private validateRequiredVariables(
    required: readonly string[],
    data: Record<string, unknown>,
    type: NotificationType,
    channel: NotificationChannel,
  ): void {
    const missing = required.filter(
      (v) => !(v in data) || data[v] === null || data[v] === undefined,
    );

    if (missing.length > 0) {
      throw new MissingTemplateVariablesException(type, channel, missing);
    }
  }
}

import { Injectable } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as Handlebars from 'handlebars';
import { z } from 'zod';
import { LoggerService } from '@/shared/services/logger.service';
import { TemplateCacheService } from './template-cache.service';
import { NotificationEventMapping } from '../config/notifications.map';
import { EventType } from '@/shared/events';
import { CenterEvents } from '@/shared/events/center.events.enum';
import { AuthEvents } from '@/shared/events/auth.events.enum';
import { NotificationEvent } from '../types/notification-event.types';
import {
  TemplateRenderingException,
  MissingTemplateVariablesException,
} from '../exceptions/notification.exceptions';
// Old config imports removed - using manifests now
import { NotificationType } from '../enums/notification-type.enum';
import { ValidateEventForNotification } from '../types/event-validation.types';
import { NotificationChannel } from '../enums/notification-channel.enum';
import {
  getChannelExtension,
  getChannelFolder,
  TemplateFallbackStrategy,
} from '../config/template-format.config';
import { resolveTemplatePathWithFallback } from '../utils/template-path.util';
import { Config } from '@/shared/config/config';

@Injectable()
export class NotificationTemplateService {
  constructor(
    private readonly logger: LoggerService,
    private readonly cacheService: TemplateCacheService,
  ) {}

  /**
   * Load and compile template with caching
   */
  loadTemplate(
    templateName: string,
    locale: string = 'en',
  ): Promise<HandlebarsTemplateDelegate> {
    return Promise.resolve(
      this.cacheService.getCompiledTemplate(templateName, locale, () => {
        // Load template from file system
        const templatePath = join(
          process.cwd(),
          'src',
          'i18n',
          'notifications',
          locale,
          `${templateName}.hbs`,
        );

        try {
          const templateContent = readFileSync(templatePath, 'utf-8');
          const compiledTemplate = Handlebars.compile(templateContent);
          return compiledTemplate;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          this.logger.error(
            `Failed to load template: ${templatePath}`,
            error instanceof Error ? error.stack : undefined,
            'NotificationTemplateService',
            {
              templateName,
              locale,
              templatePath,
              error: errorMessage,
            },
          );
          throw new TemplateRenderingException(
            templateName,
            `Template not found: ${templateName} for locale: ${locale}. ${errorMessage}`,
          );
        }
      }),
    );
  }

  /**
   * Load template with fallback chain: locale -> en -> default -> null
   */
  async loadTemplateWithFallback(
    templateName: string,
    locale: string = 'en',
  ): Promise<HandlebarsTemplateDelegate | null> {
    // Try 1: Requested locale
    try {
      return await this.loadTemplate(templateName, locale);
    } catch {
      this.logger.debug(
        `Template ${templateName} not found for locale ${locale}, trying English fallback`,
        'NotificationTemplateService',
      );
    }

    // Try 2: English fallback (if not already English)
    if (locale !== 'en') {
      try {
        return await this.loadTemplate(templateName, 'en');
      } catch {
        this.logger.debug(
          `Template ${templateName} not found for English, trying default fallback`,
          'NotificationTemplateService',
        );
      }
    }

    // Try 3: Default template fallback
    try {
      return await this.loadTemplate('default', 'en');
    } catch (error) {
      this.logger.error(
        `Default template not found, notification rendering will fail`,
        error instanceof Error ? error.stack : undefined,
        'NotificationTemplateService',
      );
    }

    // All fallbacks failed
    return null;
  }

  /**
   * Render template with data
   */
  async renderTemplate(
    templateName: string,
    data: Record<string, any>,
    locale: string = 'en',
  ): Promise<string> {
    const template = await this.loadTemplate(templateName, locale);
    return template(data);
  }

  /**
   * @deprecated Legacy method - no longer used. All notifications use manifest system.
   * This method is kept for internal fallback rendering but should not be called directly.
   * @param notificationType - The notification type
   * @param channel - The notification channel
   * @param fallbackTemplate - Fallback template path
   * @returns Template path (fallback)
   */
  getTemplatePathFromConfig(
    notificationType: NotificationType,
    channel: NotificationChannel,
    fallbackTemplate: string,
  ): string {
    // Legacy method - manifests handle template paths now
    return fallbackTemplate;
  }

  /**
   * Render template with caching (for bulk notifications with same content)
   */
  async renderTemplateCached(
    templateName: string,
    data: Record<string, any>,
    locale: string = 'en',
  ): Promise<string> {
    return this.cacheService.getRenderedContent(
      templateName,
      locale,
      data,
      async () => {
        const template = await this.loadTemplate(templateName, locale);
        return template(data);
      },
    );
  }

  /**
   * Clear template cache (useful for development)
   */
  clearCache(): void {
    this.cacheService.clearAll();
  }

  /**
   * Clear specific template from cache
   */
  clearTemplateCache(templateName: string, locale: string = 'en'): void {
    this.cacheService.clearCompiledCache(templateName, locale);
  }

  /**
   * Ensure all required template fields have defaults
   * @param event - Event object containing data
   * @param mapping - Notification event mapping configuration
   * @param eventName - Name of the event
   * @returns Template data with all required fields filled
   */
  ensureTemplateData<
    TNotificationType extends NotificationType = NotificationType,
  >(
    event: ValidateEventForNotification<
      NotificationEvent | Record<string, unknown> | any,
      TNotificationType
    >,
    mapping: { type: TNotificationType },
    eventName: string,
  ): Record<string, unknown> {
    const eventObj = event as Record<string, unknown>;
    const templateData: Record<string, unknown> = {
      ...eventObj,
      eventName,
    };

    // Map resetUrl/verificationUrl to link for template consistency
    if (typeof eventObj.resetUrl === 'string' && eventObj.resetUrl) {
      templateData.link = eventObj.resetUrl;
      templateData.actionUrl = eventObj.resetUrl; // For IN_APP notifications
      templateData.expiresIn =
        (typeof eventObj.expiresIn !== 'undefined'
          ? eventObj.expiresIn
          : undefined) || '1 hour'; // Default, can be overridden
      templateData.name =
        (typeof eventObj.name === 'string' ? eventObj.name : undefined) ||
        'User'; // Fallback name
    }
    if (
      typeof eventObj.verificationUrl === 'string' &&
      eventObj.verificationUrl
    ) {
      templateData.link = eventObj.verificationUrl;
      templateData.actionUrl = eventObj.verificationUrl; // For IN_APP notifications
      templateData.expiresIn =
        (typeof eventObj.expiresIn !== 'undefined'
          ? eventObj.expiresIn
          : undefined) || '24 hours'; // Default, can be overridden
      templateData.name =
        (typeof eventObj.name === 'string' ? eventObj.name : undefined) ||
        'User'; // Use name if provided, otherwise default
    }
    if (typeof eventObj.otpCode !== 'undefined' && eventObj.otpCode) {
      templateData.otpCode = eventObj.otpCode;
      templateData.otp = eventObj.otpCode; // Map otpCode to otp for SMS/WhatsApp templates
      const expiresInValue =
        typeof eventObj.expiresIn === 'number'
          ? eventObj.expiresIn
          : typeof eventObj.expiresIn === 'string'
            ? parseInt(eventObj.expiresIn, 10)
            : 10;
      templateData.expiresIn = `${expiresInValue} minutes`;
      templateData.name =
        (typeof eventObj.name === 'string' ? eventObj.name : undefined) ||
        'User'; // Default name, should be fetched from user if needed
    }

    // Ensure default fields are present
    if (!templateData.name) {
      templateData.name =
        (typeof eventObj.name === 'string' ? eventObj.name : undefined) ||
        'User';
    }
    if (!templateData.message) {
      templateData.message =
        (typeof eventObj.message === 'string' ? eventObj.message : undefined) ||
        'You have a new notification';
    }
    if (!templateData.link && !templateData.actionUrl) {
      // Try to extract link from various event properties
      templateData.link =
        (typeof eventObj.link === 'string' ? eventObj.link : undefined) ||
        (typeof eventObj.url === 'string' ? eventObj.url : undefined) ||
        (typeof eventObj.actionUrl === 'string'
          ? eventObj.actionUrl
          : undefined) ||
        (typeof eventObj.redirectUrl === 'string'
          ? eventObj.redirectUrl
          : undefined) ||
        '';
      templateData.actionUrl = templateData.link;
    }

    return templateData;
  }

  /**
   * Build title, message, and actionUrl for in-app notifications based on event type
   * @param eventName - Type of event (EventType or string)
   * @param event - Event object containing data
   * @param userId - Optional user ID for generating action URLs
   * @param centerId - Optional center ID for generating action URLs
   * @returns Object with title, message, actionUrl, and priority (severity can be derived from priority: 0-1=info, 2-3=success, 4-5=warning, 6-7=error)
   */
  buildInAppNotificationData(
    eventName: EventType | string,
    event: NotificationEvent | Record<string, unknown>,
    userId?: string,
    centerId?: string,
  ): {
    title: string;
    message: string;
    actionUrl?: string;
    priority?: number;
  } {
    const baseUrl = Config.app.frontendUrl;
    const eventObj = event as Record<string, unknown>;

    // Center events
    if (String(eventName) === CenterEvents.CREATED) {
      const centerObj =
        eventObj &&
        typeof eventObj.center === 'object' &&
        eventObj.center !== null
          ? (eventObj.center as Record<string, unknown>)
          : null;
      const centerName =
        (centerObj && typeof centerObj.name === 'string'
          ? centerObj.name
          : undefined) ||
        (typeof eventObj.name === 'string' ? eventObj.name : undefined) ||
        'Center';
      return {
        title: 'New Center Created',
        message: `A new center "${centerName}" has been created.`,
        actionUrl: centerId ? `${baseUrl}/centers/${centerId}` : undefined,
        priority: 2,
      };
    }
    if (String(eventName) === CenterEvents.UPDATED) {
      return {
        title: 'Center Updated',
        message: `Center information has been updated.`,
        actionUrl: centerId ? `${baseUrl}/centers/${centerId}` : undefined,
        priority: 0,
      };
    }

    // Auth events
    if (String(eventName) === AuthEvents.PASSWORD_RESET_REQUESTED) {
      return {
        title: 'Password Reset Requested',
        message: `You requested to reset your password. Click the link below to reset it.`,
        actionUrl:
          typeof eventObj.resetUrl === 'string' ? eventObj.resetUrl : undefined,
        priority: 4,
      };
    }
    if (String(eventName) === AuthEvents.EMAIL_VERIFICATION_REQUESTED) {
      return {
        title: 'Verify Your Email',
        message: `Please verify your email address to complete your registration.`,
        actionUrl:
          typeof eventObj.verificationUrl === 'string'
            ? eventObj.verificationUrl
            : undefined,
        priority: 4,
      };
    }
    if (String(eventName) === AuthEvents.OTP_SENT) {
      const otpCode =
        typeof eventObj.otpCode === 'string' ? eventObj.otpCode : 'N/A';
      const expiresIn =
        typeof eventObj.expiresIn === 'number'
          ? eventObj.expiresIn
          : typeof eventObj.expiresIn === 'string'
            ? parseInt(eventObj.expiresIn, 10)
            : 10;
      return {
        title: 'Verification Code Sent',
        message: `Your verification code is: ${otpCode}. It will expire in ${expiresIn} minutes.`,
        priority: 0,
      };
    }

    // Default fallback
    return {
      title: 'New Notification',
      message: `You have a new notification: ${eventName}`,
      priority: 0,
    };
  }

  /**
   * Schema for validating IN_APP JSON templates
   */
  private readonly inAppTemplateSchema = z.object({
    title: z.string(),
    message: z.string(),
    actionUrl: z.string().nullable().optional(),
    priority: z.number().optional(),
    icon: z.string().optional(),
    expiresAt: z.string().optional(),
  });

  /**
   * Load template content from file system with channel support
   * @param templateName - Template path (can include channel prefix or be base path)
   * @param locale - Locale code
   * @param channel - Notification channel
   * @returns Template content as string
   */
  private loadTemplateContent(
    templateName: string,
    locale: string = 'en',
    channel: NotificationChannel,
  ): string {
    // Try to resolve with fallback strategy
    const templatePath = resolveTemplatePathWithFallback(
      templateName,
      locale,
      channel,
      TemplateFallbackStrategy.CHANNEL_OR_EMAIL,
    );

    if (!templatePath) {
      throw new TemplateRenderingException(
        templateName,
        `Template not found: ${templateName} for channel ${channel} and locale ${locale}`,
      );
    }

    try {
      return readFileSync(templatePath, 'utf-8');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to load template: ${templatePath}`,
        error instanceof Error ? error.stack : undefined,
        'NotificationTemplateService',
        {
          templateName,
          locale,
          channel,
          templatePath,
          error: errorMessage,
        },
      );
      throw new TemplateRenderingException(
        templateName,
        `Template not found: ${templateName} for channel ${channel} and locale ${locale}. ${errorMessage}`,
      );
    }
  }

  /**
   * Load and compile Handlebars template with channel support
   * @param templateName - Template path
   * @param locale - Locale code
   * @param channel - Notification channel
   * @returns Compiled Handlebars template
   */
  loadTemplateWithChannel(
    templateName: string,
    locale: string = 'en',
    channel: NotificationChannel,
  ): Promise<HandlebarsTemplateDelegate> {
    const cacheKey = `${locale}:${channel}:${templateName}`;

    return Promise.resolve(
      this.cacheService.getCompiledTemplate(cacheKey, locale, () => {
        const templateContent = this.loadTemplateContent(
          templateName,
          locale,
          channel,
        );
        return Handlebars.compile(templateContent);
      }),
    );
  }

  /**
   * Render text template using simple regex interpolation
   * Fast and lightweight, perfect for SMS/WhatsApp
   * @param content - Template content with {{variable}} placeholders
   * @param data - Data to interpolate
   * @returns Rendered text
   */
  private renderTextTemplate(
    content: string,
    data: Record<string, any>,
  ): string {
    return content.replace(/{{(\w+)}}/g, (_, key) => {
      const value = data[key];
      return value !== undefined && value !== null ? String(value) : '';
    });
  }

  /**
   * Render JSON template with variable injection and schema validation
   * @param content - JSON template content
   * @param data - Data to inject
   * @returns Parsed and validated JSON object
   */
  private renderJsonTemplate(
    content: string,
    data: Record<string, any>,
  ): object {
    // First, interpolate variables in JSON string
    const interpolated = this.renderTextTemplate(content, data);

    try {
      // Parse JSON
      const parsed = JSON.parse(interpolated);

      // Validate schema
      const validated = this.inAppTemplateSchema.parse(parsed);

      return validated;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to render JSON template: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
        'NotificationTemplateService',
        {
          error: errorMessage,
          content: content.substring(0, 200), // Log first 200 chars
        },
      );

      if (error instanceof z.ZodError) {
        throw new TemplateRenderingException(
          'json-template',
          `JSON template validation failed: ${error.errors.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
        );
      }

      throw new TemplateRenderingException(
        'json-template',
        `Failed to parse JSON template: ${errorMessage}`,
      );
    }
  }

  /**
   * Render template with channel support (supports .hbs, .txt, .json)
   * @param templateName - Template path
   * @param data - Template data
   * @param locale - Locale code
   * @param channel - Notification channel
   * @returns Rendered content (string for HTML/text, object for JSON)
   */
  async renderTemplateWithChannel(
    templateName: string,
    data: Record<string, any>,
    locale: string = 'en',
    channel: NotificationChannel,
  ): Promise<string | object> {
    const extension = getChannelExtension(channel);

    // Load template content
    const templateContent = this.loadTemplateContent(
      templateName,
      locale,
      channel,
    );

    // Render based on extension
    if (extension === '.hbs') {
      // Handlebars compilation
      const template = await this.loadTemplateWithChannel(
        templateName,
        locale,
        channel,
      );
      return template(data);
    } else if (extension === '.txt') {
      // Simple text interpolation
      return this.renderTextTemplate(templateContent, data);
    } else if (extension === '.json') {
      // JSON parsing and validation
      return this.renderJsonTemplate(templateContent, data);
    } else {
      throw new TemplateRenderingException(
        templateName,
        `Unsupported template extension: ${extension} for channel ${channel}`,
      );
    }
  }
}

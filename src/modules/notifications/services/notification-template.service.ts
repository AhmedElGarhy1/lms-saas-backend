import { Injectable } from '@nestjs/common';
import { readFileSync } from 'fs';
import * as Handlebars from 'handlebars';
import { z } from 'zod';
import { LoggerService } from '@/shared/services/logger.service';
import { TemplateCacheService } from './template-cache.service';
import { NotificationEvent } from '../types/notification-event.types';
import { TemplateRenderingException } from '../exceptions/notification.exceptions';
import { NotificationType } from '../enums/notification-type.enum';
import { ValidateEventForNotification } from '../types/event-validation.types';
import { NotificationChannel } from '../enums/notification-channel.enum';
import {
  getChannelExtension,
  TemplateFallbackStrategy,
} from '../config/template-format.config';
import { resolveTemplatePathWithFallback } from '../utils/template-path.util';

@Injectable()
export class NotificationTemplateService {
  constructor(
    private readonly logger: LoggerService,
    private readonly cacheService: TemplateCacheService,
  ) {}

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
      NotificationEvent | Record<string, unknown>,
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
   * Schema for validating IN_APP JSON templates
   * Data comes from JSON template files, not hardcoded in service
   */
  private readonly inAppTemplateSchema = z.object({
    title: z.string(),
    message: z.string(),
    priority: z.number().optional(),
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
    data: Record<string, unknown>,
  ): string {
    return content.replace(/{{(\w+)}}/g, (_, key: string) => {
      const value = data[key];
      if (value === undefined || value === null) {
        return '';
      }
      if (typeof value === 'object') {
        try {
          return JSON.stringify(value);
        } catch {
          return '[object]';
        }
      }
      if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
      ) {
        return String(value);
      }
      // Fallback for other types (symbol, bigint, function, etc.)
      return '[unknown]';
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
    data: Record<string, unknown>,
  ): object {
    // First, interpolate variables in JSON string
    const interpolated = this.renderTextTemplate(content, data);

    try {
      // Parse JSON
      const parsed: unknown = JSON.parse(interpolated);

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
    data: Record<string, unknown>,
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

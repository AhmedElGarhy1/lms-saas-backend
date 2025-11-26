import { Injectable, Logger } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { readFile } from 'fs/promises';
import * as Handlebars from 'handlebars';
import { z } from 'zod';
import { RedisTemplateCacheService } from './redis-template-cache.service';
import { BaseService } from '@/shared/common/services/base.service';
import { TemplateRenderingException } from '../exceptions/notification.exceptions';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { NotificationType } from '../enums/notification-type.enum';
import {
  getChannelExtension,
  TemplateFallbackStrategy,
} from '../config/template-format.config';
import { resolveTemplatePathWithFallback } from '../utils/template-path.util';
import {
  getNotificationI18nKey,
  NOTIFICATION_FIELDS,
} from '../utils/notification-i18n.util';

@Injectable()
export class NotificationTemplateService extends BaseService {
  private readonly logger: Logger = new Logger(
    NotificationTemplateService.name,
  );

  constructor(
    private readonly redisCache: RedisTemplateCacheService,
    private readonly i18nService: I18nService,
  ) {
    super();
  }

  /**
   * Schema for validating IN_APP JSON templates
   * Data comes from JSON template files, not hardcoded in service
   */
  private readonly inAppTemplateSchema = z.object({
    title: z.string(),
    message: z.string(),
    expiresAt: z.string().optional(),
  });

  /**
   * Load template content from file system with channel support (async)
   * @param templateName - Template path (can include channel prefix or be base path)
   * @param locale - Locale code
   * @param channel - Notification channel
   * @returns Template content as string
   */
  private async loadTemplateContent(
    templateName: string,
    locale: string = 'en',
    channel: NotificationChannel,
  ): Promise<string> {
    // Try to resolve with fallback strategy
    const templatePath = resolveTemplatePathWithFallback(
      templateName,
      locale,
      channel,
      TemplateFallbackStrategy.CHANNEL_OR_WHATSAPP,
    );

    if (!templatePath) {
      throw new TemplateRenderingException(
        templateName,
        `Template not found: ${templateName} for channel ${channel} and locale ${locale}`,
      );
    }

    try {
      // Use Redis cache for template source
      return await this.redisCache.getTemplateSource(
        `${locale}:${channel}:${templateName}`,
        async () => readFile(templatePath, 'utf-8'),
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to load template: ${templatePath}`,
        error instanceof Error ? error : undefined,
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
  async loadTemplateWithChannel(
    templateName: string,
    locale: string = 'en',
    channel: NotificationChannel,
  ): Promise<HandlebarsTemplateDelegate> {
    const cacheKey = `${locale}:${channel}:${templateName}`;

    // Get compiled template with Redis caching
    return this.redisCache.getCompiledTemplate(cacheKey, async () => {
      const templateContent = await this.loadTemplateContent(
        templateName,
        locale,
        channel,
      );
      return Handlebars.compile(templateContent);
    });
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
   * Render JSON template using i18n engine for translations
   * For IN_APP channel, translations are loaded from t.json notifications namespace
   * @param content - JSON template content (minimal structure, translations come from i18n)
   * @param data - Data to inject into translations
   * @param locale - Locale code for translation
   * @param notificationType - Notification type enum value (used to build i18n key)
   * @returns Parsed and validated JSON object with translated content
   */
  private renderJsonTemplate(
    content: string,
    data: Record<string, unknown>,
    locale: string = 'en',
    notificationType: NotificationType,
  ): object {
    try {
      // Parse the JSON structure (should be minimal now, just structure)
      const template: { title?: string; message?: string; [key: string]: unknown } =
        JSON.parse(content);

      // Build i18n keys using notification type enum value directly
      const titleKey = getNotificationI18nKey(
        notificationType,
        NOTIFICATION_FIELDS.TITLE,
      );
      const messageKey = getNotificationI18nKey(
        notificationType,
        NOTIFICATION_FIELDS.MESSAGE,
      );

      // Use i18n service to translate (works everywhere, no context needed)
      let translatedTitle: string;
      let translatedMessage: string;

      try {
        translatedTitle = this.i18nService.translate(titleKey, {
          lang: locale,
          args: data,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `Failed to translate title for ${notificationType}: ${errorMessage}`,
          {
            notificationType,
            locale,
            i18nKey: titleKey,
            error: errorMessage,
          },
        );
        // Fallback to empty string if translation fails (prevent crashes)
        translatedTitle = template.title || '';
      }

      try {
        translatedMessage = this.i18nService.translate(messageKey, {
          lang: locale,
          args: data,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `Failed to translate message for ${notificationType}: ${errorMessage}`,
          {
            notificationType,
            locale,
            i18nKey: messageKey,
            error: errorMessage,
          },
        );
        // Fallback to empty string if translation fails (prevent crashes)
        translatedMessage = template.message || '';
      }

      // Build result object with translated content
      const result: { title: string; message: string; [key: string]: unknown } = {
        ...template,
        title: translatedTitle,
        message: translatedMessage,
      };

      // Validate schema
      const validated = this.inAppTemplateSchema.parse(result);

      return validated;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to render JSON template: ${errorMessage}`,
        error instanceof Error ? error : undefined,
        {
          error: errorMessage,
          notificationType,
          locale,
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
   * @param templateName - Template path (optional for IN_APP - uses i18n instead)
   * @param data - Template data
   * @param locale - Locale code
   * @param channel - Notification channel
   * @param notificationType - Notification type (required for IN_APP/JSON templates)
   * @returns Rendered content (string for HTML/text, object for JSON)
   */
  async renderTemplateWithChannel(
    templateName: string,
    data: Record<string, unknown>,
    locale: string = 'en',
    channel: NotificationChannel,
    notificationType?: NotificationType,
  ): Promise<string | object> {
    const extension = getChannelExtension(channel);

    // For IN_APP JSON templates, skip file loading - use i18n directly
    if (channel === NotificationChannel.IN_APP && extension === '.json') {
      if (!notificationType) {
        throw new TemplateRenderingException(
          templateName,
          `NotificationType is required for JSON template rendering (IN_APP channel)`,
        );
      }
      // Use minimal default JSON structure - translations come from i18n
      const defaultJsonContent = JSON.stringify({
        title: '',
        message: '',
      });
      return this.renderJsonTemplate(
        defaultJsonContent,
        data,
        locale,
        notificationType,
      );
    }

    // Load template content (async - uses Redis cache)
    const templateContent = await this.loadTemplateContent(
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
      try {
        return template(data);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Failed to render Handlebars template: ${templateName}`,
          error instanceof Error ? error : undefined,
          {
            templateName,
            locale,
            channel,
            error: errorMessage,
          },
        );
        throw new TemplateRenderingException(
          templateName,
          `Failed to render template ${templateName}: ${errorMessage}`,
        );
      }
    } else if (extension === '.txt') {
      // Simple text interpolation
      return this.renderTextTemplate(templateContent, data);
    } else if (extension === '.json') {
      // JSON parsing and validation with i18n translation
      if (!notificationType) {
        throw new TemplateRenderingException(
          templateName,
          `NotificationType is required for JSON template rendering (IN_APP channel)`,
        );
      }
      return this.renderJsonTemplate(
        templateContent,
        data,
        locale,
        notificationType,
      );
    } else {
      throw new TemplateRenderingException(
        templateName,
        `Unsupported template extension: ${extension} for channel ${channel}`,
      );
    }
  }
}

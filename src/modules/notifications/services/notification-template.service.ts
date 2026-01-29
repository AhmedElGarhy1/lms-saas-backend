import { Injectable, Logger } from '@nestjs/common';
import { readFile } from 'fs/promises';
import * as Handlebars from 'handlebars';
import { z } from 'zod';
import { InMemoryTemplateCacheService } from './in-memory-template-cache.service';
import { BaseService } from '@/shared/common/services/base.service';
import { NotificationErrors } from '../exceptions/notification-errors';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { NotificationType } from '../enums/notification-type.enum';
import { getChannelExtension } from '../config/template-format.config';
import { resolveTemplatePathWithFallback } from '../utils/template-path.util';
import {
  getNotificationI18nKey,
  NOTIFICATION_FIELDS,
} from '../utils/notification-i18n.util';
import { NotificationTranslationService } from './notification-translation.service';

@Injectable()
export class NotificationTemplateService extends BaseService {
  private readonly logger: Logger = new Logger(
    NotificationTemplateService.name,
  );

  constructor(
    private readonly templateCache: InMemoryTemplateCacheService,
    private readonly translationService: NotificationTranslationService,
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
    );

    if (!templatePath) {
      throw NotificationErrors.templateRenderingFailed();
    }

    try {
      // Use in-memory cache for template source
      return await this.templateCache.getTemplateSource(
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
      throw NotificationErrors.templateRenderingFailed();
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

    // Get compiled template with in-memory caching
    return this.templateCache.getCompiledTemplate(cacheKey, async () => {
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
   * Interpolate {variable} placeholders in i18n strings (e.g. from notifications.json).
   * Skips ICU-style {var, type, ...} so we only replace plain {var}.
   */
  private interpolateI18nVars(
    str: string,
    data: Record<string, unknown>,
  ): string {
    return str.replace(/\{(\w+)\}(?!\s*,)/g, (_, key: string) => {
      const value = data[key];
      if (value === undefined || value === null) return '';
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
      return '[unknown]';
    });
  }

  /**
   * Render JSON template using i18n engine for translations
   * For IN_APP and PUSH, translations are loaded from notifications.json
   * @param content - JSON template content (minimal structure, translations come from i18n)
   * @param data - Data to inject into translations (also used for {var} interpolation)
   * @param locale - Locale code for translation
   * @param notificationType - Notification type enum value (used to build i18n key)
   * @param audience - Optional audience (TARGET, OWNERS, etc.) for multi-audience i18n; fallback to type-only key if missing
   * @returns Parsed and validated JSON object with translated, interpolated content
   */
  private async renderJsonTemplate(
    content: string,
    data: Record<string, unknown>,
    locale: string = 'en',
    notificationType: NotificationType,
    audience?: string,
  ): Promise<object> {
    try {
      const template = JSON.parse(content) as {
        title?: string;
        message?: string;
        [key: string]: unknown;
      };

      const titleKeyWithAudience = getNotificationI18nKey(
        notificationType,
        NOTIFICATION_FIELDS.TITLE,
        audience,
      );
      const messageKeyWithAudience = getNotificationI18nKey(
        notificationType,
        NOTIFICATION_FIELDS.MESSAGE,
        audience,
      );
      const titleKeyNoAudience = getNotificationI18nKey(
        notificationType,
        NOTIFICATION_FIELDS.TITLE,
      );
      const messageKeyNoAudience = getNotificationI18nKey(
        notificationType,
        NOTIFICATION_FIELDS.MESSAGE,
      );

      let translatedTitle: string;
      let translatedMessage: string;

      translatedTitle = await this.translationService.translate(
        titleKeyWithAudience,
        locale,
      );
      if (audience && translatedTitle === titleKeyWithAudience) {
        translatedTitle = await this.translationService.translate(
          titleKeyNoAudience,
          locale,
        );
      }
      if (translatedTitle === titleKeyNoAudience) {
        translatedTitle = template.title ?? '';
      }

      translatedMessage = await this.translationService.translate(
        messageKeyWithAudience,
        locale,
      );
      if (audience && translatedMessage === messageKeyWithAudience) {
        translatedMessage = await this.translationService.translate(
          messageKeyNoAudience,
          locale,
        );
      }
      if (translatedMessage === messageKeyNoAudience) {
        translatedMessage = template.message ?? '';
      }

      translatedTitle = this.interpolateI18nVars(translatedTitle, data);
      translatedMessage = this.interpolateI18nVars(translatedMessage, data);

      const result: { title: string; message: string; [key: string]: unknown } =
        {
          ...template,
          title: translatedTitle,
          message: translatedMessage,
        };

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
          content: content.substring(0, 200),
        },
      );
      if (error instanceof z.ZodError) {
        throw NotificationErrors.templateRenderingFailed();
      }
      throw NotificationErrors.templateRenderingFailed();
    }
  }

  /**
   * Render template with channel support (supports .hbs, .txt, .json)
   * IN_APP and PUSH use i18n (notifications.json) only; no file loading.
   * @param templateName - Template path (ignored for IN_APP/PUSH)
   * @param data - Template data
   * @param locale - Locale code
   * @param channel - Notification channel
   * @param notificationType - Notification type (required for IN_APP/PUSH i18n)
   * @param audience - Optional audience for multi-audience i18n keys
   * @returns Rendered content (string for HTML/text, object for JSON)
   */
  async renderTemplateWithChannel(
    templateName: string,
    data: Record<string, unknown>,
    locale: string = 'en',
    channel: NotificationChannel,
    notificationType?: NotificationType,
    audience?: string,
  ): Promise<string | object> {
    const extension = getChannelExtension(channel);

    // IN_APP and PUSH: use i18n (notifications.json) only – no file loading
    if (
      channel === NotificationChannel.IN_APP ||
      channel === NotificationChannel.PUSH
    ) {
      if (!notificationType) {
        throw NotificationErrors.templateRenderingFailed();
      }
      const defaultJsonContent = JSON.stringify({
        title: '',
        message: '',
      });
      return await this.renderJsonTemplate(
        defaultJsonContent,
        data,
        locale,
        notificationType,
        audience,
      );
    }

    // Load template content (async - uses in-memory cache)
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
        throw NotificationErrors.templateRenderingFailed();
      }
    } else if (extension === '.txt') {
      // Simple text interpolation
      return this.renderTextTemplate(templateContent, data);
    } else if (extension === '.json') {
      // JSON parsing and validation with i18n translation
      if (!notificationType) {
        throw NotificationErrors.templateRenderingFailed();
      }
      return await this.renderJsonTemplate(
        templateContent,
        data,
        locale,
        notificationType,
        audience,
      );
    } else {
      throw NotificationErrors.templateRenderingFailed();
    }
  }
}

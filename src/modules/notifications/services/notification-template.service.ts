import { Injectable } from '@nestjs/common';
import { readFile } from 'fs/promises';
import * as Handlebars from 'handlebars';
import { z } from 'zod';
import { LoggerService } from '@/shared/services/logger.service';
import { RedisTemplateCacheService } from './redis-template-cache.service';
import { TemplateRenderingException } from '../exceptions/notification.exceptions';
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
    private readonly redisCache: RedisTemplateCacheService,
  ) {}

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
          error instanceof Error ? error.stack : undefined,
          'NotificationTemplateService',
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

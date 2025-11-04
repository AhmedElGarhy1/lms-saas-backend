import { Injectable } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as Handlebars from 'handlebars';
import { LoggerService } from '@/shared/services/logger.service';
import { TemplateCacheService } from './template-cache.service';
import { ConfigService } from '@nestjs/config';
import { NotificationEventMapping } from '../config/notifications.map';
import { EventType } from '@/shared/events';
import { UserEvents } from '@/shared/events/user.events.enum';
import { CenterEvents } from '@/shared/events/center.events.enum';
import { BranchEvents } from '@/shared/events/branch.events.enum';
import { AuthEvents } from '@/shared/events/auth.events.enum';
import { NotificationEvent } from '../types/notification-event.types';

@Injectable()
export class NotificationTemplateService {
  constructor(
    private readonly logger: LoggerService,
    private readonly cacheService: TemplateCacheService,
    private readonly configService: ConfigService,
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
          this.logger.error(
            `Failed to load template: ${templatePath}`,
            error instanceof Error ? error.stack : undefined,
          );
          throw new Error(
            `Template not found: ${templateName} for locale: ${locale}`,
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
   * Render template safely with fallbacks and missing variable detection
   */
  async renderTemplateSafe(
    templateName: string,
    data: Record<string, any>,
    locale: string = 'en',
    eventType?: string,
  ): Promise<string> {
    const template = await this.loadTemplateWithFallback(templateName, locale);

    if (!template) {
      // All fallbacks failed, return fallback content
      return this.getFallbackContent(eventType, data);
    }

    // Detect missing variables (basic check)
    const missingVars = this.detectMissingVariables(template, data);
    if (missingVars.length > 0) {
      this.logger.warn(
        `Missing template variables for ${eventType || templateName}: ${missingVars.join(', ')}`,
        'NotificationTemplateService',
        {
          eventType,
          templateName,
          locale,
          missingVars,
        },
      );
    }

    // Render with defaults for missing variables
    return this.renderWithDefaults(template, data, missingVars);
  }

  /**
   * Get event-specific fallback content when template loading fails
   * Generates context-aware HTML based on event type
   */
  private getFallbackContent(
    eventType?: string,
    data?: Record<string, unknown>,
  ): string {
    const name =
      (data && typeof data.name === 'string' ? data.name : undefined) || 'User';
    const eventName = eventType ? String(eventType).toUpperCase() : 'UNKNOWN';
    const link =
      (data && typeof data.link === 'string' ? data.link : undefined) ||
      (data && typeof data.actionUrl === 'string'
        ? data.actionUrl
        : undefined) ||
      (data && typeof data.resetUrl === 'string' ? data.resetUrl : undefined) ||
      (data && typeof data.verificationUrl === 'string'
        ? data.verificationUrl
        : undefined) ||
      '';

    // Event-specific fallback messages
    let title = 'Notification';
    let message = 'You have a new notification';

    // User events
    if (
      eventName.includes('USER_CREATE') ||
      eventName.includes('USER.CREATE')
    ) {
      title = 'Welcome!';
      message = `Hello ${name}, your account has been created successfully. Welcome to the platform!`;
    } else if (
      eventName.includes('USER_ACTIVATE') ||
      eventName.includes('USER.ACTIVATE')
    ) {
      title = 'Account Activated';
      message = `Hello ${name}, your account has been activated. You can now access all features.`;
    } else if (
      eventName.includes('USER_UPDATE') ||
      eventName.includes('USER.UPDATE')
    ) {
      title = 'Profile Updated';
      message = `Hello ${name}, your profile information has been updated.`;
    } else if (
      eventName.includes('USER_DELETE') ||
      eventName.includes('USER.DELETE')
    ) {
      title = 'Account Deleted';
      message = `Hello ${name}, your account has been deleted.`;
    }
    // Auth events
    else if (
      eventName.includes('PASSWORD_RESET') ||
      eventName.includes('PASSWORD_RESET_REQUESTED')
    ) {
      title = 'Password Reset Requested';
      message = `Hello ${name}, you requested to reset your password. Click the link below to reset it.`;
    } else if (
      eventName.includes('EMAIL_VERIFICATION') ||
      eventName.includes('EMAIL_VERIFICATION_REQUESTED')
    ) {
      title = 'Verify Your Email';
      message = `Hello ${name}, please verify your email address to complete your registration.`;
    } else if (eventName.includes('OTP_SENT')) {
      title = 'Verification Code Sent';
      const otpCode =
        (data && typeof data.otpCode === 'string' ? data.otpCode : undefined) ||
        'N/A';
      const expiresIn =
        (data && typeof data.expiresIn === 'string'
          ? data.expiresIn
          : undefined) || '10 minutes';
      message = `Hello ${name}, your verification code is: ${otpCode}. It will expire in ${expiresIn}.`;
    }
    // Center events
    else if (
      eventName.includes('CENTER_CREATE') ||
      eventName.includes('CENTER.CREATE')
    ) {
      title = 'New Center Created';
      const centerObj =
        data && typeof data.center === 'object' && data.center !== null
          ? (data.center as Record<string, unknown>)
          : null;
      const centerName =
        (centerObj && typeof centerObj.name === 'string'
          ? centerObj.name
          : undefined) ||
        (data && typeof data.name === 'string' ? data.name : undefined) ||
        'Center';
      message = `Hello ${name}, a new center "${centerName}" has been created.`;
    } else if (
      eventName.includes('CENTER_UPDATE') ||
      eventName.includes('CENTER.UPDATE')
    ) {
      title = 'Center Updated';
      message = `Hello ${name}, center information has been updated.`;
    }
    // Branch events
    else if (
      eventName.includes('BRANCH_CREATED') ||
      eventName.includes('BRANCH.CREATED')
    ) {
      title = 'New Branch Created';
      const branchObj =
        data && typeof data.branch === 'object' && data.branch !== null
          ? (data.branch as Record<string, unknown>)
          : null;
      const branchName =
        (branchObj && typeof branchObj.name === 'string'
          ? branchObj.name
          : undefined) ||
        (data && typeof data.name === 'string' ? data.name : undefined) ||
        'Branch';
      message = `Hello ${name}, a new branch "${branchName}" has been created.`;
    } else if (
      eventName.includes('BRANCH_UPDATED') ||
      eventName.includes('BRANCH.UPDATED')
    ) {
      title = 'Branch Updated';
      message = `Hello ${name}, branch information has been updated.`;
    }
    // Default fallback
    else {
      message =
        (data && typeof data.message === 'string' ? data.message : undefined) ||
        `Hello ${name}, you have a new notification.`;
    }

    // Generate HTML with event-specific content
    const expiresInHtml =
      data && typeof data.expiresIn === 'string'
        ? `<p style="color: #999; font-size: 12px; margin-top: 20px;">This link expires in ${data.expiresIn}.</p>`
        : '';

    if (link) {
      return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 10px;">${title}</h2>
          <p style="color: #666; line-height: 1.6;">${message}</p>
          <p style="margin-top: 20px;">
            <a href="${link}" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Click here to ${this.getActionText(eventName)}</a>
          </p>
          ${expiresInHtml}
        </div>
      `;
    }

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 10px;">${title}</h2>
        <p style="color: #666; line-height: 1.6;">${message}</p>
        ${expiresInHtml}
      </div>
    `;
  }

  /**
   * Get action text for link button based on event type
   */
  private getActionText(eventName: string): string {
    const upperEventName = eventName.toUpperCase();
    if (
      upperEventName.includes('PASSWORD_RESET') ||
      upperEventName.includes('RESET_PASSWORD')
    ) {
      return 'Reset Password';
    }
    if (
      upperEventName.includes('EMAIL_VERIFICATION') ||
      upperEventName.includes('VERIFY_EMAIL')
    ) {
      return 'Verify Email';
    }
    if (upperEventName.includes('CENTER')) {
      return 'View Center';
    }
    if (upperEventName.includes('BRANCH')) {
      return 'View Branch';
    }
    if (upperEventName.includes('USER')) {
      return 'View Profile';
    }
    return 'View Details';
  }

  /**
   * Detect missing variables in template (basic implementation)
   * Note: This is a simplified check - full Handlebars AST parsing would be more accurate
   */
  private detectMissingVariables(
    template: HandlebarsTemplateDelegate,
    data: Record<string, any>,
  ): string[] {
    // Extract template string by rendering with empty data and comparing
    // This is a simplified approach - a full implementation would parse Handlebars AST
    const templateStr = template.toString();
    const variablePattern = /\{\{([^}]+)\}\}/g;
    const variables: string[] = [];
    let match;

    while ((match = variablePattern.exec(templateStr)) !== null) {
      const varName = match[1].trim().split(/[.\s]/)[0]; // Get base variable name
      if (varName && !varName.startsWith('#') && !varName.startsWith('/')) {
        // Ignore Handlebars helpers and comments
        if (!variables.includes(varName)) {
          variables.push(varName);
        }
      }
    }

    // Check which variables are missing from data
    return variables.filter((varName) => {
      // Check if variable exists in data (handle nested paths)
      const parts = varName.split('.');
      let current: unknown = data;
      for (const part of parts) {
        if (
          current === null ||
          current === undefined ||
          typeof current !== 'object'
        ) {
          return true; // Missing
        }
        current = (current as Record<string, unknown>)[part];
      }
      return current === null || current === undefined;
    });
  }

  /**
   * Render template with defaults for missing variables
   */
  private renderWithDefaults(
    template: HandlebarsTemplateDelegate,
    data: Record<string, any>,
    missingVars: string[],
  ): string {
    // Create data with defaults for missing variables
    const dataWithDefaults = { ...data };

    // Add defaults for common missing variables
    const defaults: Record<string, string> = {
      name: (data.name as string | undefined) || 'User',
      message:
        (data.message as string | undefined) || 'You have a new notification',
      link:
        (data.link as string | undefined) ||
        (data.actionUrl as string | undefined) ||
        '',
      title: (data.title as string | undefined) || 'Notification',
      expiresIn: (data.expiresIn as string | undefined) || '1 hour',
    };

    for (const varName of missingVars) {
      if (defaults[varName] !== undefined && !dataWithDefaults[varName]) {
        dataWithDefaults[varName] = defaults[varName];
      }
    }

    try {
      return template(dataWithDefaults);
    } catch (error) {
      this.logger.error(
        `Failed to render template with defaults`,
        error instanceof Error ? error.stack : undefined,
        'NotificationTemplateService',
        {
          missingVars,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      // Return basic fallback HTML
      return this.getFallbackContent(undefined, dataWithDefaults);
    }
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
  ensureTemplateData(
    event: NotificationEvent | Record<string, unknown>,
    mapping: NotificationEventMapping,
    eventName: string,
  ): Record<string, unknown> {
    const eventObj = event as Record<string, unknown>;
    const templateData: Record<string, unknown> = {
      ...eventObj,
      template: mapping.template,
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
   * @returns Object with title, message, actionUrl, priority, and severity
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
    severity?: string;
  } {
    const baseUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const eventObj = event as Record<string, unknown>;

    // User events
    if (String(eventName) === UserEvents.CREATE) {
      return {
        title: 'Welcome!',
        message: `Your account has been created successfully. Welcome to the platform!`,
        actionUrl: userId ? `${baseUrl}/users/${userId}` : undefined,
        severity: 'success',
      };
    }
    if (String(eventName) === UserEvents.ACTIVATE) {
      return {
        title: 'Account Activated',
        message: `Your account has been activated. You can now access all features.`,
        actionUrl: userId ? `${baseUrl}/users/${userId}` : undefined,
        severity: 'success',
      };
    }
    if (String(eventName) === UserEvents.UPDATE) {
      return {
        title: 'Profile Updated',
        message: `Your profile information has been updated.`,
        actionUrl: userId ? `${baseUrl}/users/${userId}` : undefined,
        severity: 'info',
      };
    }

    // Center events
    if (String(eventName) === CenterEvents.CREATE) {
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
        severity: 'success',
      };
    }
    if (String(eventName) === CenterEvents.UPDATE) {
      return {
        title: 'Center Updated',
        message: `Center information has been updated.`,
        actionUrl: centerId ? `${baseUrl}/centers/${centerId}` : undefined,
        severity: 'info',
      };
    }

    // Branch events
    if (String(eventName) === BranchEvents.CREATED) {
      const branchObj =
        eventObj &&
        typeof eventObj.branch === 'object' &&
        eventObj.branch !== null
          ? (eventObj.branch as Record<string, unknown>)
          : null;
      const branchName =
        (branchObj && typeof branchObj.name === 'string'
          ? branchObj.name
          : undefined) ||
        (typeof eventObj.name === 'string' ? eventObj.name : undefined) ||
        'Branch';
      return {
        title: 'New Branch Created',
        message: `A new branch "${branchName}" has been created.`,
        actionUrl: centerId
          ? `${baseUrl}/centers/${centerId}/branches`
          : undefined,
        severity: 'success',
      };
    }

    // Auth events
    if (String(eventName) === AuthEvents.PASSWORD_RESET_REQUESTED) {
      return {
        title: 'Password Reset Requested',
        message: `You requested to reset your password. Click the link below to reset it.`,
        actionUrl:
          typeof eventObj.resetUrl === 'string' ? eventObj.resetUrl : undefined,
        priority: 3,
        severity: 'warning',
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
        priority: 3,
        severity: 'warning',
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
        priority: 3,
        severity: 'info',
      };
    }

    // Default fallback
    return {
      title: 'New Notification',
      message: `You have a new notification: ${eventName}`,
      severity: 'info',
    };
  }
}

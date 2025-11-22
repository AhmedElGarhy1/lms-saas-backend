import { Injectable, Logger } from '@nestjs/common';
import { NotificationService } from '../../services/notification.service';
import { NotificationManifestResolver } from '../../manifests/registry/notification-manifest-resolver.service';
import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import { NotificationEvent } from '../../types/notification-event.types';
import { RecipientInfo } from '../../types/recipient-info.interface';
import { ValidateAndTriggerOptions } from '../../types/channel-types';

/**
 * Helper service for notification listener operations
 * Provides validation, triggering, and recipient validation utilities
 * Separated from NotificationListener to improve maintainability and testability
 */
@Injectable()
export class NotificationListenerHelper {
  private readonly logger: Logger = new Logger(NotificationListenerHelper.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly manifestResolver: NotificationManifestResolver,
  ) {}

  /**
   * Validate that event data contains all required template variables
   * This provides early detection of missing data before rendering
   * @param notificationType - Notification type
   * @param audience - Audience identifier
   * @param eventData - Event data to validate
   * @returns Array of missing variable names, empty if all present
   */
  validateEventData(
    notificationType: NotificationType,
    audience: string,
    eventData: NotificationEvent | Record<string, unknown>,
  ): string[] {
    try {
      const manifest = this.manifestResolver.getManifest(notificationType);
      const audienceConfig = this.manifestResolver.getAudienceConfig(
        manifest,
        audience,
      );

      if (!audienceConfig) {
        return [];
      }

      const missing: string[] = [];

      // Check manifest-level required variables (all variables needed by any audience)
      const requiredVariables = manifest.requiredVariables || [];
      for (const variable of requiredVariables) {
        const eventObj = eventData as Record<string, unknown>;
        if (
          !(variable in eventObj) ||
          eventObj[variable] === null ||
          eventObj[variable] === undefined
        ) {
          missing.push(variable);
        }
      }

      return missing;
    } catch (error) {
      // If manifest resolution fails, return empty (will be caught later)
      this.logger.warn(
        `Failed to validate event data for ${notificationType}:${audience}`,
        {
          notificationType,
          audience,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      return [];
    }
  }

  /**
   * Validate event data and trigger notification with comprehensive error handling
   * This helper method centralizes validation, logging, and error handling logic
   *
   * @template TType - Notification type (enforces type-safe channels)
   * @param notificationType - Notification type (used for type inference)
   * @param audience - Audience identifier
   * @param event - Event data
   * @param recipients - Recipients to notify
   * @param options - Options including type-safe channels and context
   */
  async validateAndTriggerNotification<TType extends NotificationType>(
    notificationType: TType,
    audience: string,
    event: NotificationEvent | Record<string, unknown>,
    recipients: RecipientInfo[],
    options?: ValidateAndTriggerOptions<TType>,
  ): Promise<void> {
    const { channels, context = {} } = options || {};

    // Early validation: Check if required template variables are present
    const missingVariables = this.validateEventData(
      notificationType,
      audience,
      event,
    );

    if (missingVariables.length > 0) {
      this.logger.error(
        `${notificationType} notification will fail - Missing required template variables: ${missingVariables.join(', ')}`,
        {
          notificationType,
          audience,
          missingVariables,
          eventDataKeys: Object.keys(event).join(', '),
          ...context,
        },
      );
    }

    try {
      await this.notificationService.trigger(notificationType, {
        audience,
        event,
        recipients,
        // Type assertion: TypedChannels is a subset of NotificationChannel[]
        // Runtime validation ensures only valid channels are passed
        channels: channels as NotificationChannel[] | undefined,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const extractedMissing = this.extractMissingVariables(errorMessage);

      this.logger.error(
        `Failed to send ${notificationType} notification${extractedMissing ? ` - Missing variables: ${extractedMissing.join(', ')}` : ''}`,
        error,
        {
          notificationType,
          audience,
          error: errorMessage,
          missingVariables: extractedMissing || missingVariables,
          eventDataKeys: Object.keys(event).join(', '),
          ...context,
        },
      );
      throw error;
    }
  }

  /**
   * Extract missing variables from error message
   */
  extractMissingVariables(errorMessage: string): string[] | undefined {
    const match = errorMessage.match(
      /Missing required template variables.*?: (.+)$/,
    );
    return match ? match[1].split(', ').map((v) => v.trim()) : undefined;
  }

  /**
   * Validate recipients - phone and locale are always required
   * @param recipients - Array of recipients to validate
   * @param notificationType - Notification type for logging context
   * @returns Array of valid recipients
   */
  validateRecipients(
    recipients: RecipientInfo[],
    notificationType: NotificationType,
  ): RecipientInfo[] {
    return recipients.filter((r) => {
      if (!r.phone) {
        this.logger.warn(
          `Recipient ${r.userId} missing required phone, skipping`,
          { userId: r.userId, notificationType },
        );
        return false;
      }
      if (!r.locale) {
        this.logger.warn(
          `Recipient ${r.userId} missing required locale, skipping`,
          { userId: r.userId, notificationType },
        );
        return false;
      }
      return true;
    });
  }
}


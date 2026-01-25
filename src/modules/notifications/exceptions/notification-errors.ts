import {
  DomainException,
  BaseErrorHelpers,
} from '@/shared/common/exceptions/domain.exception';
import { NotificationErrorCode } from '../enums/notification.codes';

/**
 * Notification module error helpers
 * Clean, simple, and maintainable error creation
 */
export class NotificationErrors extends BaseErrorHelpers {
  // Basic notification errors
  static notificationNotFound(): DomainException {
    return this.createNoDetails(NotificationErrorCode.NOTIFICATION_NOT_FOUND);
  }

  static notificationLogNotFound(): DomainException {
    return this.createNoDetails(
      NotificationErrorCode.NOTIFICATION_LOG_NOT_FOUND,
    );
  }

  static notificationAccessDenied(): DomainException {
    return this.createNoDetails(
      NotificationErrorCode.NOTIFICATION_ACCESS_DENIED,
    );
  }

  static notificationAlreadyRead(): DomainException {
    return this.createNoDetails(
      NotificationErrorCode.NOTIFICATION_ALREADY_READ,
    );
  }

  // Template and recipient errors
  static templateRenderingFailed(): DomainException {
    return this.createNoDetails(
      NotificationErrorCode.TEMPLATE_RENDERING_FAILED,
    );
  }

  static invalidRecipient(): DomainException {
    return this.createNoDetails(NotificationErrorCode.INVALID_RECIPIENT);
  }

  // Background job and system errors
  static notificationSendingFailed(
    channel: string,
    error: string,
  ): DomainException {
    return this.createWithDetails(
      NotificationErrorCode.NOTIFICATION_SENDING_FAILED,
      {
        channel,
        error,
      },
    );
  }

  static channelAdapterFailed(
    channel: string,
    operation: string,
    error: string,
  ): DomainException {
    return this.createWithDetails(
      NotificationErrorCode.CHANNEL_ADAPTER_FAILED,
      {
        channel,
        operation,
        error,
      },
    );
  }

  static invalidChannel(
    adapter: string,
    expectedChannel: string,
    receivedChannel: string,
  ): DomainException {
    return this.createWithDetails(NotificationErrorCode.INVALID_CHANNEL, {
      adapter,
      expectedChannel,
      receivedChannel,
    });
  }

  static missingNotificationContent(
    channel: string,
    contentType: string,
  ): DomainException {
    return this.createWithDetails(
      NotificationErrorCode.MISSING_NOTIFICATION_CONTENT,
      {
        channel,
        contentType,
      },
    );
  }

  static missingTemplateVariables(
    notificationType: string,
    channel: string,
    missingVariables: string[],
  ): DomainException {
    return this.createWithDetails(
      NotificationErrorCode.MISSING_TEMPLATE_VARIABLES,
      {
        notificationType,
        channel,
        missingVariables,
      },
    );
  }

  static webhookSignatureInvalid(): DomainException {
    return this.createNoDetails(
      NotificationErrorCode.WEBHOOK_SIGNATURE_INVALID,
    );
  }
}

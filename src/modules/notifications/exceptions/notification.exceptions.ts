import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * @deprecated These custom exceptions are being phased out in favor of NotificationErrors helpers
 * that use the standard DomainException pattern. Use NotificationErrors instead.
 * 
 * Base class for notification system exceptions
 * Provides consistent error formatting for background job errors
 */
abstract class NotificationSystemException extends HttpException {
  protected constructor(
    errorType: string,
    message: string,
    details: Record<string, any> = {},
    statusCode: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
  ) {
    super(
      {
        error: errorType,
        message,
        type: 'notification_system_error',
        timestamp: new Date().toISOString(),
        ...details,
      },
      statusCode,
    );
  }
}

/**
 * Exception thrown when notification sending fails (system error)
 */
export class NotificationSendingFailedException extends NotificationSystemException {
  constructor(channel: string, error: string) {
    super(
      'Notification Sending Failed',
      `Failed to send notification via ${channel}: ${error}`,
      { channel, originalError: error },
    );
  }
}

/**
 * Exception thrown when template rendering fails (system error)
 */
export class TemplateRenderingException extends NotificationSystemException {
  constructor(templateName: string, error: string) {
    super(
      'Template Rendering Failed',
      `Failed to render template ${templateName}: ${error}`,
      { templateName, originalError: error },
    );
  }
}

/**
 * Exception thrown when channel adapter fails (system error)
 */
export class ChannelAdapterException extends NotificationSystemException {
  constructor(channel: string, operation: string, error: string) {
    super(
      'Channel Adapter Failed',
      `Channel adapter ${channel} failed during ${operation}: ${error}`,
      { channel, operation, originalError: error },
    );
  }
}

/**
 * Exception thrown when wrong channel is used with an adapter (validation error)
 */
export class InvalidChannelException extends NotificationSystemException {
  constructor(
    adapter: string,
    expectedChannel: string,
    receivedChannel: string,
  ) {
    super(
      'Invalid Channel Configuration',
      `${adapter} can only send ${expectedChannel} notifications, received ${receivedChannel}`,
      { adapter, expectedChannel, receivedChannel },
      HttpStatus.BAD_REQUEST,
    );
  }
}

/**
 * Exception thrown when notification content is missing (validation error)
 */
export class MissingNotificationContentException extends NotificationSystemException {
  constructor(channel: string, contentType: string) {
    super(
      'Missing Notification Content',
      `${channel} message ${contentType} is required`,
      { channel, contentType },
      HttpStatus.BAD_REQUEST,
    );
  }
}

/**
 * Exception thrown when required template variables are missing (validation error)
 */
export class MissingTemplateVariablesException extends NotificationSystemException {
  constructor(
    notificationType: string,
    channel: string,
    missingVariables: string[],
  ) {
    super(
      'Missing Template Variables',
      `Missing required template variables for ${notificationType} via ${channel}: ${missingVariables.join(', ')}`,
      { notificationType, channel, missingVariables },
      HttpStatus.BAD_REQUEST,
    );
  }
}

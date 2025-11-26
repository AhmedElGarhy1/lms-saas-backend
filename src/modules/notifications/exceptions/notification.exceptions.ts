import {
  InternalServiceUnavailableException,
  InternalInvalidOperationException,
  InternalBusinessLogicException,
} from '@/shared/common/exceptions/custom.exceptions';

/**
 * Exception thrown when notification sending fails
 */
export class NotificationSendingFailedException extends InternalServiceUnavailableException {
  constructor(channel: string, error: string, userId?: string) {
    super(`Failed to send notification via ${channel}: ${error}`);
  }
}

/**
 * Exception thrown when template rendering fails
 */
export class TemplateRenderingException extends InternalBusinessLogicException {
  constructor(templateName: string, error: string) {
    super(`Failed to render template ${templateName}: ${error}`);
  }
}

/**
 * Exception thrown when channel adapter fails
 */
export class ChannelAdapterException extends InternalServiceUnavailableException {
  constructor(channel: string, operation: string, error: string) {
    super(`Channel adapter ${channel} failed during ${operation}: ${error}`);
  }
}

/**
 * Exception thrown when wrong channel is used with an adapter
 */
export class InvalidChannelException extends InternalInvalidOperationException {
  constructor(
    adapter: string,
    expectedChannel: string,
    receivedChannel: string,
  ) {
    super(
      `${adapter} can only send ${expectedChannel} notifications, received ${receivedChannel}`,
    );
  }
}

/**
 * Exception thrown when notification content is missing
 */
export class MissingNotificationContentException extends InternalInvalidOperationException {
  constructor(channel: string, contentType: string) {
    super(`${channel} message ${contentType} is required`);
  }
}

/**
 * Exception thrown when required template variables are missing
 */
export class MissingTemplateVariablesException extends InternalInvalidOperationException {
  constructor(
    notificationType: string,
    channel: string,
    missingVariables: string[],
  ) {
    super(
      `Missing required template variables for ${notificationType} via ${channel}: ${missingVariables.join(', ')}`,
    );
  }
}

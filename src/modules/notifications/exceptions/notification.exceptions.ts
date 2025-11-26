import {
  ServiceUnavailableException,
  InvalidOperationException,
  BusinessLogicException,
} from '@/shared/common/exceptions/custom.exceptions';

/**
 * Exception thrown when notification sending fails
 */
export class NotificationSendingFailedException extends ServiceUnavailableException {
  constructor(channel: string, error: string, userId?: string) {
    super('t.errors.notificationSendingFailed', { channel, error });
  }
}

/**
 * Exception thrown when template rendering fails
 */
export class TemplateRenderingException extends BusinessLogicException {
  constructor(templateName: string, error: string) {
    super('t.errors.templateRenderingFailed', { templateName, error });
  }
}

/**
 * Exception thrown when channel adapter fails
 */
export class ChannelAdapterException extends ServiceUnavailableException {
  constructor(channel: string, operation: string, error: string) {
    super('t.errors.channelAdapterFailed', { channel, operation, error });
  }
}

/**
 * Exception thrown when wrong channel is used with an adapter
 */
export class InvalidChannelException extends InvalidOperationException {
  constructor(
    adapter: string,
    expectedChannel: string,
    receivedChannel: string,
  ) {
    super('t.errors.invalidChannel', { adapter, expectedChannel, receivedChannel });
  }
}

/**
 * Exception thrown when notification content is missing
 */
export class MissingNotificationContentException extends InvalidOperationException {
  constructor(channel: string, contentType: string) {
    super('t.errors.missingNotificationContent', { channel, contentType });
  }
}

/**
 * Exception thrown when required template variables are missing
 */
export class MissingTemplateVariablesException extends InvalidOperationException {
  constructor(
    notificationType: string,
    channel: string,
    missingVariables: string[],
  ) {
    super('t.errors.missingTemplateVariables', {
      notificationType,
      channel,
      missingVariables: missingVariables.join(', '),
    });
  }
}

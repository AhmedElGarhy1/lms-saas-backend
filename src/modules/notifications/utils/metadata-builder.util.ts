import { NotificationPayload } from '../types/notification-payload.interface';
import { StandardizedNotificationMetadata } from '../types/notification-metadata.types';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { RenderedNotification } from '../manifests/types/manifest.types';

/**
 * Extract rendered content from a notification payload
 * Returns the actual content that was sent (not template)
 */
export function extractRenderedContent(
  payload: NotificationPayload,
  rendered: RenderedNotification,
): string {
  const channel = payload.channel;

  if (channel === NotificationChannel.EMAIL) {
    // For email, prefer html, then content, then message
    const data = payload.data as {
      html?: string;
      content?: string;
      message?: string;
    };
    return data.html || data.content || data.message || '';
  }

  if (
    channel === NotificationChannel.SMS ||
    channel === NotificationChannel.WHATSAPP
  ) {
    // For SMS/WhatsApp, prefer content, then message
    const data = payload.data as {
      content?: string;
      message?: string;
      html?: string;
    };
    return data.content || data.message || data.html || '';
  }

  if (channel === NotificationChannel.IN_APP) {
    // For IN_APP, prefer message, then content
    // Content can be string or object, so handle both cases
    const data = payload.data as {
      message?: string;
      content?: string | object;
    };
    if (data.message) {
      return typeof data.message === 'string' ? data.message : '';
    }
    if (data.content) {
      return typeof data.content === 'string' ? data.content : '';
    }
    // If content is an object, try to get message from it
    if (typeof data.content === 'object' && data.content !== null) {
      const contentObj = data.content as { message?: string };
      return contentObj.message || '';
    }
    return '';
  }

  if (channel === NotificationChannel.PUSH) {
    // For Push, prefer message
    const data = payload.data as { message?: string; content?: string };
    return data.message || data.content || '';
  }

  // Fallback: try to get content from rendered notification
  if (typeof rendered.content === 'string') {
    return rendered.content;
  }

  // Last resort: empty string
  return '';
}

/**
 * Extract template path from rendered notification metadata
 */
export function extractTemplatePath(rendered: RenderedNotification): string {
  return rendered.metadata?.template || '';
}

/**
 * Build standardized metadata from payload and send result
 */
export function buildStandardizedMetadata(
  payload: NotificationPayload,
  rendered: RenderedNotification,
  options: {
    jobId?: string;
    correlationId: string;
    retryCount: number;
    latencyMs?: number;
    attempts?: number;
    deliveredAt?: Date;
    notificationId?: string;
    payloadData?: Record<string, any>;
    retryHistory?: Array<{ attempt: number; timestamp: Date }>;
  },
): StandardizedNotificationMetadata {
  const channel = payload.channel;
  const content = extractRenderedContent(payload, rendered);
  const template = extractTemplatePath(rendered);

  const metadata: StandardizedNotificationMetadata = {
    jobId: options.jobId,
    correlationId: options.correlationId,
    template,
    retryCount: options.retryCount,
    content, // Rendered content, not template
  };

  // Add channel-specific fields
  if (channel === NotificationChannel.EMAIL) {
    const emailPayload = payload as {
      subject?: string;
      data?: { html?: string };
    };
    if (emailPayload.subject) {
      metadata.subject = emailPayload.subject;
    }
    if (emailPayload.data?.html) {
      metadata.html = emailPayload.data.html;
    }
  }

  if (
    channel === NotificationChannel.IN_APP ||
    channel === NotificationChannel.EMAIL ||
    channel === NotificationChannel.PUSH
  ) {
    const payloadWithTitle = payload as { title?: string };
    if (payloadWithTitle.title) {
      metadata.title = payloadWithTitle.title;
    }
  }

  if (
    channel === NotificationChannel.IN_APP ||
    channel === NotificationChannel.SMS ||
    channel === NotificationChannel.WHATSAPP
  ) {
    const data = payload.data as { message?: string };
    if (data.message) {
      metadata.message = data.message;
    }
  }

  // Add performance metrics
  if (options.latencyMs !== undefined) {
    metadata.latencyMs = options.latencyMs;
  }
  if (options.attempts !== undefined) {
    metadata.attempts = options.attempts;
  }
  if (options.deliveredAt) {
    metadata.deliveredAt = options.deliveredAt;
  }

  // Add debugging fields
  if (options.notificationId) {
    metadata.notificationId = options.notificationId;
  }
  if (options.payloadData) {
    metadata.payloadData = options.payloadData;
  }
  if (options.retryHistory) {
    metadata.retryHistory = options.retryHistory;
  }

  return metadata;
}

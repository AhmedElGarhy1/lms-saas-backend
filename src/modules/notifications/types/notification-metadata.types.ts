/**
 * Standardized metadata structure for NotificationLog entries
 * Ensures consistency across all notification channels
 */
export interface StandardizedNotificationMetadata {
  // Common fields (all channels)
  jobId?: string;
  correlationId: string;
  template: string;
  retryCount: number;

  // Content (rendered, not template) - the actual sent/received content
  content: string;

  // Channel-specific optional fields
  title?: string; // For IN_APP, Email, Push
  subject?: string; // For Email
  html?: string; // For Email
  message?: string; // Alternative content field (for IN_APP, SMS, WhatsApp)

  // Performance metrics (optional, all channels)
  latencyMs?: number;
  attempts?: number;
  deliveredAt?: Date;

  // Debugging fields (optional)
  notificationId?: string; // For IN_APP
  payloadData?: Record<string, any>; // For debugging
  retryHistory?: Array<{ attempt: number; timestamp: Date }>; // For IN_APP

  // Additional fields that may exist in legacy data
  [key: string]: any;
}

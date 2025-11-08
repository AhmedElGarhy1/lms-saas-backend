/**
 * Detailed result of a bulk notification operation
 */
export interface BulkNotificationResult {
  /** Total number of recipients processed */
  total: number;
  /** Number of notifications successfully sent/enqueued */
  sent: number;
  /** Number of notifications that failed */
  failed: number;
  /** Number of recipients skipped (e.g., no valid channels, validation failed) */
  skipped: number;
  /** Array of errors with recipient information */
  errors: Array<{
    /** Recipient identifier (userId) */
    recipient: string;
    /** Error message */
    error: string;
    /** Optional error code or type */
    code?: string;
  }>;
  /** Processing duration in milliseconds */
  duration: number;
  /** Correlation ID for tracing */
  correlationId: string;
}



import { NotificationPayload } from './notification-payload.interface';
import { JobId } from './branded-types';

/**
 * Extended payload for BullMQ job processing
 * Includes job metadata in addition to notification payload
 * Uses intersection type since NotificationPayload is a union type
 */
export type NotificationJobData = NotificationPayload & {
  jobId?: JobId;
  retryCount?: number;
  /**
   * Whether the job is retriable. If false, job will be marked as FAILED immediately
   * without triggering BullMQ retry mechanism. Defaults to true.
   */
  retryable?: boolean;
};

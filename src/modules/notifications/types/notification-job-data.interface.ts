import { NotificationPayload } from './notification-payload.interface';

export interface NotificationJobData extends NotificationPayload {
  jobId?: string;
  retryCount?: number;
  userId?: string;
  /**
   * Whether the job is retriable. If false, job will be marked as FAILED immediately
   * without triggering BullMQ retry mechanism. Defaults to true.
   */
  retryable?: boolean;
}

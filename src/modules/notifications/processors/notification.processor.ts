import { Injectable } from '@nestjs/common';
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { NotificationJobData } from '../types/notification-job-data.interface';
import { NotificationSenderService } from '../services/notification-sender.service';
import { NotificationLogRepository } from '../repositories/notification-log.repository';
import { NotificationLog } from '../entities/notification-log.entity';
import { NotificationStatus } from '../enums/notification-status.enum';
import { NotificationPayload } from '../types/notification-payload.interface';
import { LoggerService } from '@/shared/services/logger.service';
import { NotificationMetricsService } from '../services/notification-metrics.service';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { ChannelRetryStrategyService } from '../services/channel-retry-strategy.service';
import { NotificationConfig } from '../config/notification.config';
import { NotificationSendingFailedException } from '../exceptions/notification.exceptions';
import { randomUUID } from 'crypto';
import { NotificationAlertService } from '../services/notification-alert.service';
import {
  isNotificationJobData,
  isRecord,
  getStringProperty,
} from '../utils/type-guards.util';

/**
 * Processor concurrency must be a static value in the decorator.
 * To change concurrency, update NotificationConfig.concurrency.processor and restart the application.
 */
const PROCESSOR_CONCURRENCY = NotificationConfig.concurrency.processor;

@Processor('notifications', {
  concurrency: PROCESSOR_CONCURRENCY,
})
@Injectable()
export class NotificationProcessor extends WorkerHost {
  private readonly retryThreshold: number;

  constructor(
    private readonly senderService: NotificationSenderService,
    private readonly logRepository: NotificationLogRepository,
    private readonly logger: LoggerService,
    private readonly metricsService: NotificationMetricsService,
    private readonly retryStrategyService: ChannelRetryStrategyService,
    @InjectQueue('notifications') private readonly queue: Queue,
    private readonly alertService?: NotificationAlertService,
  ) {
    super();
    this.retryThreshold = NotificationConfig.retryThreshold;
  }

  async process(job: Job<NotificationJobData>): Promise<void> {
    // Validate job data using type guard
    if (!isNotificationJobData(job.data)) {
      throw new Error(
        `Invalid job data format: expected NotificationJobData, got ${typeof job.data}`,
      );
    }

    // Destructure job data for cleaner code
    // NotificationJobData extends NotificationPayload which has common properties from BaseNotificationPayload
    const jobData = job.data;
    const { channel, type, userId, data: payloadData } = jobData;
    const retryable = jobData.retryable ?? true; // Default to retriable if not specified
    const retryCount = job.attemptsMade || 0;
    const jobId = job.id || 'unknown';
    const attempt = retryCount + 1;

    // Extract correlationId from job data
    // Use type guard to safely access payloadData
    // No longer using RequestContext - correlationId flows through payload
    const correlationId =
      (isRecord(payloadData) ? getStringProperty(payloadData, 'correlationId') : undefined) ||
      jobData.correlationId ||
      randomUUID();

      // Process notification without RequestContext wrapper
      // correlationId is passed through payload and used directly
      this.logger.debug(
          `Processing notification job: ${jobId}, type: ${type}, channel: ${channel}, attempt: ${attempt}`,
          'NotificationProcessor',
          {
            jobId,
            type,
            channel,
            userId,
            attempt,
            retryCount,
            correlationId,
          },
        );

        // Get channel-specific retry config for metrics tracking
        const retryConfig = this.retryStrategyService.getRetryConfig(channel);

        // Track retry metrics if this is a retry and within configured attempts
        if (retryCount > 0 && retryCount < retryConfig.maxAttempts) {
          await this.metricsService.incrementRetry(channel);
        }

        try {
          // Update job data with retry count
          // Create payload with retry metadata in data field
          // jobData is already validated as NotificationJobData which extends NotificationPayload
          // Preserve the original data structure and add retry metadata
          // Since jobData is already a valid NotificationPayload, payloadData should always be a record
          if (!isRecord(payloadData)) {
            throw new Error(`Invalid payload data structure for notification ${jobId}: data is not an object`);
          }
          // Preserve the original data structure and add retry metadata
          // The data field structure depends on the channel (discriminated union)
          // Since jobData is already validated, we can safely add metadata properties
          // TypeScript can't narrow the discriminated union, so we use a type assertion
          const payload = {
            ...jobData,
            data: {
              ...payloadData,
              retryCount,
              jobId,
            },
          } as NotificationPayload;

          // Send notification
          const results = await this.senderService.send(payload);

          // Check if any channel succeeded
          const hasSuccess = results.some((r) => r.success);

          if (hasSuccess) {
            this.logger.debug(
              `Notification sent successfully: ${jobId}, type: ${type}`,
              'NotificationProcessor',
              {
                jobId,
                type,
                channel,
                userId,
                attempt,
                correlationId,
              },
            );
          } else {
            // All channels failed - log individual channel failures
            const failedChannels = results.filter((r) => !r.success);
            const errors = failedChannels
              .map((r) => `${r.channel}: ${r.error || 'Unknown error'}`)
              .join('; ');

            // Log individual channel failures for better visibility
            for (const failedChannel of failedChannels) {
              this.logger.warn(
                `Channel ${failedChannel.channel} failed: ${failedChannel.error || 'Unknown error'}`,
                'NotificationProcessor',
                {
                  jobId,
                  type,
                  channel: failedChannel.channel,
                  userId,
                  attempt,
                  error: failedChannel.error,
                  correlationId,
                },
              );
            }

            throw new NotificationSendingFailedException(
              channel,
              `All notification channels failed: ${errors}`,
              userId,
            );
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);

          // Enhanced error logging with structured context
          // correlationId is available from job data
          const ctxCorrelationId = correlationId;
          this.logger.error(
            `Failed to send notification: ${jobId}, attempt: ${attempt}`,
            error instanceof Error ? error.stack : undefined,
            'NotificationProcessor',
            {
              jobId,
              type,
              channel,
              userId,
              attempt,
              retryCount,
              retryable,
              error: errorMessage,
              correlationId: ctxCorrelationId,
            },
          );

          // Update notification log if exists
          if (userId) {
            const jobIdValue = job.id || jobData.jobId;

            // Optimized: Try to find log using single query with OR conditions
            // First try jobId, then fallback to userId/type/channel/status combination
            const whereConditions: Array<Record<string, unknown>> = [];

            if (jobIdValue) {
              whereConditions.push({ jobId: jobIdValue });
            }

            // Add fallback conditions for PENDING or RETRYING status
            whereConditions.push(
              {
                userId,
                type,
                channel,
                status: NotificationStatus.PENDING,
              },
              {
                userId,
                type,
                channel,
                status: NotificationStatus.RETRYING,
              },
            );

            // Single query with OR conditions (more efficient than multiple queries)
            const logs = await this.logRepository.findMany({
              where: whereConditions,
              order: { createdAt: 'DESC' },
              take: 1, // Only need the most recent
            });

            if (logs.length > 0) {
              const log = logs[0];
              // Use configurable retry threshold instead of hardcoded value
              await this.logRepository.update(log.id, {
                status:
                  retryCount < this.retryThreshold
                    ? NotificationStatus.RETRYING
                    : NotificationStatus.FAILED,
                error: errorMessage,
                retryCount,
                lastAttemptAt: new Date(),
              });
            }
          }

          // Check if error is non-retriable
          if (retryable === false) {
            // Mark as FAILED immediately without re-throwing
            // This prevents BullMQ from retrying non-retriable errors
            this.logger.warn(
              `Non-retriable error detected, marking job as FAILED: ${jobId}`,
              'NotificationProcessor',
              {
                jobId,
                type,
                channel,
                userId,
                attempt,
                error: errorMessage,
                correlationId: ctxCorrelationId,
              },
            );
            // Don't re-throw - job will be marked as completed with failure
            return;
          }

          // Re-throw to trigger BullMQ retry for retriable errors
          throw error;
        }
  }

  @OnWorkerEvent('completed')
  async onCompleted(job: Job<NotificationJobData>): Promise<void> {
    if (!isNotificationJobData(job.data)) {
      this.logger.error(
        `Invalid job data in onCompleted: ${job.id}`,
        undefined,
        'NotificationProcessor',
        { jobId: job.id },
      );
      return;
    }
    const jobData = job.data;
    const { channel, type, userId } = jobData;
    const jobId = job.id || 'unknown';

    // Update queue backlog metrics (metrics are already tracked in senderService.send())
    const queueSize = await this.queue.getWaitingCount();
    await this.metricsService.setQueueBacklog(queueSize);

    // Check queue backlog and send alerts if needed
    if (this.alertService) {
      const warningThreshold = NotificationConfig.queue.warningThreshold;
      const criticalThreshold = NotificationConfig.queue.criticalThreshold;

      if (queueSize >= criticalThreshold) {
        await this.alertService.sendAlert(
          'critical',
          `Notification queue backlog is critical: ${queueSize} jobs waiting`,
          {
            queueSize,
            threshold: criticalThreshold,
            jobId,
            type,
            channel,
          },
        );
      } else if (queueSize >= warningThreshold) {
        await this.alertService.sendAlert(
          'warning',
          `Notification queue backlog is high: ${queueSize} jobs waiting`,
          {
            queueSize,
            threshold: warningThreshold,
            jobId,
            type,
            channel,
          },
        );
      }
    }

    this.logger.debug(
      `Notification job completed: ${jobId}`,
      'NotificationProcessor',
      {
        jobId,
        type,
        channel,
        userId,
        queueSize,
      },
    );
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job<NotificationJobData>, error: Error): Promise<void> {
    if (!isNotificationJobData(job.data)) {
      this.logger.error(
        `Invalid job data in onFailed: ${job.id}`,
        undefined,
        'NotificationProcessor',
        { jobId: job.id },
      );
      return;
    }
    const jobData = job.data;
    const { channel, type, userId, retryable } = jobData;
    const jobId = job.id || 'unknown';
    const errorMessage = error instanceof Error ? error.message : String(error);
    const retryCount = job.attemptsMade || 0;

    // Update queue backlog metrics (metrics are already tracked in senderService.send())
    const queueSize = await this.queue.getWaitingCount();
    await this.metricsService.setQueueBacklog(queueSize);

    // Check queue backlog and send alerts if needed
    if (this.alertService) {
      const warningThreshold = NotificationConfig.queue.warningThreshold;
      const criticalThreshold = NotificationConfig.queue.criticalThreshold;

      if (queueSize >= criticalThreshold) {
        await this.alertService.sendAlert(
          'critical',
          `Notification queue backlog is critical: ${queueSize} jobs waiting`,
          {
            queueSize,
            threshold: criticalThreshold,
            jobId,
            type,
            channel,
          },
        );
      } else if (queueSize >= warningThreshold) {
        await this.alertService.sendAlert(
          'warning',
          `Notification queue backlog is high: ${queueSize} jobs waiting`,
          {
            queueSize,
            threshold: warningThreshold,
            jobId,
            type,
            channel,
          },
        );
      }
    }

    this.logger.error(
      `Notification job failed permanently: ${jobId}`,
      error instanceof Error ? error.stack : undefined,
      'NotificationProcessor',
      {
        jobId,
        type,
        channel,
        userId,
        retryCount,
        retryable,
        error: errorMessage,
      },
    );

    // Update notification log if exists to mark as permanently failed
    if (userId) {
      const jobIdValue = job.id || jobData.jobId;

      // Optimized: Single query with OR conditions
      const whereConditions: Array<Record<string, unknown>> = [];

      if (jobIdValue) {
        whereConditions.push({ jobId: jobIdValue });
      }

      // Add fallback condition for RETRYING status
      whereConditions.push({
        userId,
        type,
        channel,
        status: NotificationStatus.RETRYING,
      });

      // Single query with OR conditions (more efficient than multiple queries)
      const logs = await this.logRepository.findMany({
        where: whereConditions,
        order: { createdAt: 'DESC' },
        take: 1, // Only need the most recent
      });

      if (logs.length > 0) {
        const log = logs[0];
        await this.logRepository.update(log.id, {
          status: NotificationStatus.FAILED,
          error: errorMessage,
          retryCount,
          lastAttemptAt: new Date(),
        });
      }
    }
  }
}

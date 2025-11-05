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
import { ConfigService } from '@nestjs/config';
import { ChannelRetryStrategyService } from '../services/channel-retry-strategy.service';
import { NotificationSendingFailedException } from '../exceptions/notification.exceptions';

/**
 * Processor concurrency must be a static value in the decorator.
 * To change concurrency, update NOTIFICATION_CONCURRENCY env variable and restart the application.
 */
const PROCESSOR_CONCURRENCY =
  parseInt(process.env.NOTIFICATION_CONCURRENCY || '5', 10) || 5;

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
    private readonly configService: ConfigService,
    private readonly retryStrategyService: ChannelRetryStrategyService,
    @InjectQueue('notifications') private readonly queue: Queue,
  ) {
    super();
    this.retryThreshold =
      parseInt(
        this.configService.get<string>('NOTIFICATION_RETRY_THRESHOLD', '2'),
        10,
      ) || 2;
  }

  async process(job: Job<NotificationJobData>): Promise<void> {
    // Destructure job data for cleaner code
    // NotificationJobData extends NotificationPayload which has common properties from BaseNotificationPayload
    const jobData = job.data as NotificationPayload & NotificationJobData;
    const { channel, type, userId, data: payloadData } = jobData;
    const retryable = jobData.retryable ?? true; // Default to retriable if not specified
    const retryCount = job.attemptsMade || 0;
    const jobId = job.id || 'unknown';
    const attempt = retryCount + 1;

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
      // Create payload with retry metadata in data field, but keep it as NotificationPayload
      const payload: NotificationPayload = {
        ...jobData,
        data: {
          ...payloadData,
          retryCount,
          jobId,
        },
      } as NotificationPayload;

      // Extract correlationId from payload data if available
      const correlationId =
        (payloadData?.correlationId as string | undefined) ||
        jobData.correlationId;

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

      // Extract correlationId from job data if available
      const correlationId =
        (payloadData?.correlationId as string | undefined) ||
        jobData.correlationId;

      // Enhanced error logging with structured context
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
          correlationId,
        },
      );

      // Update notification log if exists
      if (userId) {
        const jobIdValue = job.id || jobData.jobId;

        // First try to find by jobId if available
        let logs: NotificationLog[] = [];
        if (jobIdValue) {
          logs = await this.logRepository.findMany({
            where: {
              jobId: jobIdValue as string,
            },
            order: { createdAt: 'DESC' },
            take: 1,
          });
        }

        // Fallback to search by userId, type, channel, and status (PENDING or RETRYING)
        if (logs.length === 0) {
          logs = await this.logRepository.findMany({
            where: [
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
            ],
            order: { createdAt: 'DESC' },
            take: 1,
          });
        }

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
    const jobData = job.data as NotificationPayload & NotificationJobData;
    const { channel, type, userId } = jobData;
    const jobId = job.id || 'unknown';

    // Update queue backlog metrics (metrics are already tracked in senderService.send())
    const queueSize = await this.queue.getWaitingCount();
    await this.metricsService.setQueueBacklog(queueSize);

    this.logger.debug(
      `Notification job completed: ${jobId}`,
      'NotificationProcessor',
      {
        jobId,
        type,
        channel,
        userId,
      },
    );
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job<NotificationJobData>, error: Error): Promise<void> {
    const jobData = job.data as NotificationPayload & NotificationJobData;
    const { channel, type, userId, retryable } = jobData;
    const jobId = job.id || 'unknown';
    const errorMessage = error instanceof Error ? error.message : String(error);
    const retryCount = job.attemptsMade || 0;

    // Update queue backlog metrics (metrics are already tracked in senderService.send())
    const queueSize = await this.queue.getWaitingCount();
    await this.metricsService.setQueueBacklog(queueSize);

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

      // First try to find by jobId if available
      let logs: NotificationLog[] = [];
      if (jobIdValue) {
        logs = await this.logRepository.findMany({
          where: {
            jobId: jobIdValue as string,
          },
          order: { createdAt: 'DESC' },
          take: 1,
        });
      }

      // Fallback to search by userId, type, channel, and RETRYING status
      if (logs.length === 0) {
        logs = await this.logRepository.findMany({
          where: {
            userId,
            type,
            channel,
            status: NotificationStatus.RETRYING,
          },
          order: { createdAt: 'DESC' },
          take: 1,
        });
      }

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

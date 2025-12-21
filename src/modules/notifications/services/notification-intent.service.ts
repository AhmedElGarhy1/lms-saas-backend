import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { NotificationType } from '../enums/notification-type.enum';
import { NotificationTriggerJobData } from '../types/notification-trigger-job-data.interface';
import {
  NotificationIntentMap,
  IntentForNotification,
} from '../types/notification-intent.map';
import { randomUUID } from 'crypto';

/**
 * Service for enqueueing notification intents
 * Provides type-safe API for emitting notification intents from listeners
 */
@Injectable()
export class NotificationIntentService {
  private readonly logger: Logger = new Logger(NotificationIntentService.name);

  constructor(
    @InjectQueue('notification-triggers')
    private readonly triggerQueue: Queue,
  ) {}

  /**
   * Enqueue a notification intent to be processed asynchronously
   * Type-safe: TypeScript enforces correct intent structure based on notification type
   *
   * @param type - Notification type
   * @param intent - Intent DTO containing only IDs needed to resolve recipients and template variables
   * @returns Promise that resolves immediately (fire-and-forget)
   */
  async enqueue<T extends NotificationType & keyof NotificationIntentMap>(
    type: T,
    intent: IntentForNotification<T>,
  ): Promise<void> {
    const correlationId = randomUUID();

    // Create job data with type-safe intent
    const jobData: NotificationTriggerJobData<T> = {
      type,
      intent,
      correlationId,
    };

    try {
      await this.triggerQueue.add('trigger-notification', jobData, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: {
          age: 3600, // Keep completed jobs for 1 hour
        },
        removeOnFail: {
          age: 86400, // Keep failed jobs for 24 hours
        },
      });

      this.logger.debug(`Enqueued notification intent: ${type}`, {
        notificationType: type,
        correlationId,
      });
    } catch (error) {
      // Log but don't throw - queue failures shouldn't break events
      this.logger.error(
        `Failed to enqueue notification intent: ${type}`,
        error instanceof Error ? error.stack : String(error),
        {
          notificationType: type,
          correlationId,
        },
      );
    }
  }
}

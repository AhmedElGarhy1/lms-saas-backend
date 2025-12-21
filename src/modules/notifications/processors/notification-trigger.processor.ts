import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { NotificationTriggerJobData } from '../types/notification-trigger-job-data.interface';
import { NotificationService } from '../services/notification.service';
import { NotificationIntentResolverRegistryService } from '../intents/notification-intent-resolver-registry.service';
import { NotificationRegistry } from '../manifests/registry/notification-registry';
import { MissingTemplateVariablesException } from '../exceptions/notification.exceptions';
import { InvalidRecipientException } from '../exceptions/invalid-recipient.exception';

/**
 * Processor concurrency for trigger jobs
 * Lower than delivery processor since triggers are CPU/DB bound
 */
const TRIGGER_PROCESSOR_CONCURRENCY = 5;

@Processor('notification-triggers', {
  concurrency: TRIGGER_PROCESSOR_CONCURRENCY,
})
@Injectable()
export class NotificationTriggerProcessor extends WorkerHost {
  private readonly logger: Logger = new Logger(
    NotificationTriggerProcessor.name,
  );

  constructor(
    private readonly notificationService: NotificationService,
    private readonly resolverRegistry: NotificationIntentResolverRegistryService,
  ) {
    super();
  }

  /**
   * Check if an error is non-retriable (validation errors that shouldn't be retried)
   */
  private isNonRetriableError(error: unknown): boolean {
    return (
      error instanceof MissingTemplateVariablesException ||
      error instanceof InvalidRecipientException
    );
  }

  async process(job: Job<NotificationTriggerJobData>): Promise<void> {
    const { type, intent, channels, correlationId } = job.data;
    const jobId = job.id || 'unknown';
    const attempt = (job.attemptsMade || 0) + 1;

    try {
      // Get manifest to determine available audiences
      const manifest = NotificationRegistry[type];
      if (!manifest) {
        throw new Error(`No manifest found for notification type: ${type}`);
      }

      // Get resolver for this notification type
      const resolver = this.resolverRegistry.get(type);
      if (!resolver) {
        throw new Error(`No resolver found for notification type: ${type}`);
      }

      // Loop through all audiences in the manifest
      const audiences = Object.keys(manifest.audiences);

      for (const audience of audiences) {
        // Resolve intent for this audience
        // Resolver handles: fetching data, building template variables, resolving recipients
        const { templateVariables, recipients } = await resolver.resolveIntent(
          intent,
          audience as any, // Type-safe at compile time via resolver interface
        );

        if (recipients.length === 0) {
          this.logger.warn(
            `No recipients resolved for notification trigger: ${jobId}, audience: ${audience}`,
            {
              jobId,
              notificationType: type,
              audience,
              correlationId,
            },
          );
          // Continue to next audience instead of returning
          continue;
        }

        // Call the existing trigger method with template variables and recipients
        // This runs outside the request/event context
        // Pass actorId from intent so it can be used for createdBy field
        await this.notificationService.trigger(type, {
          audience,
          templateVariables,
          recipients,
          channels,
          actorId: (intent as { actorId?: string }).actorId,
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error(
        `Failed to process notification trigger job: ${jobId}, attempt: ${attempt}`,
        error instanceof Error ? error.stack : String(error),
        {
          jobId,
          notificationType: type,
          correlationId,
          attempt,
          error: errorMessage,
        },
      );

      // Classify error as retriable vs non-retriable
      if (this.isNonRetriableError(error)) {
        // Non-retriable errors (validation) - log and mark as permanently failed
        this.logger.warn(
          `Non-retriable error in trigger job ${jobId}, marking as failed permanently`,
          {
            jobId,
            notificationType: type,
            correlationId,
            error: errorMessage,
          },
        );
        // Don't re-throw - job will be marked as completed with failure
        // This prevents unnecessary retries for validation errors
        return;
      }

      // Retriable errors (DB timeouts, Redis hiccups, etc.) - re-throw to trigger retry
      throw error;
    }
  }

  /**
   * Handle completed jobs
   */
  @OnWorkerEvent('completed')
  onCompleted(_job: Job<NotificationTriggerJobData>): void {
    // Job completed successfully - no logging needed for normal operation
  }

  /**
   * Handle failed jobs
   */
  @OnWorkerEvent('failed')
  onFailed(job: Job<NotificationTriggerJobData>, error: Error): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    this.logger.error(
      `Trigger job ${job.id} failed permanently: ${errorMessage}`,
      error instanceof Error ? error.stack : String(error),
    );
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { WhatsAppWebhookEvent } from '../types/whatsapp-webhook.types';
import { WhatsAppWebhookService } from '../services/webhooks/whatsapp-webhook.service';

/**
 * BullMQ processor for WhatsApp webhook events
 * Processes webhook events asynchronously from the queue
 */
@Processor('whatsapp-webhooks', {
  concurrency: 5, // Process up to 5 webhook events concurrently
})
@Injectable()
export class WhatsAppWebhookProcessor extends WorkerHost {
  private readonly logger = new Logger(WhatsAppWebhookProcessor.name);

  constructor(private readonly webhookService: WhatsAppWebhookService) {
    super();
  }

  /**
   * Process webhook event job
   * @param job BullMQ job containing webhook event
   */
  async process(job: Job<WhatsAppWebhookEvent>): Promise<void> {
    const { id, data } = job;

    this.logger.debug(`Processing webhook job ${id}`);

    try {
      const event = data;

      // Basic validation only (DTO validation handles structure)
      if (
        !event?.entry ||
        !Array.isArray(event.entry) ||
        event.entry.length === 0
      ) {
        this.logger.warn(`Job ${id}: Invalid webhook event structure`);
        return;
      }

      // Process webhook event
      await this.webhookService.processWebhookEvent(event);

      this.logger.debug(`Successfully processed webhook event job ${id}`);
    } catch (error) {
      this.logger.error(
        `Failed to process webhook job ${id}`,
        error instanceof Error ? error.stack : String(error),
      );
      // Re-throw to trigger BullMQ retry mechanism
      throw error;
    }
  }

  /**
   * Handle completed jobs
   */
  @OnWorkerEvent('completed')
  onCompleted(job: Job<WhatsAppWebhookEvent>): void {
    this.logger.debug(`Webhook job ${job.id} completed`);
  }

  /**
   * Handle failed jobs
   */
  @OnWorkerEvent('failed')
  onFailed(job: Job<WhatsAppWebhookEvent>, error: Error): void {
    this.logger.error(
      `Webhook job ${job.id} failed: ${error.message}`,
      error.stack,
    );
  }
}

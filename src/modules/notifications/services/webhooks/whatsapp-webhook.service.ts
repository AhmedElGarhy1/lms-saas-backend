import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  WhatsAppWebhookEvent,
  WhatsAppStatus,
  WhatsAppIncomingMessage,
} from '../../types/whatsapp-webhook.types';
import { NotificationStatus } from '../../enums/notification-status.enum';
import { NotificationLogRepository } from '../../repositories/notification-log.repository';
import { WhatsAppWebhookIdempotencyService } from './whatsapp-webhook-idempotency.service';
import { WhatsAppWebhookMetricsService } from './whatsapp-webhook-metrics.service';
import { BaseService } from '@/shared/common/services/base.service';

/**
 * Service for processing WhatsApp webhook events
 */
@Injectable()
export class WhatsAppWebhookService extends BaseService {
  private readonly logger = new Logger(WhatsAppWebhookService.name);

  constructor(
    @InjectQueue('whatsapp-webhooks')
    private readonly webhookQueue: Queue,
    private readonly logRepository: NotificationLogRepository,
    private readonly idempotencyService: WhatsAppWebhookIdempotencyService,
    private readonly metricsService: WhatsAppWebhookMetricsService,
  ) {
    super();
  }

  /**
   * Enqueue webhook event to BullMQ queue
   * @param event Webhook event
   */
  async enqueueWebhookEvent(event: WhatsAppWebhookEvent): Promise<void> {
    try {
      // Enqueue entire event (Meta batches are small: 1-5 items typically)
      await this.webhookQueue.add('process-webhook', event, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      });
    } catch (error) {
      this.logger.error(
        'Failed to enqueue webhook event',
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  /**
   * Process webhook event
   * @param event Webhook event
   */
  async processWebhookEvent(event: WhatsAppWebhookEvent): Promise<void> {
    try {
      // Process all entries in the event
      for (const entry of event.entry) {
        for (const change of entry.changes) {
          // Process status updates
          if (change.value.statuses && change.value.statuses.length > 0) {
            await this.processStatusUpdates(change.value.statuses);
          }

          // Process incoming messages (optional, for future 2-way messaging)
          if (change.value.messages && change.value.messages.length > 0) {
            for (const message of change.value.messages) {
              await this.processIncomingMessage(message);
            }
          }
        }
      }
    } catch (error) {
      this.logger.error(
        'Failed to process webhook event',
        error instanceof Error ? error.stack : String(error),
      );
      await this.metricsService.recordProcessingError(
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  /**
   * Process batch of status updates
   * Processes statuses sequentially to avoid race conditions when same message ID appears multiple times
   * @param statuses Array of status updates
   */
  async processStatusUpdates(statuses: WhatsAppStatus[]): Promise<void> {
    // Process statuses sequentially to ensure atomicity
    // This prevents race conditions when the same message ID appears multiple times
    for (const status of statuses) {
      try {
        await this.processStatusUpdate(status);
      } catch (error) {
        // Log error but continue processing other statuses
        // Individual status failures shouldn't block the entire batch
        this.logger.error(
          `Failed to process status update in batch: ${status.id}:${status.status}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
  }

  /**
   * Process single status update
   * @param status Status update
   */
  async processStatusUpdate(status: WhatsAppStatus): Promise<void> {
    try {
      // Check idempotency
      const alreadyProcessed =
        await this.idempotencyService.checkAndMarkProcessed(
          status.id,
          status.status,
        );

      if (alreadyProcessed) {
        // Status update already processed (normal idempotency, no logging needed)
        return;
      }

      // Find notification log by message ID
      const log = await this.logRepository.findByWhatsAppMessageId(status.id);

      if (!log) {
        // Orphaned webhook - message ID not found (just log warning)
        this.logger.warn(
          `Orphaned webhook: message ID not found - ${status.id}`,
        );
        await this.metricsService.recordOrphanedWebhook();
        return;
      }

      // Map WhatsApp status to NotificationStatus
      const notificationStatus = this.mapStatus(status.status);

      // Prepare metadata updates
      const metadata: Record<string, any> = {
        ...(log.metadata || {}),
        whatsappStatus: status.status,
      };

      if (status.status === 'read') {
        metadata.whatsappReadAt = new Date(parseInt(status.timestamp) * 1000);
      }

      if (
        status.status === 'failed' &&
        status.errors &&
        status.errors.length > 0
      ) {
        const error = status.errors[0];
        metadata.whatsappErrorCode = error.code;
        metadata.whatsappErrorMessage = error.message || error.title;
        metadata.whatsappErrorData = error.error_data;
      }

      // Update notification log atomically
      const errorMessage =
        status.status === 'failed' && status.errors && status.errors.length > 0
          ? status.errors[0].message || status.errors[0].title
          : undefined;

      await this.logRepository.updateStatusWithMetadata(
        log.id,
        notificationStatus,
        errorMessage,
        metadata,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process status update: ${status.id}:${status.status}`,
        error instanceof Error ? error.stack : String(error),
      );
      await this.metricsService.recordStatusUpdate(status.status, false);
      throw error;
    }
  }

  /**
   * Process incoming message (optional, for 2-way messaging)
   * @param message Incoming message
   */
  processIncomingMessage(_message: WhatsAppIncomingMessage): void {
    // TODO: Implement incoming message handling if needed
  }

  /**
   * Map WhatsApp status to NotificationStatus enum
   * @param whatsappStatus WhatsApp status
   * @returns NotificationStatus
   */
  private mapStatus(
    whatsappStatus: 'sent' | 'delivered' | 'read' | 'failed',
  ): NotificationStatus {
    switch (whatsappStatus) {
      case 'sent':
        return NotificationStatus.SENT;
      case 'delivered':
      case 'read':
        // Read is a subset of delivered, but we store "read" in metadata for analytics
        return NotificationStatus.DELIVERED;
      case 'failed':
        return NotificationStatus.FAILED;
      default:
        this.logger.warn(`Unknown WhatsApp status: ${whatsappStatus}`);
        return NotificationStatus.FAILED;
    }
  }
}

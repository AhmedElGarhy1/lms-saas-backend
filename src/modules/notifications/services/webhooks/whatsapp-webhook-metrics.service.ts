import { Injectable, Logger } from '@nestjs/common';

/**
 * Simplified metrics service for WhatsApp webhooks
 * Uses logging instead of Redis storage
 * For production metrics, use Prometheus/Datadog instead
 */
@Injectable()
export class WhatsAppWebhookMetricsService {
  private readonly logger = new Logger(WhatsAppWebhookMetricsService.name);

  /**
   * Record webhook received (simple log)
   */
  recordWebhookReceived(): void {
    this.logger.debug('Webhook received');
  }

  /**
   * Record signature verification failure
   */
  recordSignatureVerificationFailure(): void {
    this.logger.warn('Webhook signature verification failed');
  }

  /**
   * Record orphaned webhook (message ID not found)
   */
  recordOrphanedWebhook(): void {
    this.logger.warn('Orphaned webhook detected');
  }

  /**
   * Record status update (optional - can remove if not needed)
   * @param status Status type (sent, delivered, read, failed)
   * @param success Whether processing was successful
   */
  recordStatusUpdate(status: string, success: boolean): void {
    if (!success) {
      this.logger.warn(`Status update failed: ${status}`);
    }
  }

  /**
   * Record processing error
   * @param error Error message or type
   */
  recordProcessingError(error: string): void {
    this.logger.error(`Webhook processing error: ${error}`);
  }

  /**
   * Record processing latency (optional - logs only if high)
   * @param latencyMs Latency in milliseconds
   */
  recordProcessingLatency(latencyMs: number): void {
    // Log only if latency is high (>1s)
    if (latencyMs > 1000) {
      this.logger.warn(`High webhook processing latency: ${latencyMs}ms`);
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { WebhookAttemptRepository } from '../repositories/webhook-attempt.repository';
import { WebhookProvider } from '../enums/webhook-provider.enum';
import { WebhookStatus } from '../enums/webhook-status.enum';
import { WebhookAttempt } from '../entities/webhook-attempt.entity';
import { PaymentService } from './payment.service';
import { PaymentGatewayService } from '../adapters/payment-gateway.service';
import { PaymentGatewayType } from '../adapters/interfaces/payment-gateway.interface';
import { WebhookEvent } from '../adapters/interfaces/payment-gateway.interface';
import { FinanceMonitorService } from '../monitoring/finance-monitor.service';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly webhookAttemptRepository: WebhookAttemptRepository,
    private readonly paymentService: PaymentService,
    private readonly paymentGatewayService: PaymentGatewayService,
    private readonly financeMonitor: FinanceMonitorService,
  ) {}

  /**
   * Process incoming webhook with idempotency and retry logic
   */
  async processWebhook(
    provider: WebhookProvider,
    externalId: string,
    payload: any,
    signature: string,
    ipAddress: string,
  ): Promise<WebhookAttempt> {
    // Check if we've already processed this webhook
    let attempt =
      await this.webhookAttemptRepository.findByProviderAndExternalId(
        provider,
        externalId,
      );

    if (attempt) {
      // Idempotency: Return existing processed attempt
      if (attempt.status === WebhookStatus.PROCESSED) {
        this.logger.log(`Webhook already processed: ${provider}:${externalId}`);
        return attempt;
      }

      // Update attempt count for retry
      attempt.attemptCount += 1;
      await this.webhookAttemptRepository.create(attempt); // This will update existing entity
    } else {
      // Create new attempt
      attempt = await this.webhookAttemptRepository.create({
        provider,
        externalId,
        payload,
        signature,
        ipAddress,
        status: WebhookStatus.RECEIVED,
        attemptCount: 1,
      });
    }

    try {
      const startTime = Date.now();

      // Validate webhook signature if signature is provided (fail-fast validation)
      if (signature) {
        const gatewayType = this.mapProviderToGatewayType(provider);
        const isValidSignature =
          this.paymentGatewayService.validateWebhookSignature(
            gatewayType,
            payload,
            signature,
          );

        if (!isValidSignature) {
          // Record invalid webhook metric
          this.financeMonitor.recordWebhookReceived(provider, 'invalid');

          // Mark as failed due to invalid signature
          attempt.status = WebhookStatus.FAILED;
          attempt.errorMessage = 'Webhook signature validation failed';
          await this.webhookAttemptRepository.create(attempt);

          // Record processing duration
          this.financeMonitor.recordWebhookProcessingDuration(
            provider,
            'error',
            Date.now() - startTime,
          );

          throw new Error('Webhook signature validation failed');
        }
      }

      // Record valid webhook received
      this.financeMonitor.recordWebhookReceived(provider, 'valid');

      // Mark as validated (ready for processing)
      attempt.status = WebhookStatus.PROCESSING;
      await this.webhookAttemptRepository.create(attempt);

      // Process asynchronously (fail-fast pattern)
      this.processWebhookAsync(attempt.id, provider, payload);

      this.logger.log(
        `Webhook validated and queued for processing: ${provider}:${externalId}`,
      );
      return attempt;
    } catch (error) {
      // Schedule retry with exponential backoff
      const nextRetryAt = this.calculateNextRetry(attempt.attemptCount);
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Schedule retry - the scheduleRetry method handles the update
      await this.webhookAttemptRepository.scheduleRetry(
        attempt.id,
        attempt.attemptCount,
        nextRetryAt,
        errorMessage,
      );

      this.logger.error(
        `Webhook processing failed, scheduled retry: ${provider}:${externalId}`,
        error instanceof Error ? error.stack : error,
      );

      throw error;
    }
  }

  /**
   * Process webhook based on provider
   */
  private async processWebhookByProvider(
    provider: WebhookProvider,
    payload: any,
  ): Promise<any> {
    switch (provider) {
      case WebhookProvider.PAYMOB:
        return this.processPaymobWebhook(payload);
      default:
        throw new Error(`Unsupported webhook provider: ${provider}`);
    }
  }

  /**
   * Calculate next retry time with exponential backoff
   */
  private calculateNextRetry(attemptCount: number): Date {
    // Exponential backoff: 1min, 5min, 30min, 2hr, 6hr, 24hr
    const delays = [60, 300, 1800, 7200, 21600, 86400]; // seconds
    const delaySeconds =
      delays[Math.min(attemptCount - 1, delays.length - 1)] || 86400;

    return new Date(Date.now() + delaySeconds * 1000);
  }

  /**
   * Process Paymob webhook
   */
  private async processPaymobWebhook(payload: any): Promise<any> {
    try {
      // Paymob webhooks typically contain transaction data
      const transactionId =
        payload?.id || payload?.transaction_id || payload?.obj?.id;
      const transactionData = payload?.obj || payload;

      if (!transactionId) {
        throw new Error('No transaction ID found in Paymob webhook payload');
      }

      // Map Paymob webhook event to our WebhookEvent interface
      const webhookEvent: WebhookEvent = {
        eventType: this.mapPaymobEventType(payload),
        gatewayPaymentId: transactionId,
        data: transactionData,
        signature: '', // Would be validated separately if needed
        timestamp: new Date(),
      };

      // Process webhook through payment gateway service
      const paymentStatus =
        await this.paymentGatewayService.processWebhookEvent(
          PaymentGatewayType.PAYMOB,
          webhookEvent,
        );

      // Update our payment record
      const status =
        paymentStatus.status === 'completed'
          ? 'completed'
          : paymentStatus.status === 'failed'
            ? 'failed'
            : paymentStatus.status === 'cancelled'
              ? 'cancelled'
              : 'pending';

      await this.paymentService.processExternalPaymentCompletion(
        transactionId,
        PaymentGatewayType.PAYMOB,
        status as 'completed' | 'failed' | 'cancelled',
        paymentStatus.amount,
        paymentStatus.failureReason,
      );

      return {
        gatewayPaymentId: transactionId,
        status: paymentStatus.status,
        amount: paymentStatus.amount?.toString(),
      };
    } catch (error) {
      this.logger.error('Failed to process Paymob webhook', {
        error: error.message,
        payload,
      });
      throw error;
    }
  }

  /**
   * Map Paymob webhook event types to our internal event types
   */
  private mapPaymobEventType(payload: any): string {
    const type = payload?.type || payload?.event_type || payload?.obj?.type;

    // Map common Paymob event types
    switch (type) {
      case 'TRANSACTION_COMPLETED':
      case 'transaction.completed':
        return 'TRANSACTION_COMPLETED';
      case 'TRANSACTION_FAILED':
      case 'transaction.failed':
        return 'TRANSACTION_FAILED';
      case 'TRANSACTION_CANCELLED':
      case 'transaction.cancelled':
        return 'TRANSACTION_CANCELLED';
      default:
        return type || 'UNKNOWN_EVENT';
    }
  }

  /**
   * Process webhook asynchronously (fail-fast pattern)
   */
  private async processWebhookAsync(
    attemptId: string,
    provider: WebhookProvider,
    payload: any,
  ): Promise<void> {
    const startTime = Date.now();
    const providerName = provider.toLowerCase();

    try {
      // Get the attempt (it should exist since we just created it)
      const attempt = await this.webhookAttemptRepository.findOne(attemptId);
      if (!attempt) {
        this.logger.error(
          `Webhook attempt not found for async processing: ${attemptId}`,
        );
        return;
      }

      // Process based on provider
      const result = await this.processWebhookByProvider(provider, payload);

      // Record successful processing metrics
      this.financeMonitor.recordWebhookProcessed(
        providerName,
        result?.eventType || 'unknown',
      );
      this.financeMonitor.recordWebhookProcessingDuration(
        providerName,
        'success',
        Date.now() - startTime,
      );

      // Mark as processed successfully
      attempt.status = WebhookStatus.PROCESSED;
      attempt.processedAt = new Date();
      attempt.processingResult = result;
      await this.webhookAttemptRepository.create(attempt);

      this.logger.log(
        `Webhook processed successfully (async): ${provider}:${attempt.externalId}`,
      );
    } catch (error) {
      this.logger.error(`Webhook async processing failed: ${attemptId}`, error);

      // Record error metrics
      this.financeMonitor.recordWebhookProcessingDuration(
        providerName,
        'error',
        Date.now() - startTime,
      );

      // Mark as failed
      const attempt = await this.webhookAttemptRepository.findOne(attemptId);
      if (attempt) {
        attempt.status = WebhookStatus.FAILED;
        attempt.errorMessage =
          error instanceof Error ? error.message : String(error);
        await this.webhookAttemptRepository.create(attempt);
      }
    }
  }

  /**
   * Map webhook provider to payment gateway type
   */
  private mapProviderToGatewayType(
    provider: WebhookProvider,
  ): PaymentGatewayType {
    switch (provider) {
      case WebhookProvider.PAYMOB:
        return PaymentGatewayType.PAYMOB;
      default:
        return PaymentGatewayType.PAYMOB;
    }
  }

  /**
   * Process pending retry attempts
   */
  async processPendingRetries(): Promise<number> {
    const pendingRetries =
      await this.webhookAttemptRepository.findPendingRetries();
    let processed = 0;

    for (const attempt of pendingRetries) {
      try {
        await this.processWebhook(
          attempt.provider,
          attempt.externalId,
          attempt.payload,
          attempt.signature || '',
          attempt.ipAddress || '',
        );
        processed++;
      } catch (error) {
        this.logger.error(
          `Retry processing failed for attempt ${attempt.id}`,
          error,
        );
      }
    }

    return processed;
  }
}

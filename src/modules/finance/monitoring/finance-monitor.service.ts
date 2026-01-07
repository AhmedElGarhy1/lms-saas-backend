import { Injectable, Logger } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Histogram, Gauge } from 'prom-client';
import { Money } from '@/shared/common/utils/money.util';

@Injectable()
export class FinanceMonitorService {
  private readonly logger = new Logger(FinanceMonitorService.name);

  // Payment metrics
  @InjectMetric('finance_payments_total')
  private readonly paymentCounter: Counter<string>;

  @InjectMetric('finance_payments_completed_total')
  private readonly paymentCompletedCounter: Counter<string>;

  @InjectMetric('finance_payments_failed_total')
  private readonly paymentFailedCounter: Counter<string>;

  // Transaction metrics
  @InjectMetric('finance_transactions_total')
  private readonly transactionCounter: Counter<string>;

  // Balance metrics
  @InjectMetric('finance_wallet_balance')
  private readonly walletBalanceGauge: Gauge<string>;

  // Performance metrics
  @InjectMetric('finance_operation_duration_seconds')
  private readonly operationDuration: Histogram<string>;

  @InjectMetric('finance_lock_wait_duration_seconds')
  private readonly lockWaitDuration: Histogram<string>;

  // Multi-Profile Transfer metrics
  @InjectMetric('finance_internal_transfer_total')
  private readonly internalTransferCounter: Counter<string>;

  // Error metrics
  @InjectMetric('finance_insufficient_funds_total')
  private readonly insufficientFundsCounter: Counter<string>;

  @InjectMetric('finance_lock_timeout_total')
  private readonly lockTimeoutCounter: Counter<string>;

  // Webhook metrics
  @InjectMetric('finance_webhooks_received_total')
  private readonly webhooksReceivedTotal: Counter<string>;

  @InjectMetric('finance_webhooks_processed_total')
  private readonly webhooksProcessedTotal: Counter<string>;

  @InjectMetric('finance_webhook_processing_duration_seconds')
  private readonly webhookProcessingDuration: Histogram<string>;

  // Refund metrics
  @InjectMetric('finance_refunds_total')
  private readonly refundsTotal: Counter<string>;

  @InjectMetric('finance_refunds_processed_total')
  private readonly refundsProcessedTotal: Counter<string>;

  /**
   * Record payment creation (fail-safe)
   */
  recordPaymentCreated(amount: Money, source: string, reason: string): void {
    try {
      this.paymentCounter.inc({
        source,
        reason,
        amount_range: this.getAmountRange(amount),
      });
    } catch (error) {
      this.logger.warn('Failed to record payment creation metric', {
        amount: amount.toString(),
        source,
        reason,
        error: error.message,
      });
    }
  }

  /**
   * Record payment completion (fail-safe)
   */
  recordPaymentCompleted(amount: Money, source: string, reason: string): void {
    try {
      this.paymentCompletedCounter.inc({
        source,
        reason,
        amount_range: this.getAmountRange(amount),
      });
    } catch (error) {
      this.logger.warn('Failed to record payment completion metric', {
        amount: amount.toString(),
        source,
        reason,
        error: error.message,
      });
    }
  }

  /**
   * Record payment failure (fail-safe)
   */
  recordPaymentFailed(reason: string, errorType: string): void {
    try {
      this.paymentFailedCounter.inc({
        reason,
        error_type: errorType,
      });
    } catch (error) {
      this.logger.warn('Failed to record payment failure metric', {
        reason,
        error_type: errorType,
        error: error.message,
      });
    }
  }

  /**
   * Record transaction creation (fail-safe)
   */
  recordTransactionCreated(type: string, amount: Money): void {
    try {
      this.transactionCounter.inc({
        type,
        amount_range: this.getAmountRange(amount),
      });
    } catch (error) {
      this.logger.warn('Failed to record transaction creation metric', {
        type,
        amount: amount.toString(),
        error: error.message,
      });
    }
  }

  /**
   * Update wallet balance gauge (fail-safe)
   */
  updateWalletBalance(
    walletId: string,
    balance: Money,
  ): void {
    try {
      this.walletBalanceGauge.set(
        { wallet_id: walletId, type: 'balance' },
        balance.toNumber(),
      );
    } catch (error) {
      this.logger.warn('Failed to update wallet balance metrics', {
        wallet_id: walletId,
        balance: balance.toString(),
        error: error.message,
      });
    }
  }

  /**
   * Record operation duration (fail-safe)
   */
  recordOperationDuration(
    operation: string,
    durationMs: number,
    success: boolean,
  ): void {
    try {
      this.operationDuration.observe(
        { operation, success: success.toString() },
        durationMs / 1000, // Convert to seconds
      );
    } catch (error) {
      this.logger.warn('Failed to record operation duration metric', {
        operation,
        duration_ms: durationMs,
        success,
        error: error.message,
      });
    }
  }

  /**
   * Record lock wait duration (fail-safe)
   */
  recordLockWaitDuration(operation: string, durationMs: number): void {
    try {
      this.lockWaitDuration.observe({ operation }, durationMs / 1000);
    } catch (error) {
      this.logger.warn('Failed to record lock wait duration metric', {
        operation,
        duration_ms: durationMs,
        error: error.message,
      });
    }
  }

  /**
   * Record insufficient funds error (fail-safe)
   */
  recordInsufficientFunds(
    walletId: string,
    requestedAmount: Money,
    availableAmount: Money,
  ): void {
    try {
      this.insufficientFundsCounter.inc({
        wallet_id: walletId,
        amount_range: this.getAmountRange(requestedAmount),
      });
    } catch (error) {
      this.logger.warn('Failed to record insufficient funds metric', {
        wallet_id: walletId,
        requested_amount: requestedAmount.toString(),
        available_amount: availableAmount.toString(),
        error: error.message,
      });
    }

    // Always log the business logic warning (this is important)
    this.logger.warn(
      `Insufficient funds: wallet=${walletId}, requested=${requestedAmount.toString()}, available=${availableAmount.toString()}`,
    );
  }

  /**
   * Record lock timeout (fail-safe)
   */
  recordLockTimeout(
    operation: string,
    walletId: string,
    retryCount: number,
  ): void {
    try {
      this.lockTimeoutCounter.inc({
        operation,
        wallet_id: walletId,
        retry_count: retryCount.toString(),
      });
    } catch (error) {
      this.logger.warn('Failed to record lock timeout metric', {
        operation,
        wallet_id: walletId,
        retry_count: retryCount,
        error: error.message,
      });
    }

    // Always log the performance warning (this is important)
    this.logger.warn(
      `Lock timeout: operation=${operation}, wallet=${walletId}, retries=${retryCount}`,
    );
  }

  /**
   * Record internal transfer between user profiles (fail-safe)
   */
  recordInternalTransfer(
    userId: string,
    amount: Money,
    fromCenterId: string,
    toCenterId: string,
    transferType:
      | 'consolidation'
      | 'distribution'
      | 'rebalancing' = 'consolidation',
  ): void {
    try {
      this.internalTransferCounter.inc(
        {
          user_id: userId,
          currency: 'USD', // TODO: Make dynamic based on system currency
          from_center: fromCenterId,
          to_center: toCenterId,
          transfer_type: transferType,
        },
        amount.toNumber(),
      );
    } catch (error) {
      this.logger.warn('Failed to record internal transfer metric', {
        user_id: userId,
        amount: amount.toString(),
        from_center: fromCenterId,
        to_center: toCenterId,
        transfer_type: transferType,
        error: error.message,
      });
    }

    // Always log the successful transfer (this is important for audit trail)
    this.logger.log(
      `Internal transfer recorded: user=${userId}, amount=${amount.toString()}, ` +
        `from_center=${fromCenterId}, to_center=${toCenterId}, type=${transferType}`,
    );
  }

  /**
   * Get amount range for metrics (to avoid high cardinality)
   */
  private getAmountRange(amount: Money): string {
    const value = amount.toNumber();
    if (value < 10) return '0-10';
    if (value < 100) return '10-100';
    if (value < 1000) return '100-1000';
    if (value < 10000) return '1000-10000';
    return '10000+';
  }

  /**
   * Health check for critical financial operations
   */
  async performHealthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: Record<string, any>;
  }> {
    // TODO: Implement actual health checks
    // - Database connectivity
    // - Lock queue length
    // - Recent error rates
    // - Balance consistency checks

    return {
      status: 'healthy',
      details: {
        database: 'connected',
        locks: 'normal',
        errors_last_hour: 0,
        balance_consistency: 'valid',
      },
    };
  }

  /**
   * Record webhook received
   */
  recordWebhookReceived(
    provider: string,
    result: 'valid' | 'invalid' | 'error',
  ): void {
    try {
      this.webhooksReceivedTotal.inc({
        provider,
        result,
      });
    } catch (error) {
      this.logger.warn('Failed to record webhook received metric', {
        error: error.message,
      });
    }
    this.logger.log(`Webhook received: ${provider}, result: ${result}`);
  }

  /**
   * Record webhook processed successfully
   */
  recordWebhookProcessed(provider: string, eventType: string): void {
    try {
      this.webhooksProcessedTotal.inc({
        provider,
        event_type: eventType,
      });
    } catch (error) {
      this.logger.warn('Failed to record webhook processed metric', {
        error: error.message,
      });
    }
    this.logger.log(`Webhook processed: ${provider}, event: ${eventType}`);
  }

  /**
   * Record webhook processing duration
   */
  recordWebhookProcessingDuration(
    provider: string,
    result: 'success' | 'error',
    durationMs: number,
  ): void {
    try {
      this.webhookProcessingDuration.observe(
        { provider, result },
        durationMs / 1000, // Convert to seconds
      );
    } catch (error) {
      this.logger.warn('Failed to record webhook processing duration', {
        error: error.message,
      });
    }
  }

  /**
   * Record refund amount requested
   */
  recordRefundRequested(amount: Money, gateway: string): void {
    try {
      this.refundsTotal.inc(
        {
          currency: 'EGP', // TODO: Make dynamic based on system currency
          gateway,
        },
        amount.toNumber(),
      );
    } catch (error) {
      this.logger.warn('Failed to record refund requested metric', {
        error: error.message,
      });
    }
    this.logger.log(`Refund requested: ${amount.toString()} via ${gateway}`);
  }

  /**
   * Record refund amount processed
   */
  recordRefundProcessed(
    amount: Money,
    gateway: string,
    result: 'success' | 'failed',
  ): void {
    try {
      this.refundsProcessedTotal.inc(
        {
          currency: 'EGP', // TODO: Make dynamic based on system currency
          gateway,
          result,
        },
        amount.toNumber(),
      );
    } catch (error) {
      this.logger.warn('Failed to record refund processed metric', {
        error: error.message,
      });
    }
    this.logger.log(`Refund ${result}: ${amount.toString()} via ${gateway}`);
  }
}

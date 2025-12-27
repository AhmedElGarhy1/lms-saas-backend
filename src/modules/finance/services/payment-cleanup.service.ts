import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PaymentRepository } from '../repositories/payment.repository';
import { PaymentService } from './payment.service';
import { PaymentStatus } from '../enums/payment-status.enum';

@Injectable()
export class PaymentCleanupService {
  private readonly logger = new Logger(PaymentCleanupService.name);

  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly paymentService: PaymentService,
  ) {}

  /**
   * Cron job to clean up expired pending payments (runs every hour)
   * Marks payments as EXPIRED if they've been PENDING for more than 24 hours
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredPayments() {
    this.logger.log('Starting expired payment cleanup');

    try {
      const expiredThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

      // Find payments that are PENDING and older than 24 hours
      const expiredPayments = await this.paymentRepository
        .createQueryBuilder('payment')
        .where('payment.status = :status', { status: PaymentStatus.PENDING })
        .andWhere('payment.createdAt < :threshold', {
          threshold: expiredThreshold,
        })
        .getMany();

      if (expiredPayments.length === 0) {
        this.logger.log('No expired payments found');
        return;
      }

      this.logger.log(
        `Found ${expiredPayments.length} expired payments to clean up`,
      );

      let cleanedCount = 0;
      let errorCount = 0;

      for (const payment of expiredPayments) {
        try {
          // Cancel the expired payment
          await this.cancelExpiredPayment(payment.id);
          cleanedCount++;
        } catch (error) {
          errorCount++;
          this.logger.error(
            `Failed to cancel expired payment ${payment.id}`,
            error instanceof Error ? error.stack : error,
          );
        }
      }

      this.logger.log(
        `Payment cleanup completed: ${cleanedCount} cleaned, ${errorCount} errors`,
      );
    } catch (error) {
      this.logger.error(
        'Payment cleanup job failed',
        error instanceof Error ? error.stack : error,
      );
    }
  }

  /**
   * Cancel an expired payment
   */
  private async cancelExpiredPayment(paymentId: string): Promise<void> {
    // Update payment status to CANCELLED
    await this.paymentRepository.updatePaymentStatus(
      paymentId,
      PaymentStatus.CANCELLED,
    );

    this.logger.log(
      `Cancelled expired payment: ${paymentId} (expired timeout)`,
    );
  }

  /**
   * Get statistics about pending payments
   */
  async getPendingPaymentStats() {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [totalPending, pendingOver1Hour, pendingOver24Hours] =
      await Promise.all([
        this.paymentRepository
          .createQueryBuilder('payment')
          .where('payment.status = :status', { status: PaymentStatus.PENDING })
          .getCount(),
        this.paymentRepository
          .createQueryBuilder('payment')
          .where(
            'payment.status = :status AND payment.createdAt < :threshold',
            {
              status: PaymentStatus.PENDING,
              threshold: oneHourAgo,
            },
          )
          .getCount(),
        this.paymentRepository
          .createQueryBuilder('payment')
          .where(
            'payment.status = :status AND payment.createdAt < :threshold',
            {
              status: PaymentStatus.PENDING,
              threshold: twentyFourHoursAgo,
            },
          )
          .getCount(),
      ]);

    return {
      totalPending,
      pendingOver1Hour,
      pendingOver24Hours,
      lastCleanup: now,
    };
  }
}

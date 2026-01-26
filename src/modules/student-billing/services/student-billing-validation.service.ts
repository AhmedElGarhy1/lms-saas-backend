import { Injectable } from '@nestjs/common';
import { PaymentStrategyService } from '@/modules/classes/services/payment-strategy.service';
import { StudentBillingErrors } from '../exceptions/student-billing.errors';

@Injectable()
export class StudentBillingValidationService {
  constructor(
    private readonly paymentStrategyService: PaymentStrategyService,
  ) {}

  /**
   * Validate that monthly subscriptions are allowed for this class
   */
  async validateMonthlySubscriptionAllowed(classId: string): Promise<void> {
    const paymentStrategy =
      await this.paymentStrategyService.getStudentPaymentStrategyForClass(
        classId,
      );

    if (!paymentStrategy) {
      throw StudentBillingErrors.subscriptionPaymentStrategyMissing();
    }

    if (!paymentStrategy.includeMonth) {
      throw StudentBillingErrors.monthlySubscriptionsNotAllowed();
    }
  }

  /**
   * Validate that session charges are allowed for this class
   */
  async validateSessionChargeAllowed(classId: string): Promise<void> {
    const paymentStrategy =
      await this.paymentStrategyService.getStudentPaymentStrategyForClass(
        classId,
      );

    if (!paymentStrategy) {
      throw StudentBillingErrors.subscriptionPaymentStrategyMissing();
    }

    if (!paymentStrategy.includeSession) {
      throw StudentBillingErrors.sessionChargesNotAllowed();
    }
  }

  /**
   * Validate that class charges are allowed for this class
   */
  async validateClassChargeAllowed(classId: string): Promise<void> {
    const paymentStrategy =
      await this.paymentStrategyService.getStudentPaymentStrategyForClass(
        classId,
      );

    if (!paymentStrategy) {
      throw StudentBillingErrors.subscriptionPaymentStrategyMissing();
    }

    if (!paymentStrategy.includeClass) {
      throw StudentBillingErrors.classChargesNotAllowed();
    }
  }

  /**
   * Get validated payment price for a class
   */
  async getValidatedPaymentPrice(
    classId: string,
    paymentType: 'session' | 'month',
  ): Promise<number> {
    const paymentStrategy =
      await this.paymentStrategyService.getStudentPaymentStrategyForClass(
        classId,
      );

    if (!paymentStrategy) {
      throw StudentBillingErrors.subscriptionPaymentStrategyMissing();
    }

    if (paymentType === 'session') {
      if (!paymentStrategy.includeSession || !paymentStrategy.sessionPrice) {
        throw StudentBillingErrors.sessionPaymentsNotConfigured();
      }
      return paymentStrategy.sessionPrice;
    }

    if (paymentType === 'month') {
      if (!paymentStrategy.includeMonth || !paymentStrategy.monthPrice) {
        throw StudentBillingErrors.monthlyPaymentsNotConfigured();
      }
      return paymentStrategy.monthPrice;
    }

    throw StudentBillingErrors.invalidPaymentType();
  }

  /**
   * Get validated class charge price for a class
   */
  async getValidatedClassPrice(classId: string): Promise<number> {
    const paymentStrategy =
      await this.paymentStrategyService.getStudentPaymentStrategyForClass(
        classId,
      );

    if (!paymentStrategy) {
      throw StudentBillingErrors.subscriptionPaymentStrategyMissing();
    }

    if (!paymentStrategy.includeClass || !paymentStrategy.classPrice) {
      throw StudentBillingErrors.classPaymentsNotConfigured();
    }

    return paymentStrategy.classPrice;
  }
}

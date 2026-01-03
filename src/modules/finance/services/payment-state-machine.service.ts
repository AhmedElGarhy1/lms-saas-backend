import { Injectable, Logger } from '@nestjs/common';
import { PaymentRepository } from '../repositories/payment.repository';
import { PaymentStatusChangeRepository } from '../repositories/payment-status-change.repository';
import { PaymentService } from './payment.service';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import { Payment } from '../entities/payment.entity';
import { PaymentStatus } from '../enums/payment-status.enum';
import { TransitionType } from '../enums/transition-type.enum';
import {
  PaymentStateMachine,
  PaymentTransition,
} from '../state-machines/payment-state-machine';
import { FinanceErrors } from '../exceptions/finance.errors';
import { SystemErrors } from '@/shared/common/exceptions/system.exception';

@Injectable()
export class PaymentStateMachineService {
  private readonly logger = new Logger(PaymentStateMachineService.name);

  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly paymentStatusChangeRepository: PaymentStatusChangeRepository,
    private readonly paymentService: PaymentService,
    private readonly accessControlHelperService: AccessControlHelperService,
    private readonly paymentStateMachine: PaymentStateMachine,
  ) {}

  /**
   * Validate and execute a payment status transition
   */
  async validateAndExecuteTransition(
    paymentId: string,
    targetStatus: PaymentStatus,
    userProfileId: string,
    reason?: string,
  ): Promise<Payment> {
    // 1. Find the payment
    const payment = await this.paymentRepository.findOneOrThrow(paymentId);

    // 2. Validate the transition exists
    const transition = this.paymentStateMachine.getTransition(
      payment.status,
      targetStatus,
    );
    if (!transition) {
      const validTransitions = this.paymentStateMachine
        .getValidTransitionsFrom(payment.status)
        .map((t) => t.to);
      throw FinanceErrors.paymentStatusTransitionInvalid(
        payment.status,
        targetStatus,
        validTransitions,
      );
    }

    // 3. Validate permissions for override transitions
    if (transition.type === TransitionType.OVERRIDE) {
      const isSuperAdmin =
        await this.accessControlHelperService.isSuperAdmin(userProfileId);
      if (!isSuperAdmin) {
        throw FinanceErrors.paymentOverrideDenied();
      }
    }

    // 4. Execute the transition
    const updatedPayment = await this.executeTransition(payment, transition);

    // 5. Log the status change
    await this.logStatusChange(
      payment,
      updatedPayment,
      transition,
      userProfileId,
      reason,
    );

    this.logger.log(
      `Payment ${paymentId} status changed: ${payment.status} → ${updatedPayment.status} ` +
        `(${transition.type}) by user ${userProfileId}`,
    );

    return updatedPayment;
  }

  /**
   * Execute the actual transition based on type
   */
  private async executeTransition(
    payment: Payment,
    transition: PaymentTransition,
  ): Promise<Payment> {
    if (transition.type === TransitionType.STANDARD) {
      return this.executeStandardTransition(payment, transition);
    } else {
      return this.executeOverrideTransition(payment, transition);
    }
  }

  /**
   * Execute standard transitions (logic-driven with money movement)
   */
  private async executeStandardTransition(
    payment: Payment,
    transition: PaymentTransition,
  ): Promise<Payment> {
    switch (transition.businessLogic) {
      case 'completePayment':
        // For cash payments, the paidByProfileId is the sender (who physically paid)
        // For wallet payments, we still need to provide it for consistency
        const paidByProfileId =
          payment.senderType === 'USER_PROFILE'
            ? payment.senderId
            : payment.source === 'CASH'
              ? payment.senderId
              : payment.senderId;
        return this.paymentService.completePayment(payment.id, paidByProfileId);

      case 'cancelPayment':
        return this.paymentService.cancelPayment(payment.id);

      case 'refundPayment':
        return this.paymentService.refundInternalPayment(payment.id);

      default:
        throw SystemErrors.unknownTransitionLogic(transition.businessLogic);
    }
  }

  /**
   * Execute override transitions (label-only, no money movement)
   */
  private async executeOverrideTransition(
    payment: Payment,
    transition: PaymentTransition,
  ): Promise<Payment> {
    // For override transitions, just update the status without business logic
    payment.status = transition.to;
    payment.updatedAt = new Date();

    return this.paymentRepository.create(payment); // This will update the existing payment
  }

  /**
   * Log the status change for audit purposes
   */
  private async logStatusChange(
    oldPayment: Payment,
    newPayment: Payment,
    transition: PaymentTransition,
    userProfileId: string,
    reason?: string,
  ): Promise<void> {
    await this.paymentStatusChangeRepository.create({
      paymentId: oldPayment.id,
      oldStatus: oldPayment.status,
      newStatus: newPayment.status,
      transitionType: transition.type,
      changedByUserId: userProfileId,
      reason: reason || transition.description,
      metadata: {
        businessLogic: transition.businessLogic,
        requiresSuperAdmin: transition.requiresSuperAdmin,
      },
    });
  }

  /**
   * Get transition matrix for API documentation
   */
  getTransitionMatrix() {
    return this.paymentStateMachine.getTransitionMatrix();
  }

  /**
   * Get valid transitions from a given status
   */
  getValidTransitionsFrom(status: PaymentStatus): PaymentTransition[] {
    return this.paymentStateMachine.getValidTransitionsFrom(status);
  }

  /**
   * Check if a transition is valid
   */
  isValidTransition(from: PaymentStatus, to: PaymentStatus): boolean {
    return this.paymentStateMachine.isValidTransition(from, to);
  }
}

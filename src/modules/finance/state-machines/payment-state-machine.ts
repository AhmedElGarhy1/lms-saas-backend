import { Injectable } from '@nestjs/common';
import { PaymentStatus } from '../enums/payment-status.enum';
import { TransitionType } from '../enums/transition-type.enum';
import { BaseTransition, BaseStateMachine } from '@/shared/state-machines';

export interface PaymentTransition extends BaseTransition<PaymentStatus> {
  type: TransitionType;
  requiresSuperAdmin: boolean;
}

/**
 * Payment State Machine Definition
 * Defines all valid payment status transitions
 */
@Injectable()
export class PaymentStateMachine extends BaseStateMachine<
  PaymentStatus,
  PaymentTransition
> {
  private static readonly TRANSITIONS: PaymentTransition[] = [
    // STANDARD TRANSITIONS (Logic-Driven - Money + Label)
    {
      from: PaymentStatus.PENDING,
      to: PaymentStatus.COMPLETED,
      type: TransitionType.STANDARD,
      requiresSuperAdmin: false,
      businessLogic: 'completePayment',
      description: 'Complete payment and credit wallet balance',
    },
    {
      from: PaymentStatus.PENDING,
      to: PaymentStatus.CANCELLED,
      type: TransitionType.STANDARD,
      requiresSuperAdmin: false,
      businessLogic: 'cancelPayment',
      description: 'Cancel payment and unlock any held funds',
    },
    {
      from: PaymentStatus.COMPLETED,
      to: PaymentStatus.REFUNDED,
      type: TransitionType.STANDARD,
      requiresSuperAdmin: false,
      businessLogic: 'refundPayment',
      description: 'Refund payment and debit wallet balance',
    },

    // OVERRIDE TRANSITIONS (Label-Only - Superadmin Only)
    {
      from: PaymentStatus.CANCELLED,
      to: PaymentStatus.PENDING,
      type: TransitionType.OVERRIDE,
      requiresSuperAdmin: true,
      businessLogic: 'override',
      description: 'Revert cancellation for reprocessing (admin override)',
    },
    {
      from: PaymentStatus.REFUNDED,
      to: PaymentStatus.COMPLETED,
      type: TransitionType.OVERRIDE,
      requiresSuperAdmin: true,
      businessLogic: 'override',
      description: 'Revert incorrect refund (admin override)',
    },
    {
      from: PaymentStatus.COMPLETED,
      to: PaymentStatus.CANCELLED,
      type: TransitionType.OVERRIDE,
      requiresSuperAdmin: true,
      businessLogic: 'override',
      description: 'Accounting correction without refund (admin override)',
    },
  ];

  /**
   * Get all payment transitions (required by base class)
   */
  protected getTransitions(): PaymentTransition[] {
    return PaymentStateMachine.TRANSITIONS;
  }

  /**
   * Execute business logic for transitions (required by base class)
   */
  protected async executeBusinessLogic(
    logic: string,
    context: any,
  ): Promise<any> {
    switch (logic) {
      case 'completePayment':
        return this.completePayment(context);
      case 'cancelPayment':
        return this.cancelPayment(context);
      case 'refundPayment':
        return this.refundPayment(context);
      case 'override':
        return this.handleOverride(context);
      default:
        throw new Error(`Unknown payment business logic: ${logic}`);
    }
  }

  /**
   * Get all standard transitions (logic-driven)
   */
  getStandardTransitions(): PaymentTransition[] {
    return this.getTransitions().filter(
      (t) => t.type === TransitionType.STANDARD,
    );
  }

  /**
   * Get all override transitions (superadmin only)
   */
  getOverrideTransitions(): PaymentTransition[] {
    return this.getTransitions().filter(
      (t) => t.type === TransitionType.OVERRIDE,
    );
  }

  // Business logic methods (to be implemented by the payment service)
  private async completePayment(context: any): Promise<any> {
    throw new Error('completePayment must be implemented by payment service');
  }

  private async cancelPayment(context: any): Promise<any> {
    throw new Error('cancelPayment must be implemented by payment service');
  }

  private async refundPayment(context: any): Promise<any> {
    throw new Error('refundPayment must be implemented by payment service');
  }

  private async handleOverride(context: any): Promise<any> {
    throw new Error('handleOverride must be implemented by payment service');
  }
}

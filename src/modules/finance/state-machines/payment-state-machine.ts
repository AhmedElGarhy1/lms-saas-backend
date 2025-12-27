import { PaymentStatus } from '../enums/payment-status.enum';
import { TransitionType } from '../enums/transition-type.enum';

export interface PaymentTransition {
  from: PaymentStatus;
  to: PaymentStatus;
  type: TransitionType;
  requiresSuperAdmin: boolean;
  businessLogic: string;
  description: string;
}

/**
 * Payment State Machine Definition
 * Defines all valid payment status transitions
 */
export class PaymentStateMachine {
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
   * Get valid transition for given from/to statuses
   */
  static getTransition(from: PaymentStatus, to: PaymentStatus): PaymentTransition | null {
    return this.TRANSITIONS.find(
      transition => transition.from === from && transition.to === to
    ) || null;
  }

  /**
   * Get all valid transitions from a given status
   */
  static getValidTransitionsFrom(from: PaymentStatus): PaymentTransition[] {
    return this.TRANSITIONS.filter(transition => transition.from === from);
  }

  /**
   * Get all valid transitions to a given status
   */
  static getValidTransitionsTo(to: PaymentStatus): PaymentTransition[] {
    return this.TRANSITIONS.filter(transition => transition.to === to);
  }

  /**
   * Check if a transition is valid
   */
  static isValidTransition(from: PaymentStatus, to: PaymentStatus): boolean {
    return this.getTransition(from, to) !== null;
  }

  /**
   * Get all standard transitions (logic-driven)
   */
  static getStandardTransitions(): PaymentTransition[] {
    return this.TRANSITIONS.filter(t => t.type === TransitionType.STANDARD);
  }

  /**
   * Get all override transitions (superadmin only)
   */
  static getOverrideTransitions(): PaymentTransition[] {
    return this.TRANSITIONS.filter(t => t.type === TransitionType.OVERRIDE);
  }

  /**
   * Get transition matrix for documentation
   */
  static getTransitionMatrix(): Record<string, PaymentTransition[]> {
    const matrix: Record<string, PaymentTransition[]> = {};

    Object.values(PaymentStatus).forEach(status => {
      matrix[status] = this.getValidTransitionsFrom(status);
    });

    return matrix;
  }
}

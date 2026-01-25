import { Payment } from '../entities/payment.entity';
import { ExecutionResult } from '../services/payment-executor.service';

/**
 * Strategy interface for executing payments
 * Different payment methods (WALLET, CASH) implement this interface
 */
export interface PaymentExecutionStrategy {
  /**
   * Execute the payment operation
   */
  execute(payment: Payment): Promise<ExecutionResult>;

  /**
   * Validate the payment before execution
   * Throws an error if validation fails
   */
  validate(payment: Payment): Promise<void>;
}

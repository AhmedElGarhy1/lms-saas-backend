/**
 * Status values for student charges
 * Consolidated from scattered entity definitions
 */
export enum StudentChargeStatus {
  PENDING = 'PENDING',      // Charge created but not yet processed
  INSTALLMENT = 'INSTALLMENT', // Partial payment/installment plan
  COMPLETED = 'COMPLETED',  // Fully paid and completed
  REFUNDED = 'REFUNDED',    // Charge has been refunded
  CANCELLED = 'CANCELLED',  // Charge cancelled before completion
}
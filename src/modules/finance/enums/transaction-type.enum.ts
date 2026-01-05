export enum TransactionType {
  // Business transaction types (unified for wallet and cash)
  STUDENT_BILL = 'STUDENT_BILL', // All student payments
  TEACHER_PAYOUT = 'TEACHER_PAYOUT', // All teacher compensation
  INTERNAL_TRANSFER = 'INTERNAL_TRANSFER', // All system transfers
  TOPUP = 'TOPUP', // Balance additions
  REFUND = 'REFUND', // Payment reversals

  // Cash-specific operations
  CASH_DEPOSIT = 'CASH_DEPOSIT', // Cash received into system
  CASH_WITHDRAWAL = 'CASH_WITHDRAWAL', // Cash paid out from system
}

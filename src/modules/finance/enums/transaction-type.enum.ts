export enum TransactionType {
  // Business transaction types
  STUDENT_BILL = 'STUDENT_BILL', // All student payments
  TEACHER_PAYOUT = 'TEACHER_PAYOUT', // All teacher compensation
  INTERNAL_TRANSFER = 'INTERNAL_TRANSFER', // All system transfers
  TOPUP = 'TOPUP', // Balance additions
  REFUND = 'REFUND', // Payment reversals
  EXPENSE = 'EXPENSE', // Center/branch expenses (cash payments to external vendors)
  SYSTEM_FEE = 'SYSTEM_FEE', // System fees deducted from student payments

  // Branch wallet operations
  BRANCH_WITHDRAWAL = 'BRANCH_WITHDRAWAL', // Branch wallet withdrawals (branch → staff)
  BRANCH_DEPOSIT = 'BRANCH_DEPOSIT', // Branch wallet deposits (staff → branch)
}

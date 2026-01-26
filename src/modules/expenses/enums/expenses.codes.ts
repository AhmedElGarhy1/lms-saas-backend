/**
 * Expenses-related error codes (EXP_xxx)
 * Range: EXP_001 - EXP_049
 */
export enum ExpenseErrorCode {
  EXPENSE_NOT_FOUND = 'EXP_001',
  CANNOT_UPDATE_REFUNDED_EXPENSE = 'EXP_002',
  EXPENSE_ALREADY_REFUNDED = 'EXP_003',
  ONLY_PAID_EXPENSES_CAN_BE_REFUNDED = 'EXP_004',
}

/**
 * Teacher Payout-related error codes (TP_xxx)
 * Range: TP_001 - TP_049
 */
export enum TeacherPayoutErrorCode {
  PAYOUT_NOT_FOUND = 'TP_001',
  PAYOUT_ALREADY_PAID = 'TP_002',
  PAYOUT_INVALID_STATUS_TRANSITION = 'TP_003',
  PAYOUT_ALREADY_EXISTS = 'TP_004',
}

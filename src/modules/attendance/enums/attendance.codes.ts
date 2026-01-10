/**
 * Attendance-related error codes (ATD_xxx)
 * Only codes actually used in the codebase
 */
export enum AttendanceErrorCode {
  ATTENDANCE_SESSION_NOT_ACTIVE = 'ATD_007',
  ATTENDANCE_STUDENT_NOT_ENROLLED = 'ATD_008',
  ATTENDANCE_INVALID_STUDENT_CODE = 'ATD_014',
  ATTENDANCE_PAYMENT_REQUIRED = 'ATD_012',
  ATTENDANCE_ALREADY_EXISTS = 'ATD_015',
  ATTENDANCE_CREATION_FAILED = 'ATD_016',
}

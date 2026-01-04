import {
  DomainException,
  BaseErrorHelpers,
} from '@/shared/common/exceptions/domain.exception';
import { AttendanceErrorCode } from '../enums/attendance.codes';

/**
 * Attendance module error helpers
 * Clean, simple, and maintainable error creation
 */
export class AttendanceErrors extends BaseErrorHelpers {
  // Session and validation errors
  static attendanceSessionNotActive(): DomainException {
    return this.createNoDetails(
      AttendanceErrorCode.ATTENDANCE_SESSION_NOT_ACTIVE,
    );
  }

  // Student and enrollment errors
  static attendanceStudentNotEnrolled(): DomainException {
    return this.createNoDetails(
      AttendanceErrorCode.ATTENDANCE_STUDENT_NOT_ENROLLED,
    );
  }

  // Validation errors
  static attendanceInvalidStudentCode(): DomainException {
    return this.createNoDetails(
      AttendanceErrorCode.ATTENDANCE_INVALID_STUDENT_CODE,
    );
  }

  // Permission errors
  static attendancePaymentRequired(): DomainException {
    return this.createNoDetails(
      AttendanceErrorCode.ATTENDANCE_PAYMENT_REQUIRED,
    );
  }

  // Duplicate/Exists errors
  static attendanceAlreadyExists(): DomainException {
    return this.createNoDetails(AttendanceErrorCode.ATTENDANCE_ALREADY_EXISTS);
  }
}

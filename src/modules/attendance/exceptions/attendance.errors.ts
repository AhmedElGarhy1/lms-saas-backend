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
  static attendancePaymentRequired(paymentStrategy?: any): DomainException {
    if (!paymentStrategy) {
      return this.createNoDetails(
        AttendanceErrorCode.ATTENDANCE_PAYMENT_REQUIRED,
      );
    }

    const paymentOptions = [];
    if (paymentStrategy.includeSession) {
      paymentOptions.push({
        type: 'session',
        price: paymentStrategy.sessionPrice
      });
    }
    if (paymentStrategy.includeMonth) {
      paymentOptions.push({
        type: 'monthly',
        price: paymentStrategy.monthPrice
      });
    }
    if (paymentStrategy.includeClass) {
      paymentOptions.push({
        type: 'class',
        price: paymentStrategy.classPrice
      });
    }

    return this.createWithDetails(
      AttendanceErrorCode.ATTENDANCE_PAYMENT_REQUIRED,
      {
        availablePaymentOptions: paymentOptions,
        hasPaymentOptions: paymentOptions.length > 0
      },
    );
  }

  // Duplicate/Exists errors
  static attendanceAlreadyExists(): DomainException {
    return this.createNoDetails(AttendanceErrorCode.ATTENDANCE_ALREADY_EXISTS);
  }
}
